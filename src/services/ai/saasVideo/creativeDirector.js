/**
 * creativeDirector.js
 * src/services/ai/saasVideo/creativeDirector.js
 *
 * Stage 1 — ONE call that directs the whole film before any scene exists.
 *
 * v3.1: the director is also the cinematographer. Every scene gets a living
 * background — footage first, design accents second. Per scene it casts:
 *   visual_source  — broll | stock_image | screenshot | ai_image | mockup | typographic
 *   shot_query     — concrete stock-search phrase (broll / stock_image / ai_image)
 *   motion         — punch_in | ken_burns | none
 *   transition_out — zoom | slide-left | slide-up | fade | none (cut into next scene)
 *
 * The director's choice is a REQUEST. The footage resolver downgrades it
 * deterministically when reality disagrees (no good clip → image → AI image).
 * Code, not the model, has final say on what exists.
 *
 * Hard casting rules enforced here in validation:
 *   - The product is NEVER stock. Stock/AI footage shows context, people,
 *     pain, emotion — the product appears only via screenshot or HTML mockup.
 *   - Majority of scenes must be footage-backed (broll/stock_image/ai_image/screenshot).
 *   - Never two static scenes (mockup/typographic) in a row.
 *   - typographic is an accent: max 1 scene per video.
 *   - Each screenshot cast at most once.
 *   - Scene word budgets are capped at 24; problem and solution are separate scenes.
 */

import { openai } from "../../../server/middleware/shared.js";
import { normalizeHex, ensureVividAccent } from "./utils.js";

const DIRECTOR_MODEL = "gpt-4.1";

const ARCHETYPES = [
  "typography_hero", "single_stat", "split_composition", "numbered_list",
  "feature_grid", "full_bleed_image", "minimal_cta", "proof_social",
  "process_steps", "quote_statement",
];

const INTENTS = ["hook", "problem", "solution", "benefit", "feature", "process", "proof", "cta", "standalone"];

const MUSIC_MOODS = ["upbeat", "inspiring", "chill", "cinematic", "energetic", "ambient"];

const VISUAL_SOURCES = ["broll", "stock_image", "screenshot", "ai_image", "mockup", "typographic"];
const FOOTAGE_SOURCES = new Set(["broll", "stock_image", "ai_image", "screenshot"]);
const STATIC_SOURCES  = new Set(["mockup", "typographic"]);

const MOTIONS     = ["punch_in", "ken_burns", "none"];
const TRANSITIONS = ["zoom", "slide-left", "slide-up", "fade", "none"];

const MAX_SCENE_WORDS = 24;

// Word budgets per intent — at ~2.7 words/sec these set scene durations
const WORD_BUDGETS = {
  hook: 14, problem: 18, solution: 20, benefit: 20,
  feature: 22, process: 24, proof: 18, cta: 14, standalone: 22,
};

function buildDirectorPrompt({ harvest, productName, description, tone, goal, sceneCount }) {
  const inventory = `
ASSET INVENTORY (these are the ONLY real assets that exist):
- Product screenshots available: ${harvest.screenshotUrls.length} (index 0 = landing hero${harvest.screenshotUrls.length > 1 ? ", index 1 = features section" : ""})
- Logo available: ${harvest.logoUrl ? "yes" : "no"}
- Brand color detected: ${harvest.brandColor ?? "none — you choose one that fits the product"}
- Stock footage and AI imagery: unlimited, resolved later from your shot_query`;

  const harvestBlock = harvest.title || harvest.headlines.length ? `
WEBSITE COPY (real copy scraped from the product's site — ground your plan in this):
Title: ${harvest.title ?? "n/a"}
Description: ${harvest.description ?? "n/a"}
Headlines: ${harvest.headlines.slice(0, 10).join(" | ") || "n/a"}
Feature bullets: ${harvest.bullets.slice(0, 10).join(" | ") || "n/a"}
Body sample: ${harvest.bodyText.slice(0, 1500) || "n/a"}` : `
WEBSITE COPY: none could be scraped. Plan from the user-provided details only.`;

  const sceneCountRule = sceneCount === "auto"
    ? "Choose the scene count yourself: 4 or 5 scenes — enough to give problem and solution their own scenes."
    : `The video must have exactly ${sceneCount} scene(s).`;

  return {
    system: `You are the creative director AND cinematographer of a premium 9:16 SaaS promo video studio.
You direct the ENTIRE film in one pass: narrative arc, visual identity, and a per-scene shot plan.
A script writer, footage resolver, and scene designers execute your plan exactly — be specific.

THE STUDIO'S STYLE: footage-first. Every scene has a LIVING background — real stock footage,
a moving photograph, or the real product. Designed text/stat/CTA overlays sit ON TOP of the
footage and enrich it. Typography-on-gradient is a deliberate accent used at most once, never a default.

${inventory}

VISUAL SOURCE — assign one per scene:
- "broll": real stock video footage behind the scene. THE DEFAULT for hook, problem, benefit, proof.
- "stock_image": stock photograph with cinematic motion (slow zoom/pan). Use when a held image is stronger than motion.
- "screenshot": the REAL product capture from the inventory, framed with a push-in. Set screenshot_index. Max one scene per screenshot.${harvest.screenshotUrls.length === 0 ? ' FORBIDDEN — no screenshots exist.' : ''}
- "ai_image": AI-generated image with motion. For abstract/conceptual shots stock libraries won't have.
- "mockup": stylized product UI built in HTML (browser frame, cards, charts). For product scenes when no (or no more) screenshots exist.
- "typographic": pure type/icon design on gradient. AN ACCENT — maximum ONE scene per video, only where a hard text punch beats footage (e.g. a 3-word hook or a stat slam).

THE PRODUCT IS NEVER STOCK — ABSOLUTE RULE:
broll/stock_image/ai_image show context: people, workspaces, emotions, the pain, the lifestyle.
They NEVER depict "a dashboard", "an app interface", or anything pretending to be the product.
The product itself appears ONLY via "screenshot" or "mockup". A stock interface posing as the
product is the #1 amateur tell and is forbidden.

SHOT QUERY (required for broll / stock_image / ai_image):
A concrete, searchable stock phrase — what the camera sees, 3-6 words.
GOOD: "person scrolling phone night", "team meeting laptop office", "frustrated man computer desk"
BAD: "the feeling of wasted time", "productivity concept", "success"

MOTION per scene: "punch_in" (slow zoom into footage — default for broll/screenshot),
"ken_burns" (zoom + drift — default for stock_image/ai_image), "none" (only for typographic).

TRANSITION_OUT per scene — the cut INTO the next scene: ${TRANSITIONS.join(" | ")}.
Vary them. "zoom" for energy beats, "slide-left"/"slide-up" for progression, "fade" for tone shifts.
Last scene: "none".

RHYTHM RULES:
- The MAJORITY of scenes must be footage-backed (broll / stock_image / ai_image / screenshot).
- NEVER two static scenes (mockup / typographic) back to back.
- ${sceneCountRule}

ARCHETYPES (each scene gets one, NO archetype may repeat in the video):
${ARCHETYPES.join(" | ")}
On footage scenes the archetype describes the OVERLAY treatment (e.g. single_stat = one big number over footage).

INTENTS: ${INTENTS.join(" | ")}

NARRATIVE ARC RULES:
- Scene 0 is always a hook: a pain, a bold claim, or a striking number. Never the product name.
- Last scene is always cta.
- problem and solution get SEPARATE scenes — never merged into one.
- The solution scene is where the product name lands for the first time (use screenshot or mockup).

WORD BUDGETS per intent (HARD CAP ${MAX_SCENE_WORDS} words per scene — the script writer obeys these exactly):
${Object.entries(WORD_BUDGETS).map(([k, v]) => `${k}=${v}w`).join(", ")}

VISUAL IDENTITY RULES:
- accent_color: 6-digit hex. ${harvest.brandColor ? `The detected brand color is ${harvest.brandColor} — use it unless it is unusable on a video background.` : "Choose one that fits the product's niche. Avoid default purple #6366f1 unless it genuinely fits."}
- theme: dark | medium | light (dark is the safe default for promo video)
- visual_style: radiant | minimal | professional | high-contrast
- music_mood: one of ${MUSIC_MOODS.join(" | ")}

Return ONLY valid JSON:
{
  "project_name": "short project title",
  "product_name": "the product's name",
  "positioning": "one sentence: who this product is for and the #1 value",
  "niche": "saas category, e.g. devtools, productivity, marketing",
  "accent_color": "#rrggbb",
  "theme": "dark",
  "visual_style": "radiant",
  "music_mood": "upbeat",
  "scene_plan": [
    {
      "scene_index": 0,
      "intent": "hook",
      "archetype": "typography_hero",
      "visual_concept": "one specific sentence describing the scene: footage + overlay treatment",
      "visual_source": "broll",
      "shot_query": "person scrolling phone night",
      "screenshot_index": null,
      "motion": "punch_in",
      "transition_out": "zoom",
      "word_budget": 14
    }
  ]
}`,
    user: `PRODUCT NAME (user-provided, may be empty): ${productName || "(not provided — derive from website copy)"}
USER DESCRIPTION: ${description || "(not provided)"}
TONE: ${tone || "professional"}
GOAL: ${goal || "promo"}
${harvestBlock}

Direct this film.`,
  };
}

/**
 * directFilm(params) → validated brief
 */
export async function directFilm({ harvest, productName, description, tone, goal, sceneCount }) {
  const prompt = buildDirectorPrompt({ harvest, productName, description, tone, goal, sceneCount });

  const response = await openai.chat.completions.create({
    model: DIRECTOR_MODEL,
    max_tokens: 3500,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: prompt.system },
      { role: "user",   content: prompt.user },
    ],
  });

  let brief;
  try {
    brief = JSON.parse(response.choices[0].message.content);
  } catch (e) {
    throw new Error(`creative director returned invalid JSON: ${e.message}`);
  }

  // ── Validation — never trust the model on structural fields ──────────────
  // Vividness guard: monochrome brand sites (black/white/grey) produce accents
  // that vanish on video — replace with a usable vivid default.
  const requested = normalizeHex(brief.accent_color, harvest.brandColor ?? "#6366f1");
  brief.accent_color = ensureVividAccent(requested, "#38bdf8");
  if (brief.accent_color !== requested) {
    console.log(`[saas/director] accent ${requested} too dark/grey for video — using ${brief.accent_color}`);
  }
  if (!["dark", "medium", "light"].includes(brief.theme)) brief.theme = "dark";
  if (!["radiant", "minimal", "professional", "high-contrast"].includes(brief.visual_style)) brief.visual_style = "radiant";
  if (!MUSIC_MOODS.includes(brief.music_mood)) brief.music_mood = "upbeat";
  if (!brief.product_name) brief.product_name = productName || harvest.title || "Your Product";
  if (!brief.project_name) brief.project_name = `${brief.product_name} — SaaS Video`;

  let plan = Array.isArray(brief.scene_plan) ? brief.scene_plan : [];
  if (plan.length === 0) throw new Error("creative director returned an empty scene plan");

  if (sceneCount !== "auto") {
    const n = parseInt(sceneCount, 10);
    if (Number.isFinite(n) && n > 0 && plan.length !== n) plan = plan.slice(0, n);
  }
  if (plan.length > 7) plan = plan.slice(0, 7);

  const usedArchetypes  = new Set();
  const usedShots       = new Set();
  let   typographicUsed = false;

  plan = plan.map((s, i) => {
    let archetype = ARCHETYPES.includes(s.archetype) ? s.archetype : "typography_hero";
    if (usedArchetypes.has(archetype)) {
      archetype = ARCHETYPES.find(a => !usedArchetypes.has(a)) ?? archetype;
    }
    usedArchetypes.add(archetype);

    const intent = INTENTS.includes(s.intent) ? s.intent : (i === 0 ? "hook" : i === plan.length - 1 ? "cta" : "benefit");

    // ── visual_source grounding ──────────────────────────────────────────
    let visualSource    = VISUAL_SOURCES.includes(s.visual_source) ? s.visual_source : "broll";
    let screenshotIndex = null;

    if (visualSource === "screenshot") {
      const idx = Number.isInteger(s.screenshot_index) ? s.screenshot_index : 0;
      if (harvest.screenshotUrls.length === 0 || usedShots.has(idx) || idx >= harvest.screenshotUrls.length) {
        visualSource = "mockup"; // downgrade gracefully — never a pending placeholder
      } else {
        screenshotIndex = idx;
        usedShots.add(idx);
      }
    }

    // typographic is an accent — second occurrence becomes broll
    if (visualSource === "typographic") {
      if (typographicUsed) visualSource = "broll";
      else typographicUsed = true;
    }

    const needsQuery = ["broll", "stock_image", "ai_image"].includes(visualSource);
    let shotQuery = typeof s.shot_query === "string" ? s.shot_query.trim().slice(0, 80) : "";
    if (needsQuery && !shotQuery) {
      shotQuery = `${brief.niche ?? "modern office"} person working laptop`;
    }

    let motion = MOTIONS.includes(s.motion) ? s.motion : null;
    if (!motion) {
      motion = visualSource === "stock_image" || visualSource === "ai_image" ? "ken_burns"
             : visualSource === "typographic" ? "none"
             : "punch_in";
    }

    let transitionOut = TRANSITIONS.includes(s.transition_out) ? s.transition_out : "fade";
    if (i === plan.length - 1) transitionOut = "none";

    return {
      scene_index:      i,
      intent,
      archetype,
      visual_concept:   s.visual_concept || "Designer's choice — match the script",
      visual_source:    visualSource,
      shot_query:       needsQuery ? shotQuery : null,
      screenshot_index: screenshotIndex,
      motion,
      transition_out:   transitionOut,
      word_budget:      Number.isFinite(s.word_budget)
        ? Math.min(MAX_SCENE_WORDS, Math.max(8, s.word_budget))
        : Math.min(MAX_SCENE_WORDS, WORD_BUDGETS[intent] ?? 20),
    };
  });

  // ── Rhythm enforcement: no two static scenes adjacent ────────────────────
  for (let i = 1; i < plan.length; i++) {
    if (STATIC_SOURCES.has(plan[i].visual_source) && STATIC_SOURCES.has(plan[i - 1].visual_source)) {
      plan[i].visual_source = "broll";
      plan[i].shot_query    = plan[i].shot_query || `${brief.niche ?? "modern office"} person working laptop`;
      plan[i].motion        = "punch_in";
      console.log(`[saas/director] rhythm fix: scene ${i} static-after-static → broll`);
    }
  }

  // ── Footage majority enforcement ──────────────────────────────────────────
  const footageCount = plan.filter(s => FOOTAGE_SOURCES.has(s.visual_source)).length;
  if (footageCount < Math.ceil(plan.length / 2)) {
    for (const s of plan) {
      if (STATIC_SOURCES.has(s.visual_source) && s.intent !== "solution" && s.visual_source !== "typographic") {
        s.visual_source = "broll";
        s.shot_query    = s.shot_query || `${brief.niche ?? "modern office"} person working laptop`;
        s.motion        = "punch_in";
        if (plan.filter(x => FOOTAGE_SOURCES.has(x.visual_source)).length >= Math.ceil(plan.length / 2)) break;
      }
    }
  }

  brief.scene_plan = plan;
  console.log(`[saas/director] ${plan.length} scenes — ${plan.map(s => `${s.intent}/${s.visual_source}${s.transition_out !== "none" ? `→${s.transition_out}` : ""}`).join(", ")} — accent ${brief.accent_color}`);
  return brief;
}
