/**
 * @vidquence/render — index.js  (INTERNAL MODULE, no public/published API yet)
 *
 * Vidquence's own timeline→MP4 engine. Drop-in alternative to the Remotion render path,
 * selected by the RENDER_ENGINE flag in renderService.js. It deliberately stops at "produce
 * a local MP4 file"; upload + DB recording stay in renderService so both engines share one
 * idempotent persistence path.
 *
 * Pipeline:  compose (timeline → deterministic HTML)
 *         →  renderFrames (headless Chrome screenshots each frame)
 *         →  stitch (ffmpeg frames + audio → MP4)
 *
 * See README.md for architecture, build phases, and the shadow-diff validation strategy.
 */
import fs from "fs";
import path from "path";
import { compose } from "./composer.js";
import { renderFrames } from "./frameDriver.js";
import { stitch } from "./stitcher.js";
import { extractVideoFrames } from "./videoFrames.js";

/**
 * renderToFile(project, { outputPath, renderId, width, height, scale, fps, onProgress, isCancelled })
 * - width/height are the BASE composition dims; `scale` upscales (e.g. 2 for 4k).
 * - onProgress(pct) 0→100. isCancelled() polled per frame.
 * Returns { outputPath }. Throws on failure (caller decides retry/refund). Cleans its frames.
 */
export async function renderToFile(project, { outputPath, renderId, width = 1080, height = 1920, scale = 1, fps = 30, onProgress, isCancelled } = {}) {
  if (!outputPath) throw new Error("renderToFile: outputPath required");

  const { html, durationInFrames, audio, videoLayers } = compose(project, { width, height, fps });
  const durationSec = durationInFrames / fps;

  const framesDir = path.join(path.dirname(outputPath), `vqframes-${renderId || Date.now()}`);
  const videoDir = path.join(path.dirname(outputPath), `vqvframes-${renderId || Date.now()}`);
  try {
    // Phase 3: extract each embedded video layer's frames via ffmpeg up front, so the
    // frameDriver can inject the right one per composite frame.
    const videoFrames = [];
    for (const vl of videoLayers || []) {
      try { videoFrames.push(await extractVideoFrames({ ...vl, fps, outDir: videoDir })); }
      catch (e) { console.warn(`[@vidquence/render] video layer ${vl.i} extract failed (skipping): ${e.message}`); }
    }

    // Frames take the bulk of the time → map them to 0–85% of progress.
    await renderFrames({
      html, framesDir, width, height, scale, fps, durationInFrames, videoFrames,
      isCancelled,
      onProgress: (p) => onProgress?.(Math.round(p * 0.85)),
    });
    // Stitch + mux → 85–100%.
    await stitch({
      framesDir, outputPath, fps, width: width * scale, height: height * scale,
      audio, durationSec,
      onProgress: (p) => onProgress?.(85 + Math.round(p * 0.15)),
    });
  } finally {
    try { fs.rmSync(framesDir, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(videoDir, { recursive: true, force: true }); } catch {}
  }

  onProgress?.(100);
  return { outputPath };
}
