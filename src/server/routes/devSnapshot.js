/**
 * devSnapshot.js — PRIVATE one-shot project inspector (LOCAL DEV ONLY).
 *
 * Give it ANY video project's id (ai_video / promo_video / social_video / product_video /
 * typography_video / TH) and it: (1) fetches raw_ai_json (the plan + designed HTML) and
 * safe_project_json (the timeline), (2) writes both to a PER-SERVICE folder <repo>/.aiv-preview/
 * <source>/ (so each service keeps its own latest snapshot), (3) renders sparse PREVIEW frames
 * (scene-NN.png) from the timeline + the original designed HTML (design-NN.png) so the two can be
 * compared, and (4) writes a manifest.json. Any service's run can be inspected from an id alone.
 *
 * GATE: loopback address + NODE_ENV !== "production" ONLY. This never serves in prod and needs no
 * auth token, so it can be driven from a local shell. Mounted at /api/dev (BEFORE the auth'd lab
 * router) — distinct paths (/snapshot, /project), so the lab's requireAuth is unaffected.
 */
import express from "express";
import fs from "fs";
import path from "path";
import { supabaseAdmin, PROJECT_ROOT } from "../middleware/shared.js";
import { renderPreviewFrames, renderBeatDesigns } from "../../render/preview.js";

export const router = express.Router();

const isLoopback = (req) => {
  const ip = req.ip || req.socket?.remoteAddress || "";
  return ip === "::1" || ip === "127.0.0.1" || ip === "::ffff:127.0.0.1" || ip.endsWith("127.0.0.1");
};
router.use((req, res, next) => {
  if (process.env.NODE_ENV !== "production" && isLoopback(req)) return next();
  return res.status(403).json({ error: "devSnapshot is local-dev only" });
});

// One folder PER SERVICE (source), wiped before each snapshot — so every service keeps its own
// latest run's frames + JSON side by side (e.g. .aiv-preview/social_video/, .aiv-preview/ai_video/).
const BASE_DIR = path.join(PROJECT_ROOT, ".aiv-preview");
function freshOutDir(source) {
  const dir = path.join(BASE_DIR, String(source || "unknown").replace(/[^a-z0-9_-]/gi, "_"));
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Designed HTML is stored under a different key per service — collect whichever this project used,
// so design-NN.png renders for all of them (typography saves none → design frames simply skipped).
function extractDesignHTMLs(raw) {
  if (!raw) return [];
  if (Array.isArray(raw.beatHTMLs)  && raw.beatHTMLs.some(Boolean))  return raw.beatHTMLs;   // ai_video
  if (Array.isArray(raw.sceneHTMLs) && raw.sceneHTMLs.some(Boolean)) return raw.sceneHTMLs;  // social / product / promo-TH
  if (Array.isArray(raw.beats))  { const h = raw.beats.map((b) => b?.html ?? null);  if (h.some(Boolean)) return h; } // saas faceless
  if (Array.isArray(raw.scenes)) { const h = raw.scenes.map((s) => s?.html ?? null); if (h.some(Boolean)) return h; }
  return [];
}

async function fetchProject(id) {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("id, name, source, raw_ai_json, safe_project_json, updated_at")
    .eq("id", id)
    .single();
  if (error) throw new Error(`Supabase: ${error.message}`);
  if (!data) throw new Error("project not found");
  return data;
}

// Compact, text-only summary of the timeline so the manifest reads at a glance.
function summarize(safe, raw) {
  const layers = safe?.layers || [];
  const scenes = {};
  for (const l of layers) {
    const m = (l.trackId || "").match(/^s(\d+)_/);
    if (!m) continue;
    const k = +m[1];
    scenes[k] = scenes[k] || { idx: k, start: Infinity, end: 0, images: 0, videos: 0, texts: [] };
    const s = scenes[k];
    s.start = Math.min(s.start, l.start ?? 0);
    s.end = Math.max(s.end, l.end ?? 0);
    if (l.type === "image") s.images++;
    if (l.type === "video") s.videos++;
    if (l.type === "text") { const t = (l.content || l.text || "").replace(/\s+/g, " ").trim(); if (t) s.texts.push(t); }
  }
  const beats = raw?.beats || [];
  return {
    name: safe?.name ?? null,
    source: safe?.meta?.source ?? null,
    style: safe?.meta?.visual_style ?? null,
    user_prompt: safe?.meta?.user_prompt ?? null,
    duration: safe?.format?.duration ?? null,
    beats: beats.map((b) => ({ i: b.beat_index, source: b.source, split_hold: !!b.split_hold, continues: !!b.continues_previous, dur: b.duration_seconds, line: b.script_line })),
    scenes: Object.values(scenes).sort((a, b) => a.idx - b.idx)
      .map((s) => ({ idx: s.idx, start: +s.start.toFixed(2), end: +s.end.toFixed(2), images: s.images, videos: s.videos, text: s.texts })),
  };
}

// GET /api/dev/snapshot/:id  — fetch + dump JSON + render ONE frame per scene (default).
// ?mode=cadence&every=1.5 falls back to a fixed time cadence.
router.get("/snapshot/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const mode = req.query.mode === "cadence" ? "cadence" : "scene";
    const everySec = Math.max(0.5, Math.min(5, parseFloat(req.query.every) || 1.5));
    const proj = await fetchProject(id);
    const outDir = freshOutDir(proj.source);

    fs.writeFileSync(path.join(outDir, "safe_project.json"), JSON.stringify(proj.safe_project_json ?? null, null, 2));
    fs.writeFileSync(path.join(outDir, "raw_ai_json.json"), JSON.stringify(proj.raw_ai_json ?? null, null, 2));

    let preview = null, previewError = null;
    if (proj.safe_project_json?.layers?.length) {
      try { preview = await renderPreviewFrames(proj.safe_project_json, { outDir, mode, everySec }); }
      catch (e) { previewError = e.message; }
    } else previewError = "no layers in safe_project_json";

    // Also render each beat's ORIGINAL designed HTML (design-NN.png) so it can be compared against
    // the converted scene-NN.png — exposing where the measure/convert pipeline diverges from intent.
    let designs = null, designsError = null;
    const htmls = extractDesignHTMLs(proj.raw_ai_json);
    if (htmls.length) {
      const W = proj.safe_project_json?.format?.width ?? 1080;
      const H = proj.safe_project_json?.format?.height ?? 1920;
      // Render the design previews on the video's real field (palette base) — not browser-white — so
      // the preview faithfully predicts the video instead of faking invisible-text/contrast failures.
      const field = proj.raw_ai_json?.palette?.bg ?? null;
      try { designs = await renderBeatDesigns(htmls, { outDir, width: W, height: H, background: field }); }
      catch (e) { designsError = e.message; }
    }

    const summary = summarize(proj.safe_project_json, proj.raw_ai_json);
    const manifest = { id, name: proj.name, source: proj.source, updated_at: proj.updated_at, outDir, mode, preview, previewError, designs, designsError, summary };
    fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
    res.json(manifest);
  } catch (e) {
    console.error("[dev-snapshot]", e);
    res.status(400).json({ error: e.message });
  }
});

// GET /api/dev/project/:id — JSON only (no render), for a quick fetch
router.get("/project/:id", async (req, res) => {
  try {
    const proj = await fetchProject(req.params.id);
    const outDir = freshOutDir(proj.source);
    fs.writeFileSync(path.join(outDir, "safe_project.json"), JSON.stringify(proj.safe_project_json ?? null, null, 2));
    fs.writeFileSync(path.join(outDir, "raw_ai_json.json"), JSON.stringify(proj.raw_ai_json ?? null, null, 2));
    res.json({ id: proj.id, name: proj.name, source: proj.source, outDir, summary: summarize(proj.safe_project_json, proj.raw_ai_json) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
