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
import { renderMedia } from "@remotion/renderer";

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

/* AI ROUTE */

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

    const text = completion.choices[0].message.content;
    const parsed = JSON.parse(text);

    res.json(parsed);
  } catch (error) {
    res.status(500).json({ error: "AI generation failed" });
  }
});

/* COMPRESSION ROUTE */

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

/* REMOTION RENDER ROUTE */

let bundleLocation = null;

async function ensureBundle() {
  if (bundleLocation) return bundleLocation;

  bundleLocation = await bundle({
    entryPoint: path.resolve("src/main.jsx"),
  });

  return bundleLocation;
}

app.post("/api/render", async (req, res) => {
  try {
    const { project, fps = 30, resolution = "1080p" } = req.body;

    const serveUrl = await ensureBundle();

    const base =
      resolution === "720p"
        ? 720
        : resolution === "4k"
        ? 2160
        : 1080;

    const isVertical = project.meta.orientation === "9:16";

    const width = isVertical ? base : Math.round(base * (16 / 9));
    const height = isVertical ? Math.round(base * (16 / 9)) : base;

    const fileName = `render-${Date.now()}.mp4`;
    const outputPath = path.join(TEMP_DIR, fileName);

    await renderMedia({
      composition: "VideoComposition",
      serveUrl,
      codec: "h264",
      outputLocation: outputPath,
      inputProps: { project },
      fps,
      width,
      height,
    });

    res.json({
      success: true,
      url: `http://localhost:5000/renders/${fileName}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* SERVER START */

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});