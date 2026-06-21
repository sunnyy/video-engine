export const PROJECT_STATUS = {
  DRAFT:              "draft",
  SCRIPT_GENERATED:   "script_generated",
  WAITING_ASSETS:     "waiting_assets",
  ASSETS_READY:       "assets_ready",
  READY_FOR_RENDER:   "ready_for_render",
  RENDERING:          "rendering",
  RENDERED:           "rendered",
  FAILED:             "failed",
};

export const SCENE_TYPE = {
  HOOK:          "hook",
  TALKING_HEAD:  "talking_head",
  FEATURE_DEMO:  "feature_demo",
  UI_SHOWCASE:   "ui_showcase",
  PAIN_POINT:    "pain_point",
  BEFORE_AFTER:  "before_after",
  CTA:           "cta",
  LOGO_OUTRO:    "logo_outro",
  MONTAGE:       "montage",
};

export const VIDEO_GOAL = {
  SAAS_PROMO:           "saas_promo",
  FEATURE_ANNOUNCEMENT: "feature_announcement",
  LAUNCH_REVEAL:        "launch_reveal",
  SOCIAL_TEASER:        "social_teaser",
  ONBOARDING_DEMO:      "onboarding_demo",
};

export const TARGET_PLATFORM = {
  TIKTOK:         "tiktok",
  REELS:          "reels",
  YOUTUBE_SHORTS: "youtube_shorts",
  LINKEDIN:       "linkedin",
};

export const ASSET_TYPE = {
  AI_VOICEOVER:         "ai_voiceover",
  USER_RECORDING_AUDIO: "user_recording_audio",
  SILENT:               "silent",
  MUSIC_ONLY:           "music_only",
  TALKING_HEAD:         "talking_head",
};

export const ASSET_SOURCE = {
  USER_UPLOAD:  "user_upload",
  AI_GENERATED: "ai_generated",
  STOCK:        "stock",
  SCRAPED:      "scraped",
  PLACEHOLDER:  "placeholder",
};

export const SCENE_STATUS = {
  PENDING:       "pending",
  ASSET_MISSING: "asset_missing",
  ASSET_READY:   "asset_ready",
  RENDERED:      "rendered",
  FAILED:        "failed",
};

export const REGENERATION_SCOPE = {
  SCRIPT_ONLY:  "script_only",
  VISUALS_ONLY: "visuals_only",
  TIMING_ONLY:  "timing_only",
  FULL:         "full",
};

function createEmptyScene(overrides = {}) {
  return {
    scene_id:           null,
    scene_type:         null,   // semantic: hook_scene, listicle, stat_highlight, cta, etc.
    scene_data:         {},     // type-specific payload: items[], steps[], stat_value, etc.
    script:             "",
    duration_seconds:   0,
    asset_type:         ASSET_TYPE.AI_VOICEOVER,
    asset_source:       ASSET_SOURCE.PLACEHOLDER,
    asset_url:          null,
    fallback_asset_url: null,
    captions:           [],
    status:             SCENE_STATUS.PENDING,
    regeneration_scope: REGENERATION_SCOPE.FULL,
    ...overrides,
  };
}

export function createEmptyProject(userId, inputs = {}) {
  const now = new Date().toISOString();
  return {
    // Meta
    id:         null,
    user_id:    userId,
    created_at: now,
    updated_at: now,
    status:     PROJECT_STATUS.DRAFT,

    // User inputs
    video_goal:          inputs.video_goal          ?? null,
    product_url:         inputs.product_url         ?? null,
    product_description: inputs.product_description ?? null,
    product_name:        inputs.product_name        ?? null,
    target_platform:     inputs.target_platform     ?? null,
    language:            inputs.language            ?? "en",
    tone:                inputs.tone                ?? null,
    target_audience:     inputs.target_audience     ?? null,
    duration_seconds:    inputs.duration_seconds    ?? 30,

    // Asset availability
    has_script:       false,
    has_talking_head: false,
    has_screenshots:  false,
    has_recordings:   false,
    has_logo:         false,
    has_voiceover:    false,

    // Style
    caption_style:    inputs.caption_style    ?? null,
    transition_style: inputs.transition_style ?? null,
    motion_style:     inputs.motion_style     ?? null,
    color_palette:    inputs.color_palette    ?? null,
    music_mood:       inputs.music_mood       ?? null,

    // Scenes
    scenes: [],

    // Credits
    credits_estimated: null,
    credits_charged:   0,
    approved_at:       null,
  };
}

export { createEmptyScene };
