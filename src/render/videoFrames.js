/**
 * @vidquence/render — videoFrames.js  (Phase 3)
 *
 * Embedded video (B-roll) layers can't be painted by driving an HTML <video> in headless
 * Chromium — the bundled Chromium lacks proprietary H.264/AAC codecs, so the element stays
 * black. Instead we let ffmpeg (which DOES decode H.264) extract the exact frames we need as
 * JPEGs, and the frameDriver feeds them into the page per composite-frame. Deterministic and
 * codec-safe. ffmpeg reads remote URLs directly, so no separate download step.
 *
 * Mapping: composite frame f (start*fps ≤ f < end*fps) → extracted frame (f - startFrame + 1),
 * where the extracted sequence samples the source from `trimStart` at fps/playbackRate so frame
 * k lands on source time trimStart + k*playbackRate/fps.
 */
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import fs from "fs";
import path from "path";

if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic);

/**
 * extractVideoFrames({ i, src, fps, start, end, trimStart, playbackRate, outDir })
 * → { i, startFrame, count, dir, prefix }
 */
export async function extractVideoFrames({ i, src, fps, start, end, trimStart = 0, playbackRate = 1, outDir }) {
  const startFrame = Math.round(start * fps);
  const count = Math.max(1, Math.ceil((end - start) * fps));
  const sampleFps = fps / (playbackRate || 1); // frame k → source time trimStart + k*playbackRate/fps
  const prefix = `v${i}-`;
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(src)
      .inputOptions(trimStart ? [`-ss ${trimStart}`] : [])
      .outputOptions([
        "-an",                       // video only
        `-vf fps=${sampleFps}`,
        `-frames:v ${count}`,
        "-q:v 3",                    // good JPEG quality
      ])
      .on("end", resolve)
      .on("error", reject)
      .save(path.join(outDir, `${prefix}%05d.jpg`));
  });

  return { i, startFrame, count, dir: outDir, prefix };
}
