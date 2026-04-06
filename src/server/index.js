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

/* ── Bundle cache — only bundle once per server session ── */
let cachedBundle = null;
async function getBundle() {
  if (cachedBundle) {
    console.log("[bundle] Using cached bundle");
    return cachedBundle;
  }
  console.log("[bundle] Building bundle...");
  cachedBundle = await bundle({
    entryPoint: path.join(PROJECT_ROOT, "src/remotion/Root.jsx"),
    publicDir:  PUBLIC_DIR,
  });
  console.log("[bundle] Done:", cachedBundle);
  return cachedBundle;
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
    const parsed = JSON.parse(completion.choices[0].message.content);
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

/* ---------------- FAL.AI IMAGE GENERATION ---------------- */
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt, orientation } = req.body;
    if (!process.env.FAL_API_KEY) return res.status(500).json({ error: "FAL_API_KEY not set" });

    const imageSize = orientation === "9:16" ? "portrait_4_3" : "landscape_4_3";
    const falRes = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method:  "POST",
      headers: { "Authorization": `Key ${process.env.FAL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, image_size: imageSize, num_images: 1, num_inference_steps: 4, enable_safety_checker: true }),
    });

    if (!falRes.ok) {
      const err = await falRes.text();
      console.error("[fal.ai] Error:", err);
      return res.status(500).json({ error: "Fal.ai request failed" });
    }

    const data = await falRes.json();
    const url  = data?.images?.[0]?.url;
    if (!url) return res.status(500).json({ error: "No image returned" });
    res.json({ url });
  } catch (err) {
    console.error("[fal.ai]", err);
    res.status(500).json({ error: "Image generation failed" });
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
    let { project, resolution = "1080p" } = req.body;

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