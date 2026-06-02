import { openai } from "../../../server/middleware/shared.js";
import {
  createEmptyScene,
  PROJECT_STATUS,
  SCENE_TYPE,
  ASSET_TYPE,
  ASSET_SOURCE,
} from "./projectSchema.js";
import { DSL_SPEC } from "./dsl/dslSpec.js";
import { parseDSL, validateDSL } from "./dsl/dslParser.js";

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

SEMANTIC SCENE TYPES — classify the content meaning:
- hook_scene         → question, attention grab, or product name reveal
- listicle           → script enumerates multiple items, tools, platforms, categories
- feature_showcase   → highlights a specific feature with a visual
- stat_highlight     → states a number, percentage, or metric
- process_steps      → describes a step-by-step process
- benefit_highlight  → states a clear benefit or value proposition
- cta                → asks viewer to follow, comment, save, or visit a URL
- comparison         → before vs after or option A vs option B
- screenshot_focus   → focuses on a specific UI screen
- screen_recording_focus → focuses on a product recording

SCENE DATA — extract per type (include in "scene_data" field):
- listicle:          { "items": ["item1", "item2", ...] }  max 5 items
- stat_highlight:    { "stat_value": "50+", "stat_label": "tools available" }
- process_steps:     { "steps": ["step1", "step2", ...] }  max 5 steps
- benefit_highlight: { "benefit_text": "the main benefit" }
- cta:               { "cta_text": "Follow for more", "url": null }
- feature_showcase:  { "feature_name": "the feature name" }
- all others:        {}

SCENE TYPE → recommended visual_mode:
- listicle           → stock or full_asset
- stat_highlight     → stock
- hook_scene         → full_avatar or stock (use stock for faceless)
- cta                → stock
- feature_showcase, screenshot_focus, screen_recording_focus → full_asset

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
  "scene_type": <semantic scene type from the list above>,
  "scene_data": <structured data object per scene type rules above>,
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

  const prompt = `You are a video editor assigning visual modes and semantic scene types to scenes.

Product: ${project.product_name || "Unknown"}
Description: ${project.product_description || "Not provided"}

${modeRules}

SCENE TYPE — determine the semantic meaning of each spoken line:
- hook_scene         → question, attention grab, or product name reveal
- listicle           → spoken text enumerates multiple items, tools, platforms, or categories (e.g. "Free Games, Open Source Software, Learning Materials")
- feature_showcase   → mentions a specific product feature with a visual
- stat_highlight     → states a number, percentage, or metric
- process_steps      → describes steps or a sequence
- benefit_highlight  → states a clear benefit or value proposition
- cta                → asks viewer to follow, comment, DM, save, or visit a URL
- talking_head_full  → conversational line with no specific visual need
- talking_head_split → talking while describing something that benefits from a visual

SCENE DATA — extract structured data per type:
- listicle:        { "items": ["item1", "item2", ...] }  max 5 items — split semantically, not by punctuation
- stat_highlight:  { "stat_value": "50+", "stat_label": "free tools" }
- process_steps:   { "steps": ["step1", "step2", ...] }  max 5 steps
- benefit_highlight: { "benefit_text": "the main benefit" }
- cta:             { "cta_text": "Follow for more", "url": null }
- feature_showcase: { "feature_name": "the feature name" }
- all others:      {}

SCENE TYPE → recommended visual_mode:
- listicle           → stock or floating_avatar
- stat_highlight     → stock
- hook_scene         → full_avatar or stock
- cta                → full_avatar or stock
- talking_head_full  → full_avatar
- talking_head_split → split_view or floating_avatar
- feature_showcase, screenshot_focus → full_asset

For each scene assign: visual_mode, asset_hint, scene_type, scene_data.
- asset_hint for split_view/full_asset: specific, actionable description of the exact screenshot or recording needed.
- asset_hint for stock/floating_avatar: 2–4 word Pixabay search term, noun-based, no adjectives.
- asset_hint for full_avatar: empty string.

Scenes to process:
${JSON.stringify(sceneList, null, 2)}

Return ONLY a valid JSON array. No markdown, no explanation, no code blocks.
Each element: { "scene_id": <int>, "visual_mode": <string>, "asset_hint": <string>, "scene_type": <string>, "scene_data": <object> }`;

  const response = await openai.chat.completions.create({
    model:       "gpt-4.1",
    temperature: 0.4,
    max_tokens:  2500,
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
    scene_type:  byId[scene.scene_id]?.scene_type  ?? null,
    scene_data:  byId[scene.scene_id]?.scene_data  ?? {},
  }));
}

// ── mergeConsecutiveListicles ─────────────────────────────────────────────────
// Collapses consecutive scenes all tagged scene_type=listicle into one scene
// with a combined items[] array. Merges durations and TH timestamps.
export function mergeConsecutiveListicles(scenes) {
  const result = [];
  let i = 0;
  while (i < scenes.length) {
    if (scenes[i].scene_type !== "listicle") { result.push(scenes[i]); i++; continue; }
    // Collect contiguous listicle group
    const group = [scenes[i]];
    while (i + group.length < scenes.length && scenes[i + group.length].scene_type === "listicle") {
      group.push(scenes[i + group.length]);
    }
    if (group.length === 1) { result.push(scenes[i]); i++; continue; }

    const allItems = group.flatMap(s => s.scene_data?.items?.length ? s.scene_data.items : [s.spoken || s.script || ""].filter(Boolean));
    const merged = {
      ...group[0],
      spoken:           group.map(s => s.spoken || s.script || "").join(" ").trim(),
      script:           group.map(s => s.script || s.spoken || "").join(" ").trim(),
      duration_seconds: parseFloat(group.reduce((sum, s) => sum + (s.duration_seconds || 0), 0).toFixed(3)),
      word_count:       group.reduce((sum, s) => sum + (s.word_count || 0), 0),
      th_end:           group[group.length - 1].th_end,
      scene_data:       { items: allItems.slice(0, 7) },
    };
    result.push(merged);
    i += group.length;
  }
  return result.map((s, idx) => ({ ...s, scene_id: idx + 1 }));
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
      scene_data:        item.scene_data        ?? {},
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

// ── generateDSLScenePlan ───────────────────────────────────────────────────────
// DSL-based alternative to generateScenePlan. GPT outputs DSL text; dslParser
// converts it to scene objects; dslLayoutEngine renders layers.
// generateScenePlan() remains intact as the fallback for existing projects.
export async function generateDSLScenePlan(project) {
  const userPrompt = `You are generating a Visual Intent DSL script for a short-form product video.

Product Name: ${project.product_name || "Unknown"}
Product Description: ${project.product_description || "Not provided"}
Video Goal: ${project.video_goal || "Not specified"}
Target Audience: ${project.target_audience || "General"}
Niche: ${project.style?.niche || "saas"}

CONSTRAINT DOCUMENT — follow every rule exactly:
${DSL_SPEC}

Generate a complete promo video script as Visual Intent DSL.

ADDITIONAL RULES:
1. Output 5-8 scenes for a 45-60 second video. Each scene represents one idea.
2. Follow this narrative flow: hook → problem or benefit → features or list → proof or stat → cta
3. Set SECTION_ROLE on every single scene (one of: hook, body, proof, cta)
4. The very last scene MUST have INTENT cta and SECTION_ROLE cta
5. Output ONLY valid DSL text — start directly with SCENE on the very first line
6. No preamble, no explanation, no markdown, no backticks, no JSON — only DSL keywords

ASSET REQUIREMENTS — CRITICAL:
- For any scene showcasing the product UI, dashboard, or interface: set ASSET_REQUIREMENT screenshot
- For any scene demonstrating a workflow or feature in action: set ASSET_REQUIREMENT recording
- For any scene that would benefit from a relevant background image (hook scenes, benefit scenes, proof scenes): set ASSET_REQUIREMENT image and write a specific ASSET_HINT describing the ideal image (e.g. ASSET_HINT person using laptop at modern desk)
- Only use ASSET_REQUIREMENT none for scenes that are purely text-based (statistics, process steps, CTA)
- At minimum, 2-3 scenes in every video MUST have ASSET_REQUIREMENT image with a specific ASSET_HINT`;

  const response = await openai.chat.completions.create({
    model:       "gpt-4.1",
    temperature: 0.6,
    max_tokens:  3000,
    messages: [
      {
        role:    "system",
        content: "You are a video production AI that outputs Visual Intent DSL only. Your entire response must start with SCENE and contain only valid DSL keywords as defined in the constraint document. No JSON, no markdown, no backticks, no explanation.",
      },
      {
        role:    "user",
        content: userPrompt,
      },
    ],
  });

  const raw          = (response.choices[0].message.content || "").trim();
  const parsedScenes = parseDSL(raw);

  const { valid, errors } = validateDSL(raw);
  if (!valid) {
    console.warn(`[generateDSLScenePlan] DSL validation warnings for ${project.id}:`, errors);
  }

  if (parsedScenes.length === 0) {
    throw new Error(`DSL scene plan returned 0 scenes. Raw GPT output:\n${raw.slice(0, 500)}`);
  }

  console.log(`[generateDSLScenePlan] ${parsedScenes.length} scenes parsed for ${project.id}`);

  return {
    ...project,
    scenes:       parsedScenes,
    scene_format: "dsl",
    status:       PROJECT_STATUS.SCRIPT_GENERATED,
    updated_at:   new Date().toISOString(),
  };
}
