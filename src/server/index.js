import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import multer from "multer";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
// @remotion/bundler and @remotion/renderer are lazy-imported inside the render
// route to avoid crashing the server on hosts without the required native binaries.
import { v4 as uuidv4 } from "uuid";
import compressVideo from "./compressVideo.cjs";
import compressAudio from "./compressAudio.cjs";
import { createClient } from "@supabase/supabase-js";
import {
  sendAdminAlert, sendUserEmail,
  adminNewUserEmail, adminUserDeletedEmail, adminCreditsTopupEmail,
  adminNewSaleEmail, adminPlanRenewalEmail, adminPlanUpgradeEmail,
  userWelcomeEmail, userCreditsPurchasedEmail, userLowCreditsEmail,
} from "./services/emailService.js";
import axios from "axios";
import https   from "node:https";
import http    from "node:http";
import crypto  from "node:crypto";
import Razorpay from "razorpay";
import { fileURLToPath } from "url";

console.log("Server starting...", new Date().toISOString());

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
  process.exit(1);
});

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

  // Low-credits warning: fire once when balance crosses below 20
  if (newBalance < 20 && credits.balance >= 20) {
    supabaseAdmin.auth.admin.getUserById(userId).then(({ data: { user } }) => {
      if (user?.email) {
        const name = user.user_metadata?.full_name || user.user_metadata?.name || "";
        const { subject, html } = userLowCreditsEmail(name, newBalance);
        sendUserEmail(user.email, subject, html);
      }
    }).catch(() => {});
  }

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

  // Fire email alerts for credit purchases (not admin grants / plan assignments)
  if (type === "purchase" || type === "topup") {
    supabaseAdmin.auth.admin.getUserById(userId).then(({ data: { user } }) => {
      if (!user) return;
      const name = user.user_metadata?.full_name || user.user_metadata?.name || "";
      // Admin alert
      const adminEmail = adminCreditsTopupEmail({ userEmail: user.email, amount, balance: newBalance });
      sendAdminAlert(adminEmail.subject, adminEmail.html);
      // User confirmation
      const userEmail = userCreditsPurchasedEmail(name, amount, newBalance);
      sendUserEmail(user.email, userEmail.subject, userEmail.html);
    }).catch(() => {});
  }

  return { success: true, balance: newBalance };
}
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
app.use(cors());
app.use(express.json({ limit: "100mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../..");
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
  // Prefer the pre-built bundle (generated locally via `npm run prebundle`).
  // This avoids spawning esbuild at runtime, which crashes on restricted hosts.
  const PREBUNDLE_DIR = path.join(PROJECT_ROOT, "remotion-bundle");
  if (fs.existsSync(path.join(PREBUNDLE_DIR, "index.html"))) {
    console.log("[bundle] Using pre-built bundle at:", PREBUNDLE_DIR);
    return PREBUNDLE_DIR;
  }
  // Fallback: build at runtime (local dev only).
  const { bundle } = await import("@remotion/bundler");
  console.log("[bundle] Building bundle at runtime (dev only)...");
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

/* ── Public: active plans ── */
app.get("/api/plans", async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("plans")
      .select("id, name, slug, description, credits, price_monthly, price_annual, discount_percent, is_popular, sort_order, features")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("[plans]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── User: get own profile ── */
app.get("/api/user/profile", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", req.user.id)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    res.json(data || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── User: update own profile ── */
app.post("/api/user/profile", requireAuth, async (req, res) => {
  try {
    const allowed = ["niche", "goal", "default_duration", "default_language"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    updates.updated_at = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", req.user.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── User: own credit transactions ── */
app.get("/api/user/transactions", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("credit_transactions")
      .select("id, amount, type, action, description, balance_after, created_at")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── User: own credit balance + lifetime ── */
app.get("/api/user/credits", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("user_credits")
      .select("balance, lifetime_credits")
      .eq("user_id", req.user.id)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    res.json(data || { balance: 0, lifetime_credits: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

/* ---------------- TOPIC RESEARCH ---------------- */
app.post("/api/research-topic", requireAuth, async (req, res) => {
  try {
    const { topic, videoType, audience, language } = req.body;
    if (!topic) return res.status(400).json({ error: "topic required" });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 800,
      messages: [
        {
          role: "system",
          content: "You are a research assistant for a viral video scriptwriter. Your job is to find the most interesting, specific, counterintuitive, and current facts about a topic that will make a short-form video script compelling. Return ONLY a JSON object, no markdown.",
        },
        {
          role: "user",
          content: `Research this topic for a viral short-form video script:

TOPIC: ${topic}
VIDEO TYPE: ${videoType || "viral"}
AUDIENCE: ${audience || "general"}
LANGUAGE: ${language || "english"}

Return a JSON object with:
{
  "key_facts": ["3-5 specific facts with real numbers, names, dates"],
  "counterintuitive_angle": "one surprising or contrarian take on this topic",
  "hook_ideas": ["2-3 possible opening lines that would stop someone scrolling"],
  "specific_entities": ["real people, brands, products, events related to this topic"],
  "current_context": "what is happening RIGHT NOW related to this topic in 2025-2026",
  "emotional_angle": "what emotion does this topic tap into — fear, awe, anger, curiosity, inspiration"
}

Be specific. Use real numbers. No vague generalities. If you don't know exact current stats, use the best known figures.`,
        },
      ],
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/```json\n?/gi, "").replace(/```\n?/gi, "").trim());
    } catch {
      return res.status(500).json({ error: "Research returned invalid JSON" });
    }
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
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

    // Upload directly to Supabase so the URL is permanent across all environments
    const storageKey = `tts/${req.user.id}/${normName}`;
    const normBuffer = fs.readFileSync(normPath);
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("user-assets")
      .upload(storageKey, normBuffer, { contentType: "audio/mpeg", upsert: false });

    if (!uploadErr) {
      fs.unlinkSync(normPath);
      const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(storageKey);
      console.log("[TTS] Uploaded to Supabase:", publicUrl);
      res.json({ url: publicUrl });
    } else {
      // Fallback: return localhost temp URL (only works in local dev)
      const url = `http://localhost:5000/renders/${normName}`;
      console.warn("[TTS] Supabase upload failed, using temp URL:", uploadErr.message);
      res.json({ url });
    }
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
    signal: AbortSignal.timeout(10000),
    headers: {
      "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer":         "https://www.bing.com/images/search",
    },
  });
  if (!r.ok) {
    const err = new Error(`Bing scrape HTTP ${r.status}`);
    err.httpStatus = r.status;
    throw err;
  }
  const html = await r.text();

  // Bing embeds image URLs in multiple formats depending on region/version:
  // 1. HTML-encoded:  murl&quot;:&quot;URL&quot;
  // 2. Raw JSON:      "murl":"URL"
  // Try both and deduplicate.
  const murlsEncoded = [...html.matchAll(/murl&quot;:&quot;(https?:[^&"]+)&quot;/g)].map(m => m[1]);
  const murlsRaw     = [...html.matchAll(/"murl"\s*:\s*"(https?:[^"]+)"/g)].map(m => m[1]);
  const turlsEncoded = [...html.matchAll(/turl&quot;:&quot;(https?:[^&"]+)&quot;/g)].map(m => m[1]);
  const turlsRaw     = [...html.matchAll(/"turl"\s*:\s*"(https?:[^"]+)"/g)].map(m => m[1]);

  // Merge and deduplicate while preserving order
  const dedupe = (...arrs) => [...new Set(arrs.flat().filter(Boolean))];
  const murls = dedupe(murlsEncoded, murlsRaw);
  const turls = dedupe(turlsEncoded, turlsRaw);

  const results = [];
  for (let i = 0; i < Math.max(murls.length, turls.length); i++) {
    results.push({ murl: murls[i] || null, turl: turls[i] || null });
  }

  console.log(`[search] Bing found ${results.length} results for "${query}" (encoded:${murlsEncoded.length} raw:${murlsRaw.length})`);
  if (results.length === 0) console.warn(`[search] Zero results — Bing HTML may have changed format. Check /api/test-search?q=${encodeURIComponent(query)}`);
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
    return { localUrl: `http://localhost:5000/renders/${fname}`, filePath, buffer, contentType: ct, ext, fname };
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
        // Upload directly to Supabase storage so the URL is permanent and accessible
        // from any environment (no localhost round-trip through the browser).
        try {
          const storageKey = `search/${req.user.id}/${cached.fname}`;
          const { error: uploadErr } = await supabaseAdmin.storage
            .from("user-assets")
            .upload(storageKey, cached.buffer, { contentType: cached.contentType, upsert: false });
          if (!uploadErr) {
            const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(storageKey);
            try { fs.unlinkSync(cached.filePath); } catch {}
            console.log(`[search] Uploaded to Supabase for "${query}": ${publicUrl}`);
            res.json({ url: publicUrl, source: "bing_scrape", query });
            return;
          }
          console.warn(`[search] Supabase upload failed, falling back to temp URL`);
        } catch (e) {
          console.warn(`[search] Supabase upload error: ${e.message}`);
        }
        // Fallback: temp local URL (only works in local dev)
        res.json({ url: cached.localUrl, source: "bing_scrape", query });
        setTimeout(() => { try { fs.unlinkSync(cached.filePath); } catch {} }, 30_000);
        return;
      }
    }

    res.status(404).json({ error: "No usable image found", query });
  } catch (e) {
    // Bing blocks cloud-hosting IPs (403/429) or the scrape timed out.
    // Return 503 (upstream dependency unavailable) — not a server bug.
    // The generation pipeline checks res.ok and falls through to AI image gen.
    console.warn(`[search] Bing unavailable for "${query}": ${e.message}`);
    res.status(503).json({ error: "Image search unavailable", detail: e.message });
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

    /* ── 0. Clamp transition durations — never let a transition exceed 80% of its beat ── */
    if (project?.beats) {
      project = {
        ...project,
        beats: project.beats.map((beat) => {
          const beatDuration = (beat.end_sec ?? 0) - (beat.start_sec ?? 0);
          const maxTransition = beatDuration * 0.8;
          if (beat.transition?.duration && beatDuration > 0 && beat.transition.duration > maxTransition) {
            return { ...beat, transition: { ...beat.transition, duration: Math.round(maxTransition * 100) / 100 } };
          }
          return beat;
        }),
      };
    }

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

    /* ── 3.5. Embed layout definitions so Remotion never needs Supabase inside Chromium ── */
    try {
      const layoutIds = [...new Set((project.beats || []).map(b => b.layout).filter(Boolean))];
      if (layoutIds.length > 0) {
        const { data: layoutRows } = await supabaseAdmin
          .from("layouts")
          .select("*")
          .in("id", layoutIds);
        if (layoutRows?.length) {
          const layoutDefs = Object.fromEntries(layoutRows.map(r => [r.id, r]));
          project = { ...project, meta: { ...project.meta, layoutDefs } };
          console.log(`[render] Embedded ${layoutRows.length} layout defs into inputProps`);
        }
      }
    } catch (e) {
      console.warn("[render] Failed to embed layout defs:", e.message);
    }

    /* ── 4. Get cached bundle ── */
    const serveUrl = await getBundle();

    /* ── 5. Get composition ── */
    const { getCompositions, renderFrames, stitchFramesToVideo } = await import("@remotion/renderer");
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

    /* ── 7. Upload render to Supabase storage + save DB record ── */
    let videoUrl = null;
    try {
      const storageKey  = `renders/${req.user.id}/render-${jobId}.mp4`;
      const videoBuffer = fs.readFileSync(outputPath);
      const { error: storageErr } = await supabaseAdmin.storage
        .from("user-assets")
        .upload(storageKey, videoBuffer, { contentType: "video/mp4", upsert: false });
      if (storageErr) {
        console.warn("[render] Storage upload failed:", storageErr.message);
      } else {
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from("user-assets")
          .getPublicUrl(storageKey);
        videoUrl = publicUrl;
        const projectId = req.body.projectId || req.body.project?.id || null;
        await supabaseAdmin.from("renders").insert([{
          project_id: projectId,
          user_id:    req.user.id,
          video_url:  videoUrl,
          status:     "done",
          file_path:  storageKey,
          created_at: new Date().toISOString(),
        }]);
        console.log("[render] Saved to storage + DB:", videoUrl);
      }
    } catch (e) {
      console.warn("[render] Post-render save failed:", e.message);
    }

    renderJobs[jobId] = {
      progress:  100,
      done:      true,
      url:       `http://localhost:5000/api/render-download/${jobId}`,
      video_url: videoUrl,
      error:     null,
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

/* ── Admin: delete user ── */
app.post("/api/admin/delete-user", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });

    // Fetch user info before deleting so we can include it in the alert
    const { data: { user: deletedUser } } = await supabaseAdmin.auth.admin.getUserById(userId);

    await supabaseAdmin.from("profiles").delete().eq("id", userId);
    await supabaseAdmin.from("user_credits").delete().eq("user_id", userId);
    await supabaseAdmin.from("credit_transactions").delete().eq("user_id", userId);
    await supabaseAdmin.from("projects").delete().eq("user_id", userId);
    await supabaseAdmin.from("generated_images").delete().eq("user_id", userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;

    // Admin alert
    const { subject, html } = adminUserDeletedEmail({ id: userId, email: deletedUser?.email || "unknown" });
    await sendAdminAlert(subject, html);

    res.json({ success: true });
  } catch (err) {
    console.error("[admin/delete-user]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: suspend / unsuspend user ── */
app.post("/api/admin/suspend-user", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, suspend } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: suspend ? "87600h" : "none",
    });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("[admin/suspend-user]", err.message);
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

/* ── Plans CRUD (admin) ─────────────────────────────────────────────────── */
app.get("/api/admin/plans", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("plans")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("[admin/plans GET]", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/plans", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, slug, description, credits, price_monthly, price_annual,
            discount_percent, is_active, is_popular, sort_order, features } = req.body;
    if (!name || !slug || !credits || !price_monthly) {
      return res.status(400).json({ error: "name, slug, credits, price_monthly required" });
    }
    const { data, error } = await supabaseAdmin.from("plans").insert({
      name, slug, description: description || null,
      credits: Number(credits), price_monthly: Number(price_monthly),
      price_annual: price_annual ? Number(price_annual) : null,
      discount_percent: Number(discount_percent) || 0,
      is_active: is_active !== false,
      is_popular: !!is_popular,
      sort_order: Number(sort_order) || 0,
      features: features || [],
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("[admin/plans POST]", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/admin/plans/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, credits, price_monthly, price_annual,
            discount_percent, is_active, is_popular, sort_order, features } = req.body;
    const patch = {};
    if (name           !== undefined) patch.name             = name;
    if (slug           !== undefined) patch.slug             = slug;
    if (description    !== undefined) patch.description      = description;
    if (credits        !== undefined) patch.credits          = Number(credits);
    if (price_monthly  !== undefined) patch.price_monthly    = Number(price_monthly);
    if (price_annual   !== undefined) patch.price_annual     = price_annual ? Number(price_annual) : null;
    if (discount_percent !== undefined) patch.discount_percent = Number(discount_percent) || 0;
    if (is_active      !== undefined) patch.is_active        = !!is_active;
    if (is_popular     !== undefined) patch.is_popular       = !!is_popular;
    if (sort_order     !== undefined) patch.sort_order       = Number(sort_order) || 0;
    if (features       !== undefined) patch.features         = features;
    const { data, error } = await supabaseAdmin.from("plans").update(patch).eq("id", id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("[admin/plans PUT]", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/plans/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from("plans").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error("[admin/plans DELETE]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Grant plan to user by email ── */
app.post("/api/admin/plans/:id/grant", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, billing_cycle } = req.body;
    if (!email) return res.status(400).json({ error: "email required" });

    // Resolve user by email
    const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) throw listErr;
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) return res.status(404).json({ error: `No user found with email: ${email}` });

    // Get plan
    const { data: plan, error: planErr } = await supabaseAdmin.from("plans").select("*").eq("id", id).single();
    if (planErr || !plan) return res.status(404).json({ error: "Plan not found" });

    // Add credits
    await addCredits(user.id, plan.credits, "plan_assign", "plan_assign",
      `Plan assigned: ${plan.name} (${plan.credits} credits, $${plan.price_monthly}/mo)`);

    // Upsert subscription row
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + (billing_cycle === "annual" ? 12 : 1));
    await supabaseAdmin.from("subscriptions").upsert({
      user_id: user.id, plan_id: id, plan_name: plan.name,
      status: "active", billing_cycle: billing_cycle || "monthly",
      price_paid: billing_cycle === "annual" ? plan.price_annual : plan.price_monthly,
      period_start: now.toISOString(), period_end: end.toISOString(),
    }, { onConflict: "user_id" });

    res.json({ ok: true, credits: plan.credits, user_id: user.id });
  } catch (err) {
    console.error("[admin/plans/grant]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── All subscriptions (admin) ── */
app.get("/api/subscriptions/all", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = data || [];
    // Enrich with user emails
    const uniqueIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))];
    const emailMap = {};
    await Promise.all(uniqueIds.map(async uid => {
      try {
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(uid);
        emailMap[uid] = user?.email || uid;
      } catch { emailMap[uid] = uid; }
    }));
    res.json({ subscriptions: rows.map(r => ({ ...r, email: emailMap[r.user_id] || r.user_id })) });
  } catch (err) {
    console.error("[subscriptions/all]", err.message);
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

/* ── Transcription Service ─────────────────────────────────────────── */

const uploadTranscription = multer({
  dest: TEMP_DIR,
  limits: { fileSize: 500 * 1024 * 1024 },
});

function getFileDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata?.format?.duration || 0);
    });
  });
}

app.post("/api/transcription/transcribe", requireAuth, uploadTranscription.single("file"), async (req, res) => {
  const tempFiles = [];
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    tempFiles.push(req.file.path);

    let durationSeconds = 0;
    try {
      durationSeconds = await getFileDuration(req.file.path);
    } catch (e) {
      console.warn("[transcription] ffprobe failed, defaulting to 60s:", e.message);
      durationSeconds = 60;
    }

    const creditsUsed = Math.max(2, Math.ceil(durationSeconds / 60) * 2);
    const deduction = await deductCredits(req.user.id, creditsUsed, "transcription_service", "Transcription service", null);
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });

    // Extract audio — Whisper works on audio only, keeps file small
    const audioPath = req.file.path + ".mp3";
    tempFiles.push(audioPath);
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

    const transcription = await openai.audio.transcriptions.create({
      file:            fs.createReadStream(audioPath),
      model:           "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    const transcript = transcription.text || "";
    const segments   = (transcription.segments || []).map(s => ({
      start: s.start ?? 0,
      end:   s.end   ?? 0,
      text:  s.text?.trim() || "",
    })).filter(s => s.text);
    const language   = transcription.language || "en";

    const { data: record, error: insertErr } = await supabaseAdmin
      .from("transcriptions")
      .insert({
        user_id:          req.user.id,
        file_name:        req.file.originalname || req.file.filename,
        duration_seconds: Math.round(durationSeconds),
        credits_used:     creditsUsed,
        transcript,
        segments,
        language,
      })
      .select()
      .single();
    if (insertErr) console.error("[transcription] DB insert:", insertErr.message);

    res.json({
      id:               record?.id,
      transcript,
      segments,
      language,
      duration_seconds: Math.round(durationSeconds),
      credits_used:     creditsUsed,
    });
  } catch (err) {
    console.error("[transcription]", err.message);
    res.status(500).json({ error: err.message || "Transcription failed" });
  } finally {
    tempFiles.forEach(f => { try { fs.unlinkSync(f); } catch {} });
  }
});

app.get("/api/transcription/history", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("transcriptions")
      .select("id, file_name, duration_seconds, credits_used, transcript, segments, language, created_at")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ transcriptions: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/transcription/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error: fetchErr } = await supabaseAdmin
      .from("transcriptions").select("user_id").eq("id", id).single();
    if (fetchErr || !data) return res.status(404).json({ error: "Not found" });
    if (data.user_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });
    await supabaseAdmin.from("transcriptions").delete().eq("id", id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    const iconKeys = ['arrow','arrowCircle','star','starOutline','check','checkCircle','close','heart','fire','lightning','crown','diamond','shield','trophy','rocket','flag','bell','eye','play','pause','plus','bolt','thumbsup','smile','medal','chart','briefcase','globe','leaf','sun','moon','lock','key','percent','dollar','target'];

    const visionPrompt = `You are a precision layout extraction engine for short-form video design. Your job is to analyze a marketing image and output accurate zone coordinates + metadata.

⚠️ CRITICAL — TEXT IN THIS IMAGE IS AI-GENERATED GIBBERISH:
The image was produced by a Fal.ai diffusion model which cannot render real text. Every word you see is garbled nonsense — "AKRAQAIMED", "UNPARALAJELED", "EXCLUME", "Eleleate2" etc. DO NOT attempt to read or OCR any text from the image.
Instead, for every text zone you detect, you MUST write real, meaningful placeholder content based on the zone's ROLE + the context below (niche=${niche}, intent=${intent}).
Use these role-specific rules to generate content — the image text is irrelevant:
  • headline zone  → a real curiosity-style hook phrase for this niche/intent, 6-10 words, e.g. "WHY MILLIONS ARE SWITCHING TO THIS NOW"
  • label zone     → the niche name in ALL CAPS, e.g. "${(niche||'LIFESTYLE').toUpperCase()}"
  • subtext zone   → a real supporting sentence relevant to the niche, e.g. "Join 50,000 people already transforming their results."
  • tagline zone   → a short memorable brand-style phrase, e.g. "Built for the bold."
  • cta zone       → a real action directive, e.g. "FOLLOW NOW" or "GET STARTED →"
  • stat zone      → a realistic metric for this niche, e.g. "10,000+" or "94%" or "$3.5M"
  • quote zone     → a quotable pull-quote sentence relevant to the beat
Generate content that would actually appear in a real ${niche} ${intent} video — not generic fillers.

CANVAS: 1080 wide × 1920 tall (9:16 vertical). All output coordinates are PERCENTAGES of canvas dimensions (0–100).

══════════════════════════════════════
PHASE 1 — LAYOUT ANALYSIS (think first)
══════════════════════════════════════
Before writing any JSON, mentally do this:

A) Divide the image into horizontal bands:
   - Band T (top 0-20%): headers, labels, badges
   - Band U (upper 20-45%): titles, hero elements
   - Band M (mid 45-65%): main image/character
   - Band L (lower 65-80%): supporting text, stats
   - Band B (bottom 80-100%): CTA, footer

B) List every visible element and which band it's in.

C) For each element, estimate its LEFT EDGE, TOP EDGE, WIDTH, HEIGHT as % of canvas.
   Use this formula to self-check:
   - Element covers pixels X1 to X2 horizontally on a 1080px canvas → x = X1/1080*100, width = (X2-X1)/1080*100
   - Element covers pixels Y1 to Y2 vertically on a 1920px canvas → y = Y1/1920*100, height = (Y2-Y1)/1920*100
   - CENTERED element of width W%: x = (100-W)/2
   - VERIFY: x+width ≤ 100, y+height ≤ 100

══════════════════════════════════════
PHASE 2 — BACKGROUND
══════════════════════════════════════
Classify the canvas background (ignoring all text, icons, and assets):
- "solid" — flat color or simple 2-stop gradient, no repeating textures
- "pattern" — repeating geometric shapes, grid, dots, lines, subtle texture
- "abstract" — photo, illustration, complex scene, organic gradient mesh

Output fields:
  background_category: "solid"|"pattern"|"abstract"
  background_colors: [primary_hex, secondary_hex_or_same]   — dominant background colors
  background_gradient_direction: "to bottom"|"to right"|"135deg"|null
  color_family: "blue"|"green"|"red"|"yellow"|"purple"|"orange"|"teal"|"pink"|"dark"|"light"|"neutral"
  background_needs_image: true ONLY if abstract
  background_image_prompt: detailed Fal.ai prompt for background generation (abstract only, else null)

══════════════════════════════════════
PHASE 3 — ZONE EXTRACTION
══════════════════════════════════════
Extract EVERY visible element as a zone. Use sequential IDs: z1, z2…

ZONE SCHEMA (all fields required):
{
  "id": "z1",
  "type": "text"|"asset"|"decorative"|"icon",
  "role": [see roles],
  "x": [left edge %],
  "y": [top edge %],
  "width": [%],
  "height": [%],
  "content": "exact text" (text zones) | null (all others),
  "assetDescription": "subject description for AI image gen" (asset zones ONLY — omit for all other types),
  "style": { ... see style rules ... },
  "animation": "fadeIn"|"slideUpIn"|"popIn"|"scaleIn"|"none",
  "animationDelay": 0.1–0.9
}

ROLES:
  text:       headline | subtext | label | tagline | stat | metric | quote | cta
  asset:      primary_asset | secondary_asset
  decorative: decorative
  icon:       icon

STYLE RULES by type:
  TEXT zones:
    fontSize:   pixels on 1920px canvas — be bold: headline 130–220, subtext 50–80, label 30–50, cta 48–70, stat 100–170
    fontWeight: "400"|"600"|"700"|"800"|"900"
    fontFamily: "Bebas Neue"|"Anton"|"Unbounded"|"Oswald"|"Montserrat"|"Outfit"|"Barlow Condensed"|"Poppins"|"Inter"|"Raleway"|"Lato"|"Playfair Display"|"Dancing Script"|"Syne"|"JetBrains Mono"|"Nunito"|"Roboto"
    color:      "#hex"
    textAlign:  "center" if element appears centered on canvas, "left" if left-aligned, "right" if right-aligned
    backgroundColor: "#hex" (only if text has a visible pill/badge background, else null)
    borderRadius: number (only if rounded pill/badge background, else null)
    rotation:   number in degrees — ONLY if text is visually rotated (e.g. -90 for vertical text running upward along left edge, 90 for downward). Omit if not rotated.

  DECORATIVE zones:
    shapeKey:  one of [${decorativeShapeKeys.join(',')}]
    fillColor: "#hex"
    opacity:   0.0–1.0

  ICON zones:
    iconKey:   one of [${iconKeys.join(',')}]
    fillColor: "#hex"
    iconSize:  70–100 (fill percentage of zone)
    Minimum zone size: width ≥ 8, height ≥ 8

  ASSET zones:
    assetDescription: "one-sentence visual description of the subject for AI image generation — e.g. 'fit woman jogging in athletic wear, energetic pose' or 'sleek laptop with stock charts on screen'. Describe the SUBJECT ONLY, not the background or layout."
    content: null (always)
    No other style fields needed

EXTRACTION RULES:
1. CATEGORY LABEL (e.g. "HEALTH", "COMEDY", "EDUCATION") → text, role:label
   Width must fit the FULL word on ONE line without wrapping. Min width = 12%.
   E.g. "HEALTH" badge 5 letters at 36px → width ≈ 20%, height ≈ 6%.
2. HEADLINE — if visually split across lines with different styles (color/size/font):
   create ONE zone per line. Each gets its own x/y/width/height/fontSize/color.
   Do NOT merge lines into one zone.
   CRITICAL: headline lines must NOT overlap. If line 1 is at y=10, height=10, then line 2 must start at y ≥ 21.
   Stack them: each zone's y = previous zone's y + previous zone's height + small gap.
   Check: zone A y=10 h=10 → zone B y≥21. Zone B y=21 h=10 → zone C y≥32.
3. SUPPORTING TEXT → text, role:subtext
4. CTA / BUTTON TEXT → text, role:cta
5. PRICE / STAT / BADGE numbers → text, role:stat (include badge background color if present)
   Width must be wide enough to fit all text on ONE line. Stat zones: min width 18%.
6. PRIMARY IMAGE (main person, character, product, emoji, mascot, illustration) →
   asset, role:primary_asset, content:null
   REQUIRED: assetDescription field — describe the visual subject as a Fal.ai generation prompt
   Bounding box = tight crop around the subject, NOT the full canvas
7. SECONDARY IMAGE → asset, role:secondary_asset, content:null
   REQUIRED: assetDescription field — describe what this secondary subject visually is
8. DECORATIVE SHAPES (circles, hexagons, ribbons, blobs, colored bands/bars, diagonal strips, dots) → decorative
   Colored diagonal strips, bottom bars, side accent strips → decorative, shapeKey:rectangle or shapeKey:pill
9. SIMPLE ICONS (star, sparkle, arrow, check, fire, crown, heart, etc.) → icon
10. DIVIDER LINE → decorative, shapeKey:line
11. ALL text in this image is AI-generated gibberish — NEVER attempt to read it. For EVERY text zone, generate real meaningful content based on role + context (niche=${niche}, intent=${intent}):
    headline → curiosity-style hook, 6-10 words, relevant to ${niche} ${intent}, e.g. "WHY MILLIONS ARE SWITCHING TO THIS NOW"
    label    → "${(niche||'lifestyle').toUpperCase()}" — just the niche name in caps
    subtext  → a real ${niche} supporting sentence, e.g. "Join 50,000 people already seeing results."
    tagline  → short memorable phrase, e.g. "Built for the bold."
    stat     → realistic ${niche} metric, e.g. "10,000+" or "94%" or "$3.5M"
    cta      → real action directive, e.g. "FOLLOW NOW" or "GET STARTED →" or "LEARN MORE"
    quote    → quotable ${niche} pull-quote sentence
12. Do NOT create a background zone — background is handled separately
13. TEXT ZONE HEIGHT: use fontSize to estimate: height = (fontSize/1920)*100*1.5
    Example: 160px font → height ≈ 12.5%. Do not make text zones taller than needed.
14. ASSET ZONE: draw a generous bounding box — include the full figure/object plus a small margin.
    Primary asset should typically be width 50–85%, height 30–50% of canvas.
    Do NOT draw a tiny box; the asset fills its zone at objectFit:cover, so give it room to breathe.

ANIMATION TIMING (reading order, top→bottom):
  First element: 0.1s | Each next: +0.1s | Split headline parts: +0.08s each | CTA: 0.7–0.9s

══════════════════════════════════════
OUTPUT FORMAT — VALID JSON ONLY, NO MARKDOWN, NO EXTRA TEXT
══════════════════════════════════════
{
  "background_category": "solid"|"pattern"|"abstract",
  "background_colors": ["#hex"],
  "background_gradient_direction": null,
  "color_family": "string",
  "background_needs_image": false,
  "background_image_prompt": null,
  "zones": []
}

Context: niche=${niche}, intent=${intent}, energy=${energy}

${intent === 'visual_rest' ? `══════════════════════════════════════
SPECIAL OVERRIDE — visual_rest INTENT
══════════════════════════════════════
This image is a full-bleed atmospheric photo. The entire image IS an asset zone.
You MUST return EXACTLY 3 zones — no more, no fewer:
  z1: type=asset, role=primary_asset, x=0, y=0, width=100, height=100
      assetDescription: one-sentence description of the scene/subject in the image
  z2: type=text, role=label, small category label text at top (y=3–7%)
      content: the niche category name in uppercase (e.g. "${(niche||'TRAVEL').toUpperCase()}")
      style: small fontSize (28–40), light fontWeight "300" or "400", white or soft color
  z3: type=text, role=subtext, short atmospheric caption at bottom (y=82–88%)
      content: 3–6 word poetic caption (e.g. "The world is waiting." or "Find your calm.")
      style: italic-style, light fontWeight, white or soft color, textAlign:center
Return ONLY these 3 zones. Do NOT add headline, CTA, decorative, or icon zones.` : ''}
${intent === 'escalate' ? `══════════════════════════════════════
SPECIAL OVERRIDE — escalate INTENT
══════════════════════════════════════
This layout uses stacked escalating text. Return a MAXIMUM of 4 zones total.
  z1: type=text, role=label — urgency pill at top (e.g. "⚡ LIMITED TIME")
  z2: type=text, role=headline — upper text line (larger, bold)
  z3: type=text, role=headline — the big payoff line (the largest/boldest text on canvas)
  z4 (optional): type=asset or decorative — only if a strong visual element exists
If you see more than 3 text elements in the image, MERGE the smaller/weaker lines into z2.
Do NOT create separate zones for every line of text. Max 4 zones total. No CTA zone.` : ''}`;

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

    console.log('\n[convert-layout-image] ── RAW VISION OUTPUT ─────────────────────');
    console.log('bg_category:', parsed.background_category, '| colors:', parsed.background_colors, '| color_family:', parsed.color_family);
    console.log('zones count:', (parsed.zones || []).length);
    (parsed.zones || []).forEach((z, i) => {
      const s = z.style || {};
      console.log(`  z${i+1} [${z.type}/${z.role}] x:${z.x} y:${z.y} w:${z.width} h:${z.height} | content:"${z.content || ''}" | fontSize:${s.fontSize} iconKey:${s.iconKey||z.iconKey||'-'} shapeKey:${s.shapeKey||'-'}${z.assetDescription ? ` | asset:"${z.assetDescription}"` : ''}`);
    });
    console.log('──────────────────────────────────────────────────────────────────\n');

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
      // whiteSpace is passed through from Vision AI style if explicitly set
      if (raw.whiteSpace) style.whiteSpace = raw.whiteSpace;

      // ── Icon/decorative registry mappings ────────────────────────────────
      // iconKey → Phosphor icon name (set:"ph")
      const ICON_KEY_TO_PH = {
        // snake_case keys
        star: 'star-fill', star_outline: 'star', sparkle: 'sparkle',
        heart: 'heart-fill', heart_outline: 'heart',
        thumbsup: 'thumbs-up-fill', thumbsdown: 'thumbs-down-fill',
        handshake: 'handshake-fill', crown: 'crown-fill', trophy: 'trophy-fill',
        arrow: 'arrow-right-bold', arrow_right: 'arrow-right-bold',
        arrow_left: 'arrow-left-bold', arrow_up: 'arrow-up-bold', arrow_down: 'arrow-down-bold',
        chevron: 'caret-right-fill', chevron_right: 'caret-right-fill',
        bolt: 'lightning-fill', lightning: 'lightning-fill', fire: 'fire-fill',
        check: 'check-bold', check_circle: 'check-circle-fill',
        close: 'x-bold', plus: 'plus-bold',
        clock: 'clock-fill', alarm: 'bell-fill', bell: 'bell-fill',
        play: 'play-fill', pause: 'pause-fill', camera: 'camera-fill', music: 'music-note-fill',
        phone: 'phone-fill', location: 'map-pin-fill', pin: 'map-pin-fill',
        info: 'info-fill', warning: 'warning-fill', wifi: 'wifi-high-fill',
        dollar: 'currency-dollar-bold', percent: 'percent-bold',
        rocket: 'rocket-fill', globe: 'globe-fill',
        smile: 'smiley-fill', wink: 'smiley-wink-fill', laugh: 'smiley-wink-fill',
        diamond: 'diamond-four-corners-fill', confetti: 'confetti-fill',
        briefcase: 'briefcase-fill', chart: 'chart-bar-fill', medal: 'medal-fill',
        target: 'target-fill', flag: 'flag-fill', gem: 'diamond-fill',
        shield: 'shield-check-fill', lock: 'lock-fill', key: 'key-fill',
        leaf: 'leaf-fill', sun: 'sun-fill', moon: 'moon-fill', cloud: 'cloud-fill',
        snowflake: 'snowflake-fill', wave: 'waves', eye: 'eye-fill',
        // camelCase variants (Vision AI often outputs these)
        arrowCircle: 'arrow-circle-right-fill', arrowRight: 'arrow-right-bold',
        arrowLeft: 'arrow-left-bold', arrowUp: 'arrow-up-bold', arrowDown: 'arrow-down-bold',
        starOutline: 'star', checkCircle: 'check-circle-fill',
        thumbsUp: 'thumbs-up-fill', thumbsDown: 'thumbs-down-fill',
        mapPin: 'map-pin-fill', chartBar: 'chart-bar-fill',
        shieldCheck: 'shield-check-fill', currencyDollar: 'currency-dollar-bold',
        musicNote: 'music-note-fill', smiley: 'smiley-fill',
      };
      // shapeKey/iconKey → decorativeRegistry ID (for shapes not in Phosphor)
      const SHAPE_TO_DEC = {
        star_burst: 'star_burst_6pt', star_4pt: 'star_burst_4pt',
        star_8pt: 'star_burst_8pt', star_12pt: 'star_burst_12pt',
        sparkle_sm: 'sparkle_4pt_sm', sparkle_lg: 'sparkle_4pt_lg',
        sparkle_6pt: 'sparkle_6pt', sparkle_cluster: 'sparkle_cluster',
        flower: 'flower_simple', daisy: 'flower_daisy',
        blob: 'blob_organic_a', blob_soft: 'blob_circle_soft',
        blob_long: 'blob_elongated', blob_corner: 'blob_corner_fill',
        speech_bubble: 'speech_bubble_round', speech_bubble_sharp: 'speech_bubble_sharp',
        badge: 'badge_circle', badge_pill: 'badge_pill', badge_burst: 'badge_burst',
        badge_shield: 'badge_shield', badge_tag: 'badge_tag', badge_ribbon: 'badge_ribbon',
        square: 'shape_square', rectangle: 'shape_rectangle',
        arrow_curved: 'arrow_curved_right', arrow_swoosh: 'arrow_swoosh',
        arrow_bounce: 'arrow_bounce', arrow_double: 'arrow_double_right',
      };
      // Pure CSS shapes — keep borderRadius approach, no registry lookup
      const CSS_SHAPES = new Set(['circle', 'ring', 'dot', 'pill', 'rounded', 'oval']);

      const sk = raw.shapeKey;
      const ik = raw.iconKey;
      const fillColor = raw.fillColor || raw.color || '#ffffff';

      let iconifyOut   = undefined; // set for Phosphor icon zones
      let decorativeId = undefined; // set for decorativeRegistry shapes
      let typeOut      = type;      // may be overridden (e.g. icon→decorative when using dec registry)

      if (type === 'icon') {
        const phName = ik && ICON_KEY_TO_PH[ik];
        if (phName) {
          // Map to Phosphor via Iconify API
          iconifyOut = { set: 'ph', icon: phName };
          style.color = fillColor;
        } else {
          const decId = ik && SHAPE_TO_DEC[ik];
          if (decId) {
            // LayoutRenderer reads content.decorativeId only under effectiveType==="decorative"
            decorativeId = decId;
            typeOut = 'decorative';
            style.color = fillColor;
          } else {
            // Unknown/missing iconKey → infer from text content or default to a sensible icon
            const contentStr = (z.content || '').trim();
            const inferredKey =
              (contentStr === '+' || contentStr.toLowerCase() === 'plus') ? 'plus' :
              (contentStr === '★' || contentStr === '*') ? 'star' :
              (contentStr === '✓' || contentStr === '✔') ? 'check' :
              (contentStr === '→' || contentStr === '▶' || contentStr === '>') ? 'arrow' :
              (contentStr === '♥' || contentStr === '❤') ? 'heart' :
              (contentStr === '⚡' || contentStr === '⚡️') ? 'bolt' :
              (contentStr === '🔥') ? 'fire' :
              (contentStr === '👑') ? 'crown' :
              (role === 'cta' ? 'arrow' : 'star');
            const infPh = ICON_KEY_TO_PH[inferredKey];
            if (infPh) { iconifyOut = { set: 'ph', icon: infPh }; }
            style.color = fillColor;
          }
        }
      } else if (type === 'decorative') {
        if (sk && !CSS_SHAPES.has(sk)) {
          const decId = SHAPE_TO_DEC[sk];
          if (decId) {
            decorativeId = decId;
            style.color = fillColor;
          } else {
            // Unknown shape key → CSS colored box
            if (!style.background) style.background = fillColor;
          }
        } else {
          // CSS shapes or no shapeKey → use background color
          if (!style.background) style.background = fillColor;
          if (sk === 'circle' || sk === 'ring' || sk === 'dot') style.borderRadius = '50%';
          else if (sk === 'pill') style.borderRadius = 999;
        }
      }
      // icon zone size (how much of the zone the icon fills, 0-100)
      if (type === 'icon') style.iconSize = raw.iconSize ?? 80;
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
        const rawText = (z.content || '').trim();
        const stripped = rawText.replace(/\s+/g, '');

        // Helper: is a single word likely garbled?
        const COMMON_CONSONANT_STARTS = /^(str|spr|scr|shr|spl|squ|thr|chr|sch|wh|kn|gn|ps|ph)/i;
        const isWordGarbled = (word) => {
          if (word.length < 4) return false;
          const vowels  = (word.match(/[aeiou]/gi) || []).length;
          const conRatio = (word.length - vowels) / word.length;
          // 80%+ consonants for words 5+ chars (e.g. "jmilt" = 4/5 = 0.8)
          if (word.length >= 5 && conRatio >= 0.8) return true;
          // 3+ consecutive vowels (e.g. EDUCAEIGNY → AEI)
          if (/[aeiouAEIOU]{3,}/.test(word)) return true;
          // Unusual 3+ consonant cluster at word start (not common English prefixes)
          const startCluster = word.match(/^[bcdfghjklmnpqrstvwxyz]{3,}/i);
          if (startCluster && !COMMON_CONSONANT_STARTS.test(word)) return true;
          return false;
        };

        // Single-token garble (short text, < 28 chars)
        const shortGarble = rawText.length > 0 && rawText.length < 28 && (
          (!/[aeiouAEIOU]/.test(stripped) && /[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]{4,}/.test(stripped)) ||
          /[aeiouAEIOU]{3,}/.test(stripped) ||
          (rawText === rawText.toUpperCase() && !rawText.includes(' ') && stripped.length > 6 && /[BCDFGHJKLMNPQRSTVWXYZ]{5,}/.test(stripped))
        );

        // Multi-word garble: check word-level patterns for longer texts
        const alphaWords = rawText.split(/\s+/).filter(w => /^[a-zA-Z]{4,}$/.test(w));
        const garbledWordCount = alphaWords.filter(isWordGarbled).length;
        const longGarble = rawText.length >= 20 && alphaWords.length >= 3
          && garbledWordCount / alphaWords.length >= 0.33;

        const isGarbled = shortGarble || longGarble;
        const rolePlaceholders = {
          headline: 'YOUR HEADLINE HERE', subtext: 'Supporting detail goes here',
          // Label fallback uses niche name so it reads naturally (e.g. "EDUCATION" not "CATEGORY")
          label: niche ? niche.toUpperCase() : 'CATEGORY',
          stat: '30% OFF', cta: 'GET STARTED',
          tagline: 'Your tagline', metric: '10K+', quote: '"Quote goes here"',
        };
        const cleanText = isGarbled
          ? (rolePlaceholders[role] || rawText)
          : (rawText || rolePlaceholders[role] || '');
        content = { kind: 'text', text: cleanText };
      } else if (type === 'asset') {
        content = { kind: 'asset', asset: { src: null, type: 'image', objectFit: 'cover', motion: 'none', enterTransition: 'none', exitTransition: 'none' } };
      } else if (decorativeId) {
        // decorativeRegistry shape (star burst, sparkle, flower, blob, badge, etc.)
        content = { decorativeId };
      } else if (type === 'icon' && ik && !iconifyOut) {
        // Local iconRegistry fallback (heart, star SVG paths, etc.)
        content = { iconId: ik };
      }
      // pure CSS decorative (circle, pill, etc.): no content needed

      // maxChars: generous limit so content is never truncated — based on actual content + role defaults
      const ROLE_MAX_CHARS = { headline: 40, subtext: 100, tagline: 80, cta: 40, stat: 20, metric: 20, label: 30, quote: 150 };
      const contentText = type === 'text' ? (z.content || '') : '';
      const maxChars = type === 'text'
        ? Math.max(contentText.length + 20, ROLE_MAX_CHARS[role] || 60)
        : undefined;

      // ── Width enforcement ────────────────────────────────────────────────────
      const MIN_WIDTHS_BY_ROLE = { headline: 80, subtext: 75, tagline: 70, cta: 60, stat: 28, metric: 28, label: 22, quote: 70 };
      const rawW = typeof z.width === 'number' ? z.width : 90;
      const rawX = typeof z.x     === 'number' ? z.x     : 5;
      const minW = type === 'text' ? (MIN_WIDTHS_BY_ROLE[role] ?? 50) : rawW;
      let finalW = Math.min(Math.max(rawW, minW), 99);
      let finalX = Math.max(0, Math.min(rawX, 99 - finalW));

      // Stat/label/metric: auto-widen zone to fit content at its fontSize (prevents clipping on nowrap)
      if (type === 'text' && (role === 'stat' || role === 'metric' || role === 'label') && style.fontSize && z.content) {
        const statText = (z.content || '').trim();
        const neededW = Math.min(Math.ceil((statText.length * style.fontSize * 0.62 / 1080) * 100) + 8, 95);
        if (neededW > finalW) {
          finalW = neededW;
          finalX = Math.max(0, Math.min(rawX, 99 - finalW));
        }
      }

      // Headline / CTA / subtext with textAlign:center → force x = (100-width)/2
      // This corrects Vision AI placing centered zones off-center
      if (type === 'text' && style.textAlign === 'center' && ['headline', 'subtext', 'tagline', 'cta', 'quote'].includes(role)) {
        finalX = Math.round((100 - finalW) / 2 * 10) / 10;
      }

      // CTA: if font is too large for the zone width, scale it down to prevent clipping
      if (type === 'text' && role === 'cta' && style.fontSize && z.content) {
        const ctaText = (z.content || '').trim();
        const maxPxForW = (finalW / 100) * 1080 * 0.82; // 82% of px width (rest = padding)
        const neededPx  = ctaText.length * style.fontSize * 0.55;
        if (neededPx > maxPxForW) {
          style.fontSize = Math.max(24, Math.round(maxPxForW / (ctaText.length * 0.55)));
        }
      }

      // Height enforcement: Vision AI consistently underestimates text zone heights.
      // Use fontSize formula as minimum so stacking post-processing has accurate bottom edges.
      const rawH    = typeof z.height === 'number' ? z.height : 10;
      const minFontH = type === 'text' && style.fontSize ? (style.fontSize / 1920) * 100 * 1.25 : 0;
      const computedH = type === 'text' ? Math.max(rawH, minFontH) : rawH;

      return {
        id:             z.id || `z${i + 1}`,
        type: typeOut, role,
        x:              finalX,
        y:              typeof z.y      === 'number' ? z.y      : 5,
        width:          finalW,
        height:         computedH,
        zIndex,
        start:          z.animationDelay ?? (i * 0.1),
        end:            null,
        enterAnimation: z.animation || (type === 'asset' ? 'fadeIn' : type === 'icon' ? 'popIn' : 'fadeIn'),
        exitAnimation:  'none',
        style,
        ...(iconifyOut        !== undefined ? { iconify: iconifyOut }                     : {}),
        ...(content           !== undefined ? { content }                                 : {}),
        ...(maxChars          !== undefined ? { maxChars }                                : {}),
        ...(z.assetDescription              ? { assetDescription: z.assetDescription }   : {}),
      };
    }

    let zones = (parsed.zones || []).map(toInternalZone);

    // ── Post-process 1: stack multi-line headlines (heights now font-corrected) ──
    {
      const hlZones = zones
        .filter(z => z.role === 'headline' && z.type === 'text')
        .sort((a, b) => (a.y || 0) - (b.y || 0));
      if (hlZones.length > 1) {
        let cursor = hlZones[0].y || 0;
        const newYMap = new Map();
        for (const hl of hlZones) {
          newYMap.set(hl.id, Math.round(cursor * 10) / 10);
          cursor = Math.round(cursor * 10) / 10 + (hl.height || 0) + 0.8;
        }
        zones = zones.map(z => newYMap.has(z.id) ? { ...z, y: newYMap.get(z.id) } : z);
      }
    }

    // ── Post-process 2: push ALL non-headline text zones below the headline block ─
    // Group zones at same y (±1.5%) into rows so side-by-side elements stay together
    {
      const hlBottomEdge = zones
        .filter(z => z.role === 'headline' && z.type === 'text')
        .reduce((max, z) => Math.max(max, (z.y || 0) + (z.height || 0)), 0);

      if (hlBottomEdge > 0) {
        // Non-headline text zones that fall inside the headline block area
        const toPlace = zones
          .filter(z => z.type === 'text' && z.role !== 'headline' && (z.y || 0) < hlBottomEdge)
          .sort((a, b) => (a.y || 0) - (b.y || 0));

        if (toPlace.length > 0) {
          // Group into rows: zones within 1.5% y of each other are side-by-side
          const rows = [];
          for (const z of toPlace) {
            const lastRow = rows[rows.length - 1];
            if (lastRow && Math.abs((z.y || 0) - lastRow.y) <= 1.5) {
              lastRow.zones.push(z);
              lastRow.rowH = Math.max(lastRow.rowH, z.height || 0);
            } else {
              rows.push({ y: z.y || 0, rowH: z.height || 0, zones: [z] });
            }
          }
          // Place rows sequentially starting from below the headline block
          const pushMap = new Map();
          let cursor = hlBottomEdge + 1.5;
          for (const row of rows) {
            const rowY = Math.round(cursor * 10) / 10;
            for (const z of row.zones) pushMap.set(z.id, rowY);
            cursor = rowY + row.rowH + 1;
          }
          zones = zones.map(z => pushMap.has(z.id) ? { ...z, y: pushMap.get(z.id) } : z);
        }
      }
    }

    // ── Post-process: inject circle decoration behind circular stat/label badges ─
    {
      const injections = [];
      zones.forEach((z, idx) => {
        const br = z.style?.borderRadius;
        const hasBg = z.style?.background || z.style?.backgroundColor;
        const isCircle = br === '50%' || Number(br) >= 50;
        if (z.type === 'text' && hasBg && isCircle && ['stat', 'metric', 'label'].includes(z.role)) {
          const bgColor = z.style.background || z.style.backgroundColor;
          const sz = Math.max(z.width || 10, typeof z.height === 'number' ? z.height : 10);
          const cx = (z.x || 0) + ((z.width || sz) - sz) / 2;
          injections.push({
            before: idx,
            zone: {
              id: `${z.id}_circle`,
              type: 'decorative', role: 'decorative',
              x: cx, y: z.y || 0, width: sz, height: sz,
              zIndex: Math.max((z.zIndex || 4) - 1, 1),
              start: z.start, end: null,
              enterAnimation: 'fadeIn', exitAnimation: 'none',
              style: { background: bgColor, borderRadius: '50%' },
            },
          });
          // Strip background/borderRadius from text zone — decorative circle carries it
          const newStyle = { ...z.style };
          delete newStyle.background; delete newStyle.backgroundColor; delete newStyle.borderRadius;
          zones[idx] = { ...z, style: newStyle };
        }
      });
      // Insert in reverse order so earlier indices stay valid
      for (let i = injections.length - 1; i >= 0; i--) {
        zones.splice(injections[i].before, 0, injections[i].zone);
      }
    }

    // ── visual_rest: ensure exactly asset + label + caption ──────
    if (intent === 'visual_rest') {
      // 1. Ensure full-bleed asset zone exists at z-index 1
      const hasFullAsset = zones.some(z => z.type === 'asset' && (z.width || 0) >= 80 && (z.height || 0) >= 80);
      if (!hasFullAsset) {
        // Grab any existing asset zone to steal its assetDescription, else use niche fallback
        const anyAsset = zones.find(z => z.type === 'asset');
        const assetDesc = anyAsset?.assetDescription || `atmospheric ${niche || 'lifestyle'} scene, cinematic photography, full bleed`;
        zones = zones.filter(z => z.type !== 'asset'); // remove partial assets
        zones.unshift({
          id: 'vr_asset',
          type: 'asset', role: 'primary_asset',
          x: 0, y: 0, width: 100, height: 100,
          zIndex: 1, start: 0.1, end: null,
          enterAnimation: 'fadeIn', exitAnimation: 'none',
          style: { objectFit: 'cover' },
          content: { kind: 'asset', asset: { src: '', type: 'image', motion: 'none', objectFit: 'cover', enterTransition: 'none', exitTransition: 'none' } },
          assetDescription: assetDesc,
          background: {},
        });
      }
      // 2. Ensure label text zone at top
      const hasLabel = zones.some(z => z.type === 'text' && (z.role === 'label' || (z.y || 0) < 12));
      if (!hasLabel) {
        zones.push({
          id: 'vr_label',
          type: 'text', role: 'label',
          x: 35, y: 4, width: 30, height: 3,
          zIndex: 5, start: 0.2, end: null,
          enterAnimation: 'fadeIn', exitAnimation: 'none',
          style: { color: '#ffffff', fontSize: 32, fontWeight: '400', fontFamily: 'Montserrat', textAlign: 'center', letterSpacing: '0.15em' },
          content: { kind: 'text', text: (niche || 'LIFESTYLE').toUpperCase() },
          maxChars: 12,
          background: {},
        });
      }
      // 3. Ensure caption text zone at bottom
      const hasCaption = zones.some(z => z.type === 'text' && (z.y || 0) > 70);
      if (!hasCaption) {
        zones.push({
          id: 'vr_caption',
          type: 'text', role: 'subtext',
          x: 10, y: 84, width: 80, height: 4,
          zIndex: 5, start: 0.4, end: null,
          enterAnimation: 'fadeIn', exitAnimation: 'none',
          style: { color: '#ffffff', fontSize: 44, fontWeight: '300', fontFamily: 'Playfair Display', textAlign: 'center', fontStyle: 'italic' },
          content: { kind: 'text', text: 'Find your still.' },
          maxChars: 22,
          background: {},
        });
      }
      // 4. Remove all other text/decorative/icon zones — keep it minimal
      zones = zones.filter(z =>
        (z.type === 'asset' && (z.width || 0) >= 80) ||
        z.id === 'vr_label' || z.id === 'vr_caption' ||
        (z.type === 'text' && ((z.role === 'label' && (z.y || 0) < 12) || (z.y || 0) > 70))
      );
    }

    // ── Re-index IDs ──────────────────────────────────────────────
    zones = zones.map((z, i) => ({ ...z, id: `z${i + 1}` }));

    console.log('[convert-layout-image] ── PROCESSED ZONES ──────────────────────');
    zones.forEach(z => {
      console.log(`  ${z.id} [${z.type}/${z.role}] x:${z.x} y:${z.y} w:${z.width} h:${z.height} | maxChars:${z.maxChars ?? '-'} iconify:${z.iconify ? z.iconify.icon : '-'}${z.assetDescription ? ` | asset:"${z.assetDescription}"` : ''}`);
    });
    console.log('──────────────────────────────────────────────────────────────────\n');

    // ── Build default_background for LayoutBackgroundRenderer ─────
    // For solid/pattern: derive CSS color/gradient → stored as generation_meta.default_background
    // LayoutRenderer falls back to this when beat.layoutBackground is not explicitly set.
    // For abstract: value starts null; client fills it in once the background image is generated.
    let defaultBackground = null;
    if (bgCategory === 'solid' || bgCategory === 'pattern') {
      const css = bgColors.length >= 2
        ? `linear-gradient(${bgDirection || 'to bottom'}, ${bgColors.join(', ')})`
        : (bgColors[0] || '#0a0a0a');
      defaultBackground = { type: bgColors.length >= 2 ? 'gradient' : 'color', value: css };
    } else if (bgCategory === 'abstract') {
      defaultBackground = { type: 'image', value: null }; // filled in after generate-layout-assets
    }

    return res.json({
      zones,
      background_category: bgCategory,
      background_colors:   bgColors,
      background_gradient_direction: bgDirection,
      color_family:        colorFamily,
      background_needs_image:  bgNeedsImg,
      background_image_prompt: bgImgPrompt,
      default_background:      defaultBackground,
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

    // Intent-specific layout structure definitions
    const INTENT_LAYOUTS = {
      hook: {
        description: 'Stop the scroll. Bold visual, dominant headline, immediate impact. Everything fights for attention in the first frame.',
        elements: `1. BACKGROUND — bold gradient or high-contrast solid. Specify exact hex colors.
2. CATEGORY LABEL — small pill/tag at very top (top 12%). Uppercase niche name inside colored pill.
3. HEADLINE — massive ultra-bold text, 6-10 words shown as a COMPLETE THOUGHT or curiosity question across 1-2 lines (12-42%). e.g. "WHY MRBEAST GIVES AWAY MILLIONS" or "THIS CHANGED EVERYTHING OVERNIGHT". Condensed heavy typeface. NEVER a single dramatic word like "WOW", "EPIC", "BIG", "ARENA" — always a meaningful multi-word phrase that makes sense on its own.
4. SUBTEXT — 5-8 word supporting line directly below headline, lighter weight.
5. SUBJECT — striking visual (person, product, character) filling center (40-75%), drop shadow, isolated on background.
6. DECORATIVE ACCENTS — min 2: corner geometric, side accent strip, floating icon, or price badge.
7. CTA — full-width bottom bar or large pill button at bottom (88-100%). Bold directive text + arrow.
8. SPACING: top 12%=label, 12-42%=headline+sub, 42-75%=subject, 75-88%=accent, 88-100%=CTA.`,
        example: `Bold fitness hook on burnt orange to crimson gradient. TOP: white pill badge "FITNESS" at top-center. Upper third: ultra-bold condensed "WHY 10 MILLION PEOPLE CAN'T STOP WATCHING" in white across 2 lines, yellow divider line below. Sub-line "Gear Up For Greatness" in off-white. CENTER: red dumbbells product shot, 55% canvas width, drop shadow. Large faint circle behind product. Left: thin yellow accent strip. Bottom-right: circular "50% OFF" badge on dark pill. BOTTOM: full-width charcoal bar "SHOP NOW →" in white bold.`
      },
      proof: {
        description: 'Show evidence. Asset-led — one or two images showing the result, product, or person. Supporting text below or beside. Feels credible and visual. NO CTA — the evidence speaks for itself.',
        elements: `1. BACKGROUND — clean, professional, neutral or slightly dark. Trust-building palette.
2. CATEGORY LABEL — small pill at top with niche + "RESULTS" or "VERIFIED" indicator.
3. PROOF VISUAL — DOMINANT. Person using product, before/after split, or screenshot of results. Large image filling upper-center (12-65%). This is the hero — make it the biggest element.
4. RESULT STAT — bold prominent number or result overlapping or directly below the visual (e.g. "10,000 CUSTOMERS", "4.9★", "97% SUCCESS"). High contrast.
5. CLAIM TEXT — brief credibility statement (e.g. "Trusted by professionals worldwide"). Medium weight, 6-10 words.
6. TRUST BADGES — star rating, certification badge, logo strip, or checkmark list (3 short bullet points). Lower area (72-90%).
7. NO CTA — end with trust signals. Do not add a CTA button or bar.
8. SPACING: top 12%=label, 12-65%=dominant proof visual, 65-78%=stat+claim, 78-100%=trust badges.`,
        example: `Clean dark navy proof layout for finance. TOP: small pill "FINANCE • VERIFIED". CENTER-DOMINANT: professional in suit reviewing charts on laptop, image filling 55% canvas width, clean background. Overlapping the bottom of the image: giant white bold "97% SUCCESS RATE" centered, gold accent underline. Below: "Trusted by 50,000 investors worldwide" in light grey. Bottom area: row of 3 gold checkmarks — "Regulated", "Insured", "Proven". Star rating "4.9 ★★★★★". No CTA button.`
      },
      stat: {
        description: 'One big number owns the screen. Everything else supports it — a label above, context below. Clean, minimal, the number is the hero. NO CTA.',
        elements: `1. BACKGROUND — minimal, clean solid or soft gradient. Background serves the number, does not compete.
2. CATEGORY LABEL — tiny label or pill at very top (top 10%).
3. STAT CONTEXT LABEL — short phrase ABOVE the number telling what it measures (e.g. "Conversion Rate", "Monthly Revenue", "Students Enrolled"). Smaller, lighter weight.
4. GIANT STAT NUMBER — the SINGLE most important number, ultra-bold, fills 20-50% of canvas height. Centered. E.g. "87%", "$2.4M", "10K+", "3X". This IS the layout. Make it enormous.
5. CONTEXT VISUAL — small supporting graphic (upward chart, icon, minimal illustration) below the number at 55-72%. NOT dominant.
6. SUPPORTING CLAIM — one sentence below visual explaining the stat in context. Max 10 words.
7. NO CTA — the stat is the ending. Do not add a button or CTA bar.
8. SPACING: 10%=label, 18-28%=stat context label, 28-58%=giant number, 58-72%=small visual, 72-88%=claim text.`,
        example: `Minimal dark stat layout for business. Soft black background. TOP: tiny "BUSINESS" pill. Small "Active Users This Month" label in medium grey at 22%. CENTER-DOMINANT: enormous white bold "10,000+" number filling 35% of canvas, with thin gold line above and below it. Small upward trend chart icon at 62%. One-line "Growing 40% month over month" in light grey. No CTA button — layout ends with the supporting claim.`
      },
      contrast: {
        description: 'Before vs After. Two states shown side by side or stacked. Clear visual comparison of transformation.',
        elements: `1. BACKGROUND — split design: LEFT half one color/tone, RIGHT half contrasting color/tone. Or TOP dark, BOTTOM light.
2. CATEGORY LABEL — centered at very top spanning both sides.
3. BEFORE LABEL — "BEFORE" text on left/top side in dark or muted color. Small uppercase label.
4. AFTER LABEL — "AFTER" text on right/bottom side in bright accent color. Small uppercase label.
5. SPLIT VISUAL — two contrasting images or illustrations side-by-side (person before/after, product old/new, situation bad/good). Takes 35-70% of canvas.
6. DIVIDER — bold center line or arrow dividing the two states.
7. CONTRAST HEADLINE — short description of the transformation. E.g. "THE DIFFERENCE IS CLEAR". Spans both sides.
8. CTA — at bottom spanning full width (88-100%).
9. SPACING: top 10%=label, 10-25%=before/after labels + headline, 25-72%=split visual with divider, 72-88%=result text, 88-100%=CTA.`,
        example: `Split contrast layout for skincare. Left half: dull grey-beige, right half: vibrant warm peach. TOP: "SKINCARE" pill centered. LEFT: dull muted skin texture photo labeled "BEFORE" in grey. RIGHT: glowing radiant skin photo labeled "AFTER" in coral. Bold vertical white divider with arrow in center. Headline spanning both: "SEE THE DIFFERENCE" in dark bold at top of image area. Below images: "8 weeks to radiant skin" centered. BOTTOM: full-width peach bar "START YOUR JOURNEY →".`
      },
      escalate: {
        description: 'Building energy. Stacked text layers, each line hitting harder than the last. Feels like things are ramping up — pressure, stakes, momentum. NO CTA.',
        elements: `IMPORTANT: This layout has MAX 4 ZONES TOTAL — a background, a small label, and 2-3 text lines. Do NOT create more than 4 zones.
1. BACKGROUND — dark, intense, high-energy colors. Deep red, dark orange, near-black, or dramatic gradient. Full canvas. This is zone 1.
2. URGENCY LABEL — small pill at top "⚡ LIMITED TIME" or "🔥 BREAKING" in red/orange. This is zone 2.
3. ESCALATING HEADLINE — a SHORT punchy phrase (3-6 words), ultra-bold condensed, large. Positioned upper-center (20-45%). E.g. "LAST CHANCE" or "THE TIME IS NOW". This is zone 3.
4. ESCALATING PAYOFF — the final knockout line (1-4 words), even bigger and bolder than zone 3. Positioned center-lower (50-72%). E.g. "GO." or "IT'S HAPPENING." or "MOVE NOW." This is zone 4.
NO MORE ZONES. Total = 4 zones only. No CTA. No subtext. No accent badges. No extra lines.`,
        example: `Intense dark escalate layout for fitness. Near-black to deep crimson gradient. TOP: small fiery orange pill "⚡ BREAKING" — zone 2. Zone 3: large white condensed bold "THE TIME IS NOW" centered at 30%. Zone 4: massive ultra-bold full-width "GO." at 60%, biggest element on canvas. Dramatic vignette border. No CTA, no subtext, no extra zones — only 4 zones total.`
      },
      explanation: {
        description: 'Calm and clear. Asset on top showing the subject — sharp, well-lit, professional. Structured text below. Readable, spacious, educational. Step or label element optional. NO CTA.',
        elements: `1. BACKGROUND — light, clean, or soft toned. Readable and calm — this is educational content.
2. CATEGORY LABEL — small pill at top with niche category.
3. EXPLANATION HEADLINE — "HOW IT WORKS", "3 SIMPLE STEPS", or concept title. Bold but not aggressive. Upper area (10-25%).
4. ASSET/VISUAL — MANDATORY. Sharp, well-lit, professional photo or illustration of the subject. Studio-quality. "Sharp focus", "professional photography", "studio lighting", clean edges. Positioned prominently (25-55%). NOT blurry, NOT stylized — crisp and clear.
5. STEP/POINT BLOCKS — 2-4 numbered steps or concept points below the visual (55-82%). Each block: number/icon + short title + 1-line description. Visually distinct with subtle dividers or cards.
6. SUPPORTING SUBTEXT — brief reassurance below the steps (e.g. "Simple. Fast. Effective.").
7. NO CTA — the explanation is complete. Do not add a button or CTA bar.
8. SPACING: 10%=label, 10-25%=headline, 25-55%=sharp well-lit asset, 55-82%=step blocks, 82-100%=subtext + quiet space.`,
        example: `Clean white explanation layout for education. White background with blue accents. TOP: "EDUCATION" blue pill label. Bold "HOW IT WORKS" headline in dark navy. CENTER: sharp professional photo of a student using a tablet app — studio lighting, crisp focus, clean background, product clearly visible — filling 35% of canvas width. THREE numbered step cards below (slight drop shadow, white cards): "① Choose Your Topic" with book icon, "② Practice Daily" with calendar icon, "③ Track Your Progress" with chart icon. Below: "Used by 50,000+ students" in grey. No CTA button — layout ends with the reassurance line.`
      },
      reveal: {
        description: 'Dramatic payoff. Large asset with minimal text overlay. The visual IS the message. Text appears late, feels like a curtain being pulled back. NO CTA.',
        elements: `1. BACKGROUND — dramatic, transitioning from dark/mystery (top) to vivid/clear (bottom) or full-bleed cinematic image.
2. CATEGORY LABEL — small pill at top. Minimal.
3. MYSTERY TEXT — sparse teaser text in upper area (10-30%). E.g. "WHAT IF WE TOLD YOU...", "THE SECRET IS OUT", "REVEALED:". Small, muted — building anticipation, NOT dominating.
4. REVEAL VISUAL — DOMINANT. The hero image fills 35-78% of the canvas. Product emerging from shadow, dramatic transformation, cinematic unveil. Large, high-impact. The visual IS the message.
5. SPOTLIGHT/GLOW EFFECT — light rays, starburst, or spotlight glow emanating from the reveal visual. Dramatic.
6. RESULT TEXT — bold punchy text directly below the visual (78-90%). The payoff line. E.g. product name, transformation result, the revealed secret. High contrast, punchy. This is the last thing they read.
7. NO CTA — the reveal IS the ending. No button, no bar.
8. SPACING: 10%=tiny label, 10-30%=sparse mystery text, 30-78%=dominant reveal visual with spotlight, 78-92%=bold payoff result text.`,
        example: `Dramatic dark-to-gold reveal layout for skincare. Deep charcoal top fading to warm champagne gold at bottom. TOP: small "SKINCARE" label. Sparse italic "The secret is out." in muted grey at 18%. CENTER-DOMINANT: skincare serum bottle emerging dramatically from dark shadow into spotlight, golden light rays radiating outward, product occupying 60% canvas width, filling 40% of canvas height. Dramatic warm glow halo around product. Bold "LIQUID GOLD" in large champagne text below product at 82%. No CTA — the product reveal is the final beat.`
      },
      testimonial: {
        description: 'Human voice. Quote-led design. Large italic text center stage. Small attribution label below. Asset optional — circle avatar or background image at low opacity. NO CTA.',
        elements: `1. BACKGROUND — warm, approachable, clean. Light neutral or soft gradient. Flatters and feels human.
2. CATEGORY LABEL — small trust-indicator pill at top (e.g. "★ VERIFIED REVIEW", "REAL RESULTS").
3. PERSON PHOTO — DOMINANT. Real person (happy, transformed, credible). Upper-center area (10-52%). Large, warm lighting, natural expression. Not a model — relatable. Or a circular avatar if testimonial-card style.
4. RESULT BADGE — small pill overlapping or near the photo showing their specific result (e.g. "-23 lbs", "Promoted in 3 months", "Saved $400/month").
5. STAR RATING — 5 stars displayed prominently below the photo.
6. QUOTE TEXT — HERO. Large italic or bold pull quote (58-84%). 1-2 sentences. E.g. "This changed my life completely. I can't imagine going back." Attribution below: name + credential in smaller text.
7. NO CTA — the testimonial is the ending. The human voice is the call to believe. No button or bar.
8. SPACING: 10%=trust label, 10-52%=dominant person photo with result badge, 52-58%=star rating, 58-84%=large quote+attribution, 84-100%=social proof count or quiet space.`,
        example: `Warm cream testimonial layout for health. Soft cream to pale peach gradient. TOP: "★ VERIFIED RESULT" small green pill. CENTER-DOMINANT: smiling woman, natural photo, warm lighting, 45% canvas width, looking slightly off-camera. Small green pill badge overlapping her photo: "-18 lbs in 60 days". Five gold stars below photo. Large italic quote: "I never thought it would work this fast. My doctor was shocked." — Sarah M., 34. "47,000 people achieved similar results" in small grey text. No CTA — ends with the human story.`
      },
      visual_rest: {
        description: 'Breathe. Full bleed atmospheric asset filling the entire canvas. Minimal text overlaid on top. Palette cleanser between heavy beats. The image IS the content — rich, detailed, cinematic.',
        elements: `IMPORTANT: This layout has EXACTLY 3 ZONES — 1 asset zone + 1 label text zone + 1 caption text zone. No more.
1. FULL BLEED ASSET ZONE — MANDATORY. Rich, detailed, atmospheric photograph or cinematic illustration. Fills the ENTIRE canvas (x=0, y=0, width=100, height=100). This is NOT a background color — it is a real image zone with real content. Must depict a specific scene: landscape, styled interior, portrait, nature, or product in environment. NOT a plain color, NOT a gradient, NOT empty.
2. CATEGORY LABEL TEXT ZONE — small, minimal text. Positioned at top of canvas (y=3-7%). Elegant, refined. E.g. "TRAVEL" or "WELLNESS". Overlaid on the asset.
3. CAPTION TEXT ZONE — ONE short line, max 8 words. Elegant italic or light weight. Positioned at bottom (y=82-88%). E.g. "The world is waiting." or "Find your still." Overlaid on the asset.
NO MORE ZONES. Total = 3 zones: asset + label + caption. No headline zone, no CTA, no subtext, no decorative elements.`,
        example: `Full bleed visual rest layout for travel. Zone 1 ASSET: stunning wide-angle cinematic photo of golden-hour light over a misty mountain valley — rich atmospheric haze, warm amber and deep blue tones, fills 100% canvas. Zone 2 LABEL TEXT: tiny white "TRAVEL" at top (y=5%). Zone 3 CAPTION TEXT: delicate italic "The world is waiting." in soft white at y=85%. Only these 3 zones — no headline, no CTA, no other elements.`
      },
      cta: {
        description: 'Action-oriented. Bold directive headline. Supporting line. No asset needed. Ends with energy — follow, comment, share, click. The CTA button is the hero.',
        elements: `1. BACKGROUND — high contrast, action-oriented. Bold but not chaotic. Single strong color or tight gradient.
2. CATEGORY LABEL — small at very top, minimal presence.
3. BENEFIT HEADLINE — what they GET by clicking. 3-5 words. E.g. "GET YOUR FREE GUIDE", "DOUBLE YOUR SALES". Upper area (10-30%). Bold, benefit-focused.
4. THE CTA BUTTON — MASSIVE. Centered on canvas (40-65%). Pill or rectangle shape. Largest element. High contrast to background. Action verb + noun. E.g. "CLAIM FREE ACCESS →", "START NOW FREE →". This fills 50-70% canvas width and is visually dominant.
5. SUPPORTING REASON — 1-2 lines below CTA button explaining WHY to click (e.g. "No credit card. Cancel anytime."). Small, reassuring.
6. URGENCY LINE — brief urgency element above or below CTA (e.g. "Join 12,000+ members", "Only 50 spots left").
7. TRUST MICRO-ELEMENT — small lock icon + "Secure", checkmark + "Free", or star rating. Near the CTA.
8. SPACING: 10%=label, 10-30%=benefit headline, 30-40%=urgency line, 40-65%=GIANT CTA BUTTON, 65-80%=supporting reason, 80-90%=trust micro, 90-100%=secondary text.`,
        example: `High-impact purple CTA layout for business. Deep violet to rich purple gradient. TOP: tiny white "BUSINESS" label. Bold "DOUBLE YOUR REVENUE" in large white condensed. Below: "12,847 businesses already growing" in soft lavender. CENTER-DOMINANT: massive bright gold rounded rectangle button "CLAIM YOUR FREE STRATEGY CALL →" in dark text, 65% canvas width, slight glow/shadow. Below button: "No obligation. 30 minutes. Real results." in small white. Lock icon + "100% Secure & Confidential" in tiny grey. BOTTOM: "Or learn more at our website" in small muted text.`
      },
    };

    const intentKey = intent.toLowerCase().replace(/[^a-z_]/g, '');
    const layoutSpec = INTENT_LAYOUTS[intentKey] || INTENT_LAYOUTS.hook;

    const systemPrompt = `You are a creative director generating image-generation prompts for 9:16 vertical social media layout mockups.

Each prompt describes a COMPLETE, DENSE layout scene — background, subject, text, decorative accents, and CTA all composed together — to be rendered by an AI image generator (Flux). The output will be used as a visual reference for decomposing into editable zones.

Think like a professional art director. Every part of the canvas should feel purposeful.

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

ENERGY guide:
- high: bold colors, large type, dynamic angles, high contrast
- medium: balanced composition, clean type, professional subject
- low: minimal, quiet palette, refined

LAYOUT DESIGN CONSTRAINTS — CRITICAL FOR EDITABILITY:
The generated layout image will be broken down into editable zones by our system.
- Text must always be a SEPARATE typographic layer — never embedded in illustrations or artwork
- Subject must sit cleanly ON the background — not blended into it
- Maximum 3 asset zones total, maximum 5 text zones total
- NOT allowed: gradient text, metallic text, 3D extruded text, text baked into artwork
- Headline zones must contain 6+ words — single decorative words like "WOW", "EPIC", "BIG", "ARENA", "GO" are NOT headlines, they are design flaws. Every headline must be a complete readable thought or question.
- maxChars for headline zones must accommodate at least 20 characters of real content — never design a headline zone so narrow it can only fit 1-2 words.

══════════════════════════════════════
THIS IS A "${intent.toUpperCase()}" LAYOUT
Intent: ${layoutSpec.description}
══════════════════════════════════════

MANDATORY ELEMENTS FOR THIS INTENT:

${layoutSpec.elements}

EXAMPLE PROMPT FOR THIS INTENT (different niche — for structural reference only):
'${layoutSpec.example} Vertical 9:16 social media template. Professional. Sharp. No UI chrome. No device frames.'

Your prompts MUST follow the ${intent.toUpperCase()} structure above. Do NOT default to a generic hook/headline/subject/CTA layout if the intent calls for something different.`;

    const userPrompt = `Generate ${count} unique image-generation prompts for:
Niche: ${niche}
Intent: ${intent}
Energy: ${energy}

CRITICAL: These are "${intent.toUpperCase()}" layouts — follow the intent-specific structure defined above.
Do NOT default to a generic headline+subject+CTA hook layout unless intent is "hook".

Each prompt must be structurally distinct from the others — vary the composition, color story, subject type, and decorative choices while keeping the ${intent} intent structure.

Layout quality rules (apply to all intents):
- Every element must be in a clearly separated zone — no overlapping text layers
- Background is separate from subject — subject sits ON the background with visible edge
- Geometric clarity: use clear rectangles, pills, circles. No random floating elements
- Clean spacing between all zones — no cramped stacking
- Simple structure that can be broken into distinct editable zones

Return as JSON: { "prompts": [
  {
    "id": "p1",
    "title": "short descriptive title",
    "visual_direction": "one sentence describing the ${intent} approach and aesthetic",
    "prompt": "Full detailed image-generation prompt following the ${intent.toUpperCase()} mandatory elements and spacing guide. Describe every element's position, color, size, and style explicitly. End with: Vertical 9:16 social media template. Professional. Sharp. No UI chrome. No device frames."
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
    const { promptId, zones, niche, intent, background_needs_image, background_image_prompt, color_family } = req.body;
    if (!zones || !Array.isArray(zones)) return res.status(400).json({ error: 'zones required' });

    const assetZones = zones.filter(z => z.type === 'asset' && ['primary_asset','secondary_asset'].includes(z.role));
    const results = [];

    // Generate subject/asset images
    for (const zone of assetZones) {
      try {
        // Build a niche-specific subject prompt for this asset zone.
        // Do NOT include any layout/UI description — Flux would generate a full mockup.
        // Intent modifier — overrides niche subject when intent signals a specific visual style
        const INTENT_OVERRIDES = {
          motivate:  { health: 'athletic person in dynamic running or workout pose, sportswear, energetic', lifestyle: 'motivated person in action, bright energetic scene', fitness: 'athlete in powerful workout pose, gym or outdoor' },
          inspire:   { health: 'athletic person running or jumping, full energy, clean background', fitness: 'athlete at peak performance, dynamic action shot' },
          challenge: { health: 'person pushing physical limits, sport or fitness activity', fitness: 'competitive athlete in action' },
          educate:   { health: 'healthcare professional or wellness expert, clean background', finance: 'financial advisor at desk or presentation', business: 'professional presenting or teaching' },
          entertain: { comedy: 'funny expressive emoji face or cartoon character, bright bold colors', entertainment: 'vibrant performer in colorful costume, dynamic pose' },
          promote:   {},
          sell:      {},
          hook:      {},
        };
        const NICHE_ASSET_PROMPTS = {
          comedy:        'funny expressive emoji face or cartoon character, bright cheerful colors, clean background',
          entertainment: 'vibrant performer or character, dynamic energetic pose, clean background',
          gaming:        'gaming character or person with headset and controller, dramatic neon lighting, dark background',
          education:     'student or teacher with books or laptop, bright professional background',
          finance:       'confident financial professional in business attire, clean minimal background',
          business:      'confident professional in smart business attire, clean minimal background',
          fitness:       'athletic person in dynamic workout pose, gym or studio, energetic',
          health:        'fit healthy person in athletic wear, vibrant clean background',
          food:          'appetizing food dish or drink, professional food photography, clean background',
          fashion:       'stylish person wearing on-trend outfit, editorial studio background',
          travel:        'person at scenic travel location or with travel gear, vibrant setting',
          technology:    'sleek modern tech device or person using tech, minimal clean background',
          lifestyle:     'person enjoying an aspirational lifestyle moment, bright airy background',
        };
        const nicheKey = niche?.toLowerCase().replace(/[^a-z]/g, '') || 'business';
        const intentKey = intent?.toLowerCase() || '';
        const intentOverride = INTENT_OVERRIDES[intentKey]?.[nicheKey];
        const nicheDesc = intentOverride || NICHE_ASSET_PROMPTS[nicheKey] || `${niche} subject, professional photo, clean background`;
        // Vision AI provides per-zone assetDescription — use it as primary prompt when available
        const zoneDesc = zone.assetDescription || zone._assetDescription;
        const baseDesc = zoneDesc
          ? zoneDesc
          : (zone.role === 'primary_asset'
            ? `${nicheDesc}, main hero subject, sharp focus, isolated foreground, full body or portrait`
            : `${nicheDesc}, supporting element, secondary composition`);
        const subjectPrompt = `${baseDesc}, photorealistic, no text overlays, no logos, no UI elements, no layout mockup, no social media frame, ultra high quality`;

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

// POST /api/image-generation/enhance-prompt
app.post("/api/image-generation/enhance-prompt", requireAuth, async (req, res) => {
  try {
    const { prompt, type } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: "prompt required" });
    if (!["poster", "thumbnail"].includes(type)) return res.status(400).json({ error: "type must be poster or thumbnail" });

    const instructions = {
      poster:    "Transform this into a detailed vertical 9:16 marketing poster image generation prompt. Include: bold typography zone, subject/person or product, background style, color palette, decorative elements, CTA area. Professional Canva-style. No UI chrome.",
      thumbnail: "Transform this into a detailed horizontal 16:9 YouTube thumbnail image generation prompt. Include: expressive human face or reaction, bold text overlay area, high contrast colors, dramatic lighting, click-worthy composition. No UI chrome.",
    };

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 300,
      messages: [
        { role: "system", content: `You are an expert image generation prompt engineer. ${instructions[type]}` },
        { role: "user",   content: `Original idea: ${prompt.trim()}\n\nWrite an enhanced detailed image generation prompt. Return only the prompt, no explanation.` },
      ],
    });

    res.json({ enhanced: response.choices[0].message.content.trim() });
  } catch (err) {
    console.error("[enhance-prompt]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/image-generation/generate
// Body: { prompt, style, aspect_ratio, quality, count }
// Generates images via Fal.ai, uploads to Supabase, saves to generated_images table
app.post("/api/image-generation/generate", requireAuth, async (req, res) => {
  try {
    const { prompt, aspect_ratio = "1:1", count = 1, type = "image" } = req.body;
    const quality = "standard";
    if (!prompt?.trim()) return res.status(400).json({ error: "prompt required" });
    if (!process.env.FAL_API_KEY) return res.status(500).json({ error: "FAL_API_KEY not set" });

    const numImages = Math.min(Math.max(parseInt(count) || 1, 1), 4);

    const creditsPerImage = 2;
    const totalCredits = numImages * creditsPerImage;

    const creditResult = await deductCredits(
      req.user.id,
      totalCredits,
      "image_generation",
      `Image generation: "${prompt.slice(0, 60)}" × ${numImages}`,
      null
    );
    if (!creditResult.success) return res.status(402).json({ error: creditResult.error, code: "NO_CREDITS" });

    // Build fal.ai size from aspect_ratio
    const SIZES = {
      "1:1":  { width: 1024, height: 1024 },
      "16:9": { width: 1280, height: 720  },
      "9:16": { width: 720,  height: 1280 },
    };
    const imageSize = SIZES[aspect_ratio] || SIZES["1:1"];


    // Auto-enhance short prompts (<200 chars) — transparent to the user
    const ENHANCE_THRESHOLD = 200;
    const ENHANCE_INSTRUCTIONS = {
      image:     "Transform this into a detailed, vivid image generation prompt. Describe lighting, composition, mood, colors, and style. Keep it natural and photographic.",
      poster:    "Transform this into a detailed vertical 9:16 marketing poster image generation prompt. Include bold typography area, subject, background style, color palette, decorative elements, CTA zone. Professional Canva-style. No text overlays, no UI chrome.",
      thumbnail: "Transform this into a detailed horizontal 16:9 YouTube thumbnail image generation prompt. Include expressive face or reaction, high contrast colors, dramatic lighting, click-worthy composition. No UI chrome.",
    };

    let finalPrompt = prompt.trim();
    if (finalPrompt.length < ENHANCE_THRESHOLD) {
      try {
        const enhanced = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          max_tokens: 200,
          messages: [
            { role: "system", content: ENHANCE_INSTRUCTIONS[type] || ENHANCE_INSTRUCTIONS.image },
            { role: "user",   content: finalPrompt },
          ],
        });
        finalPrompt = enhanced.choices[0].message.content.trim();
        console.log(`[image-gen] prompt auto-enhanced (${prompt.length} → ${finalPrompt.length} chars)`);
      } catch (e) {
        console.warn("[image-gen] prompt enhancement failed, using original:", e.message);
      }
    }

    const fullPrompt = finalPrompt;

    const isHighQuality = quality === "high";
    const model = isHighQuality ? "fal-ai/flux/dev" : "fal-ai/flux/schnell";
    // schnell: max 12 steps, no guidance_scale; dev: up to 50 steps, guidance_scale supported
    const falBody = isHighQuality
      ? { prompt: fullPrompt, image_size: imageSize, num_inference_steps: 28, guidance_scale: 3.5, num_images: numImages, enable_safety_checker: true }
      : { prompt: fullPrompt, image_size: imageSize, num_inference_steps: 4,  num_images: numImages, enable_safety_checker: true };

    console.log(`[image-gen] user=${req.user.id} model=${model} count=${numImages} size=${imageSize.width}x${imageSize.height}`);

    // Call fal.ai
    const falRes = await fetch(`https://fal.run/${model}`, {
      method: "POST",
      headers: { "Authorization": `Key ${process.env.FAL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(falBody),
    });

    if (!falRes.ok) {
      const errText = await falRes.text();
      console.error("[image-gen] fal.ai error:", errText.slice(0, 200));
      return res.status(500).json({ error: "Image generation failed", detail: errText.slice(0, 120) });
    }

    const falData = await falRes.json();
    const falImages = falData?.images || [];
    if (!falImages.length) return res.status(500).json({ error: "No images returned from fal.ai" });

    // Upload each image to Supabase storage and save record
    const results = [];
    for (const img of falImages) {
      let storedUrl = img.url;
      try {
        const imgRes = await fetch(img.url);
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          const fname = `generated/${req.user.id}/${uuidv4()}.jpg`;
          const { error: uploadErr } = await supabaseAdmin.storage
            .from("user-assets")
            .upload(fname, buffer, { contentType: "image/jpeg", upsert: false });
          if (!uploadErr) {
            const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(fname);
            storedUrl = publicUrl;
          } else {
            console.warn("[image-gen] Upload error:", uploadErr.message);
          }
        }
      } catch (uploadEx) {
        console.warn("[image-gen] Upload failed:", uploadEx.message);
      }

      // Save to generated_images table — try full schema first, fall back to minimal
      let record = null;
      const { data: dbRecord, error: insertErr } = await supabaseAdmin
        .from("generated_images")
        .insert({
          user_id:      req.user.id,
          prompt:       prompt.trim(),
          aspect_ratio,
          quality,
          url:          storedUrl,
          fal_url:      img.url,
          width:        img.width  || imageSize.width,
          height:       img.height || imageSize.height,
          credits_used: creditsPerImage,
        })
        .select()
        .single();
      if (insertErr) console.error("[image-gen] DB insert error:", insertErr.message);
      else console.log("[image-gen] Saved record id:", dbRecord?.id);

      results.push({ url: storedUrl, id: dbRecord?.id, width: img.width || imageSize.width, height: img.height || imageSize.height });
    }

    res.json({ images: results, creditsUsed: totalCredits, balance: creditResult.balance });
  } catch (err) {
    console.error("[image-generation/generate]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/image-generation/:id — Delete a generated image record
app.delete("/api/image-generation/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    // Verify ownership before deleting
    const { data, error: fetchErr } = await supabaseAdmin
      .from("generated_images")
      .select("id, url, user_id")
      .eq("id", id)
      .single();
    if (fetchErr || !data) return res.status(404).json({ error: "Not found" });
    if (data.user_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });

    // Delete DB record
    await supabaseAdmin.from("generated_images").delete().eq("id", id);

    // Best-effort: delete from storage if it's a Supabase URL
    try {
      const match = data.url?.match(/\/user-assets\/(.+)$/);
      if (match) {
        await supabaseAdmin.storage.from("user-assets").remove([decodeURIComponent(match[1])]);
      }
    } catch { /* ignore storage errors */ }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/image-generation/library — Fetch user's previously generated images
app.get("/api/image-generation/library", requireAuth, async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const [listRes, countRes] = await Promise.all([
      supabaseAdmin
        .from("generated_images")
        .select("*")
        .eq("user_id", req.user.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1),
      supabaseAdmin
        .from("generated_images")
        .select("id", { count: "exact", head: true })
        .eq("user_id", req.user.id),
    ]);
    if (listRes.error) throw listRes.error;
    res.json({ images: listRes.data || [], total: countRes.count || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Feedback ─────────────────────────────────────────────────────────────── */
app.post("/api/feedback", requireAuth, async (req, res) => {
  try {
    const { rating, message, context } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: "rating 1-5 required" });
    const { error } = await supabaseAdmin.from("feedback").insert({
      user_id: req.user.id,
      rating,
      message: message || null,
      context: context || null,
    });
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error("[feedback]", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/feedback/mine", requireAuth, async (req, res) => {
  try {
    const { count, error } = await supabaseAdmin
      .from("feedback")
      .select("id", { count: "exact", head: true })
      .eq("user_id", req.user.id);
    if (error) throw error;
    res.json({ count: count || 0 });
  } catch (err) {
    console.error("[feedback/mine]", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/feedback/my-history", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("feedback")
      .select("id, rating, message, context, created_at")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ feedback: data || [] });
  } catch (err) {
    console.error("[feedback/my-history]", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/feedback", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("feedback")
      .select("id, user_id, rating, message, context, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const rows = data || [];
    const avgRating = rows.length
      ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / rows.length) * 10) / 10
      : 0;

    // Enrich with user emails (batch unique user ids)
    const uniqueIds = [...new Set(rows.map(r => r.user_id))];
    const emailMap = {};
    await Promise.all(uniqueIds.map(async uid => {
      try {
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(uid);
        emailMap[uid] = user?.email || uid;
      } catch { emailMap[uid] = uid; }
    }));

    const feedback = rows.map(r => ({ ...r, email: emailMap[r.user_id] || r.user_id }));
    res.json({ feedback, averageRating: avgRating });
  } catch (err) {
    console.error("[admin/feedback]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Payments: Razorpay ──────────────────────────────────────────────────── */
function getRazorpay() {
  return new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

/** POST /api/payments/create-order — create a Razorpay order for a plan */
app.post("/api/payments/create-order", requireAuth, async (req, res) => {
  try {
    const { planSlug, billingCycle } = req.body;
    if (!planSlug || !billingCycle) return res.status(400).json({ error: "planSlug and billingCycle required" });

    const { data: plan, error } = await supabaseAdmin
      .from("plans")
      .select("id, name, slug, price_monthly, price_annual, discount_percent, credits")
      .eq("slug", planSlug)
      .eq("is_active", true)
      .single();
    if (error || !plan) return res.status(404).json({ error: "Plan not found" });

    const baseUSD    = billingCycle === "annual" && plan.price_annual ? plan.price_annual : plan.price_monthly;
    const discounted = plan.discount_percent > 0 ? baseUSD * (1 - plan.discount_percent / 100) : baseUSD;
    const amountINR  = +(discounted * 83).toFixed(2); // USD → INR
    const amountPaise = Math.round(amountINR * 100);

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount:   amountPaise,
      currency: "INR",
      receipt:  `order_${uuidv4().slice(0, 8)}`,
      notes: {
        user_id:       req.user.id,
        plan_slug:     planSlug,
        billing_cycle: billingCycle,
      },
    });

    res.json({
      orderId:      order.id,
      amount:       amountPaise,
      currency:     "INR",
      keyId:        process.env.RAZORPAY_KEY_ID,
      planName:     plan.name,
      planSlug,
      billingCycle,
    });
  } catch (err) {
    console.error("[payments/create-order]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/payments/verify — verify signature, provision credits, insert subscription */
app.post("/api/payments/verify", requireAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planSlug, billingCycle } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !planSlug) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Verify Razorpay signature
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: "Payment verification failed" });
    }

    // Fetch plan
    const { data: plan, error } = await supabaseAdmin
      .from("plans")
      .select("id, name, price_monthly, price_annual, discount_percent, credits")
      .eq("slug", planSlug)
      .eq("is_active", true)
      .single();
    if (error || !plan) return res.status(404).json({ error: "Plan not found" });

    const baseUSD    = billingCycle === "annual" && plan.price_annual ? plan.price_annual : plan.price_monthly;
    const discounted = plan.discount_percent > 0 ? baseUSD * (1 - plan.discount_percent / 100) : baseUSD;
    const amountINR  = +(discounted * 83).toFixed(2);

    const now = new Date();
    const periodDays = billingCycle === "annual" ? 365 : 30;
    const periodEnd  = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

    // Insert subscription record
    await supabaseAdmin.from("subscriptions").insert({
      user_id:                req.user.id,
      plan_id:                plan.id,
      status:                 "active",
      billing_cycle:          billingCycle,
      price_paid:             amountINR,
      credits_granted:        plan.credits,
      current_period_start:   now.toISOString(),
      current_period_end:     periodEnd.toISOString(),
      razorpay_payment_id,
      razorpay_subscription_id: razorpay_order_id,
    });

    // Add credits
    const { balance: newBalance } = await addCredits(
      req.user.id, plan.credits, "purchase", "plan_subscription",
      `${plan.name} plan – ${billingCycle}`, razorpay_payment_id,
    );

    // Emails (fire-and-forget)
    supabaseAdmin.auth.admin.getUserById(req.user.id).then(({ data: { user } }) => {
      if (!user) return;
      const name = user.user_metadata?.full_name || user.user_metadata?.name || "";
      const adminEmail = adminNewSaleEmail({ userEmail: user.email, plan: plan.name, amount: amountINR.toFixed(2), credits: plan.credits });
      sendAdminAlert(adminEmail.subject, adminEmail.html);
      const userEmail = userCreditsPurchasedEmail(name, plan.credits, newBalance);
      sendUserEmail(user.email, userEmail.subject, userEmail.html);
    }).catch(() => {});

    res.json({ success: true, credits: plan.credits, balance: newBalance });
  } catch (err) {
    console.error("[payments/verify]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/payments/subscription — active subscription for this user */
app.get("/api/payments/subscription", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .select("id, status, billing_cycle, price_paid, credits_granted, current_period_start, current_period_end, razorpay_payment_id, plans(name, slug, credits)")
      .eq("user_id", req.user.id)
      .eq("status", "active")
      .order("current_period_start", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    res.json({ subscription: data || null });
  } catch (err) {
    console.error("[payments/subscription]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Webhook: Supabase new user signup ──────────────────────────────────────
   Configure in Supabase Dashboard → Database → Webhooks:
     Table: auth.users  |  Event: INSERT  |  URL: <your-domain>/api/webhooks/user-created
   During local dev this won't fire — that's fine, wire it up after deployment.
────────────────────────────────────────────────────────────────────────────── */
app.post("/api/webhooks/user-created", async (req, res) => {
  try {
    const { record } = req.body;
    if (!record) return res.status(400).json({ error: "no record" });

    const { id, email, raw_user_meta_data } = record;
    const name = raw_user_meta_data?.full_name || raw_user_meta_data?.name || "";

    // Admin alert (fire-and-forget)
    const adminEmail = adminNewUserEmail({ id, email, name });
    sendAdminAlert(adminEmail.subject, adminEmail.html);

    // Welcome email to user
    const welcome = userWelcomeEmail(name);
    sendUserEmail(email, welcome.subject, welcome.html);

    res.json({ success: true });
  } catch (err) {
    console.error("[webhook/user-created]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Serve built frontend — must come after all API routes
app.use(express.static(path.join(PROJECT_ROOT, "dist")));
app.use((req, res) => {
  res.sendFile(path.join(PROJECT_ROOT, "dist", "index.html"));
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));