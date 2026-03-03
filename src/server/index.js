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
import {
  renderFrames,
  stitchFramesToVideo,
  getCompositions,
} from "@remotion/renderer";

import { v4 as uuidv4 } from "uuid";

dotenv.config();
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
app.use(cors());
app.use(express.json({ limit: "100mb" }));

const TEMP_DIR = path.resolve("src/server/temp");
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

app.use("/renders", express.static(TEMP_DIR));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  } catch {
    res.status(500).json({ error: "AI generation failed" });
  }
});

/* ---------------- COMPRESSION ROUTE ---------------- */

const upload = multer({ dest: TEMP_DIR });

app.post("/api/compress", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const inputPath = req.file.path;
    const outputPath = path.join(TEMP_DIR, `compressed-${Date.now()}.mp4`);

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec("libx264")
        .outputOptions([
          "-preset veryfast",
          "-crf 26",
          "-vf scale=1280:-2",
          "-movflags +faststart",
        ])
        .audioCodec("aac")
        .audioBitrate("128k")
        .on("end", resolve)
        .on("error", reject)
        .save(outputPath);
    });

    res.download(outputPath, () => {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    });
  } catch {
    res.status(500).json({ error: "Compression failed" });
  }
});

/* ---------------- RENDER ---------------- */

let bundleLocation = null;
let renderJobs = {};

async function ensureBundle() {
  if (bundleLocation) return bundleLocation;
  bundleLocation = await bundle({
    entryPoint: path.resolve("src/remotion/Root.jsx"),
  });
  return bundleLocation;
}

app.post("/api/render", async (req, res) => {
  try {
    let { project } = req.body;

    // Remove blob URLs
    const clean = (url) =>
      typeof url === "string" && url.startsWith("blob:")
        ? null
        : url;

    if (project?.music?.src) project.music.src = clean(project.music.src);
    if (project?.avatar?.src) project.avatar.src = clean(project.avatar.src);

    if (project?.beats) {
      project.beats = project.beats.map((b) => {
        if (b?.asset?.src) b.asset.src = clean(b.asset.src);
        return b;
      });
    }

    const jobId = uuidv4();
    renderJobs[jobId] = { progress: 0, done: false, url: null };

    res.json({ success: true, jobId });

    const serveUrl = await ensureBundle();

    const comps = await getCompositions(serveUrl, {
      inputProps: { project },
    });

    const comp = comps.find((c) => c.id === "VideoComposition");
    if (!comp) throw new Error("VideoComposition not found");

    const outputPath = path.join(
      TEMP_DIR,
      `render-${Date.now()}.mp4`
    );

    const framesDir = path.join(TEMP_DIR, `frames-${jobId}`);
    if (!fs.existsSync(framesDir)) {
      fs.mkdirSync(framesDir);
    }

    let rendered = 0;

    const { assetsInfo } = await renderFrames({
      composition: comp,
      serveUrl,
      inputProps: { project },
      outputDir: framesDir,
      imageFormat: "jpeg",
      concurrency: 1,
      onFrameUpdate: () => {
        rendered++;
        renderJobs[jobId].progress = Math.round(
          (rendered / comp.durationInFrames) * 100
        );
      },
    });

    await stitchFramesToVideo({
      composition: comp,
      serveUrl,
      inputProps: { project },
      codec: "h264",
      assetsInfo,
      outputLocation: outputPath,
      fps: comp.fps,
      width: comp.width,
      height: comp.height,
    });

    fs.rmSync(framesDir, { recursive: true, force: true });

    renderJobs[jobId] = {
      progress: 100,
      done: true,
      url: `http://localhost:5000/renders/${path.basename(outputPath)}`,
    };
  } catch (err) {
    console.error(err);
  }
});

app.get("/api/render-status/:jobId", (req, res) => {
  const job = renderJobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});