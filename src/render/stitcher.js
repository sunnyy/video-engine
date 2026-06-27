/**
 * @vidquence/render — stitcher.js
 *
 * Two ffmpeg passes:
 *   1) the JPEG frame sequence → an h264 MP4 (silent), CRF 23 (matches the Remotion path's
 *      visually-lossless-for-short-form setting), yuv420p for universal playback.
 *   2) if the timeline has audio, mix every audio layer (offset by start, trimmed, volume'd)
 *      and mux it onto the video, cut to the video's duration.
 *
 * Uses the bundled ffmpeg (ffmpeg-static) so it works identically on the worker and locally.
 */
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import fs from "fs";
import path from "path";
import { downloadToTemp, extFromUrl } from "./download.js";

if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic);

/** Frame sequence → silent MP4. */
function framesToVideo({ framesDir, outputPath, fps, width, height }) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(path.join(framesDir, "frame-%05d.jpg"))
      .inputOptions([`-framerate ${fps}`])
      .videoCodec("libx264")
      .outputOptions([
        "-pix_fmt yuv420p", "-crf 23", "-preset medium",
        `-vf scale=${width}:${height}:flags=lanczos`, `-r ${fps}`,
        "-metadata comment=vidquence-render", // fingerprint: which engine made this file
      ])
      .on("end", resolve)
      .on("error", reject)
      .save(outputPath);
  });
}

/** Mux a mixed audio bed onto the silent video (cut to video duration). */
function muxAudio({ videoPath, audio, outputPath, durationSec }) {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg().input(videoPath);
    audio.forEach((a) => {
      const inOpts = [];
      if (a.trimStart) inOpts.push(`-ss ${a.trimStart}`);
      cmd.input(a.src).inputOptions(inOpts);
    });

    // Build a filter graph: delay each track to its start, set volume, then amix.
    const parts = audio.map((a, i) => {
      const idx = i + 1; // input 0 is the video
      const delayMs = Math.max(0, Math.round((a.start || 0) * 1000));
      const vol = a.volume ?? 1;
      return `[${idx}:a]adelay=${delayMs}|${delayMs},volume=${vol}[a${i}]`;
    });
    const mixInputs = audio.map((_, i) => `[a${i}]`).join("");
    const filter = `${parts.join(";")};${mixInputs}amix=inputs=${audio.length}:normalize=0[aout]`;

    // NOTE: pass the filter WITHOUT a second "outputs" arg. Giving complexFilter(["aout"])
    // makes fluent-ffmpeg auto-emit its own `-map [aout]`, which then duplicates the explicit
    // map below → ffmpeg fails with "Invalid argument". We map everything explicitly instead.
    cmd
      .complexFilter(filter)
      .outputOptions([
        "-map 0:v", "-map [aout]",
        "-c:v copy", "-c:a aac", "-b:a 192k",
        "-shortest", `-t ${durationSec}`,
        "-metadata comment=vidquence-render", // fingerprint: which engine made this file
      ])
      .on("end", resolve)
      .on("error", reject)
      .save(outputPath);
  });
}

/**
 * stitch({ framesDir, outputPath, fps, width, height, audio, durationSec, onProgress })
 * Produces the final MP4 at outputPath.
 */
export async function stitch({ framesDir, outputPath, fps, width, height, audio = [], durationSec, onProgress }) {
  onProgress?.(0);

  // Download remote audio to local temp files first — ffmpeg reading remote https SIGSEGVs on the
  // worker. A track that fails to download is dropped (never fatal); if none remain we go silent.
  const audioDir = path.join(path.dirname(outputPath), `vqaudio-${path.basename(outputPath, ".mp4")}`);
  const localAudio = [];
  for (let i = 0; i < audio.length; i++) {
    const a = audio[i];
    try { localAudio.push({ ...a, src: await downloadToTemp(a.src, audioDir, `a${i}${extFromUrl(a.src, ".mp3")}`) }); }
    catch (e) { console.warn(`[@vidquence/render] audio ${i} download failed (skipping): ${e.message}`); }
  }

  try {
    if (!localAudio.length) {
      await framesToVideo({ framesDir, outputPath, fps, width, height });
      onProgress?.(100);
      return outputPath;
    }
    // Render silent video to a temp file, then mux audio into the real output.
    const silent = outputPath.replace(/\.mp4$/i, ".silent.mp4");
    await framesToVideo({ framesDir, outputPath: silent, fps, width, height });
    onProgress?.(60);
    try {
      await muxAudio({ videoPath: silent, audio: localAudio, outputPath, durationSec });
    } finally {
      try { fs.unlinkSync(silent); } catch {}
    }
    onProgress?.(100);
    return outputPath;
  } finally {
    try { fs.rmSync(audioDir, { recursive: true, force: true }); } catch {}
  }
}
