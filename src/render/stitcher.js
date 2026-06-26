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
  if (!audio.length) {
    await framesToVideo({ framesDir, outputPath, fps, width, height });
    onProgress?.(100);
    return outputPath;
  }
  // Render silent video to a temp file, then mux audio into the real output.
  const silent = outputPath.replace(/\.mp4$/i, ".silent.mp4");
  await framesToVideo({ framesDir, outputPath: silent, fps, width, height });
  onProgress?.(60);
  try {
    await muxAudio({ videoPath: silent, audio, outputPath, durationSec });
  } finally {
    try { fs.unlinkSync(silent); } catch {}
  }
  onProgress?.(100);
  return outputPath;
}
