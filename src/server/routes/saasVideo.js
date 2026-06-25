import express from "express";
import fs from "fs";
import path from "path";
import { supabaseAdmin, openai, requireAuth, deductCredits, addCredits, uuidv4, TEMP_DIR } from "../middleware/shared.js";
import { createEmptyProject, createEmptyScene, PROJECT_STATUS, ASSET_TYPE, ASSET_SOURCE } from "../../services/ai/saasVideo/projectSchema.js";
import { generateAssetRequirements, updateAssetStatus } from "../../services/ai/saasVideo/assetRequirements.js";
import { markProjectApproved, transitionProjectStatus, getProjectSummary } from "../../services/ai/saasVideo/projectStateManager.js";
import { orchestratePromoRender } from "../../services/ai/saasVideo/renderOrchestrator.js";
import { processTalkingHeadVideo, processTalkingHeadFromPath } from "../../services/ai/saasVideo/talkingHeadProcessor.js";
import { runV2Pipeline, planPromoNarration } from "../../services/ai/saasVideo/pipelineOrchestrator.js";
import { guardContent } from "../../services/ai/shared/moderation.js";
import { CREDIT_COSTS } from "../../core/utils/creditCosts.js";

export const router = express.Router();

const PROMO_VIDEO_CREDITS = CREDIT_COSTS.promo_video;
const TH_VIDEO_CREDITS    = CREDIT_COSTS.promo_video_th;
function promoCredits(sceneCount) {
  return PROMO_VIDEO_CREDITS[sceneCount] ?? PROMO_VIDEO_CREDITS[3];
}

function rowToProject(row) {
  return {
    id:                  row.id,
    user_id:             row.user_id,
    status:              row.status,
    video_type:          row.video_type          || null,
    video_goal:          row.video_goal,
    product_name:        row.product_name,
    product_url:         row.product_url,
    product_description: row.product_description,
    target_platform:     row.target_platform,
    language:            row.language,
    tone:                row.tone,
    target_audience:     row.target_audience,
    duration_seconds:    row.duration_seconds,
    has_script:          row.has_script,
    has_talking_head:    row.has_talking_head,
    has_screenshots:     row.has_screenshots,
    has_recordings:      row.has_recordings,
    has_logo:            row.has_logo,
    has_voiceover:       row.has_voiceover,
    logo_url:            row.logo_url            || null,
    style:               row.style || {},
    scenes:              row.scenes || [],
    credits_estimated:   row.credits_estimated,
    credits_charged:     row.credits_charged,
    approved_at:         row.approved_at,
    video_url:           row.video_url         || null,
    error_message:       row.error_message      || null,
    editor_project_id:   row.editor_project_id  || null,
    scene_format:        row.scene_format        || null,
    pipeline_version:    row.pipeline_version    || null,
    visual_style:        row.visual_style        || "radiant",
    accent_color:        row.accent_color        || "#6366f1",
    typography_style:    row.typography_style    || "modern",
    format_ratio:        row.style?.format_ratio ?? '9:16',
    theme:               row.style?.theme        ?? 'dark',
    created_at:          row.created_at,
    updated_at:          row.updated_at,
  };
}

// ── POST /promo-video/transcribe-th ─────────────────────────────────────────
// Client sends the raw video file (binary body). Server runs Whisper + segments.
// No Supabase roundtrip — file goes client → server directly.
router.post("/transcribe-th", requireAuth, express.raw({ type: "*/*", limit: "500mb" }), async (req, res) => {
  const ext     = ((req.headers["x-file-ext"] || "mp4").toLowerCase().match(/^[a-z0-9]+$/) || ["mp4"])[0];
  const tmpPath = path.join(TEMP_DIR, `th-direct-${uuidv4()}.${ext}`);
  try {
    fs.writeFileSync(tmpPath, req.body);
    console.log(`[promo-video/transcribe-th] received ${req.body.length} bytes (.${ext})`);
    const result = await processTalkingHeadFromPath(tmpPath, true);
    res.json({ scenes: result.scenes, full_transcript: result.full_transcript, total_duration: result.total_duration });
  } catch (e) {
    console.error("[promo-video/transcribe-th]", e.message);
    res.status(500).json({ error: e.message });
  } finally {
    try { fs.unlinkSync(tmpPath); } catch {}
  }
});

// ── POST /promo-video/init ───────────────────────────────────────────────────
// Creates a minimal draft row at end of Step 1 so the project has an ID
// before any AI work begins. Client uses this to update the URL for resume.
router.post("/init", requireAuth, async (req, res) => {
  try {
    const id  = uuidv4();
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from("promo_videos").insert({
      id,
      user_id:             req.user.id,
      status:              "draft",
      product_name:        req.body.product_name        ?? "",
      product_url:         req.body.product_url         ?? null,
      product_description: req.body.product_description ?? null,
      target_platform:     req.body.target_platform     ?? null,
      language:            req.body.language            ?? "en",
      tone:                req.body.tone                ?? null,
      duration_seconds:    req.body.duration_seconds    ?? 30,
      video_goal:          null,
      video_type:          null,
      has_script:          false,
      has_talking_head:    false,
      has_screenshots:     false,
      has_recordings:      false,
      has_logo:            false,
      has_voiceover:       false,
      style:               {},
      scenes:              [],
      credits_estimated:   null,
      credits_charged:     0,
      created_at:          now,
      updated_at:          now,
    });
    if (error) throw new Error(error.message);
    res.json({ projectId: id });
  } catch (e) {
    console.error("[promo-video/init]", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── POST /promo-video/create ─────────────────────────────────────────────────
router.post("/create", requireAuth, async (req, res) => {
  try {
    const {
      video_goal, video_type, product_name, product_url, product_description,
      target_platform, language, tone, target_audience, duration_seconds,
      has_script, has_talking_head, has_screenshots, has_recordings, has_logo, has_voiceover,
      caption_style, transition_style, motion_style, color_palette, music_mood,
      visual_style, accent_color, accent_color_2, typography_style, voice_id, scene_count, target_duration,
    } = req.body;

    // Safety: moderate the user-supplied product text before building the video.
    if (!(await guardContent(res, { text: [product_name, product_description, target_audience], label: "saas-video" }))) return;

    // Use existing draft ID (from /init) if provided, otherwise generate new one
    const id = req.body.project_id || uuidv4();
    if (req.body.project_id) {
      const { data: existing } = await supabaseAdmin
        .from("promo_videos").select("id").eq("id", id).eq("user_id", req.user.id).maybeSingle();
      if (!existing) return res.status(403).json({ error: "Project not found or access denied" });
    }

    let project = createEmptyProject(req.user.id, {
      video_goal, product_name, product_url, product_description,
      target_platform, language, tone, target_audience,
      duration_seconds: duration_seconds || 30,
      caption_style, transition_style, motion_style, color_palette, music_mood,
    });

    const { talking_head_url, logo_url } = req.body;
    const resolvedVideoType = video_type || (has_talking_head ? "talking_head" : "faceless");

    project = {
      ...project,
      id,
      video_type:       resolvedVideoType,
      has_script:       !!has_script,
      has_talking_head: !!has_talking_head,
      has_screenshots:  !!has_screenshots,
      has_recordings:   !!has_recordings,
      has_logo:         !!has_logo,
      has_voiceover:    !!has_voiceover,
      logo_url:         logo_url || null,
      product_notes:    (req.body.notes ?? "").trim() || null,
      // "url" → scraped copy is source of truth; "manual" → typed copy leads, URL is visuals-only
      text_source:      req.body.text_source || (product_url ? "url" : "manual"),
      language:         language         || "en",
      visual_style:     visual_style     || "radiant",
      theme:            req.body.theme   || "dark",
      accent_color:     accent_color     || "#6366f1",
      // Optional secondary accent — carried in-flight to the v2 pipeline only (NOT a DB column).
      accent_color_2:   accent_color_2   || null,
      typography_style: typography_style || "modern",
      voice_id:         voice_id         || "21m00Tcm4TlvDq8ikWAM",
      // target_duration drives the beat pipeline; scene_count kept only for render-time pricing tiers
      target_duration:  Number(target_duration) || 30,
      scene_count:      scene_count ?? (Number(target_duration) <= 15 ? 1 : Number(target_duration) <= 30 ? 3 : 5),
      format_ratio:     req.body.format_ratio || '9:16',
      // Reviewed/edited script (from the optional "Review script" step) — pipeline uses it verbatim.
      script:           (req.body.script ?? "").trim() || null,
    };

    // ── Plan-only: narration for the "Review script" step. No persist, no credits, no render. ──
    if (req.body.plan_only) {
      const { full_script } = await planPromoNarration(project);
      return res.json({ plan_only: true, full_script });
    }

    let thSegments = null; // raw segments with timestamps, saved to talking_head_segments column

    if (resolvedVideoType === "talking_head") {
      // ── Talking Head v2 path: transcript → runV2Pipeline (forks to runTHPipeline) ─
      console.log(`[promo-video/create] talking head v2 path for ${id}`);
      const preSegments = req.body.talking_head_segments;
      let thResult;
      if (preSegments?.length > 0) {
        thResult = {
          scenes:          preSegments,
          full_transcript: preSegments.map(s => s.spoken).join(" "),
          total_duration:  preSegments[preSegments.length - 1]?.end ?? 0,
        };
        console.log(`[promo-video/create] using ${preSegments.length} pre-transcribed segments`);
      } else if (talking_head_url) {
        thResult = await processTalkingHeadVideo(talking_head_url, id);
      } else {
        throw new Error("Talking head video requires either talking_head_segments or talking_head_url");
      }
      thSegments = thResult.scenes;

      project = {
        ...project,
        th_transcript: {
          scenes:         thResult.scenes,
          full_transcript: thResult.full_transcript,
          total_duration:  thResult.total_duration ?? 0,
        },
        has_script:  true,
      };
      project = await runV2Pipeline(project);

    } else {
      // ── Faceless path: always generate the script + voiceover (TTS) ourselves ──
      project = await runV2Pipeline(project);
    }

    // v2 pipeline pre-computes the manifest from the script; other paths compute it now.
    const assetManifest = project._assetManifest ?? generateAssetRequirements(project);

    const { error: dbErr } = await supabaseAdmin.from("promo_videos").upsert({
      id,
      user_id:                  project.user_id,
      status:                   project.status,
      video_goal:               project.video_goal,
      video_type:               project.video_type,
      product_name:             project.product_name,
      product_url:              project.product_url,
      product_description:      project.product_description,
      target_platform:          project.target_platform,
      language:                 project.language,
      tone:                     project.tone,
      target_audience:          project.target_audience,
      duration_seconds:         Math.round(project.duration_seconds),
      has_script:               project.has_script,
      has_talking_head:         project.has_talking_head,
      has_screenshots:          project.has_screenshots,
      has_recordings:           project.has_recordings,
      has_logo:                 project.has_logo,
      has_voiceover:            project.has_voiceover,
      logo_url:                 project.logo_url || null,
      style: {
        caption_style:    project.caption_style    ?? null,
        transition_style: project.transition_style ?? null,
        motion_style:     project.motion_style     ?? null,
        color_palette:    project.color_palette    ?? null,
        music_mood:       project.music_mood       ?? null,
        format_ratio:     project.format_ratio     ?? '9:16',
        theme:            project.theme            ?? 'dark',
      },
      scenes:                   project.scenes || [],
      scene_format:             project.scene_format || null,
      pipeline_version:         project.pipeline_version || null,
      editor_project_id:        project.editor_project_id || null,
      asset_manifest:           assetManifest,
      visual_style:             project.visual_style     || "radiant",
      accent_color:             project.accent_color     || "#6366f1",
      typography_style:         project.typography_style || "modern",
      full_transcript:          project.script || null,
      talking_head_segments:    thSegments,
      credits_estimated:        project.credits_estimated,
      credits_charged:          project.credits_charged,
      created_at:               project.created_at,
      updated_at:               project.updated_at,
    });
    if (dbErr) console.error("[promo-video/create] db:", dbErr.message);

    res.json({ project, assetManifest });
  } catch (e) {
    console.error("[promo-video/create]", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── POST /promo-video/:projectId/approve ─────────────────────────────────────
router.post("/:projectId/approve", requireAuth, async (req, res) => {
  try {
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("promo_videos")
      .select("*")
      .eq("id", req.params.projectId)
      .eq("user_id", req.user.id)
      .single();
    if (fetchErr || !row) return res.status(404).json({ error: "Project not found" });

    const project = markProjectApproved(rowToProject(row), 0);

    const { error: updErr } = await supabaseAdmin
      .from("promo_videos")
      .update({
        status:      project.status,
        approved_at: project.approved_at,
        updated_at:  project.updated_at,
      })
      .eq("id", req.params.projectId);
    if (updErr) throw new Error(updErr.message);

    res.json({ project, assetManifest: row.asset_manifest });
  } catch (e) {
    console.error("[promo-video/approve]", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── POST /promo-video/:projectId/upload-asset ────────────────────────────────
router.post("/:projectId/upload-asset", requireAuth, async (req, res) => {
  try {
    const { scene_id, asset_url } = req.body;
    if (!scene_id || !asset_url) return res.status(400).json({ error: "scene_id and asset_url required" });

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("promo_videos")
      .select("*")
      .eq("id", req.params.projectId)
      .eq("user_id", req.user.id)
      .single();
    if (fetchErr || !row) return res.status(404).json({ error: "Project not found" });

    const updatedManifest = updateAssetStatus(row.asset_manifest, scene_id, "resolved", asset_url);

    let newStatus = row.status;
    if (updatedManifest.all_assets_provided && row.status === PROJECT_STATUS.WAITING_ASSETS) {
      newStatus = PROJECT_STATUS.ASSETS_READY;
    }

    const updatedScenes = (row.scenes || []).map(s =>
      s.scene_id === scene_id ? { ...s, asset_url } : s
    );

    const updatedAt = new Date().toISOString();
    const { error: updErr } = await supabaseAdmin
      .from("promo_videos")
      .update({ status: newStatus, asset_manifest: updatedManifest, scenes: updatedScenes, updated_at: updatedAt })
      .eq("id", req.params.projectId);
    if (updErr) throw new Error(updErr.message);

    // Inject the uploaded asset URL into matching image layers in the editor timeline.
    // scene_id is 1-based; timeline layer IDs use 0-based scene_index (s0_, s1_, ...).
    if (row.editor_project_id && asset_url) {
      try {
        const sceneIndex = scene_id - 1;
        const prefix = `s${sceneIndex}_`;
        const { data: editorRow } = await supabaseAdmin
          .from("projects")
          .select("safe_project_json")
          .eq("id", row.editor_project_id)
          .single();
        if (editorRow?.safe_project_json) {
          const timeline = editorRow.safe_project_json;
          let injected = false;
          const updatedLayers = timeline.layers.map(layer => {
            if (layer.type === "image" && layer.id?.startsWith(prefix) && (!layer.src || layer.isPlaceholder)) {
              injected = true;
              return { ...layer, src: asset_url, isPlaceholder: false, assetQueued: false };
            }
            return layer;
          });
          if (injected) {
            await supabaseAdmin
              .from("projects")
              .update({ safe_project_json: { ...timeline, layers: updatedLayers }, updated_at: updatedAt })
              .eq("id", row.editor_project_id);
            console.log(`[upload-asset] injected asset into editor project ${row.editor_project_id} scene ${sceneIndex}`);
          }
        }
      } catch (e) {
        console.warn("[upload-asset] editor timeline injection failed (non-fatal):", e.message);
      }
    }

    const project = { ...rowToProject(row), status: newStatus, updated_at: updatedAt };
    res.json({ assetManifest: updatedManifest, project });
  } catch (e) {
    console.error("[promo-video/upload-asset]", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── POST /promo-video/:projectId/render ─────────────────────────────────────
router.post("/:projectId/render", requireAuth, async (req, res) => {
  let creditAmount = 0;
  try {
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("promo_videos")
      .select("id, status, user_id, style, video_type")
      .eq("id", req.params.projectId)
      .eq("user_id", req.user.id)
      .single();

    if (fetchErr || !row) return res.status(404).json({ error: "Project not found" });

    const isTH            = row.video_type === "talking_head";
    const sceneCount      = row.style?.scene_count ?? 3;
    const creditsToDeduct = isTH ? TH_VIDEO_CREDITS : promoCredits(sceneCount);

    const deduction = await deductCredits(
      req.user.id, creditsToDeduct,
      "promo_video", `SaaS/Promo Video render (${sceneCount} scenes)`,
      req.params.projectId
    );
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    creditAmount = creditsToDeduct;

    // If TH URL just uploaded by client, inject it into scenes + editor timeline
    const { talking_head_url: thUrl } = req.body || {};
    if (thUrl) {
      const { data: projRow } = await supabaseAdmin
        .from("promo_videos").select("scenes, editor_project_id").eq("id", req.params.projectId).single();
      if (projRow?.scenes) {
        const updatedScenes = projRow.scenes.map(s => ({ ...s, th_url: thUrl }));
        await supabaseAdmin.from("promo_videos")
          .update({ scenes: updatedScenes }).eq("id", req.params.projectId);
      }
      if (projRow?.editor_project_id) {
        try {
          const { data: editorRow } = await supabaseAdmin
            .from("projects").select("safe_project_json").eq("id", projRow.editor_project_id).single();
          if (editorRow?.safe_project_json) {
            const tl = editorRow.safe_project_json;
            const totalDur = tl.format?.duration ?? 0;
            const updatedLayers = tl.layers.map(l => {
              if (l.id === 'th_video_base') return { ...l, src: thUrl, end: totalDur, trimEnd: totalDur };
              if (l.src === '__TH_VIDEO__')  return { ...l, src: thUrl };
              return l;
            });
            await supabaseAdmin.from("projects")
              .update({ safe_project_json: { ...tl, layers: updatedLayers } })
              .eq("id", projRow.editor_project_id);
            console.log(`[promo-video/render] injected th_url into editor timeline ${projRow.editor_project_id}`);
          }
        } catch (e) {
          console.warn("[promo-video/render] th_url timeline injection failed (non-fatal):", e.message);
        }
      }
    }

    // Respond immediately — orchestrator runs async; client polls
    res.json({ started: true, projectId: req.params.projectId });

    orchestratePromoRender(req.params.projectId).catch(async err => {
      console.error(`[promo-video/render] ${req.params.projectId}:`, err.message);
      addCredits(req.user.id, creditAmount, "refund", "ai_failure_refund", "Refund: promo render failed").catch(() => {});
    });
  } catch (e) {
    if (creditAmount > 0) addCredits(req.user.id, creditAmount, "refund", "ai_failure_refund", "Refund: promo render failed").catch(() => {});
    console.error("[promo-video/render]", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── GET /promo-video/list — must be before /:projectId ──────────────────────
router.get("/list", requireAuth, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 18);
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;

    const { data, error, count } = await supabaseAdmin
      .from("promo_videos")
      .select("id, status, video_goal, video_type, product_name, duration_seconds, scenes, style, credits_charged, approved_at, created_at, video_url, editor_project_id", { count: "exact" })
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);

    // For faceless projects, grab the first image asset + background color from the editor timeline
    const editorIds = (data || []).map(r => r.editor_project_id).filter(Boolean);
    const editorThumbs = {};
    if (editorIds.length > 0) {
      const { data: editorRows } = await supabaseAdmin
        .from("projects")
        .select("id, safe_project_json")
        .in("id", editorIds);
      for (const row of editorRows || []) {
        const layers = row.safe_project_json?.layers || [];
        const firstImg = layers.find(l => l.type === "image" && l.src);
        const firstBg  = layers.find(l => (l.type === "gradient" || l.type === "solid") && (l.gradient || l.color));
        const fullScript   = row.safe_project_json?.full_script || "";
        const firstSentence = fullScript.split(/(?<=[.!?])\s+/)[0]?.trim() || null;
        editorThumbs[row.id] = {
          src:    firstImg?.src ?? null,
          bg:     firstBg?.gradient || firstBg?.color || null,
          script: firstSentence,
        };
      }
    }

    const projects = (data || []).map(row => {
      const summary = getProjectSummary(rowToProject(row));
      const ed = row.editor_project_id ? editorThumbs[row.editor_project_id] : null;
      if (ed?.src && !summary.preview_url) summary.preview_url    = ed.src;
      if (ed?.bg)                          summary.preview_bg     = ed.bg;
      if (ed?.script)                      summary.preview_script = ed.script;
      return summary;
    });
    res.json({ projects, total: count ?? 0, page, limit });
  } catch (e) {
    console.error("[promo-video/list]", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE /promo-video/:projectId ──────────────────────────────────────────
router.delete("/:projectId", requireAuth, async (req, res) => {
  try {
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("promo_videos")
      .select("id, editor_project_id")
      .eq("id", req.params.projectId)
      .eq("user_id", req.user.id)
      .single();
    if (fetchErr || !row) return res.status(404).json({ error: "Project not found" });

    const { error: delErr } = await supabaseAdmin
      .from("promo_videos")
      .delete()
      .eq("id", req.params.projectId);
    if (delErr) throw new Error(delErr.message);

    // Also remove the editor project row if one was created
    if (row.editor_project_id) {
      try { await supabaseAdmin.from("projects").delete().eq("id", row.editor_project_id); } catch {}
    }

    res.json({ success: true });
  } catch (e) {
    console.error("[promo-video/delete]", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── GET /promo-video/voices ──────────────────────────────────────────────────
// Must be defined before /:projectId to prevent the wildcard from intercepting it.
const PROMO_VOICE_META = [
  { id: "21m00Tcm4TlvDq8ikWAM", label: "Rachel",  gender: "female", desc: "Calm & professional"  },
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Bella",   gender: "female", desc: "Warm & expressive"    },
  { id: "XrExE9yKIg1WjnnlVkGX", label: "Matilda", gender: "female", desc: "Friendly & natural"   },
  { id: "onwK4e9ZLuTAKqWW03F9", label: "Daniel",  gender: "male",   desc: "Deep & authoritative" },
  { id: "pNInz6obpgDQGcFmaJgB", label: "Adam",    gender: "male",   desc: "Bold & commanding"    },
];

const LANG_TO_EL_CODE = { hinglish: "hi", es: "es" };

router.get("/voices", requireAuth, async (req, res) => {
  const lang   = req.query.lang;
  const elCode = LANG_TO_EL_CODE[lang];

  // Non-English: fetch top voices from ElevenLabs shared library filtered by language.
  // Shared-voice preview_url is already recorded in the target language — no sample generation needed.
  if (elCode) {
    try {
      const elRes = await fetch(
        `https://api.elevenlabs.io/v1/shared-voices?language=${elCode}&page_size=6&sort=usage`,
        { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY } }
      );
      if (!elRes.ok) throw new Error(`ElevenLabs ${elRes.status}`);
      const data   = await elRes.json();
      const voices = (data.voices || []).slice(0, 5).map(v => ({
        id:          v.voice_id,
        label:       v.name,
        gender:      v.labels?.gender ?? "female",
        desc:        v.description?.slice(0, 40) ?? "",
        preview_url: v.preview_url ?? null,
      }));
      return res.json({ voices });
    } catch (err) {
      console.warn("[promo-video/voices] ElevenLabs shared-voices failed:", err.message);
      return res.json({ voices: [] });
    }
  }

  // English: return curated list enriched with ElevenLabs preview URLs.
  try {
    const elRes = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
    });
    const data = elRes.ok ? await elRes.json() : { voices: [] };
    const byId = Object.fromEntries((data.voices || []).map(v => [v.voice_id, v]));
    const voices = PROMO_VOICE_META.map(meta => ({
      ...meta,
      preview_url: byId[meta.id]?.preview_url ?? null,
    }));
    res.json({ voices });
  } catch {
    res.json({ voices: PROMO_VOICE_META.map(v => ({ ...v, preview_url: null })) });
  }
});

// ── GET /promo-video/:projectId ──────────────────────────────────────────────
router.get("/:projectId", requireAuth, async (req, res) => {
  try {
    const { data: row, error } = await supabaseAdmin
      .from("promo_videos")
      .select("*")
      .eq("id", req.params.projectId)
      .eq("user_id", req.user.id)
      .single();
    if (error || !row) return res.status(404).json({ error: "Project not found" });
    res.json({ project: rowToProject(row), assetManifest: row.asset_manifest });
  } catch (e) {
    console.error("[promo-video/get]", e.message);
    res.status(500).json({ error: e.message });
  }
});
