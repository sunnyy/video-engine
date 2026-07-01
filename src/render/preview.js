/**
 * @vidquence/render — preview.js  (INTERNAL DEV TOOL)
 *
 * Sparse-frame "preview" of a timeline — renders ONE frame every `everySec` (not every frame, no
 * ffmpeg stitch) through the EXACT same composed page the real engine uses (compose →
 * window.__seekTo(sec) → screenshot). The result is a handful of PNGs that faithfully show what the
 * finished video looks like at each moment, for fast self-inspection — without the cost of a full
 * MP4 render. Used by the dev snapshot route, never by the production render path.
 */
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { compose } from "./composer.js";
import { extractVideoFrames } from "./videoFrames.js";
import { frameToSeconds } from "./timeModel.js";
import { localFontsCss } from "../services/ai/shared/converter.js";

const LAUNCH_ARGS = [
  "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage",
  "--font-render-hinting=none", "--disable-gpu", "--no-zygote",
  "--disable-software-rasterizer", "--disable-extensions", "--mute-audio", "--no-first-run",
];

async function setupPage(browser, html, width, height, scale) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: scale });
  await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.evaluate(async () => {
    try { await (document.fonts && document.fonts.ready); } catch {}
    const imgs = [...document.images].filter((i) => !i.complete);
    await Promise.all(imgs.map((i) => new Promise((res) => { i.onload = i.onerror = res; })));
  });
  return page;
}

/** Swap in the right extracted video frame for composite frame f (mirrors frameDriver.injectVideo). */
async function injectVideo(page, videoFrames, f) {
  for (const vf of videoFrames) {
    if (f < vf.startFrame || f >= vf.startFrame + vf.count) continue;
    const k = Math.min(vf.count, f - vf.startFrame + 1);
    const fp = path.join(vf.dir, `${vf.prefix}${String(k).padStart(5, "0")}.jpg`);
    let dataUri;
    try { dataUri = "data:image/jpeg;base64," + fs.readFileSync(fp).toString("base64"); } catch { continue; }
    await page.evaluate(async (id, src) => {
      const img = document.getElementById(id);
      if (!img) return;
      img.src = src;
      if (!img.complete) await new Promise((r) => { img.onload = img.onerror = r; });
    }, `vqv-${vf.i}`, dataUri);
  }
}

/**
 * renderBeatDesigns(beatHTMLs, { outDir, width, height, scale }) → [{ file, beat }]
 * Renders each beat's ORIGINAL designed HTML (from raw_ai_json) standalone, the SAME way the measure
 * step lays it out (bundled fonts, min-width:0, Devanagari fallback). The result — design-<NN>.png —
 * is GPT's INTENT; comparing it to the converted scene-<NN>.png frame exposes where the measure /
 * timeline / render pipeline diverges from the design (so converter/CSS bugs become visible).
 */
export async function renderBeatDesigns(beatHTMLs, { outDir, width = 1080, height = 1920, scale = 1, background = null } = {}) {
  if (!Array.isArray(beatHTMLs) || !beatHTMLs.some(Boolean)) return [];
  fs.mkdirSync(outDir, { recursive: true });
  const fontCss = localFontsCss();
  // Designs use `body { background: transparent }` — in the VIDEO that transparency is filled by the
  // scene's media or the palette base, but a bare headless render falls back to browser-default WHITE,
  // which makes light-on-dark designs look like invisible-text failures that DON'T exist in the video.
  // Paint the real field (the palette base) behind the transparent design so the preview is faithful.
  const fieldCss = background ? `html{background:${background}!important;}` : null;
  const browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined, args: LAUNCH_ARGS });
  const out = [];
  try {
    for (let i = 0; i < beatHTMLs.length; i++) {
      const html = beatHTMLs[i];
      if (!html) continue;
      const page = await browser.newPage();
      try {
        await page.setViewport({ width, height, deviceScaleFactor: scale });
        await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 30000 });
        if (fontCss) { try { await page.addStyleTag({ content: fontCss }); } catch {} }
        try { await page.addStyleTag({ content: "*{min-width:0!important;}" }); } catch {}
        if (fieldCss) { try { await page.addStyleTag({ content: fieldCss }); } catch {} }
        await page.evaluate(async () => {
          try { await (document.fonts && document.fonts.ready); } catch {}
          const imgs = [...document.images].filter((i) => !i.complete);
          await Promise.all(imgs.map((i) => new Promise((r) => { i.onload = i.onerror = r; })));
        });
        const file = `design-${String(i).padStart(2, "0")}.png`;
        await page.screenshot({ path: path.join(outDir, file), type: "png", clip: { x: 0, y: 0, width, height } });
        out.push({ file, beat: i });
      } catch (e) {
        console.warn(`[preview] design render beat ${i} failed: ${e.message}`);
      } finally { try { await page.close(); } catch {} }
    }
  } finally { try { await browser.close(); } catch {} }
  return out;
}

/**
 * sceneWindows(project) → [{ scene, start, end }] — one window per real scene, derived from the
 * timeline's s<N>_ tracks (held splits have no track, so they fold into their anchor's window).
 * This is what lets us screenshot one clean frame PER SCENE instead of a blind time cadence.
 */
export function sceneWindows(project) {
  const byScene = new Map();
  for (const l of project?.layers || []) {
    const m = (l.trackId || "").match(/^s(\d+)_/);
    if (!m) continue;
    const k = +m[1];
    const w = byScene.get(k) || { scene: k, start: Infinity, end: 0 };
    w.start = Math.min(w.start, l.start ?? 0);
    w.end = Math.max(w.end, l.end ?? 0);
    byScene.set(k, w);
  }
  return [...byScene.values()].filter(w => w.end > w.start).sort((a, b) => a.start - b.start);
}

// A representative instant for a scene: LATE in the scene — a STAGGERED multi-element entrance
// (each line fading up in turn) can run to ~75-80% of the scene, so an earlier sample freezes the
// frame before the last line appears (looked like a dropped headline). Sample at ~82%, still clamped
// clear of the out-transition (end - 0.25s), so the still shows the fully settled composition.
function sceneSampleTime(w) {
  const dur = w.end - w.start;
  return Math.max(w.start + 0.4, Math.min(w.end - 0.25, w.start + dur * 0.82));
}

/**
 * renderPreviewFrames(project, { outDir, mode, everySec, scale }) → { frames:[{file,t,frame,scene?}], durationSec, fps, width, height, mode }
 * mode "scene" (default): ONE frame per scene, sampled late (after entrances). mode "cadence":
 * one frame every `everySec`. Writes PNGs into outDir; best-effort video injection.
 */
export async function renderPreviewFrames(project, { outDir, mode = "scene", everySec = 1.5, scale = 1 } = {}) {
  if (!outDir) throw new Error("renderPreviewFrames: outDir required");
  const width  = project?.format?.width  ?? 1080;
  const height = project?.format?.height ?? 1920;
  const fps    = project?.format?.fps    ?? 30;

  const { html, durationInFrames, videoLayers } = compose(project, { width, height, fps });
  const durationSec = durationInFrames / fps;
  fs.mkdirSync(outDir, { recursive: true });

  // Extract embedded video layers up front (so a video-backed beat shows its real footage).
  const videoDir = path.join(outDir, "_vframes");
  const videoFrames = [];
  for (const vl of videoLayers || []) {
    try { videoFrames.push(await extractVideoFrames({ ...vl, fps, outDir: videoDir })); }
    catch (e) { console.warn(`[preview] video layer ${vl.i} extract failed (skipping): ${e.message}`); }
  }

  // Targets: one representative instant per scene (default) or a fixed cadence.
  const wins = mode === "scene" ? sceneWindows(project) : [];
  let targets; // [{ scene?, frame }]
  if (mode === "scene" && wins.length) {
    targets = wins.map(w => ({ scene: w.scene, frame: Math.min(durationInFrames - 1, Math.round(sceneSampleTime(w) * fps)) }));
  } else {
    const idxs = [];
    for (let t = 0; t < durationSec - 1e-6; t += everySec) idxs.push(Math.min(durationInFrames - 1, Math.round(t * fps)));
    idxs.push(durationInFrames - 1);
    targets = [...new Set(idxs)].sort((a, b) => a - b).map(f => ({ frame: f }));
  }

  const browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined, args: LAUNCH_ARGS });
  const frames = [];
  try {
    const page = await setupPage(browser, html, width, height, scale);
    const stage = await page.$("#stage");
    for (let n = 0; n < targets.length; n++) {
      const { scene, frame: f } = targets[n];
      const sec = frameToSeconds(f, fps);
      await page.evaluate((s) => window.__seekTo(s), sec);
      if (videoFrames.length) await injectVideo(page, videoFrames, f);
      const file = scene != null
        ? `scene-${String(scene).padStart(2, "0")}-t${sec.toFixed(1)}s.png`
        : `preview-${String(n).padStart(2, "0")}-t${sec.toFixed(1)}s.png`;
      await stage.screenshot({ path: path.join(outDir, file), type: "png" });
      frames.push({ file, t: parseFloat(sec.toFixed(2)), frame: f, ...(scene != null ? { scene } : {}) });
    }
  } finally {
    try { await browser.close(); } catch {}
    try { fs.rmSync(videoDir, { recursive: true, force: true }); } catch {}
  }

  return { frames, durationSec: parseFloat(durationSec.toFixed(2)), fps, width, height, mode: (mode === "scene" && wins.length) ? "scene" : "cadence" };
}
