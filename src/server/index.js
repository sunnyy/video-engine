import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

import multer from "multer";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

dotenv.config();

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
app.use(cors());
app.use(express.json());

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
        {
          role: "system",
          content: "You are a strict JSON generator. Output only valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const text = completion.choices[0].message.content;
    const parsed = JSON.parse(text);

    res.json(parsed);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "AI generation failed" });
  }
});

/* ---------------- VIDEO COMPRESSION ROUTE ---------------- */

const upload = multer({ dest: "src/server/temp/" });

app.post("/api/compress", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const inputPath = req.file.path;
    const outputPath = path.join(
      "src/server/temp",
      `compressed-${Date.now()}.mp4`
    );

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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Compression failed" });
  }
});

/* ---------------- SERVER START ---------------- */

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});