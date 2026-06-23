/**
 * cogsEstimator.js — ESTIMATED cost-to-serve per service, computed from the real model unit costs
 * in aiModels.js + tunable usage assumptions below. This is how we set margin-safe, DURATION-AWARE
 * credit prices BEFORE we have hand-measured numbers; replace with measured values in serviceCogs.js
 * as you test. GPT-5.4 scene design is the dominant cost — the `sceneTokens` assumption drives most
 * of the video estimate, so measure that first.
 *
 * Run: `node src/core/utils/cogsEstimator.js` to print the table.
 */
import { aiModels as M } from "./aiModels.js";

const gpt = (model, tin, tout) => tin / 1e6 * M[model].inputPer1M + tout / 1e6 * M[model].outputPer1M;
const tts = (chars) => chars * M["eleven_multilingual_v2"].costPerChar;
const fluxImg = M["fal-ai/flux/schnell"].costPerImage;
const nanoImg = M["fal-ai/nano-banana/edit"].costPerImage;
const ltxClip = M["fal-ai/ltx-video"].costPerClip;

// ── Tunable usage assumptions (ADJUST as real runs are measured) ──
export const ASSUMPTIONS = {
  scriptTokens: { in: 3000, out: 1800 }, // gpt-4.1 script/director call (per video)
  sceneTokens:  { in: 2500, out: 4000 }, // gpt-5.4 per beat/scene — HTML/CSS, output-heavy (DOMINANT)
  motionTokens: { in: 1500, out: 1500 }, // gpt-5.4 motion pass (per video)
  visionTokens: { in: 2000, out: 800 },  // gpt-4o vision (product analysis)
  wordsPerSec: 2.0, charsPerWord: 6, secPerBeat: 2.2,
  imageRatio: 0.66,                      // fraction of beats that are image-backed
  renderUsd: 0.03,                       // est. render compute per video
};
const A = ASSUMPTIONS;

const beats = (sec) => Math.max(1, Math.round(sec / A.secPerBeat));
const ttsForSec = (sec) => tts(sec * A.wordsPerSec * A.charsPerWord);

/** Free-design video (AI Video / Social): script + N gpt-5.4 scenes + motion + images + TTS + render. */
export function videoCogs(sec, { imageRatio = A.imageRatio } = {}) {
  const n = beats(sec);
  const script = gpt("gpt-4.1", A.scriptTokens.in, A.scriptTokens.out);
  const scenes = n * gpt("gpt-5.4", A.sceneTokens.in, A.sceneTokens.out);
  const motion = gpt("gpt-5.4", A.motionTokens.in, A.motionTokens.out);
  const images = Math.round(n * imageRatio) * fluxImg;
  const ttsCost = ttsForSec(sec);
  const usd = script + scenes + motion + images + ttsCost + A.renderUsd;
  return { sec, beats: n, usd, parts: { script, scenes, motion, images, tts: ttsCost, render: A.renderUsd } };
}

/** Typography video: script + N gpt-5.4 scenes + TTS + render (no AI images). */
export function typographyCogs(sec) {
  const n = beats(sec);
  const usd = gpt("gpt-4.1", A.scriptTokens.in, A.scriptTokens.out)
    + n * gpt("gpt-5.4", A.sceneTokens.in, A.sceneTokens.out)
    + ttsForSec(sec) + A.renderUsd;
  return { sec, beats: n, usd };
}

/** Product Ad: gpt-4o analysis + gpt-4.1 script + base/scene images (nano) + gpt-5.4 overlays + LTX clips + TTS. */
export function productAdCogs(scenes = 5) {
  const analysis = gpt("gpt-4o", A.visionTokens.in, A.visionTokens.out);
  const script = gpt("gpt-4.1", A.scriptTokens.in, A.scriptTokens.out);
  const images = (1 + scenes) * nanoImg;                         // base + per-scene shot
  const overlays = scenes * gpt("gpt-5.4", A.sceneTokens.in, A.sceneTokens.out);
  const clips = scenes * ltxClip;                                // the expensive part
  const ttsCost = ttsForSec(scenes * 5);                         // ~5s narration per scene
  const usd = analysis + script + images + overlays + clips + ttsCost + A.renderUsd;
  return { scenes, usd, parts: { analysis, script, images, overlays, clips, tts: ttsCost } };
}

/** Single image services: 1 gpt-4.1/4o call + 1 flux image. */
export function imageServiceCogs() {
  return gpt("gpt-4.1", 1500, 800) + fluxImg;
}

// ── Printable report ──
const usd = (n) => `$${n.toFixed(3)}`;
function report() {
  console.log("\n=== ESTIMATED COGS (from aiModels.js + assumptions) ===\n");
  console.log("AI Video / Social (free-design, with images):");
  for (const s of [15, 30, 45, 60]) {
    const r = videoCogs(s);
    const scenePct = Math.round(r.parts.scenes / r.usd * 100);
    console.log(`  ${s}s → ${r.beats} beats → ${usd(r.usd)}  (gpt-5.4 scenes = ${scenePct}% of cost)`);
  }
  console.log("\nTypography (no images):");
  for (const s of [15, 30, 60]) { const r = typographyCogs(s); console.log(`  ${s}s → ${usd(r.usd)}`); }
  console.log("\nProduct Ad:");
  for (const n of [3, 5]) { const r = productAdCogs(n); console.log(`  ${n} scenes → ${usd(r.usd)}  (clips ${usd(r.parts.clips)})`); }
  console.log(`\nSingle image service (poster/thumbnail/banner): ${usd(imageServiceCogs())}`);
  console.log("");
}
report();
