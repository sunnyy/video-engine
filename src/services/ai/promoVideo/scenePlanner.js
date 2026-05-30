import { openai } from "../../../server/middleware/shared.js";
import {
  createEmptyScene,
  PROJECT_STATUS,
  SCENE_TYPE,
  ASSET_TYPE,
  ASSET_SOURCE,
} from "./projectSchema.js";

function buildPrompt(project) {
  const hasProvidedScript = project.has_script && project.script?.trim();

  const assetFlags = [
    hasProvidedScript         && "User has provided a script — distribute it verbatim across scenes proportionally by duration. Do NOT rewrite or paraphrase. Set the 'script' field of each scene to the exact portion of that text that belongs in it.",
    project.has_talking_head  && "User has a talking head video — assign scene_type 'talking_head' to the most appropriate scene(s) and set asset_source to user_upload for those.",
    project.has_screenshots   && "User has product screenshots — prefer asset_source 'user_upload' for feature demo and UI showcase scenes.",
    project.has_recordings    && "User has screen recordings — prefer asset_source 'user_upload' for demo and feature scenes.",
    project.has_logo          && "User has a logo — include a logo_outro scene at the end with asset_source user_upload.",
    project.has_voiceover     && !hasProvidedScript && "User has a voiceover recording — set asset_type to user_recording_audio for narrated scenes.",
    project.has_voiceover     && hasProvidedScript  && "User has a voiceover recording transcribed into the script above — set asset_type to user_recording_audio for narrated scenes.",
  ].filter(Boolean).join("\n");

  const isTalkingHead = project.video_type === "talking_head";

  const scriptBlock = hasProvidedScript
    ? `\nPROVIDED SCRIPT (distribute verbatim across scenes — do not alter):\n"""\n${project.script.trim()}\n"""\n`
    : "";

  const visualModeRules = isTalkingHead
    ? `VISUAL MODE — decide per scene based on what the SPOKEN LINE needs to show:
- full_avatar  → spoken line is informational, conversational, or needs no specific visual. Talking head fills frame.
- split_view   → spoken line describes a product feature AND benefits from seeing the screen while the person talks. Top half = asset, bottom half = talking head.
- full_asset   → spoken line is specifically about a visible UI element, screen, or recording. Asset fills frame, no talking head.
- stock        → spoken line is general and benefits from an atmospheric background. Stock image fills frame.

STRICT RULES:
1. First scene MUST be full_avatar.
2. Last scene MUST be full_avatar.
3. Never use the same visual_mode in two consecutive scenes — alternate to create rhythm.
4. For a SaaS product, include at least 1–2 full_asset or split_view scenes to show the actual product UI.`
    : `VISUAL MODE — decide per scene based on what the SPOKEN LINE needs to show:
- full_asset   → spoken line is specifically about a visible UI feature, screen, or recording the user will upload. User uploads screenshot or recording.
- stock        → spoken line is general, informational, or emotional — system fetches a stock image automatically.
- full_avatar and split_view are NEVER valid for faceless videos. Do not use them.

STRICT RULES:
1. First scene MUST be stock.
2. Last scene MUST be stock.
3. Never use the same visual_mode in two consecutive scenes.
4. For any SaaS or website product, include at least 1–2 full_asset scenes with specific hints for website or app screenshots. Even if the user has not uploaded anything yet, mark these full_asset — the user will be prompted to upload. Do not default everything to stock for a software product.`;

  return `You are an expert SaaS video producer and scriptwriter.

Generate a structured scene plan for a short-form product video with these details:

Product Name: ${project.product_name || "Unknown"}
Product Description: ${project.product_description || "Not provided"}
Product URL: ${project.product_url || "Not provided"}
Video Goal: ${project.video_goal}
Video Type: ${project.video_type || "faceless"}
Target Platform: ${project.target_platform}
Total Duration: ${project.duration_seconds} seconds
Language: ${project.language}
Tone: ${project.tone || "Professional and engaging"}
Target Audience: ${project.target_audience || "General"}
${scriptBlock}
${assetFlags ? `ASSET AVAILABILITY — follow these instructions:\n${assetFlags}` : ""}

${visualModeRules}

SCENE TYPE OPTIONS: hook, talking_head, feature_demo, ui_showcase, pain_point, before_after, cta, logo_outro, montage
ASSET TYPE OPTIONS: ai_voiceover, user_recording_audio, silent, music_only, talking_head
ASSET SOURCE OPTIONS: user_upload, ai_generated, stock, placeholder

Return ONLY a valid JSON array of scene objects. No markdown, no explanation, no code blocks. Just the raw JSON array.

LAYOUT VARIANTS — pick layout_variant per scene based on spoken content and purpose:
- stock + primary: large centered headline, product name badge below, zoom entrance — hooks, CTAs, strong emotional statements
- stock + alternate: uppercase text centered, thin accent bar below text, pull motion — feature announcements, credibility or social proof statements
- full_asset + primary: asset background, text in lower area sliding up, product badge — feature demos, UI showcases
- full_asset + alternate: asset background, text bottom-anchored in accent yellow, no badge, darker overlay — pain points, before/after, high contrast moments
Do not use the same layout_variant for more than 2 consecutive scenes.

Each scene object must have exactly these fields:
{
  "scene_id": <integer, starting at 1>,
  "scene_type": <one of the scene type options>,
  "visual_mode": <one of the valid visual_mode values for this video_type — see rules above>,
  "layout_variant": <"primary" or "alternate" — choose based on layout variant rules above>,
  "script": <${hasProvidedScript ? "the exact portion of the provided script that belongs in this scene — copy verbatim, no paraphrasing" : "narration or caption text for this scene"}>,
  "duration_seconds": <number — derive from word count of the script field: ≤6 words = 2.0–2.5s, 7–14 words = 3.0–4.0s, 15+ words = 4.0–6.0s. All scenes must sum to exactly ${project.duration_seconds}>,
  "asset_type": <one of the asset type options>,
  "asset_source": <"user_upload" if visual_mode is full_asset, "stock" if visual_mode is stock, "placeholder" if visual_mode is full_avatar or split_view>,
  "asset_hint": <
    If visual_mode is full_asset: a specific, actionable description of the exact screenshot or recording needed — name the specific UI element, screen, or feature visible. Example: "Screenshot of the Vidquence timeline editor showing multiple video tracks". NOT generic phrases like "video editing software".
    If visual_mode is stock: a 2–4 word Pixabay search term — short, noun-based, no adjectives. Example: "team collaboration office". NOT sentences.
    If visual_mode is full_avatar or split_view with no asset: empty string.
  >,
  "scene_purpose": <one sentence explaining why this scene exists in the video>
}

SCENE COUNT LIMITS — strictly enforce based on total duration:
- 15s → maximum 5 scenes
- 30s → maximum 8 scenes
- 60s → maximum 12 scenes
- 90s → maximum 16 scenes
Minimum 2 seconds per scene.

Design the scene sequence to be highly effective for ${project.target_platform} with a ${project.video_goal} goal. The first scene must be a strong hook. The last scene must drive action. Total duration of all scenes must sum to exactly ${project.duration_seconds} seconds.`;
}

// ── assignVisualModes ─────────────────────────────────────────────────────────
// Takes pre-built scenes (from talkingHeadProcessor) and uses GPT-4.1 to assign
// visual_mode and asset_hint per scene. Does NOT rewrite scripts.
export async function assignVisualModes(scenes, project) {
  const isTalkingHead = project.video_type === "talking_head";

  const sceneList = scenes.map(s => ({
    scene_id:         s.scene_id,
    spoken:           (s.spoken || s.script || "").trim(),
    duration_seconds: s.duration_seconds,
  }));

  const totalScenes = sceneList.length;
  const minStock    = Math.max(1, Math.ceil(totalScenes * 0.30));

  const modeRules = isTalkingHead
    ? `VISUAL MODE RULES (video_type = talking_head):

WHAT EACH MODE LOOKS LIKE:
- full_avatar    → talking head fills the entire frame. Use for hooks, CTAs, conversational lines, emotional moments.
- split_view     → top half shows a relevant asset (website, feature, product screen), bottom half shows the talking head. Use when the spoken line explicitly references something visual — a feature, a website, a tool. The viewer should see what the speaker is describing.
- floating_avatar → talking head appears as a smaller overlay on a full atmospheric background. Use for energetic, transitional, or high-energy moments — creates a dynamic shift in visual rhythm.
- stock          → talking head is hidden; a full-frame stock image fills the screen. Use for general statements, statistics, emotional beats, or credibility moments that benefit from atmosphere rather than the face.

STRICT VARIETY RULES — you MUST follow these exactly:
1. First scene MUST be full_avatar.
2. Last scene MUST be full_avatar.
3. NEVER use full_avatar more than 2 times in a row. After 2 consecutive full_avatar scenes you MUST switch to stock, split_view, or floating_avatar.
4. At least ${minStock} scene(s) out of ${totalScenes} MUST be stock or full_asset — no exceptions.
${totalScenes > 5  ? `5. split_view MUST appear at least once across all scenes.` : ""}
${totalScenes > 8  ? `6. floating_avatar MUST appear at least once across all scenes.` : ""}
7. Distribute visual variety evenly — do not cluster all stock or split_view scenes together.

TALKING HEAD PACING RULES — the goal is fast-paced, attention-grabbing video, NOT a long talking head:
8. full_avatar is for SHORT flash moments only — hook and 1–2 key emotional beats. It must feel like the face FLASHES IN, not lingers.
9. If the spoken line for a scene would take more than 3 seconds to say, do NOT assign full_avatar. Use floating_avatar (avatar stays visible as overlay) or stock instead.
10. Prefer floating_avatar over full_avatar for any spoken line longer than 2 seconds — the avatar is still visible but the background shows visual content.
11. The video should feel like: flash avatar → cut to asset/stock → flash avatar → cut to stock — rapid visual cuts, not long face time.`
    : `VISUAL MODE RULES (video_type = faceless):
- full_asset → spoken line is about a specific visible UI feature. User uploads screenshot/recording.
- stock      → everything else. System fetches stock image automatically.
- Never use full_avatar or split_view.`;

  const prompt = `You are a video editor assigning visual modes to scenes from a talking head video.

Product: ${project.product_name || "Unknown"}
Description: ${project.product_description || "Not provided"}

${modeRules}

For each scene assign: visual_mode and asset_hint.
- asset_hint for split_view/full_asset: specific, actionable description of the exact screenshot or recording needed. Name the specific UI screen or feature.
- asset_hint for stock/floating_avatar: 2–4 word Pixabay search term, noun-based, no adjectives.
- asset_hint for full_avatar: empty string.

Scenes to process:
${JSON.stringify(sceneList, null, 2)}

Return ONLY a valid JSON array. No markdown, no explanation, no code blocks.
Each element: { "scene_id": <int>, "visual_mode": <string>, "asset_hint": <string> }`;

  const response = await openai.chat.completions.create({
    model:       "gpt-4.1",
    temperature: 0.4,
    max_tokens:  1500,
    messages: [
      { role: "system", content: "You are a video production AI. Return only valid JSON arrays." },
      { role: "user",   content: prompt },
    ],
  });

  const raw = response.choices[0].message.content?.trim() || "[]";
  let assignments = [];
  try { assignments = JSON.parse(raw); } catch {}

  const byId = {};
  for (const a of assignments) byId[a.scene_id] = a;

  return scenes.map(scene => ({
    ...scene,
    visual_mode: byId[scene.scene_id]?.visual_mode ?? (isTalkingHead ? "full_avatar" : "stock"),
    asset_hint:  byId[scene.scene_id]?.asset_hint  ?? null,
  }));
}

// ── generateScenePlan ─────────────────────────────────────────────────────────
export async function generateScenePlan(project) {
  const prompt = buildPrompt(project);

  const response = await openai.chat.completions.create({
    model:       "gpt-4.1",
    temperature: 0.7,
    max_tokens:  4000,
    messages: [
      {
        role:    "system",
        content: "You are a video production AI. You return only valid JSON arrays with no markdown, no explanation, and no code blocks.",
      },
      {
        role:    "user",
        content: prompt,
      },
    ],
  });

  const raw = response.choices[0].message.content?.trim() || "";

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Scene plan JSON parse failed. GPT returned:\n${raw.slice(0, 500)}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Scene plan must be a JSON array. Got: ${typeof parsed}`);
  }

  const scenes = parsed.map(item =>
    createEmptyScene({
      scene_id:          item.scene_id          ?? null,
      scene_type:        item.scene_type        ?? null,
      visual_mode:       item.visual_mode       ?? null,
      layout_variant:    item.layout_variant    ?? "primary",
      script:            item.script            ?? "",
      duration_seconds:  item.duration_seconds  ?? 0,
      asset_type:        item.asset_type        ?? ASSET_TYPE.AI_VOICEOVER,
      asset_source:      item.asset_source      ?? ASSET_SOURCE.PLACEHOLDER,
      asset_hint:        item.asset_hint        ?? null,
      scene_purpose:     item.scene_purpose     ?? null,
    })
  );

  return {
    ...project,
    scenes,
    status:     PROJECT_STATUS.SCRIPT_GENERATED,
    updated_at: new Date().toISOString(),
  };
}
