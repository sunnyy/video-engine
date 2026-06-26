/**
 * @vidquence/render — frameDriver.js
 *
 * Renders every composite frame by driving the composed page's deterministic
 * window.__seekTo(frame/fps) and screenshotting the stage. Because each frame is a pure
 * function of its index, the work parallelises safely: we split the frame range into
 * contiguous chunks and render them concurrently across several SEPARATE browser instances.
 *
 * NOTE: it must be separate browser *processes*, not multiple pages/tabs in one browser —
 * Chrome serialises screenshot capture per browser process, so N tabs give ~no speedup. N
 * browsers give ~N× (CPU-bound) because each captures independently.
 *
 * Concurrency is bounded (VQ_RENDER_CONCURRENCY, default 4) and uses the same container-
 * hardened launch flags as the measure step — so the small Railway worker won't exhaust its
 * PID/thread budget (the "pthread_create: Resource temporarily unavailable" class of crash).
 * Set VQ_RENDER_CONCURRENCY=2 on the worker; bump it on bigger boxes.
 */
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { frameToSeconds } from "./timeModel.js";

const LAUNCH_ARGS = [
  "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage",
  "--font-render-hinting=none", "--disable-gpu", "--no-zygote",
  "--disable-software-rasterizer", "--disable-extensions", "--mute-audio", "--no-first-run",
];

const CONCURRENCY = Math.max(1, parseInt(process.env.VQ_RENDER_CONCURRENCY || "4", 10));

/** Spin up a page, load the composed HTML, and wait for fonts + images to settle. */
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

/** Inject each active video layer's extracted frame (data URI → no file:// origin block). */
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
 * renderFrames({ html, framesDir, width, height, scale, fps, durationInFrames, videoFrames, onProgress, isCancelled })
 * Writes frame-00000.jpg … into framesDir across `concurrency` parallel pages.
 * Returns the number of frames written.
 */
export async function renderFrames({ html, framesDir, width = 1080, height = 1920, scale = 1, fps = 30, durationInFrames, videoFrames = [], onProgress, isCancelled }) {
  if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir, { recursive: true });

  const concurrency = Math.max(1, Math.min(CONCURRENCY, durationInFrames));
  const chunkSize = Math.ceil(durationInFrames / concurrency);

  let done = 0;
  const bump = () => {
    done++;
    if (onProgress && (done % 5 === 0 || done === durationInFrames)) {
      onProgress(Math.round((done / durationInFrames) * 100));
    }
  };

  // Each chunk gets its OWN browser process so screenshot capture runs truly in parallel.
  const renderChunk = async (lo, hi) => {
    const browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined, args: LAUNCH_ARGS });
    try {
      const page = await setupPage(browser, html, width, height, scale);
      const stage = await page.$("#stage");
      for (let f = lo; f < hi; f++) {
        if (isCancelled && isCancelled()) throw new Error("RENDER_CANCELLED");
        await page.evaluate((sec) => window.__seekTo(sec), frameToSeconds(f, fps));
        if (videoFrames.length) await injectVideo(page, videoFrames, f);
        await stage.screenshot({ path: path.join(framesDir, `frame-${String(f).padStart(5, "0")}.jpg`), type: "jpeg", quality: 95 });
        bump();
      }
    } finally {
      try { await browser.close(); } catch {}
    }
  };

  const tasks = [];
  for (let c = 0; c < concurrency; c++) {
    const lo = c * chunkSize;
    const hi = Math.min(lo + chunkSize, durationInFrames);
    if (lo < hi) tasks.push(renderChunk(lo, hi));
  }
  await Promise.all(tasks);
  return done;
}
