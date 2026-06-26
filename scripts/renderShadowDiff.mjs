/**
 * renderShadowDiff.mjs — the @vidquence/render validation harness.
 *
 * Renders the SAME timeline through BOTH engines (Remotion = the proven reference, and our
 * new @vidquence/render) and scores how close ours is using ffmpeg's SSIM (1.0 = identical).
 * This is how we "mirror" a service for testing without touching the live product: we keep
 * adding capabilities to @vidquence/render and watch the SSIM climb toward 1.0 against the
 * hardest real projects. Nothing here runs in production or uploads anything.
 *
 * Usage:
 *   node scripts/renderShadowDiff.mjs --project path/to/timeline.json [--out .shadow-out]
 *   node scripts/renderShadowDiff.mjs            # uses a tiny built-in sample timeline
 *
 * A timeline.json is just a saved project: { format:{width,height,duration,fps,background}, layers:[...] }.
 */
import fs from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import ffmpegStatic from "ffmpeg-static";
import { renderToFile } from "../src/render/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(PROJECT_ROOT, "public");

// ── args ──
const args = process.argv.slice(2);
const getArg = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const projectArg = getArg("project", null);
const outDir = path.resolve(getArg("out", path.join(PROJECT_ROOT, ".shadow-out")));
fs.mkdirSync(outDir, { recursive: true });

// ── built-in sample (text + gradient + transitions) when no --project given ──
const SAMPLE = {
  format: { width: 1080, height: 1920, duration: 4, fps: 30, background: "#0b1020" },
  layers: [
    { id: "bg", type: "gradient", start: 0, end: 4, zIndex: 0, gradient: "linear-gradient(135deg,#1b2a4a,#0b1020)", transform: { x: 0, y: 0, width: 1080, height: 1920 } },
    { id: "h1", type: "text", start: 0.2, end: 4, zIndex: 5, content: "Vidquence Render", transform: { x: 90, y: 820, width: 900, height: 200 }, style: { fontFamily: "Outfit", fontSize: 96, fontWeight: 800, color: "#ffffff", textAlign: "center" }, transition: { in: { type: "slide-up", duration: 0.6 }, out: { type: "fade", duration: 0.4 } } },
  ],
};

const project = projectArg ? JSON.parse(fs.readFileSync(path.resolve(projectArg), "utf8")) : SAMPLE;
const fmt = project.format || {};
const width = fmt.width || 1080, height = fmt.height || 1920, fps = fmt.fps || 30;

const vidquenceOut = path.join(outDir, "vidquence.mp4");
const remotionOut = path.join(outDir, "remotion.mp4");

function run(bin, argv) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, argv, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("close", (code) => (code === 0 ? resolve(err) : reject(new Error(err.slice(-1200)))));
  });
}

// ── Remotion reference render (prefer committed prebundle; else build) ──
async function renderRemotion() {
  const { bundle } = await import("@remotion/bundler");
  const { getCompositions, renderFrames, stitchFramesToVideo } = await import("@remotion/renderer");
  const prebundle = path.join(PROJECT_ROOT, "remotion-bundle");
  const serveUrl = fs.existsSync(path.join(prebundle, "index.html"))
    ? prebundle
    : await bundle({ entryPoint: path.join(PROJECT_ROOT, "src/remotion/Root.jsx"), publicDir: PUBLIC_DIR });

  const comps = await getCompositions(serveUrl, { inputProps: { project } });
  const comp = comps.find((c) => c.id === "TimelineComposition");
  const compRes = { ...comp, width, height };
  const framesDir = fs.mkdtempSync(path.join(os.tmpdir(), "shadow-rem-"));
  try {
    const { assetsInfo } = await renderFrames({
      composition: compRes, serveUrl, inputProps: { project }, outputDir: framesDir,
      imageFormat: "jpeg", concurrency: 2, chromiumOptions: { gl: "angle" }, onFrameUpdate: () => {},
    });
    await stitchFramesToVideo({
      composition: compRes, serveUrl, inputProps: { project }, codec: "h264", crf: 23,
      assetsInfo, outputLocation: remotionOut, fps: comp.fps, width, height,
    });
  } finally {
    try { fs.rmSync(framesDir, { recursive: true, force: true }); } catch {}
  }
}

// ── SSIM compare (ffmpeg) ──
async function ssim() {
  const log = await run(ffmpegStatic, ["-i", remotionOut, "-i", vidquenceOut, "-lavfi", "ssim", "-f", "null", "-"]);
  const m = log.match(/All:([0-9.]+)/);
  return m ? parseFloat(m[1]) : null;
}

(async () => {
  console.log(`\n[shadow] project: ${projectArg || "(built-in sample)"}  ${width}x${height} @${fps}fps  ${fmt.duration || "?"}s`);
  console.log("[shadow] rendering @vidquence/render …");
  const t0 = Date.now();
  await renderToFile(project, { outputPath: vidquenceOut, renderId: "shadow", width, height, scale: 1, fps, onProgress: () => {} });
  const tVq = ((Date.now() - t0) / 1000).toFixed(1);

  console.log("[shadow] rendering Remotion (reference) …");
  const t1 = Date.now();
  await renderRemotion();
  const tRem = ((Date.now() - t1) / 1000).toFixed(1);

  console.log("[shadow] scoring SSIM …");
  const score = await ssim();

  console.log("\n──────── SHADOW DIFF ────────");
  console.log(`  @vidquence/render : ${tVq}s  → ${vidquenceOut}`);
  console.log(`  Remotion (ref)    : ${tRem}s  → ${remotionOut}`);
  console.log(`  SSIM (1.0=identical): ${score == null ? "n/a" : score.toFixed(4)}`);
  console.log("─────────────────────────────");
  console.log(score != null && score >= 0.98 ? "  ✅ visually matching" : "  ⚠️  gap remains — inspect both MP4s\n");
})().catch((e) => { console.error("[shadow] FAILED:", e.message); process.exit(1); });
