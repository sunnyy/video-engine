/**
 * devSnapshot.js — PRIVATE one-shot project inspector (LOCAL DEV ONLY).
 *
 * Give it a project id and it: (1) fetches raw_ai_json (the plan + beat HTMLs) and
 * safe_project_json (the timeline) straight from Supabase, (2) writes both to
 * <repo>/.aiv-preview/<id>/, (3) renders sparse PREVIEW frames (one every ~1.5s) through our own
 * render engine — the real composed page, not the final MP4 — into the same folder, and (4) writes
 * a manifest.json summarising scenes/sources. So an AI Video run can be inspected end-to-end from
 * an id alone (no manual export/screenshot/paste).
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

// ONE flat folder, fully wiped before every snapshot — so there's only ever the latest run's
// frames + JSON to look at (no per-project subfolders to clean up).
const OUT_DIR = path.join(PROJECT_ROOT, ".aiv-preview", "latest");
function freshOutDir() {
  try { fs.rmSync(OUT_DIR, { recursive: true, force: true }); } catch {}
  fs.mkdirSync(OUT_DIR, { recursive: true });
  return OUT_DIR;
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
    const outDir = freshOutDir();

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
    const beatHTMLs = proj.raw_ai_json?.beatHTMLs;
    if (Array.isArray(beatHTMLs) && beatHTMLs.some(Boolean)) {
      const W = proj.safe_project_json?.format?.width ?? 1080;
      const H = proj.safe_project_json?.format?.height ?? 1920;
      try { designs = await renderBeatDesigns(beatHTMLs, { outDir, width: W, height: H }); }
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
    const outDir = freshOutDir();
    fs.writeFileSync(path.join(outDir, "safe_project.json"), JSON.stringify(proj.safe_project_json ?? null, null, 2));
    fs.writeFileSync(path.join(outDir, "raw_ai_json.json"), JSON.stringify(proj.raw_ai_json ?? null, null, 2));
    res.json({ id: proj.id, name: proj.name, source: proj.source, outDir, summary: summarize(proj.safe_project_json, proj.raw_ai_json) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
