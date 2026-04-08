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

dotenv.config();
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
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt } = req.body;
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

app.post("/api/generate-tts", async (req, res) => {
  try {
    const { script, voice = "female_warm", speed = 1.0 } = req.body;
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

app.post("/api/search-image", async (req, res) => {
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
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt, orientation } = req.body;
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
app.post("/api/proxy-image", async (req, res) => {
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

app.post("/api/compress", upload.single("video"), async (req, res) => {
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
app.post("/api/compress-audio", upload.single("audio"), async (req, res) => {
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

app.post("/api/render", async (req, res) => {
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
      url:      `http://localhost:5000/renders/${path.basename(outputPath)}`,
      error:    null,
    };
    console.log("[render] Done:", jobId);

  } catch (err) {
    console.error("[render] Failed:", err.message);
    renderJobs[jobId] = { progress: 0, done: true, url: null, error: err.message };
  }
});

app.get("/api/render-status/:jobId", (req, res) => {
  const job = renderJobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));