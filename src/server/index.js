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
import axios from "axios";
import https from "node:https";
import http  from "node:http";

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
    const { prompt, projectId, model: reqModel } = req.body;
    const deduction = await deductCredits(req.user.id, 8, "base_generation", "Video generation", projectId);
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    const completion = await openai.chat.completions.create({
      model: reqModel || "gpt-4o",
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
      model: "gpt-4o",
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

/* Proxy-stream a remote video URL server-side (avoids CORS/referrer restrictions on CDNs like Pixabay).
   No auth required — this only proxies publicly accessible CDN URLs. */
app.get("/api/proxy-video", (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url required" });

  let parsedUrl;
  try { parsedUrl = new URL(url); } catch {
    return res.status(400).json({ error: "invalid url" });
  }

  const lib     = parsedUrl.protocol === "https:" ? https : http;
  const options = {
    hostname: parsedUrl.hostname,
    port:     parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
    path:     parsedUrl.pathname + parsedUrl.search,
    method:   "GET",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Referer":    "https://pixabay.com/",
      ...(req.headers.range ? { "Range": req.headers.range } : {}),
    },
  };

  const upstream = lib.request(options, (upRes) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", upRes.headers["content-type"] || "video/mp4");
    if (upRes.headers["content-length"]) res.setHeader("Content-Length",  upRes.headers["content-length"]);
    if (upRes.headers["content-range"])  res.setHeader("Content-Range",   upRes.headers["content-range"]);
    if (upRes.headers["accept-ranges"])  res.setHeader("Accept-Ranges",   upRes.headers["accept-ranges"]);
    res.writeHead(upRes.statusCode || 200);
    upRes.pipe(res);
  });

  upstream.on("error", (err) => {
    console.error("[proxy-video]", err.message);
    if (!res.headersSent) res.status(500).json({ error: "Proxy failed" });
  });

  req.on("close", () => upstream.destroy());
  upstream.end();
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
            show_caption, default_transition, zones, tags, asset_count, text_count,
            thumbnail_url, generation_meta } = req.body;
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
        thumbnail_url:    thumbnail_url    ?? null,
        generation_meta:  generation_meta  ?? null,
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

/* ── Admin: AI Layout Generation ─────────────────────────────────── */

// POST /api/admin/generate-concepts — GPT-4o generates layout concept sketches
app.post("/api/admin/generate-concepts", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { niche = "entertainment", intent = "hook", energy = "high", count = 4, description = "" } = req.body;

    const systemPrompt = `You are an expert short-form vertical video layout designer. Generate creative layout concepts for a 9:16 mobile video canvas (1080x1920 pixels). Zones are positioned with percentage-based coordinates (x, y, width, height each 0–100). Return only valid JSON.`;

    const userPrompt = `Generate ${count} distinct layout concepts for short-form video.
Niche: ${niche}
Intent: ${intent}
Energy: ${energy}
${description ? `Extra requirements: ${description}` : ""}

Return a JSON object: { "concepts": [ ...array of ${count} objects... ] }

Each concept object must have exactly these fields:
{
  "id": "c1",
  "title": "Bold Stat Hero",
  "description": "Short 1-2 sentence description of the layout design.",
  "pattern": "stat-hero | text-heavy | split-screen | full-bleed | overlay-minimal | caption-focused | icon-stat",
  "zones_sketch": [
    { "type": "text|asset|decorative", "role": "headline|subtext|label|stat|metric|cta|background|accent", "x": 0, "y": 0, "w": 100, "h": 100, "zIndex": 1, "notes": "brief note" }
  ],
  "visual_style": "short description of look and feel"
}

Critical rules:
- Make ALL ${count} concepts distinctly different from each other
- At least 1 text zone per layout
- Asset or decorative zone for visual interest
- x + w ≤ 100, y + h ≤ 100 for every zone
- Background asset zIndex=1, overlaid text zIndex=2-4
- Vary structure, zone count, and composition significantly
- Return ONLY the JSON object, no markdown fences`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      temperature: 0.95,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0].message.content;
    const parsed = JSON.parse(raw);
    const concepts = Array.isArray(parsed)
      ? parsed
      : parsed.concepts || parsed.layouts || Object.values(parsed)[0] || [];

    // Ensure IDs
    const withIds = concepts.map((c, i) => ({ ...c, id: c.id || `c${i + 1}` }));
    res.json({ concepts: withIds });
  } catch (err) {
    console.error("[admin/generate-concepts]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/generate-layout-preview — Generate a full composite layout mockup image
// Body: { prompt, niche, intent }
app.post("/api/admin/generate-layout-preview", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { prompt, niche = "entertainment", intent = "hook" } = req.body;
    if (!prompt) return res.status(400).json({ error: "prompt required" });
    if (!process.env.FAL_API_KEY) return res.status(500).json({ error: "FAL_API_KEY not set" });

    console.log(`[layout-preview] Generating mockup for: ${prompt.substring(0, 80)}`);

    // ── Generate via Fal.ai flux/dev ──
    let falUrl = null;
    let lastErr = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 3000));
      try {
        const falRes = await fetch("https://fal.run/fal-ai/flux/dev", {
          method: "POST",
          headers: { "Authorization": `Key ${process.env.FAL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            image_size: { width: 608, height: 1080 },
            num_inference_steps: 28,
            guidance_scale: 3.5,
            num_images: 1,
            enable_safety_checker: true,
          }),
        });
        if (!falRes.ok) { lastErr = await falRes.text(); continue; }
        const data = await falRes.json();
        falUrl = data?.images?.[0]?.url || null;
        if (falUrl) break;
        lastErr = "No image URL in response";
      } catch (e) { lastErr = e.message; }
    }

    if (!falUrl) return res.status(500).json({ error: `Image generation failed: ${lastErr.slice(0, 120)}` });

    // ── Upload to Supabase storage ──
    let imageUrl = falUrl;
    try {
      const imgRes = await fetch(falUrl);
      if (imgRes.ok) {
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        const safeNiche = (niche || "general").replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
        const fname = `previews/${safeNiche}/${uuidv4()}.jpg`;
        const { error: uploadErr } = await supabaseAdmin.storage
          .from("layout-previews")
          .upload(fname, buffer, { contentType: "image/jpeg", upsert: false });
        if (!uploadErr) {
          const { data: { publicUrl } } = supabaseAdmin.storage.from("layout-previews").getPublicUrl(fname);
          imageUrl = publicUrl;
          console.log("[layout-preview] Mockup saved:", imageUrl);
        } else {
          console.warn("[layout-preview] Upload error:", uploadErr.message);
        }
      }
    } catch (uploadEx) {
      console.warn("[layout-preview] Upload failed:", uploadEx.message);
    }

    res.json({ imageUrl, falUrl });
  } catch (err) {
    console.error("[admin/generate-layout-preview]", err.message);
    res.status(500).json({ error: err.message });
  }
});


// POST /api/admin/remove-background — On-demand background removal via Fal.ai birefnet
// Body: { imageUrl }
app.post("/api/admin/remove-background", requireAuth, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: "imageUrl required" });
    if (!process.env.FAL_API_KEY) return res.status(500).json({ error: "FAL_API_KEY not set" });

    console.log("[rembg] Removing background from:", imageUrl.substring(0, 80));

    const falRes = await fetch("https://fal.run/fal-ai/birefnet", {
      method: "POST",
      headers: { "Authorization": `Key ${process.env.FAL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        model: "General Use (Light)",
        operating_resolution: "1024x1024",
        output_format: "png",
      }),
    });

    if (!falRes.ok) {
      const errText = await falRes.text();
      throw new Error(`Fal.ai birefnet HTTP ${falRes.status}: ${errText.slice(0, 120)}`);
    }
    const falData = await falRes.json();
    const transparentFalUrl = falData?.image?.url;
    if (!transparentFalUrl) throw new Error("No result URL from birefnet");

    // Download and upload transparent PNG to Supabase
    let transparentUrl = transparentFalUrl;
    try {
      const pngRes = await fetch(transparentFalUrl);
      if (pngRes.ok) {
        const buffer = Buffer.from(await pngRes.arrayBuffer());
        const fileName = `layouts/transparent/${Date.now()}_${uuidv4().slice(0, 8)}.png`;
        const { error: upErr } = await supabaseAdmin.storage
          .from("user-assets")
          .upload(fileName, buffer, { contentType: "image/png", upsert: true });
        if (!upErr) {
          const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(fileName);
          transparentUrl = publicUrl;
          console.log("[rembg] Transparent PNG saved:", transparentUrl);
        } else {
          console.warn("[rembg] Upload failed:", upErr.message);
        }
      }
    } catch (upEx) {
      console.warn("[rembg] Upload exception:", upEx.message);
    }

    res.json({ transparentUrl });
  } catch (err) {
    console.error("[rembg]", err.message);
    res.status(500).json({ error: "Background removal failed", details: err.message });
  }
});

// POST /api/admin/generate-zone-assets — Generate images for asset zones (no DB write)
// Body: { zones, visual_direction, prompt, niche, intent, energy, background_type, background_colors }
// Returns: { results: [{ zoneId, role, imageUrl }] }
app.post("/api/admin/generate-zone-assets", requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      zones = [], visual_direction = "", prompt: originalPrompt = "",
      niche = "entertainment", intent = "hook", energy = "high",
      background_type = "solid_gradient", background_colors = [],
    } = req.body;
    if (!process.env.FAL_API_KEY) return res.status(500).json({ error: "FAL_API_KEY not set" });

    const assetZones = zones.filter(z => z.type === "asset");
    if (assetZones.length === 0) return res.json({ results: [] });

    // Context snippets
    const ctxShort  = (originalPrompt || visual_direction).slice(0, 150);
    const ctxMedium = (originalPrompt || visual_direction).slice(0, 300);

    const results = [];

    for (const zone of assetZones) {
      let falPrompt;

      if (zone.role === "background_asset" || background_type === "image_based") {
        // Atmospheric/environmental background — no people, no text
        const bgColorHint = background_colors.length ? `Dominant colors: ${background_colors.join(", ")}.` : "";
        const energyMood  = energy === "high" ? "dramatic, high contrast" : energy === "low" ? "calm, soft, minimal" : "balanced, professional";
        falPrompt = `${niche} atmospheric background scene. ${visual_direction}. ${bgColorHint} ${energyMood} mood. ${ctxShort}. No people. No text. No logos. No UI elements. Pure environment: lighting, atmosphere, textures, depth, color. Cinematic. Full bleed. Vertical 9:16 portrait.`;
      } else if (zone.role === "primary_asset") {
        // Isolated subject — product/person/object on clean background
        falPrompt = `${niche} ${intent} product or subject. ${ctxMedium}. Isolated subject on pure white or transparent background. Professional studio photography. Clean lighting. No background clutter. Subject fills 70% of frame. Sharp. High quality. Vertical 9:16.`;
      } else if (zone.role === "secondary_asset") {
        // Supporting image — different angle or supporting element
        falPrompt = `${niche} ${intent} supporting visual. Different angle or variation. ${ctxShort}. Professional quality. Clean background. No text. Vertical 9:16.`;
      } else {
        falPrompt = `${niche} ${intent} visual element. ${visual_direction}. Professional. No text. Vertical 9:16.`;
      }

      console.log(`[generate-zone-assets] Zone ${zone.id} (${zone.role}): ${falPrompt.slice(0, 80)}`);

      try {
        const falRes = await fetch("https://fal.run/fal-ai/flux/schnell", {
          method: "POST",
          headers: { "Authorization": `Key ${process.env.FAL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: falPrompt,
            image_size: { width: 608, height: 1080 },
            num_images: 1,
            num_inference_steps: 4,
            enable_safety_checker: false,
          }),
        });

        if (!falRes.ok) {
          results.push({ zoneId: zone.id, role: zone.role, imageUrl: null, error: `Fal HTTP ${falRes.status}` });
          continue;
        }
        const falData = await falRes.json();
        const falUrl = falData?.images?.[0]?.url;
        if (!falUrl) {
          results.push({ zoneId: zone.id, role: zone.role, imageUrl: null, error: "No image from Fal.ai" });
          continue;
        }

        // Upload to Supabase for a permanent URL
        let imageUrl = falUrl;
        try {
          const imgRes = await fetch(falUrl);
          if (imgRes.ok) {
            const buf = Buffer.from(await imgRes.arrayBuffer());
            const safeNiche = niche.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
            const path = `zone-assets/${safeNiche}/${uuidv4()}.jpg`;
            const { error: upErr } = await supabaseAdmin.storage
              .from("layout-previews")
              .upload(path, buf, { contentType: "image/jpeg", upsert: false });
            if (!upErr) {
              const { data: { publicUrl } } = supabaseAdmin.storage.from("layout-previews").getPublicUrl(path);
              imageUrl = publicUrl;
            }
          }
        } catch (_) { /* use falUrl as fallback */ }

        results.push({ zoneId: zone.id, role: zone.role, imageUrl });
      } catch (e) {
        results.push({ zoneId: zone.id, role: zone.role, imageUrl: null, error: e.message });
      }
    }

    res.json({ results });
  } catch (err) {
    console.error("[generate-zone-assets]", err.message);
    res.status(500).json({ error: "Zone asset generation failed", details: err.message });
  }
});

// POST /api/admin/convert-layout-image — GPT-4o Vision → zone JSON + background metadata
// Body: { imageUrl, niche, intent, energy }
app.post('/api/admin/convert-layout-image', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { imageUrl, niche, intent, energy } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'imageUrl required' });

    const decorativeShapeKeys = ['circle','square','triangle','hexagon','star','diamond','cross','pill','arc','ring','dot','line','chevron','arrow','wave','spiral','grid','mesh','bars','blob'];
    const iconKeys = ['arrow','arrowCircle','star','starOutline','check','checkCircle','close','heart','fire','lightning','crown','diamond','shield','trophy','rocket','flag','bell','eye','play','pause'];

    const visionPrompt = `You are a precision layout extraction engine. Analyze this marketing layout image and extract every visible element into structured zone JSON that maps to a design system.

CANVAS: 1080x1920px vertical (9:16). All coordinates as percentages (0-100).

───────────────────────────────────────
STEP 1 — BACKGROUND CLASSIFICATION
───────────────────────────────────────
Classify background as ONE of:
- "solid" — solid color or simple gradient (no texture, no shapes, no photo)
- "pattern" — repeating geometric texture, grid, dots, lines, noise, subtle pattern
- "abstract" — photographic scene, illustrated scene, complex graphic, gradient mesh with multiple color stops

Output:
{
  "background_category": "solid" | "pattern" | "abstract",
  "background_colors": ["#hex1", "#hex2"],
  "background_gradient_direction": "to bottom" | "to right" | "135deg" | null,
  "color_family": "blue"|"green"|"red"|"yellow"|"purple"|"orange"|"teal"|"pink"|"dark"|"light"|"neutral",
  "background_needs_image": true (only if abstract, else false),
  "background_image_prompt": "detailed Fal.ai generation prompt describing the background only, no text, no people" (only if abstract, else null)
}

───────────────────────────────────────
STEP 2 — ZONE EXTRACTION
───────────────────────────────────────
Extract EVERY visible element. Sequential IDs: z1, z2, z3...

ZONE SCHEMA:
{
  "id": "z1",
  "type": "text" | "asset" | "decorative" | "icon",
  "role": see roles below,
  "x": 0-100,
  "y": 0-100,
  "width": 0-100,
  "height": 0-100,
  "content": visible text string (text zones only) | null,
  "style": {
    "fontSize": pixel size on a 1920px tall canvas (headline: 80-160, subtext: 30-55, label: 22-32, cta: 28-44, stat: 60-110),
    "fontWeight": "400"|"600"|"700"|"800"|"900",
    "fontFamily": "Bebas Neue"|"Outfit"|"Barlow Condensed"|"Playfair Display"|"Dancing Script"|"JetBrains Mono"|"Unbounded"|"Anton"|"Oswald"|"Montserrat"|"Inter"|"Poppins"|"Raleway"|"Lato"|"Roboto"|"Nunito"|"Syne",
    "color": "#hex",
    "textAlign": "left"|"center"|"right",
    "backgroundColor": "#hex or null",
    "borderRadius": number or null,
    "padding": number or null,
    "rotation": degrees or 0,
    "opacity": 0.0-1.0,
    "shapeKey": one of [${decorativeShapeKeys.join(',')}] (decorative zones only),
    "iconKey": one of [${iconKeys.join(',')}] (icon zones only),
    "fillColor": "#hex" (decorative/icon zones — the shape fill color)
  },
  "animation": "fadeIn"|"slideUpIn"|"popIn"|"scaleIn"|"none",
  "animationDelay": 0.1-1.0
}

ROLES:
- text: headline | subtext | label | tagline | stat | metric | quote | cta
- asset: primary_asset | secondary_asset | background_asset
- decorative: decorative
- icon: icon

EXTRACTION RULES:
1. Category label pill (e.g. "EDUCATION", "BUSINESS") — type:text, role:label
2. Main headline — type:text, role:headline. IMPORTANT: if the headline is split into multiple visually distinct parts (different font size, different color, highlight, gradient, or outline vs filled), create a SEPARATE zone for EACH part. Example: "LAUNCH" (white, 120px) on one line and "YOUR LEGACY" (yellow, 160px, bold) on the next → two separate headline zones with their individual x/y/width/height/fontSize/color. Do NOT merge them into one zone.
3. Supporting body text — type:text, role:subtext
4. Bottom CTA text or button text — type:text, role:cta
5. Price, percentage, stat badge (e.g. "60% OFF", "100K+") — type:text, role:stat
6. Main product/person image area — type:asset, role:primary_asset, content:null, coordinates = bounding box of the image/subject area
7. Small overlapping image or secondary visual — type:asset, role:secondary_asset, content:null
8. Decorative shape (circle, hexagon, dot, ring, ribbon, diagonal band, sparkle, star shape) — type:decorative, role:decorative, pick closest shapeKey from the list
9. Small icon (arrow, check, play button) — type:icon, role:icon, pick closest iconKey from the list
10. Divider line — type:decorative, role:decorative, shapeKey:line
11. Text zones MUST have content. If the text is clearly readable use EXACT text. If the font is stylized/decorative and text is unclear, use a clean role-based placeholder: headline→"YOUR HEADLINE HERE", subtext→"Supporting detail goes here", label→"CATEGORY", stat→"30% OFF", cta→"GET STARTED"
12. Asset zones MUST have content:null — do NOT put text in asset zones
13. Do NOT create a zone for the background itself
14. COORDINATES: measure carefully. A centered element on a 1080px canvas has x = (1080 - width_px) / 1080 * 50. Verify x+width ≤ 100 and y+height ≤ 100
15. textAlign: if element appears horizontally centered on canvas → "center". Left-aligned → "left". Right-aligned → "right"

ANIMATION TIMING (top to bottom, by visual reading order):
- First element (label): 0.1
- Each subsequent zone: +0.1 to +0.15 from previous
- Split headline parts: stagger each part +0.08 apart (e.g. 0.2, 0.28, 0.36)
- CTA: always last, animationDelay 0.7-0.9

───────────────────────────────────────
OUTPUT — STRICT JSON ONLY, NO MARKDOWN
───────────────────────────────────────
{
  "background_category": "solid"|"pattern"|"abstract",
  "background_colors": ["#hex"],
  "background_gradient_direction": null,
  "color_family": "string",
  "background_needs_image": false,
  "background_image_prompt": null,
  "zones": []
}

Context: niche=${niche}, intent=${intent}, energy=${energy}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
          { type: 'text', text: visionPrompt }
        ]
      }]
    });

    let raw = response.choices[0].message.content.trim();
    raw = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(raw);

    const bgCategory  = parsed.background_category || 'solid';
    const bgColors    = parsed.background_colors || ['#1a1a2e'];
    const bgDirection = parsed.background_gradient_direction || null;
    const bgNeedsImg  = !!parsed.background_needs_image;
    const bgImgPrompt = parsed.background_image_prompt || null;
    const colorFamily = parsed.color_family || 'dark';

    // ── Transform GPT schema → LayoutRenderer internal schema ────
    function toInternalZone(z, i) {
      const type = z.type || 'text';
      const role = z.role || 'subtext';
      const raw  = z.style || {};

      // zIndex by layer
      let zIndex = 4;
      if (role === 'background_asset') zIndex = 1;
      else if (type === 'asset')       zIndex = 2;
      else if (type === 'decorative')  zIndex = 3;
      else if (type === 'icon')        zIndex = 5;

      // Build internal style
      const style = {};
      if (raw.color)       style.color       = raw.color;
      if (raw.fontSize)    style.fontSize    = Math.max(18, Number(raw.fontSize));
      if (raw.fontWeight)  style.fontWeight  = String(raw.fontWeight);
      if (raw.fontFamily)  style.fontFamily  = raw.fontFamily;
      if (raw.textAlign)   style.textAlign   = raw.textAlign;
      if (raw.borderRadius != null) style.borderRadius = raw.borderRadius;
      if (raw.opacity      != null) style.opacity      = raw.opacity;
      // rotation → CSS transform
      if (raw.rotation && raw.rotation !== 0) style.transform = `rotate(${raw.rotation}deg)`;
      // backgroundColor → background (pill bg for text, fill for decoratives)
      if (raw.backgroundColor) style.background = raw.backgroundColor;
      // decorative/icon: use fillColor or color as background fill
      if ((type === 'decorative' || type === 'icon') && !style.background) {
        style.background = raw.fillColor || raw.color || '#ffffff';
      }
      // shapeKey → borderRadius shorthand
      if (type === 'decorative' || type === 'icon') {
        const sk = raw.shapeKey;
        if (sk === 'circle' || sk === 'ring' || sk === 'dot') style.borderRadius = '50%';
        else if (sk === 'pill')                               style.borderRadius = 999;
      }
      // asset objectFit
      if (type === 'asset') style.objectFit = 'cover';
      // text padding
      if (raw.padding) {
        style.paddingTop    = raw.padding;
        style.paddingBottom = raw.padding;
        style.paddingLeft   = raw.padding * 2;
        style.paddingRight  = raw.padding * 2;
      }

      // Content object
      let content;
      if (type === 'text') {
        // Garble filter: reject content that looks like OCR noise
        // (too many consonant clusters, no vowels, or suspiciously short non-word)
        const rawText = (z.content || '').trim();
        const isGarbled = rawText.length > 0 && rawText.length < 20
          && !/[aeiouAEIOU]/.test(rawText.replace(/\s/g, ''))
          && /[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]{4,}/.test(rawText.replace(/\s/g, ''));
        const rolePlaceholders = {
          headline: 'YOUR HEADLINE HERE', subtext: 'Supporting detail goes here',
          label: 'CATEGORY', stat: '30% OFF', cta: 'GET STARTED',
          tagline: 'Your tagline', metric: '10K+', quote: '"Quote goes here"',
        };
        const cleanText = isGarbled
          ? (rolePlaceholders[role] || rawText)
          : (rawText || rolePlaceholders[role] || '');
        content = { kind: 'text', text: cleanText };
      } else if (type === 'asset') {
        content = { kind: 'asset', asset: { src: null, type: 'image', objectFit: 'cover', motion: 'none', enterTransition: 'none', exitTransition: 'none' } };
      }
      // decorative/icon: no content object needed

      const maxChars = type === 'text'
        ? Math.max(5, Math.round(((z.width || 80) / 100) * (1000 / Math.max(raw.fontSize || 60, 20))))
        : undefined;

      return {
        id:             z.id || `z${i + 1}`,
        type, role,
        x:              typeof z.x      === 'number' ? z.x      : 5,
        y:              typeof z.y      === 'number' ? z.y      : 5,
        width:          typeof z.width  === 'number' ? z.width  : 90,
        height:         typeof z.height === 'number' ? z.height : 10,
        zIndex,
        start:          z.animationDelay ?? (i * 0.1),
        end:            null,
        enterAnimation: z.animation || (type === 'asset' ? 'fadeIn' : type === 'icon' ? 'popIn' : 'fadeIn'),
        exitAnimation:  'none',
        style,
        ...(content   !== undefined ? { content }   : {}),
        ...(maxChars  !== undefined ? { maxChars }  : {}),
      };
    }

    let zones = (parsed.zones || []).map(toInternalZone);

    // ── Ensure full-bleed background zone ─────────────────────────
    if (bgCategory === 'solid' || bgCategory === 'pattern') {
      const hasBg = zones.some(z => z.zIndex === 1 && (z.width ?? 0) >= 90 && (z.height ?? 0) >= 90);
      if (!hasBg) {
        const css = bgColors.length >= 2
          ? `linear-gradient(${bgDirection || 'to bottom'}, ${bgColors.join(', ')})`
          : (bgColors[0] || '#0a0a0a');
        zones.unshift({
          id: 'z_bg', type: 'decorative', role: 'decorative',
          x: 0, y: 0, width: 100, height: 100,
          zIndex: 1, start: 0, end: null,
          enterAnimation: 'none', exitAnimation: 'none',
          style: { background: css, opacity: 1 },
        });
      }
    } else if (bgCategory === 'abstract') {
      const hasBgAsset = zones.some(z => z.role === 'background_asset');
      if (!hasBgAsset) {
        zones.unshift({
          id: 'z_bgimg', type: 'asset', role: 'background_asset',
          x: 0, y: 0, width: 100, height: 100,
          zIndex: 1, start: 0, end: null,
          enterAnimation: 'fadeIn', exitAnimation: 'none',
          style: { objectFit: 'cover', opacity: 1 },
          content: { kind: 'asset', asset: { src: null, type: 'image', objectFit: 'cover', motion: 'none', enterTransition: 'none', exitTransition: 'none' } },
        });
      }
    }

    // ── Re-index IDs ──────────────────────────────────────────────
    zones = zones.map((z, i) => ({ ...z, id: `z${i + 1}` }));

    return res.json({
      zones,
      background_category: bgCategory,
      background_colors:   bgColors,
      background_gradient_direction: bgDirection,
      color_family:        colorFamily,
      background_needs_image:  bgNeedsImg,
      background_image_prompt: bgImgPrompt,
    });
  } catch (err) {
    console.error('[admin/convert-layout-image]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/generate-layout-prompts — Generate image-generation prompts for layout mockups
// Body: { niche, intent, energy, count }
app.post("/api/admin/generate-layout-prompts", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { niche = "entertainment", intent = "hook", energy = "high", count = 4 } = req.body;

    const systemPrompt = `You are a creative director generating image-generation prompts for 9:16 vertical social media layout mockups.

Each prompt describes a COMPLETE, DENSE layout scene — background, subject, text, decorative accents, and CTA all composed together — to be rendered by an AI image generator (Flux). The output will be used as a visual reference for decomposing into editable zones.

Think like a professional art director describing a premium magazine ad or Instagram story template. Every square centimeter of the canvas should feel purposeful. Target 80% canvas utilization — no empty unused areas.

NICHE aesthetic guide:
- finance: dark, professional, gold accents, authoritative typography
- skincare: light, cream, minimal, delicate, soft gradients
- food: warm, appetizing, vibrant or clean, food-forward
- fitness: dark or vibrant, energetic, bold typography, muscular subjects
- tech: dark, cool blue/grey, clean edges, device-focused
- lifestyle: light, airy, modern, aspirational subjects
- education: light, bright, readable, structured layouts
- entertainment: vibrant, bold, dramatic lighting
- motivational: dark or vibrant, powerful, oversized typography
- spiritual: warm, golden, soft glow, ornate accents
- travel: vibrant, scenic, wanderlust-inducing
- business: dark or light, professional, clean hierarchy

INTENT guide:
- hook: immediate attention-grabbing, bold contrast, striking visual
- proof: results, statistics, before/after, credibility signals
- visual_rest: calm, minimal, breathing room, soft palette
- escalate: urgency, countdown energy, dramatic
- reveal: surprise reveal composition, dramatic unveil
- cta: action-driving, button-like elements, directive text
- stat: number-dominant, large typography, supporting context
- explanation: structured, clear hierarchy, educational feel
- testimonial: person-forward, quote-driven, trust signals
- contrast: side-by-side comparison, before/after split

ENERGY guide:
- high: bold colors, large type, dynamic subject angles, high contrast
- medium: balanced composition, clean type, professional subject
- low: minimal, lots of negative space, quiet palette, refined

LAYOUT DESIGN CONSTRAINTS — CRITICAL FOR EDITABILITY:
The generated layout image will be broken down into editable zones by our system.
- Text must always be a SEPARATE typographic layer — never embedded in illustrations or artwork
- Subject must sit cleanly ON the background — not blended into it
- Maximum 3 asset zones total, maximum 5 text zones total
- NOT allowed: gradient text, metallic text, 3D extruded text, text baked into artwork

MANDATORY LAYOUT ELEMENTS — every prompt MUST include ALL 8 of these:

1. BACKGROUND — solid color or simple 2-3 color gradient. Specify exact hex colors or color names.

2. CATEGORY LABEL — small pill or tag at the very top of the canvas (top 15%). Example: 'FITNESS', 'SKINCARE', 'FINANCE'. Small uppercase text inside a colored pill or rectangle. Contrasting color to background.

3. HEADLINE — large ultra-bold text, 2-4 words maximum. Specific placeholder text (e.g. 'FEEL THE BURN', 'GLOW UP NOW'). Positioned in upper third (15-40%). Specify font weight (ultra-bold, condensed, heavy) and color.

4. SUBTEXT — smaller supporting line directly below headline. 5-8 words. Lighter weight, different color or opacity. Example: 'Gear Up For Greatness' or 'Your skin transformation starts today'.

5. SUBJECT — one clearly isolated product, person, or object. Positioned center or lower half (40-75%). Fills 40-65% of canvas width. Has drop shadow or subtle glow to separate from background.

6. DECORATIVE ACCENTS — include minimum 2 of these elements:
   - Thin horizontal divider line (accent color, below headline or above CTA)
   - Geometric background shape (large faint circle or rectangle behind subject, slightly lighter/darker than bg)
   - Corner accent element (small geometric shape or star in one corner)
   - Stat/price badge (circle or pill with bold number — '50% OFF', '$29', '10K+')
   - Icon element (small relevant icon — star ★, arrow →, checkmark ✓, lightning bolt)
   - Side accent strip (thin vertical colored bar on left or right edge)

7. CTA ELEMENT — one of these at the bottom (90-100% of canvas):
   - Full-width bottom bar (solid colored strip spanning entire width, with CTA text like 'SHOP NOW →' or 'LEARN MORE')
   - Rounded CTA button (centered, pill-shaped, contrasting color)
   - Bottom label with arrow (small bold text + directional arrow)

8. SPACING GUIDE — explicitly describe element positions using these bands:
   - Top 15%: category label/tag
   - 15-40%: headline + subtext stack
   - 40-75%: main subject/product
   - 75-90%: decorative accent, stat badge, or secondary info
   - 90-100%: CTA bar or bottom element

EXAMPLE OF A COMPLETE, DENSE PROMPT (fitness/hook):
'Bold fitness hook layout on burnt orange to deep crimson gradient background. TOP: small white pill badge with text FITNESS in black at top-center. Upper third: ultra-bold condensed headline FEEL THE BURN in white, stacked 2 lines, with a thin bright yellow horizontal line accent below it. Below headline in lighter weight: Gear Up For Greatness in off-white. CENTER: red dumbbells and black weight plate product shot with subtle drop shadow, filling 55% of canvas width, sitting in the middle band. Behind the product: large faint circle shape in slightly lighter orange, giving depth. Left edge: thin vertical yellow accent strip. Lower area: small circular badge bottom-right with 50% OFF in bold white on dark red pill. BOTTOM: full-width dark charcoal strip spanning entire canvas width with SHOP NOW in white bold uppercase and right arrow icon. Vertical 9:16 social media template. Professional. Sharp. No UI chrome. No device frames.'

Every prompt you write must be this detailed and this dense.`;

    const userPrompt = `Generate ${count} unique image-generation prompts for:
Niche: ${niche}
Intent: ${intent}
Energy: ${energy}

Each prompt must describe a DIFFERENT layout composition style with ALL 8 mandatory elements. Make each one structurally distinct — vary the subject type, background color story, headline placement, and decorative accent choices.

Return as JSON: { "prompts": [
  {
    "id": "p1",
    "title": "short descriptive title",
    "visual_direction": "one sentence summary of the aesthetic",
    "prompt": "Full detailed image-generation prompt following all mandatory element rules above. Must include: background colors, category label, headline text + style, subtext, subject description + position, minimum 2 decorative accents, CTA element, and spacing guide positions. End with: Vertical 9:16 social media template. Professional. Sharp. No UI chrome. No device frames."
  }
] }
Return only valid JSON, no explanation.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      temperature: 0.9,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0].message.content;
    const parsed = JSON.parse(raw);
    const rawPrompts = Array.isArray(parsed) ? parsed : (parsed.prompts || Object.values(parsed)[0] || []);
    const prompts = rawPrompts.map((p, i) => ({ ...p, id: p.id ?? `p${i + 1}` }));
    res.json({ prompts });
  } catch (err) {
    console.error("[admin/generate-layout-prompts]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/generate-layout-assets
// Body: { promptId, zones, niche, intent, imagePrompt, background_needs_image, background_image_prompt, color_family }
app.post('/api/admin/generate-layout-assets', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { promptId, zones, niche, intent, imagePrompt, background_needs_image, background_image_prompt, color_family } = req.body;
    if (!zones || !Array.isArray(zones)) return res.status(400).json({ error: 'zones required' });

    const assetZones = zones.filter(z => z.type === 'asset' && ['primary_asset','secondary_asset'].includes(z.role));
    const results = [];

    // Generate subject/asset images
    for (const zone of assetZones) {
      try {
        const subjectPrompt = `${imagePrompt || ''}, ${niche} niche, ${intent} intent, isolated subject on transparent or clean background, no text, no overlays, professional marketing asset, ultra high quality`;

        const falRes = await fetch("https://fal.run/fal-ai/flux/dev", {
          method: "POST",
          headers: { "Authorization": `Key ${process.env.FAL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: subjectPrompt,
            image_size: "portrait_4_3",
            num_inference_steps: 28,
            guidance_scale: 3.5,
            num_images: 1,
            enable_safety_checker: true,
          }),
        });
        if (!falRes.ok) throw new Error(`Fal.ai HTTP ${falRes.status}`);
        const falData = await falRes.json();
        const imageUrl = falData?.images?.[0]?.url;
        if (!imageUrl) continue;

        // Upload to Supabase storage
        const imageResp = await fetch(imageUrl);
        const imageBuffer = Buffer.from(await imageResp.arrayBuffer());
        const fileName = `zone-assets/${niche}/${promptId}-${zone.id}-${Date.now()}.jpg`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from('layout-previews')
          .upload(fileName, imageBuffer, { contentType: 'image/jpeg', upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('layout-previews')
          .getPublicUrl(fileName);

        results.push({ zoneId: zone.id, role: zone.role, imageUrl: publicUrl });
      } catch (zoneErr) {
        console.error(`[generate-layout-assets] Zone ${zone.id} failed:`, zoneErr.message);
      }
    }

    // Generate background image if abstract
    let backgroundImageUrl = null;
    if (background_needs_image && background_image_prompt) {
      try {
        const bgPrompt = `${background_image_prompt}, no text, no people, no UI elements, seamless background, ultra high quality, ${niche} aesthetic`;

        const falRes = await fetch("https://fal.run/fal-ai/flux/dev", {
          method: "POST",
          headers: { "Authorization": `Key ${process.env.FAL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: bgPrompt,
            image_size: "portrait_4_3",
            num_inference_steps: 28,
            guidance_scale: 3.5,
            num_images: 1,
            enable_safety_checker: true,
          }),
        });
        if (!falRes.ok) throw new Error(`Fal.ai bg HTTP ${falRes.status}`);
        const falData = await falRes.json();
        const imageUrl = falData?.images?.[0]?.url;

        if (imageUrl) {
          const imageResp = await fetch(imageUrl);
          const imageBuffer = Buffer.from(await imageResp.arrayBuffer());
          const fileName = `background-presets/${niche}/${promptId}-bg-${Date.now()}.jpg`;

          const { error: uploadError } = await supabaseAdmin.storage
            .from('layout-previews')
            .upload(fileName, imageBuffer, { contentType: 'image/jpeg', upsert: true });

          if (!uploadError) {
            const { data: { publicUrl } } = supabaseAdmin.storage
              .from('layout-previews')
              .getPublicUrl(fileName);

            backgroundImageUrl = publicUrl;

            // Save to background_presets table (fire-and-forget)
            supabaseAdmin.from('background_presets').insert({
              url: publicUrl,
              niche,
              color_family: color_family || 'dark',
              tags: [intent],
              prompt: background_image_prompt,
              created_at: new Date().toISOString()
            }).then(() => {}).catch(() => {});
          }
        }
      } catch (bgErr) {
        console.error('[generate-layout-assets] Background image gen failed:', bgErr.message);
      }
    }

    return res.json({ results, backgroundImageUrl });

  } catch (err) {
    console.error('[generate-layout-assets] error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));