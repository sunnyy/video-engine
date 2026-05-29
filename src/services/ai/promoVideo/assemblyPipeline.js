import { ASSET_SOURCE, ASSET_TYPE } from "./projectSchema.js";
import { getPromoLayout } from "../../../core/registries/promoLayoutRegistry.js";

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

  let cursor = 0;

  for (const scene of project.scenes) {
    const s   = cursor;
    const e   = cursor + scene.duration_seconds;
    cursor    = e;
    const sid = `s${scene.scene_id}`;

    // visual_mode is the primary key; scene_type as fallback for unrecognised modes
    const layout = getPromoLayout(scene.visual_mode ?? scene.scene_type, scene.layout_variant ?? "primary");

    const sceneLayers = layout(sid, s, e, {
      script:         (scene.script || "").trim(),
      assetUrl:       scene.asset_url           || null,
      talkingHeadUrl: scene.th_url || project.talking_head_url || null,
      productName:    project.product_name       || null,
      productUrl:     project.product_url        || null,
      accentColor:    accent,
      duration:       scene.duration_seconds,
    });

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

  const timeline = {
    version: "2.0",
    id:      project.id,
    name:    project.product_name ?? "Promo Video",
    format:  { width: W, height: H, fps: FPS, duration: project.duration_seconds },
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
