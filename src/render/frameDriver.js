/**
 * @vidquence/render — frameDriver.js
 *
 * Loads the composed page once in headless Chrome, then for every frame calls the page's
 * deterministic window.__seekTo(frame/fps) and screenshots the stage. Because every frame is
 * a pure function of its index, output is reproducible and safe to chunk/parallelise later.
 *
 * Reuses the same container-hardened launch flags as the measure step (htmlMeasure) — the
 * minimal process/thread footprint that prevented the "pthread_create: Resource temporarily
 * unavailable" crash on the worker.
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

/**
 * renderFrames({ html, framesDir, width, height, scale, fps, durationInFrames, onProgress, isCancelled })
 * Writes frame-00000.jpg … into framesDir. onProgress reports 0→100 across the frame range.
 * Returns the number of frames written.
 */
export async function renderFrames({ html, framesDir, width = 1080, height = 1920, scale = 1, fps = 30, durationInFrames, onProgress, isCancelled }) {
  if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir, { recursive: true });

  const browser = await puppeteer.launch({ headless: true, args: LAUNCH_ARGS });
  let written = 0;
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: scale });
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Wait for fonts + images to settle before capturing (deterministic first frame).
    await page.evaluate(async () => {
      try { await (document.fonts && document.fonts.ready); } catch {}
      const imgs = [...document.images].filter((i) => !i.complete);
      await Promise.all(imgs.map((i) => new Promise((res) => { i.onload = i.onerror = res; })));
    });

    const stage = await page.$("#stage");
    for (let f = 0; f < durationInFrames; f++) {
      if (isCancelled && isCancelled()) throw new Error("RENDER_CANCELLED");
      const t = frameToSeconds(f, fps);
      await page.evaluate((sec) => window.__seekTo(sec), t);
      const file = path.join(framesDir, `frame-${String(f).padStart(5, "0")}.jpg`);
      await stage.screenshot({ path: file, type: "jpeg", quality: 95 });
      written++;
      if (onProgress && (f % 5 === 0 || f === durationInFrames - 1)) {
        onProgress(Math.round(((f + 1) / durationInFrames) * 100));
      }
    }
  } finally {
    try { await browser.close(); } catch {}
  }
  return written;
}
