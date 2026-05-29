import express from "express";
import fs from "fs";
import path from "path";
import { supabaseAdmin, openai, requireAuth, deductCredits, addCredits, uuidv4, TEMP_DIR } from "../middleware/shared.js";
import { createEmptyProject, createEmptyScene, PROJECT_STATUS, ASSET_TYPE, ASSET_SOURCE } from "../../services/ai/promoVideo/projectSchema.js";
import { generateScenePlan, assignVisualModes } from "../../services/ai/promoVideo/scenePlanner.js";
import { generateAssetRequirements, updateAssetStatus } from "../../services/ai/promoVideo/assetRequirements.js";
import { markProjectApproved, transitionProjectStatus, getProjectSummary } from "../../services/ai/promoVideo/projectStateManager.js";
import { orchestratePromoRender } from "../../services/ai/promoVideo/renderOrchestrator.js";
import { processTalkingHeadVideo, processTalkingHeadFromPath } from "../../services/ai/promoVideo/talkingHeadProcessor.js";

export const router = express.Router();

const PROMO_VIDEO_CREDITS = 10;

function rowToProject(row) {
  return {
    id:                  row.id,
    user_id:             row.user_id,
    status:              row.status,
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
    style:               row.style || {},
    scenes:              row.scenes || [],
    credits_estimated:   row.credits_estimated,
    credits_charged:     row.credits_charged,
    approved_at:         row.approved_at,
    video_url:           row.video_url         || null,
    error_message:       row.error_message      || null,
    editor_project_id:   row.editor_project_id  || null,
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
    const result = await processTalkingHeadFromPath(tmpPath);
    res.json({ scenes: result.scenes, full_transcript: result.full_transcript, total_duration: result.total_duration });
  } catch (e) {
    console.error("[promo-video/transcribe-th]", e.message);
    res.status(500).json({ error: e.message });
  } finally {
    try { fs.unlinkSync(tmpPath); } catch {}
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
    } = req.body;

    const id = uuidv4();
    let project = createEmptyProject(req.user.id, {
      video_goal, product_name, product_url, product_description,
      target_platform, language, tone, target_audience,
      duration_seconds: duration_seconds || 30,
      caption_style, transition_style, motion_style, color_palette, music_mood,
    });

    const { voiceover_url, talking_head_url, script: scriptInput } = req.body;
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
    };

    let thSegments = null; // raw segments with timestamps, saved to talking_head_segments column

    if (resolvedVideoType === "talking_head") {
      // ── Talking Head path: segments may be pre-transcribed by /transcribe-th ─
      console.log(`[promo-video/create] talking head path for ${id}`);
      const preSegments = req.body.talking_head_segments;
      let thResult;
      if (preSegments?.length > 0) {
        // Fast path: client already ran /transcribe-th, skip download+Whisper
        thResult = {
          scenes:          preSegments,
          full_transcript: preSegments.map(s => s.spoken).join(" "),
          total_duration:  preSegments.reduce((sum, s) => sum + (s.duration_seconds || 0), 0),
        };
        console.log(`[promo-video/create] using ${preSegments.length} pre-transcribed segments`);
      } else if (talking_head_url) {
        // Fallback: download from Supabase and transcribe (original path)
        thResult = await processTalkingHeadVideo(talking_head_url, id);
      } else {
        throw new Error("Talking head video requires either talking_head_segments or talking_head_url");
      }
      thSegments = thResult.scenes;

      // Convert TH segments to project scene format
      // th_url holds the TH video clip; asset_url is reserved for per-scene screenshots
      let thScenes = thResult.scenes.map(s => createEmptyScene({
        scene_id:         s.scene_id,
        scene_type:       "talking_head",
        visual_mode:      null,
        script:           s.spoken,
        duration_seconds: s.duration_seconds,
        asset_type:       ASSET_TYPE.TALKING_HEAD,
        asset_source:     ASSET_SOURCE.PLACEHOLDER,
        asset_url:        null,
        th_url:           talking_head_url,
        asset_hint:       null,
        scene_purpose:    null,
        th_start:         s.start,
        th_end:           s.end,
      }));

      // Assign visual modes and asset hints via GPT (no script rewriting)
      thScenes = await assignVisualModes(thScenes, { ...project, video_type: "talking_head" });

      // Set asset_source based on resolved visual_mode
      thScenes = thScenes.map(s => ({
        ...s,
        asset_source:
          s.visual_mode === "full_asset" || s.visual_mode === "split_view"
            ? ASSET_SOURCE.USER_UPLOAD
            : s.visual_mode === "stock"
            ? ASSET_SOURCE.STOCK
            : ASSET_SOURCE.PLACEHOLDER,
      }));

      const totalDur = thScenes.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
      project = {
        ...project,
        scenes:           thScenes,
        script:           thResult.full_transcript,
        has_script:       true,
        duration_seconds: parseFloat(totalDur.toFixed(2)),
        status:           "script_generated",
        updated_at:       new Date().toISOString(),
      };

    } else {
      // ── Faceless path: optional voiceover transcription → GPT scene plan ───
      if (has_voiceover && voiceover_url && !scriptInput?.trim()) {
        const tmpPath = path.join(TEMP_DIR, `vo-${uuidv4()}.audio`);
        try {
          const audioRes = await fetch(voiceover_url);
          if (!audioRes.ok) throw new Error(`Failed to download voiceover: ${audioRes.status}`);
          fs.writeFileSync(tmpPath, Buffer.from(await audioRes.arrayBuffer()));
          const transcription = await openai.audio.transcriptions.create({
            model: "whisper-1",
            file:  fs.createReadStream(tmpPath),
          });
          project.script     = transcription.text?.trim() || null;
          project.has_script = !!project.script;
          console.log(`[promo-video/create] whisper: "${project.script?.slice(0, 80)}…"`);
        } catch (e) {
          console.warn("[promo-video/create] whisper transcription failed (non-fatal):", e.message);
        } finally {
          try { fs.unlinkSync(tmpPath); } catch {}
        }
      } else if (scriptInput?.trim()) {
        project.script = scriptInput.trim();
      }

      project = await generateScenePlan(project);
    }

    const assetManifest = generateAssetRequirements(project);

    const { error: dbErr } = await supabaseAdmin.from("promo_videos").insert({
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
      style: {
        caption_style:    project.caption_style    ?? null,
        transition_style: project.transition_style ?? null,
        motion_style:     project.motion_style     ?? null,
        color_palette:    project.color_palette    ?? null,
        music_mood:       project.music_mood       ?? null,
      },
      scenes:                   project.scenes || [],
      asset_manifest:           assetManifest,
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
  let creditAmount = 0;
  try {
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("promo_videos")
      .select("*")
      .eq("id", req.params.projectId)
      .eq("user_id", req.user.id)
      .single();
    if (fetchErr || !row) return res.status(404).json({ error: "Project not found" });

    const deduction = await deductCredits(
      req.user.id, PROMO_VIDEO_CREDITS,
      "promo_video", "SaaS/Promo Video generation",
      req.params.projectId
    );
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    creditAmount = PROMO_VIDEO_CREDITS;

    const project = markProjectApproved(rowToProject(row), PROMO_VIDEO_CREDITS);

    const { error: updErr } = await supabaseAdmin
      .from("promo_videos")
      .update({
        status:          project.status,
        credits_charged: project.credits_charged,
        approved_at:     project.approved_at,
        updated_at:      project.updated_at,
      })
      .eq("id", req.params.projectId);
    if (updErr) throw new Error(updErr.message);

    res.json({ project, assetManifest: row.asset_manifest });
  } catch (e) {
    if (creditAmount > 0) addCredits(req.user.id, creditAmount, "refund", "ai_failure_refund", "Refund: promo video approval failed").catch(() => {});
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
      .select("id, status, user_id")
      .eq("id", req.params.projectId)
      .eq("user_id", req.user.id)
      .single();

    if (fetchErr || !row) return res.status(404).json({ error: "Project not found" });

    const deduction = await deductCredits(
      req.user.id, PROMO_VIDEO_CREDITS,
      "promo_video", "SaaS/Promo Video render",
      req.params.projectId
    );
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    creditAmount = PROMO_VIDEO_CREDITS;

    // If TH URL just uploaded by client, inject it into scenes before render
    const { talking_head_url: thUrl } = req.body || {};
    if (thUrl) {
      const { data: projRow } = await supabaseAdmin
        .from("promo_videos").select("scenes").eq("id", req.params.projectId).single();
      if (projRow?.scenes) {
        const updatedScenes = projRow.scenes.map(s => ({ ...s, th_url: thUrl }));
        await supabaseAdmin.from("promo_videos")
          .update({ scenes: updatedScenes }).eq("id", req.params.projectId);
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
    const { data, error } = await supabaseAdmin
      .from("promo_videos")
      .select("id, status, video_goal, product_name, duration_seconds, scenes, credits_charged, approved_at, created_at")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const projects = (data || []).map(row => getProjectSummary(rowToProject(row)));
    res.json({ projects });
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
      await supabaseAdmin.from("projects").delete().eq("id", row.editor_project_id).catch(() => {});
    }

    res.json({ success: true });
  } catch (e) {
    console.error("[promo-video/delete]", e.message);
    res.status(500).json({ error: e.message });
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
