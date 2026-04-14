import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import multer from "multer";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { bundle } from "@remotion/bundler";
import { renderFrames, stitchFramesToVideo, getCompositions } from "@remotion/renderer";
import { v4 as uuidv4 } from "uuid";
import compressVideo from "./compressVideo.cjs";
import compressAudio from "./compressAudio.cjs";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

/* ── Auth middleware ── */
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: "Unauthorized" });
  req.user = user;
  next();
}

async function requireAdmin(req, res, next) {
  // Re-fetch via admin API to get the authoritative app_metadata
  const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(req.user.id);
  if (error || !user) return res.status(401).json({ error: "Unauthorized" });
  const meta = user.app_metadata ?? {};
  const role = meta.role;
  if (role !== "admin") return res.status(403).json({ error: "Forbidden" });
  req.adminUser = user;
  next();
}

/* ── Credit deduction (server-side, atomic) ── */
async function deductCredits(userId, amount, action, description, projectId = null) {
  const { data: credits } = await supabaseAdmin
    .from("user_credits")
    .select("balance")
    .eq("user_id", userId)
    .single();

  if (!credits || credits.balance < amount) {
    return { success: false, error: "Insufficient credits" };
  }

  const newBalance = credits.balance - amount;

  await supabaseAdmin
    .from("user_credits")
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  await supabaseAdmin
    .from("credit_transactions")
    .insert({
      user_id:      userId,
      amount:       -amount,
      type:         "deduction",
      action,
      description,
      project_id:   projectId || null,
      balance_after: newBalance,
    });

  return { success: true, balance: newBalance };
}

/** Add credits (positive amount) — used by admin and purchase flow. */
async function addCredits(userId, amount, type, action, description, paymentId = null) {
  const { data: credits } = await supabaseAdmin
    .from("user_credits")
    .select("balance, lifetime_credits")
    .eq("user_id", userId)
    .single();

  const current  = credits?.balance          ?? 0;
  const lifetime = credits?.lifetime_credits ?? 0;
  const newBalance  = current  + amount;
  const newLifetime = lifetime + amount;

  await supabaseAdmin
    .from("user_credits")
    .upsert({ user_id: userId, balance: newBalance, lifetime_credits: newLifetime, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

  await supabaseAdmin
    .from("credit_transactions")
    .insert({
      user_id:      userId,
      amount,
      type,
      action,
      description,
      payment_id:   paymentId,
      balance_after: newBalance,
    });

  return { success: true, balance: newBalance };
}
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
app.use(cors());
app.use(express.json({ limit: "100mb" }));

const __dirnameResolved = path.dirname(new URL(import.meta.url).pathname).replace(/^\//, "");
const PROJECT_ROOT = path.resolve(__dirnameResolved, "../..");
const TEMP_DIR     = path.join(PROJECT_ROOT, "src/server/temp");
const PUBLIC_DIR   = path.join(PROJECT_ROOT, "public");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
app.use("/renders", express.static(TEMP_DIR));

/* ── Temp directory cleanup ── */
const MAX_TEMP_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

function cleanTempDir() {
  if (!fs.existsSync(TEMP_DIR)) return;
  const now = Date.now();
  const files = fs.readdirSync(TEMP_DIR);
  let deleted = 0;
  for (const file of files) {
    const filePath = path.join(TEMP_DIR, file);
    try {
      const stat = fs.statSync(filePath);
      if (stat.isFile() && now - stat.mtimeMs > MAX_TEMP_AGE_MS) {
        fs.unlinkSync(filePath);
        deleted++;
      }
    } catch { /* file already gone */ }
  }
  if (deleted > 0) console.log(`[temp cleanup] Deleted ${deleted} files older than 24h`);
}

cleanTempDir();
setInterval(cleanTempDir, 6 * 60 * 60 * 1000);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ── Bundle — rebuilt on every render so code changes are always picked up ── */
async function getBundle() {
  console.log("[bundle] Building bundle...");
  const result = await bundle({
    entryPoint: path.join(PROJECT_ROOT, "src/remotion/Root.jsx"),
    publicDir:  PUBLIC_DIR,
  });
  console.log("[bundle] Done:", result);
  return result;
}

/* ── Download external image to local temp ── */
async function cacheExternalImage(url) {
  if (!url) return url;
  if (url.startsWith("blob:")) return null;
  if (url.startsWith("http://localhost")) return url;
  if (!url.startsWith("http")) return url;
  try {
    const res    = await fetch(url);
    if (!res.ok) return url;
    const buffer = Buffer.from(await res.arrayBuffer());
    const ext    = url.split("?")[0].split(".").pop()?.split("/")[0] || "jpg";
    const safe   = ["jpg","jpeg","png","webp","mp4","webm"].includes(ext) ? ext : "jpg";
    const fname  = `img-${Date.now()}-${Math.random().toString(36).slice(2)}.${safe}`;
    fs.writeFileSync(path.join(TEMP_DIR, fname), buffer);
    return `http://localhost:5000/renders/${fname}`;
  } catch (e) {
    console.warn("[render] Failed to cache:", url, e.message);
    return url;
  }
}

/* ---------------- AI ROUTE ---------------- */
app.post("/api/generate", requireAuth, async (req, res) => {
  try {
    const { prompt, projectId } = req.body;
    const deduction = await deductCredits(req.user.id, 8, "base_generation", "Video generation", projectId);
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a strict JSON generator. Output only valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });
    const raw = completion.choices[0].message.content;
    const cleaned = raw
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    res.json(parsed);
  } catch (err) {
    console.error("[generate]", err.message);
    res.status(500).json({ error: "AI generation failed" });
  }
});

/* ---------------- TRANSCRIPT BEAT PROCESSING ---------------- */
app.post("/api/process-beats", requireAuth, async (req, res) => {
  try {
    const { segments } = req.body;
    if (!Array.isArray(segments) || !segments.length) {
      return res.status(400).json({ error: "segments array required" });
    }
    const deduction = await deductCredits(req.user.id, 2, "transcript_beats", "Transcript beat processing");
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });

    const prompt = `You are processing a speech transcript from a talking-head video into beats for a short-form video editor.

RAW WHISPER SEGMENTS (with timestamps):
${JSON.stringify(segments, null, 2)}

TASK: Split these segments into short punchy beats. Classify each beat with intent, energy, avatar visibility, and asset hints.

BEAT SPLITTING RULES — critical, follow exactly:
- Target beat duration: 2-4 seconds. This is talking head mode — short beats, fast cuts.
- Minimum beat duration: 1.5 seconds. Never go below.
- Maximum beat duration: 5 seconds. If a segment exceeds 5s, split at a sentence boundary.
- DO NOT merge short punchy sentences just to hit a minimum. "Bas open karo." is one beat. "Edit karo." is one beat.
- If there is a gap of 0.5+ seconds between segments, ALWAYS treat as a beat boundary.
- Keep start_sec from the first merged segment and end_sec from the last merged segment.
- First beat: intent must be "curiosity" or "shock". showAvatar: true.
- Last beat: intent must be "urgency" or "reveal". showAvatar: true.

INTENT OPTIONS: shock, curiosity, proof, irony, reveal, empathy, urgency, explanation, contrast, punchline
ENERGY (0.0 calm to 1.0 explosive):
- High (0.7-1.0): exclamations, surprising claims, calls to action
- Medium (0.4-0.7): explanations, questions, proofs
- Low (0.1-0.4): emotional/reflective, slow build-up

showAvatar FIELD — boolean, determines if talking head video is visible:
- true: speaker making direct personal statement, CTA, greeting, reaction, emotional moment
- true: first beat, last beat, any beat under 2 seconds
- false: speaker references specific tool, product, website, app, statistic, place, brand name, scheme name
- false: speaker says "look at this", "here is", "this is how", "go to [website]", describing something visual

asset_hint FIELD:
- When showAvatar is true: set asset_hint to null (avatar fills the frame, no image needed)
- When showAvatar is false: MUST provide asset_hint:
  - If speaker mentions specific brand/product/website/scheme name → visual_type: "entity", search_query: "<the exact name>", prompt: null, keywords: []
  - Otherwise → visual_type: "abstract", search_query: null, prompt: "<specific photographable scene that illustrates what speaker is saying>", keywords: ["keyword1","keyword2"]

Return ONLY valid JSON:
{
  "beats": [
    {
      "spoken": "beat text",
      "start_sec": 0.0,
      "end_sec": 2.5,
      "intent": "curiosity",
      "energy": 0.8,
      "showAvatar": true,
      "asset_hint": null
    },
    {
      "spoken": "Canva open karo",
      "start_sec": 2.5,
      "end_sec": 4.8,
      "intent": "explanation",
      "energy": 0.6,
      "showAvatar": false,
      "asset_hint": { "visual_type": "entity", "search_query": "Canva", "prompt": null, "keywords": [] }
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a strict JSON generator. Output only valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
    });
    const raw     = completion.choices[0].message.content;
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const parsed  = JSON.parse(cleaned);
    res.json(parsed);
  } catch (err) {
    console.error("[process-beats]", err.message);
    res.status(500).json({ error: "Beat processing failed" });
  }
});

/* ---------------- TTS GENERATION ---------------- */
const TTS_VOICES = {
  female_warm:  "nova",
  female_clear: "shimmer",
  male_deep:    "onyx",
  male_neutral: "echo",
  neutral_soft: "alloy",
  storyteller:  "fable",
};

/* Normalize TTS audio to -14 LUFS — OpenAI tts-1 outputs ~-23 LUFS (very quiet) */
function normalizeTTS(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFilters("loudnorm=I=-9:TP=-1:LRA=7")
      .audioCodec("libmp3lame")
      .audioBitrate("192k")
      .output(outputPath)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });
}

app.post("/api/generate-tts", requireAuth, async (req, res) => {
  try {
    const { script, voice = "female_warm", speed = 1.0, projectId } = req.body;
    const deduction = await deductCredits(req.user.id, 5, "tts_generation", "TTS voiceover", projectId);
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    console.log("[TTS] Request:", { voice, speed, scriptLength: script?.length });
    if (!script?.trim()) return res.status(400).json({ error: "No script provided" });

    const resolvedVoice = TTS_VOICES[voice] || "nova";
    const mp3 = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: resolvedVoice,
      input: script.trim(),
      speed: Math.min(4.0, Math.max(0.25, Number(speed))),
    });

    const buffer   = Buffer.from(await mp3.arrayBuffer());
    const rawName  = `tts-raw-${Date.now()}.mp3`;
    const normName = `tts-${Date.now()}.mp3`;
    const rawPath  = path.join(TEMP_DIR, rawName);
    const normPath = path.join(TEMP_DIR, normName);

    fs.writeFileSync(rawPath, buffer);
    await normalizeTTS(rawPath, normPath);
    fs.unlinkSync(rawPath);

    const url = `http://localhost:5000/renders/${normName}`;
    console.log("[TTS] Done (normalized):", url);
    res.json({ url });
  } catch (err) {
    console.error("[TTS] Error:", err?.message || err);
    res.status(500).json({ error: err?.message || "TTS generation failed" });
  }
});

/* ── Music key to filename map ── */
const MUSIC_FILENAMES = {
  eliveta_1:    "eliveta491190.mp3",
  eliveta_2:    "eliveta491224.mp3",
  loksii:       "loksii.mp3",
  mood_mode:    "mood_mode.mp3",
  nastelbom:    "nastelbom.mp3",
  the_mountain: "the_mountain.mp3",
};
function getMusicFilename(key) { return MUSIC_FILENAMES[key] || `${key}.mp3`; }

/* ---------------- IMAGE SEARCH (Bing scrape — no API key) ---------------- */
async function bingScrapeImages(query) {
  const url = `https://www.bing.com/images/async?q=${encodeURIComponent(query)}&first=1&count=10&adlt=Moderate&mmasync=1`;
  const r   = await fetch(url, {
    headers: {
      "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer":         "https://www.bing.com/images/search",
    },
  });
  if (!r.ok) throw new Error(`Bing scrape HTTP ${r.status}`);
  const html = await r.text();

  // Bing HTML-encodes quotes: murl&quot;:&quot;URL&quot;
  const murls = [...html.matchAll(/murl&quot;:&quot;(https?:[^&]+)&quot;/g)].map(m => m[1]);
  const turls = [...html.matchAll(/turl&quot;:&quot;(https?:[^&]+)&quot;/g)].map(m => m[1]);

  const results = [];
  for (let i = 0; i < Math.max(murls.length, turls.length); i++) {
    results.push({ murl: murls[i] || null, turl: turls[i] || null });
  }

  console.log(`[search] Bing found ${results.length} results for "${query}"`);
  return results;
}

/* Download image to a temp file, return { localUrl, filePath } */
async function cacheImageStrict(url) {
  if (!url) return null;
  if (/\.(svg|gif|ico)/i.test(url.split("?")[0])) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 5000) return null;
    const ext      = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
    const fname    = `search-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = path.join(TEMP_DIR, fname);
    fs.writeFileSync(filePath, buffer);
    return { localUrl: `http://localhost:5000/renders/${fname}`, filePath };
  } catch {
    return null;
  }
}

app.post("/api/search-image", requireAuth, async (req, res) => {
  const { query } = req.body;
  if (!query?.trim()) return res.status(400).json({ error: "No query" });

  try {
    const results = await bingScrapeImages(query);
    if (!results.length) return res.status(404).json({ error: "No results", query });

    const isLogoQuery = /logo|poster|icon/i.test(query);
    const urls = results.map(r => r.murl).filter(Boolean);
    const sorted = isLogoQuery
      ? [...urls.filter(u => /\.png(\?|$)/i.test(u)), ...urls.filter(u => !/\.png(\?|$)/i.test(u))]
      : urls;

    for (const imgUrl of sorted) {
      const cached = await cacheImageStrict(imgUrl);
      if (cached) {
        console.log(`[search] Cached for "${query}": ${imgUrl}`);
        // Send response first, then schedule temp file deletion after client has time to fetch it
        res.json({ url: cached.localUrl, source: "bing_scrape", query });
        setTimeout(() => {
          try { fs.unlinkSync(cached.filePath); } catch {}
          console.log(`[search] Cleaned temp: ${path.basename(cached.filePath)}`);
        }, 30_000); // 30s — plenty of time for client to download + upload to Supabase
        return;
      }
    }

    res.status(404).json({ error: "No usable image found", query });
  } catch (e) {
    console.error("[search] Bing scrape failed:", e.message);
    res.status(500).json({ error: e.message });
  }
});

/* Quick test endpoint — GET /api/test-search?q=ChatGPT+logo */
app.get("/api/test-search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Pass ?q=query" });
  try {
    const results = await bingScrapeImages(query);
    res.json({ query, count: results.length, results: results.slice(0, 5) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ---------------- FAL.AI IMAGE GENERATION ---------------- */
app.post("/api/generate-image", requireAuth, async (req, res) => {
  try {
    const { prompt, orientation, projectId } = req.body;
    const deduction = await deductCredits(req.user.id, 2, "ai_image", "AI image generation", projectId);
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    if (!process.env.FAL_API_KEY) return res.status(500).json({ error: "FAL_API_KEY not set" });

    const imageSize = orientation === "9:16" ? "portrait_16_9" : "landscape_16_9";

    // Retry up to 2 times for 500 errors only.
    // 502/503/429 = fal.ai is overloaded — fail immediately so caller falls back to Bing.
    const NO_RETRY_CODES = new Set([429, 502, 503]);
    let url = null;
    let lastErr = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 1000));
      try {
        const falRes = await fetch("https://fal.run/fal-ai/flux/schnell", {
          method:  "POST",
          headers: { "Authorization": `Key ${process.env.FAL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, image_size: imageSize, num_images: 1, num_inference_steps: 4, enable_safety_checker: false }),
        });

        if (!falRes.ok) {
          lastErr = await falRes.text();
          console.warn(`[fal.ai] Attempt ${attempt + 1} failed (${falRes.status}):`, lastErr.slice(0, 80));
          if (NO_RETRY_CODES.has(falRes.status)) break; // no point retrying
          continue;
        }

        const data = await falRes.json();
        url = data?.images?.[0]?.url || null;
        if (url) break;
        lastErr = "No image URL in response";
      } catch (e) {
        lastErr = e.message;
        console.warn(`[fal.ai] Attempt ${attempt + 1} threw:`, lastErr);
      }
    }

    if (!url) {
      console.error("[fal.ai] Failed:", lastErr);
      return res.status(500).json({ error: "Fal.ai request failed" });
    }

    res.json({ url });
  } catch (err) {
    console.error("[fal.ai]", err);
    res.status(500).json({ error: "Image generation failed" });
  }
});

/* Proxy-download a fal.media URL server-side (avoids browser QUIC/HTTP3 issues) */
app.post("/api/proxy-image", requireAuth, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "url required" });

    const imgRes = await fetch(url);
    if (!imgRes.ok) return res.status(502).json({ error: "Failed to fetch image" });

    const buffer      = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", buffer.byteLength);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("[proxy-image]", err);
    res.status(500).json({ error: "Proxy failed" });
  }
});

/* ---------------- COMPRESSION VIDEO ---------------- */
const upload = multer({ dest: TEMP_DIR });

/* ── Upload + compress avatar video → Supabase (bypasses client bucket size limit) ── */
app.post("/api/upload-avatar", requireAuth, upload.single("video"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const inputPath  = req.file.path;
    const outputPath = path.join(TEMP_DIR, `avatar-${Date.now()}.mp4`);

    await compressVideo(inputPath, outputPath);
    fs.unlinkSync(inputPath);

    const buffer      = fs.readFileSync(outputPath);
    fs.unlinkSync(outputPath);

    const filePath = `${req.user.id}/avatar-${Date.now()}.mp4`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("user-assets")
      .upload(filePath, buffer, { contentType: "video/mp4", upsert: true });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("user-assets")
      .getPublicUrl(filePath);

    res.json({ url: publicUrl, filePath });
  } catch (err) {
    console.error("[upload-avatar]", err.message);
    res.status(500).json({ error: err.message || "Avatar upload failed" });
  }
});

app.post("/api/compress", requireAuth, upload.single("video"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const inputPath  = req.file.path;
    const outputPath = path.join(TEMP_DIR, `compressed-${Date.now()}.mp4`);
    await compressVideo(inputPath, outputPath);
    const buffer = fs.readFileSync(outputPath);
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
    res.setHeader("Content-Type", "video/mp4");
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Compression failed" });
  }
});

/* ---------------- COMPRESSION AUDIO ---------------- */
app.post("/api/compress-audio", requireAuth, upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const inputPath  = req.file.path;
    const outputPath = path.join(TEMP_DIR, `compressed-audio-${Date.now()}.m4a`);
    await compressAudio(inputPath, outputPath);
    const buffer = fs.readFileSync(outputPath);
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
    res.setHeader("Content-Type", "audio/mp4");
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Audio compression failed" });
  }
});

/* ---------------- RENDER ---------------- */
const renderJobs = {};

app.post("/api/render", requireAuth, async (req, res) => {
  const deduction = await deductCredits(req.user.id, 2, "export_local", "Local render export", req.body.project?.id);
  if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });

  const jobId = uuidv4();
  renderJobs[jobId] = { progress: 0, done: false, url: null, error: null };
  res.json({ success: true, jobId });

  try {
    let { project } = req.body;

    console.log("[render] Job", jobId, "— caching external assets...");
    const tempFiles = []; // track all temp files to clean up after render

    /* ── 1. Cache all external images locally ── */
    if (project?.beats) {
      project.beats = await Promise.all(project.beats.map(async (beat) => {
        const zones = { ...beat.zones };
        await Promise.all(Object.keys(zones).map(async (key) => {
          const zone = zones[key];
          const src  = zone?.content?.asset?.src;
          if (src && src.startsWith("http") && !src.startsWith("http://localhost")) {
            const cached = await cacheExternalImage(src);
            if (cached !== src) {
              const fname = cached.split("/renders/")[1];
              if (fname) tempFiles.push(path.join(TEMP_DIR, fname));
            }
            zones[key] = {
              ...zone,
              content: { ...zone.content, asset: { ...zone.content.asset, src: cached } }
            };
          }
        }));
        return { ...beat, zones };
      }));
    }

    console.log("[render] audio.music:", JSON.stringify(project?.audio?.music));

    /* ── 2. Cache local music/sfx files to temp so Remotion can serve them ── */
    if (project?.audio?.music) {
      const musicKey = project.audio.music.musicKey;
      if (musicKey) {
        // Library music — copy from public/music/ to temp and use localhost URL
        const musicFilename = getMusicFilename(musicKey);
        const musicFile = path.join(PUBLIC_DIR, "music", musicFilename);
        console.log("[render] Copying music:", musicFile, "exists:", fs.existsSync(musicFile));
        if (fs.existsSync(musicFile)) {
          const fname = `music-${Date.now()}.mp3`;
          const destPath = path.join(TEMP_DIR, fname);
          fs.copyFileSync(musicFile, destPath);
          project.audio.music = {
            ...project.audio.music,
            src:      `http://localhost:5000/renders/${fname}`,
            musicKey: null,
          };
          tempFiles.push(path.join(TEMP_DIR, fname));
          console.log("[render] Music copied to:", project.audio.music.src);
        } else {
          console.warn("[render] Music file not found:", musicFile);
          project.audio.music = null; // remove broken music
        }
      } else if (project.audio.music.src?.includes("/music/")) {
        // src still points to /music/ path — also copy
        const musicFilename = path.basename(project.audio.music.src);
        const musicFile = path.join(PUBLIC_DIR, "music", musicFilename);
        if (fs.existsSync(musicFile)) {
          const fname = `music-${Date.now()}.mp3`;
          fs.copyFileSync(musicFile, path.join(TEMP_DIR, fname));
          project.audio.music.src = `http://localhost:5000/renders/${fname}`;
          tempFiles.push(path.join(TEMP_DIR, fname));
          console.log("[render] Music (by src) copied to:", project.audio.music.src);
        }
      }
    }

    /* ── 3. Clean blob URLs ── */
    const clean = (url) => (typeof url === "string" && url.startsWith("blob:") ? null : url);
    if (project?.audio?.music?.src && !project.audio.music.musicKey) {
      project.audio.music.src = clean(project.audio.music.src);
    }
    if (project?.avatar?.src) project.avatar.src = clean(project.avatar.src);

    /* ── 4. Get cached bundle ── */
    const serveUrl = await getBundle();

    /* ── 5. Get composition ── */
    const comps = await getCompositions(serveUrl, { inputProps: { project } });
    const comp  = comps.find((c) => c.id === "VideoComposition");
    if (!comp) throw new Error("VideoComposition not found");

    const outputPath = path.join(TEMP_DIR, `render-${jobId}.mp4`);
    const framesDir  = path.join(TEMP_DIR, `frames-${jobId}`);
    if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir, { recursive: true });

    console.log("[render] Rendering frames...");

    let rendered = 0;
    const { assetsInfo } = await renderFrames({
      composition:  comp,
      serveUrl,
      inputProps:   { project },
      outputDir:    framesDir,
      imageFormat:  "jpeg",
      concurrency:  2,
      chromiumOptions: {
        gl: "angle",          // enables GPU compositing — required for mix-blend-mode, CSS masks, filters
      },
      onFrameUpdate: () => {
        rendered++;
        renderJobs[jobId].progress = Math.round((rendered / comp.durationInFrames) * 90);
      },
    });

    console.log("[render] Stitching video...");

    await stitchFramesToVideo({
      composition:    comp,
      serveUrl,
      inputProps:     { project },
      codec:          "h264",
      assetsInfo,
      outputLocation: outputPath,
      fps:            comp.fps,
      width:          comp.width,
      height:         comp.height,
    });

    /* ── 6. Cleanup frames + cached assets ── */
    fs.rmSync(framesDir, { recursive: true, force: true });
    tempFiles.forEach(f => { try { fs.unlinkSync(f); } catch {} });
    console.log("[render] Cleaned", tempFiles.length, "temp files");

    renderJobs[jobId] = {
      progress: 100,
      done:     true,
      url:      `http://localhost:5000/api/render-download/${jobId}`,
      error:    null,
    };
    console.log("[render] Done:", jobId);

  } catch (err) {
    console.error("[render] Failed:", err.message);
    renderJobs[jobId] = { progress: 0, done: true, url: null, error: err.message };
  }
});

app.get("/api/render-status/:jobId", requireAuth, (req, res) => {
  const job = renderJobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

/* Stream render output to client and delete immediately after download */
app.get("/api/render-download/:jobId", requireAuth, (req, res) => {
  const { jobId } = req.params;
  const filePath = path.join(TEMP_DIR, `render-${jobId}.mp4`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Content-Disposition", `attachment; filename="video-${jobId}.mp4"`);
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
  res.on("finish", () => {
    try { fs.unlinkSync(filePath); } catch {}
    console.log("[render] Deleted output after download:", `render-${jobId}.mp4`);
  });
});

/* ── Admin: list all users with credit balances ── */
app.get("/api/admin/users", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw error;

    const ids = users.map(u => u.id);
    const { data: creditRows } = await supabaseAdmin
      .from("user_credits")
      .select("user_id, balance, lifetime_credits")
      .in("user_id", ids);

    const creditsMap = {};
    for (const r of creditRows || []) creditsMap[r.user_id] = r;

    const result = users.map(u => ({
      id:               u.id,
      email:            u.email,
      created_at:       u.created_at,
      last_sign_in_at:  u.last_sign_in_at,
      role:             u.app_metadata?.role ?? null,
      balance:          creditsMap[u.id]?.balance          ?? null,
      lifetime_credits: creditsMap[u.id]?.lifetime_credits ?? null,
    }));

    res.json(result);
  } catch (err) {
    console.error("[admin/users]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: add credits to any user ── */
app.post("/api/admin/add-credits", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ error: "userId and positive amount required" });
    }
    const result = await addCredits(userId, amount, "bonus", "admin_grant", reason || "Admin grant");
    res.json(result);
  } catch (err) {
    console.error("[admin/add-credits]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: update user role / email ── */
app.post("/api/admin/update-user", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, role, email } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const updates = {};
    if (email) updates.email = email;
    if (role !== undefined) updates.app_metadata = { role };

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updates);
    if (error) throw error;
    res.json({ success: true, user: data.user });
  } catch (err) {
    console.error("[admin/update-user]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: set a user's credit balance directly ── */
app.post("/api/admin/set-balance", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, balance, reason } = req.body;
    if (!userId || balance === undefined || balance < 0) {
      return res.status(400).json({ error: "userId and non-negative balance required" });
    }

    const { data: current } = await supabaseAdmin
      .from("user_credits")
      .select("balance, lifetime_credits")
      .eq("user_id", userId)
      .single();

    const oldBalance  = current?.balance          ?? 0;
    const lifetime    = current?.lifetime_credits ?? 0;
    const diff        = balance - oldBalance;
    const newLifetime = diff > 0 ? lifetime + diff : lifetime;

    await supabaseAdmin
      .from("user_credits")
      .upsert({ user_id: userId, balance, lifetime_credits: newLifetime, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

    await supabaseAdmin.from("credit_transactions").insert({
      user_id:       userId,
      amount:        diff,
      type:          diff >= 0 ? "admin_set" : "admin_set",
      action:        "admin_set_balance",
      description:   reason || `Admin set balance to ${balance}`,
      balance_after: balance,
    });

    res.json({ success: true, balance, lifetime_credits: newLifetime });
  } catch (err) {
    console.error("[admin/set-balance]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: get transaction history for a user ── */
app.get("/api/admin/user-transactions/:userId", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabaseAdmin
      .from("credit_transactions")
      .select("id, amount, type, action, description, balance_after, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("[admin/user-transactions]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: credits overview (global stats + top consumers + recent txns) ── */
app.get("/api/admin/credits-overview", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [
      { data: allCredits },
      { data: recentTxns },
      { data: typeCounts },
    ] = await Promise.all([
      supabaseAdmin.from("user_credits").select("user_id, balance, lifetime_credits"),
      supabaseAdmin.from("credit_transactions")
        .select("user_id, amount, type, action, description, balance_after, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin.from("credit_transactions").select("type"),
    ]);

    const totalBalance  = (allCredits || []).reduce((s, r) => s + (r.balance || 0), 0);
    const totalLifetime = (allCredits || []).reduce((s, r) => s + (r.lifetime_credits || 0), 0);
    const totalUsers    = (allCredits || []).length;
    const lowBalance    = (allCredits || []).filter(r => r.balance < 10).length;

    // Top 10 by lifetime_credits
    const topConsumers = [...(allCredits || [])]
      .sort((a, b) => (b.lifetime_credits || 0) - (a.lifetime_credits || 0))
      .slice(0, 10);

    // Transaction type breakdown
    const typeBreakdown = {};
    (typeCounts || []).forEach(r => {
      typeBreakdown[r.type] = (typeBreakdown[r.type] || 0) + 1;
    });

    res.json({
      stats: { totalBalance, totalLifetime, totalUsers, lowBalance },
      topConsumers,
      recentTransactions: recentTxns || [],
      typeBreakdown,
    });
  } catch (err) {
    console.error("[admin/credits-overview]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: assign a plan to a user (adds plan credits, logs plan_assign) ── */
app.post("/api/admin/assign-plan", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, planId, planLabel, credits, price } = req.body;
    if (!userId || !planId || !credits || credits <= 0) {
      return res.status(400).json({ error: "userId, planId, and credits required" });
    }
    const result = await addCredits(
      userId,
      credits,
      "plan_assign",
      "plan_assign",
      `Plan assigned: ${planLabel || planId} (${credits} credits, $${price ?? "?"})`
    );
    res.json({ success: true, planId, credits, balance: result.balance });
  } catch (err) {
    console.error("[admin/assign-plan]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: get plan assignment history ── */
app.get("/api/admin/plan-assignments", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("credit_transactions")
      .select("user_id, amount, description, created_at")
      .eq("action", "plan_assign")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("[admin/plan-assignments]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: deduct credits from a user (admin action) ── */
app.post("/api/admin/deduct-credits", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ error: "userId and positive amount required" });
    }
    const result = await deductCredits(userId, amount, "admin_deduct", reason || "Admin deduction");
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (err) {
    console.error("[admin/deduct-credits]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: Layout CRUD (Supabase-backed) ───────────────────── */

// GET all layouts
app.get("/api/admin/layouts", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("layouts").select("*").eq("is_active", true).order("created_at", { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("[admin/layouts GET]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST create new layout
app.post("/api/admin/layouts", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, label, intent, energy, niche, orientation, visibility,
            show_caption, default_transition, zones, tags, asset_count, text_count } = req.body;
    if (!name || !label || !intent || !Array.isArray(zones)) {
      return res.status(400).json({ error: "name, label, intent, zones[] required" });
    }
    const { data, error } = await supabaseAdmin
      .from("layouts")
      .insert({
        name, label, intent,
        energy:       energy       ?? ["high", "medium", "low"],
        niche:        niche        ?? [],
        orientation:  orientation  ?? "9:16",
        visibility:   visibility   ?? "internal",
        show_caption:        show_caption ?? true,
        default_transition:  default_transition ?? null,
        zones:               zones,
        tags:             tags             ?? [],
        asset_count:      asset_count      ?? zones.filter(z => z.type === "asset").length,
        text_count:       text_count       ?? zones.filter(z => z.type === "text").length,
        is_active:        true,
      })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("[admin/layouts POST]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT update existing layout
app.put("/api/admin/layouts/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    // Auto-compute counts if zones were provided
    if (Array.isArray(updates.zones)) {
      updates.asset_count = updates.asset_count ?? updates.zones.filter(z => z.type === "asset").length;
      updates.text_count  = updates.text_count  ?? updates.zones.filter(z => z.type === "text").length;
    }
    const { data, error } = await supabaseAdmin
      .from("layouts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("[admin/layouts PUT]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE a layout (soft-delete via is_active=false)
app.delete("/api/admin/layouts/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from("layouts")
      .delete()
      .eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("[admin/layouts DELETE]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST duplicate a layout
app.post("/api/admin/layouts/:id/duplicate", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: src, error: fetchErr } = await supabaseAdmin
      .from("layouts").select("*").eq("id", id).single();
    if (fetchErr) throw fetchErr;
    const { id: _id, created_at, updated_at, ...rest } = src;
    const { data, error } = await supabaseAdmin
      .from("layouts")
      .insert({ ...rest, name: `${rest.name}_copy`, label: `${rest.label} (copy)`, is_active: true })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("[admin/layouts duplicate]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── AI Image Library: save a generated image (service role bypasses RLS) ── */
app.post("/api/ai-image-library/save", requireAuth, async (req, res) => {
  try {
    const record = req.body;
    if (!record?.src) return res.status(400).json({ error: "src required" });
    const { error } = await supabaseAdmin.from("ai_image_library").insert(record);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("[ai_image_library/save]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── AI Image Library: increment reuse count ── */
app.post("/api/ai-image-library/increment-reuse", requireAuth, async (req, res) => {
  try {
    const { id, reuse_count } = req.body;
    if (!id) return res.status(400).json({ error: "id required" });
    await supabaseAdmin.from("ai_image_library").update({ reuse_count: (reuse_count || 0) + 1 }).eq("id", id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: user_assets (bypasses RLS) ── */
app.get("/api/admin/user-assets", requireAuth, requireAdmin, async (req, res) => {
  try {
    const page     = parseInt(req.query.page || "0", 10);
    const type     = req.query.type || "all";
    const pageSize = 48;

    let query = supabaseAdmin
      .from("user_assets")
      .select("id, url, type, name, size, created_at, user_id", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (type !== "all") query = query.eq("type", type);

    const { data, count, error } = await query;
    if (error) throw error;
    res.json({ assets: data || [], total: count ?? 0, page, pageSize });
  } catch (err) {
    console.error("[admin/user-assets]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: delete a user asset ── */
app.delete("/api/admin/user-assets/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from("user_assets").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: AI image library (bypasses RLS) ── */
app.get("/api/admin/ai-images", requireAuth, requireAdmin, async (req, res) => {
  try {
    const page        = parseInt(req.query.page || "0", 10);
    const niche       = req.query.niche       || "all";
    const visualType  = req.query.visual_type || "all";
    const orientation = req.query.orientation || "all";
    const pageSize    = 48;

    let query = supabaseAdmin
      .from("ai_image_library")
      .select("id, src, prompt, subject, niche, visual_type, mood, energy, orientation, reuse_count, tags, width, height, generator, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (niche       !== "all") query = query.eq("niche", niche);
    if (visualType  !== "all") query = query.eq("visual_type", visualType);
    if (orientation !== "all") query = query.eq("orientation", orientation);

    const { data, count, error } = await query;
    if (error) throw error;
    res.json({ images: data || [], total: count ?? 0, page, pageSize });
  } catch (err) {
    console.error("[admin/ai-images]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: AI image library filter options ── */
app.get("/api/admin/ai-images/filters", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("ai_image_library")
      .select("niche, visual_type, orientation");
    if (error) throw error;

    const niches       = [...new Set((data || []).map(r => r.niche).filter(Boolean))].sort();
    const visualTypes  = [...new Set((data || []).map(r => r.visual_type).filter(Boolean))].sort();
    const orientations = [...new Set((data || []).map(r => r.orientation).filter(Boolean))].sort();
    res.json({ niches, visualTypes, orientations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: delete an AI image ── */
app.delete("/api/admin/ai-images/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from("ai_image_library").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("[admin/ai-images/delete]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: system health ── */
app.get("/api/admin/system-health", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const startTime = process.hrtime.bigint();

    // Temp dir stats
    let tempFiles = 0, tempBytes = 0;
    if (fs.existsSync(TEMP_DIR)) {
      const entries = fs.readdirSync(TEMP_DIR);
      tempFiles = entries.length;
      for (const f of entries) {
        try {
          const stat = fs.statSync(path.join(TEMP_DIR, f));
          if (stat.isFile()) tempBytes += stat.size;
        } catch {}
      }
    }

    // Supabase ping
    const dbStart = Date.now();
    let dbOk = false, dbMs = null;
    try {
      const { error } = await supabaseAdmin.from("projects").select("id").limit(1);
      dbOk = !error;
      dbMs = Date.now() - dbStart;
    } catch {}

    // API key presence checks (never expose actual keys)
    const apiKeys = {
      openai:   !!process.env.OPENAI_API_KEY,
      supabase: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      fal:      !!process.env.FAL_KEY || !!process.env.FAL_API_KEY,
    };

    // Memory
    const mem = process.memoryUsage();

    const pingNs = process.hrtime.bigint() - startTime;

    res.json({
      uptime:    Math.floor(process.uptime()),
      node:      process.version,
      platform:  process.platform,
      memMb: {
        rss:      (mem.rss / 1024 / 1024).toFixed(1),
        heap:     (mem.heapUsed / 1024 / 1024).toFixed(1),
        heapTotal:(mem.heapTotal / 1024 / 1024).toFixed(1),
      },
      temp: { files: tempFiles, sizeMb: (tempBytes / 1024 / 1024).toFixed(2) },
      db:  { ok: dbOk, latencyMs: dbMs },
      apiKeys,
      serverPingMs: Number(pingNs / 1_000_000n),
    });
  } catch (err) {
    console.error("[admin/system-health]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Talking Head: Transcription via Fal.ai Whisper ── */
app.post("/api/transcribe", requireAuth, upload.single("video"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No video file uploaded" });

    const deduction = await deductCredits(req.user.id, 3, "transcription", "Video transcription (Whisper)", null);
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });

    // Extract audio only — Whisper only needs audio, not the full video.
    // A 65 MB video becomes ~3–5 MB mp3, well within OpenAI Whisper's 25 MB limit.
    const audioPath = req.file.path + ".mp3";
    await new Promise((resolve, reject) => {
      ffmpeg(req.file.path)
        .noVideo()
        .audioCodec("libmp3lame")
        .audioBitrate("64k")
        .audioChannels(1)
        .on("end", resolve)
        .on("error", reject)
        .save(audioPath);
    });
    fs.unlinkSync(req.file.path); // original video no longer needed

    // Transcribe via OpenAI Whisper — reads directly from disk, no external storage needed
    let transcription;
    try {
      transcription = await openai.audio.transcriptions.create({
        file:             fs.createReadStream(audioPath),
        model:            "whisper-1",
        response_format:  "verbose_json",
        timestamp_granularities: ["segment"],
      });
    } finally {
      fs.unlink(audioPath, () => {}); // clean up regardless of success/failure
    }

    const transcript = transcription.text || "";
    const segments   = (transcription.segments || []).map(s => ({
      text:  s.text?.trim() || "",
      start: s.start ?? 0,
      end:   s.end   ?? 0,
    })).filter(s => s.text);

    res.json({ transcript, segments });
  } catch (err) {
    console.error("[transcribe]", err.message);
    res.status(500).json({ error: err.message || "Transcription failed" });
  }
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));