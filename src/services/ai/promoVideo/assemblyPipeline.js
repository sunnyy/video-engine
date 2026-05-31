import { ASSET_SOURCE, ASSET_TYPE } from "./projectSchema.js";
import { getPromoLayoutForScene } from "../../../core/registries/promoLayoutRegistry.js";

// SFX key assigned per visual_mode — fired on the background layer of each scene.
// Scene 1 is intentionally skipped (no entry SFX on the very first scene).
const SFX_BY_MODE = {
  full_avatar:     { key: "whoosh_soft",      volume: 0.45, delay: 0 },
  stock:           { key: "whoosh_hard",      volume: 0.6,  delay: 0 },
  full_asset:      { key: "swoosh_cinematic", volume: 0.6,  delay: 0 },
  floating_avatar: { key: "whoosh_soft",      volume: 0.5,  delay: 0 },
  split_view:      { key: "whoosh_soft",      volume: 0.4,  delay: 0 },
};

const FPS = 30;
const W   = 1080;
const H   = 1920;

function getAccent(palette) {
  if (!palette) return "#f5c518";
  if (typeof palette === "string") return palette;
  if (Array.isArray(palette) && palette.length > 0) return palette[0];
  return "#f5c518";
}

export function assemblePromoTimeline(project) {
  const captionStyle    = project.style?.caption_style    ?? "minimal";
  const transitionStyle = project.style?.transition_style ?? "cut";
  const musicMood       = project.style?.music_mood       ?? "upbeat";
  const accent          = getAccent(project.style?.color_palette);

  const layers          = [];
  const voiceover_queue = [];
  const asset_queue     = [];

  // Max th_end across all scenes — used to cap trimEnd buffer.
  const thMaxEnd = project.scenes.reduce((max, s) =>
    s.th_end !== undefined ? Math.max(max, s.th_end) : max, 0);

  // Group consecutive TH scenes into shared audio layers.
  // Scenes split by duration/word-count have th_end ≈ th_start of the next scene
  // (no real pause), so they share one audio element — no seek at those cuts.
  // Scenes split by an actual pause (> TH_GAP in source) start a new group,
  // paying one seek per group instead of one per scene.
  const TH_GAP = 0.1; // seconds — gaps larger than this start a new audio element
  const thGroups = [];   // { url, trimStart, trimEnd, tlStart, tlEnd }
  const sceneGroup = new Map(); // scene_id → group object
  {
    let grp = null;
    for (const scene of project.scenes) {
      if (scene.th_start === undefined) continue;
      const url = scene.th_url || project.talking_head_url || null;
      if (!url) continue;
      if (!grp || scene.th_start - grp.trimEnd > TH_GAP) {
        grp = { url, trimStart: scene.th_start, trimEnd: scene.th_end, tlStart: null, tlEnd: null };
        thGroups.push(grp);
      } else {
        grp.trimEnd = scene.th_end;
      }
      sceneGroup.set(scene.scene_id, grp);
    }
  }

  let cursor = 0;

  for (const scene of project.scenes) {
    const thUrl     = scene.th_url || project.talking_head_url || null;
    const isTHScene = scene.th_start !== undefined && scene.th_end !== undefined;

    // For TH scenes, segment duration = th_end - th_start (actual video segment).
    // This ensures audio trim offsets always match timeline positions — no drift.
    const segmentDuration = isTHScene
      ? parseFloat((scene.th_end - scene.th_start).toFixed(4))
      : scene.duration_seconds;

    const s   = cursor;
    const e   = parseFloat((cursor + segmentDuration).toFixed(4));
    cursor    = e;
    const sid = `s${scene.scene_id}`;

    // scene_type takes priority; falls back to visual_mode
    const layout = getPromoLayoutForScene(scene.scene_type, scene.visual_mode, scene.layout_variant ?? "primary");

    const sceneLayers = layout(sid, s, e, {
      script:         (scene.script || "").trim(),
      assetUrl:       scene.asset_url           || null,
      talkingHeadUrl: thUrl,
      productName:    project.product_name       || null,
      productUrl:     project.product_url        || null,
      accentColor:    accent,
      duration:       segmentDuration,
      sceneData:      scene.scene_data           || {},
      logoUrl:        project.logo_url           || null,
    });

    // TH scenes: set trimStart/trimEnd on video layer; update group timeline bounds.
    if (isTHScene) {
      for (const layer of sceneLayers) {
        if (layer.trackId === "track_talking_head" && layer.type === "video") {
          layer.trimStart = scene.th_start;
          layer.trimEnd   = scene.th_end;
          layer.muted     = true;
          layer.volume    = 0;
        }
      }
      const grp = sceneGroup.get(scene.scene_id);
      if (grp) {
        if (grp.tlStart === null) grp.tlStart = s;
        grp.tlEnd = e;
      }
    }

    // Inject transition SFX on the background layer — skip scene 1 (no entry sound)
    if (scene.scene_id > 1) {
      const sfxCfg = SFX_BY_MODE[scene.visual_mode];
      if (sfxCfg) {
        const bgLayer = sceneLayers.find(l => l.trackId === "track_background");
        if (bgLayer) bgLayer.sfx = sfxCfg;
      }
    }

    layers.push(...sceneLayers);

    // Voiceover queue
    const script = (scene.script || "").trim();
    if (scene.asset_type === ASSET_TYPE.AI_VOICEOVER && script) {
      voiceover_queue.push({ scene_id: scene.scene_id, script, voice: "nova" });
    } else if (scene.asset_type === ASSET_TYPE.USER_RECORDING_AUDIO && scene.asset_url) {
      layers.push({
        id: `${sid}_vo`, trackId: `voiceover_track_${scene.scene_id}`,
        type: "audio", audioType: "voiceover", src: scene.asset_url,
        start: s, end: e, zIndex: 0,
        visible: true, locked: false,
        trimStart: 0, trimEnd: e - s,
        volume: 1.0, muted: false, fadeIn: 0.1, fadeOut: 0.3,
        sfx: null, keyframes: {}, animation: null, transition: null, transform: null,
      });
    }

    // Asset queue
    if (scene.asset_source === ASSET_SOURCE.AI_GENERATED && !scene.asset_url) {
      asset_queue.push({ scene_id: scene.scene_id, asset_hint: scene.asset_hint ?? "", type: "ai_generated" });
    } else if (scene.asset_source === ASSET_SOURCE.STOCK && !scene.asset_url) {
      asset_queue.push({ scene_id: scene.scene_id, asset_hint: scene.asset_hint ?? "", type: "stock" });
    } else if (scene.asset_source === ASSET_SOURCE.USER_UPLOAD && !scene.asset_url) {
      asset_queue.push({ scene_id: scene.scene_id, asset_hint: scene.asset_hint ?? "", type: "user_upload_pending" });
    }
  }

  // cursor now holds the true total duration (sum of actual TH segment lengths)
  const totalDuration = parseFloat(cursor.toFixed(4));

  // One audio layer per consecutive TH group.
  // Within a group, source timestamps === timeline offsets from tlStart, so sync is
  // exact with no seeks at scene cuts. A new group only starts at a real pause in the
  // source (> TH_GAP), paying one seek there instead of one per scene.
  for (let gi = 0; gi < thGroups.length; gi++) {
    const grp = thGroups[gi];
    if (grp.tlStart === null) continue;
    layers.push({
      id: `th_audio_grp_${gi}`, trackId: `th_audio_grp_${gi}`,
      type: "audio", audioType: "voiceover", src: grp.url,
      start: grp.tlStart, end: grp.tlEnd, zIndex: 0,
      visible: true, locked: false,
      trimStart: grp.trimStart,
      trimEnd:   parseFloat(Math.min(grp.trimEnd + 0.15, thMaxEnd).toFixed(4)),
      volume: 0.5, muted: false, fadeIn: 0.05, fadeOut: 0.05,
      sfx: null, keyframes: {}, animation: null, transition: null, transform: null,
    });
  }

  const timeline = {
    version: "2.0",
    id:      project.id,
    name:    project.product_name ?? "Promo Video",
    format:  { width: W, height: H, fps: FPS, duration: totalDuration },
    layers,
    meta: {
      source:           "promo_video",
      thumbnail:        null,
      editor_version:   "timeline",
      caption_style:    captionStyle,
      transition_style: transitionStyle,
      music_mood:       musicMood,
      product_name:     project.product_name,
      video_goal:       project.video_goal,
      createdAt:        new Date().toISOString(),
      updatedAt:        new Date().toISOString(),
    },
  };

  return {
    timeline,
    voiceover_queue,
    asset_queue,
    total_frames: project.duration_seconds * FPS,
    fps:          FPS,
  };
}
