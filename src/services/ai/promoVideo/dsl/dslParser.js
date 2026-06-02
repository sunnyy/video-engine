/**
 * dslParser.js
 * src/services/ai/promoVideo/dsl/dslParser.js
 *
 * Deterministic parser: DSL text → structured scene JSON array.
 * No GPT calls, no side effects. Pure text → data transformation.
 */

const VALID_INTENTS = new Set([
  "hook", "list", "feature", "benefit", "statistic",
  "comparison", "process", "proof", "cta", "statement",
]);

const VALID_MOODS = new Set([
  "premium", "energetic", "modern", "educational", "corporate", "playful",
]);

const VALID_VISUAL_WEIGHTS = new Set(["low", "medium", "high"]);

const VALID_ASSET_REQUIREMENTS = new Set(["screenshot", "recording", "image", "none"]);

const VALID_SECTION_ROLES = new Set(["hook", "body", "proof", "cta"]);

// Keywords that accumulate into arrays
const ARRAY_KEYS = new Set(["step", "item"]);

// Keywords that map to a single string value
const SCALAR_KEYS = new Set([
  "spoken", "intent", "section_role", "headline", "subhead", "body",
  "stat", "label", "icon", "mood", "emphasis", "visual_weight",
  "asset_requirement", "asset_hint",
]);

function emptyScene() {
  return {
    spoken:            null,
    intent:            "statement",
    section_role:      null,
    headline:          null,
    subhead:           null,
    body:              null,
    stat:              null,
    label:             null,
    steps:             [],
    items:             [],
    icon:              null,
    mood:              null,
    emphasis:          null,
    visual_weight:     "medium",
    asset_requirement: "none",
    asset_hint:        null,
  };
}

/**
 * Parse a single scene block (text between SCENE markers).
 */
function parseSceneBlock(block) {
  const scene = emptyScene();
  const lines = block.split("\n");

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.toUpperCase() === "SCENE") continue;

    // Find the first space to split keyword from value
    const spaceIdx = line.indexOf(" ");
    if (spaceIdx === -1) continue; // keyword with no value — skip

    const keyword = line.slice(0, spaceIdx).toLowerCase();
    const value   = line.slice(spaceIdx + 1).trim();
    if (!value) continue;

    if (ARRAY_KEYS.has(keyword)) {
      if (keyword === "step") scene.steps.push(value);
      if (keyword === "item") scene.items.push(value);
    } else if (SCALAR_KEYS.has(keyword)) {
      scene[keyword === "section_role"   ? "section_role"      :
            keyword === "visual_weight"  ? "visual_weight"     :
            keyword === "asset_requirement" ? "asset_requirement" :
            keyword === "asset_hint"     ? "asset_hint"        :
            keyword] = value;
    }
    // Unknown keywords are silently ignored per spec
  }

  // Validate and normalise constrained fields
  if (!VALID_INTENTS.has(scene.intent)) {
    scene.intent = "statement";
  }
  if (scene.mood !== null && !VALID_MOODS.has(scene.mood)) {
    scene.mood = null;
  }
  if (!VALID_VISUAL_WEIGHTS.has(scene.visual_weight)) {
    scene.visual_weight = "medium";
  }
  if (!VALID_ASSET_REQUIREMENTS.has(scene.asset_requirement)) {
    scene.asset_requirement = "none";
  }
  if (scene.section_role !== null && !VALID_SECTION_ROLES.has(scene.section_role)) {
    scene.section_role = null;
  }

  return scene;
}

/**
 * parseDSL(dslText) → array of scene objects.
 * Splits on SCENE keyword boundaries and parses each block.
 */
export function parseDSL(dslText) {
  if (!dslText || typeof dslText !== "string") return [];

  // Split on lines that are exactly "SCENE" (case-insensitive, optional whitespace)
  const blocks = dslText.split(/^SCENE\s*$/im);

  const scenes = [];
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    // Skip blocks with no SPOKEN — they're preamble or empty
    if (!/^SPOKEN\s/im.test(trimmed)) continue;
    const scene = parseSceneBlock(trimmed);
    scene.scene_id = `dsl_scene_${scenes.length}`;
    scenes.push(scene);
  }

  return scenes;
}

/**
 * validateDSL(dslText) → { valid: boolean, errors: string[] }
 * Checks structural correctness without full parsing.
 */
export function validateDSL(dslText) {
  const errors = [];

  if (!dslText || typeof dslText !== "string" || !dslText.trim()) {
    return { valid: false, errors: ["DSL text is empty"] };
  }

  const scenes = parseDSL(dslText);

  if (scenes.length === 0) {
    errors.push("No valid SCENE blocks found. Each scene must start with SCENE and include SPOKEN.");
    return { valid: false, errors };
  }

  scenes.forEach((scene, idx) => {
    const n = idx + 1;

    if (!scene.spoken) {
      errors.push(`Scene ${n}: missing SPOKEN`);
    }

    // intent was already defaulted to "statement" if invalid, so warn rather than error
    const rawBlocks = dslText.split(/^SCENE\s*$/im).filter(b => /^SPOKEN\s/im.test(b.trim()));
    const rawBlock  = rawBlocks[idx] ?? "";
    const intentMatch = rawBlock.match(/^INTENT\s+(.+)$/im);
    if (!intentMatch) {
      errors.push(`Scene ${n}: missing INTENT (defaulted to "statement")`);
    } else if (!VALID_INTENTS.has(intentMatch[1].trim().toLowerCase())) {
      errors.push(`Scene ${n}: invalid INTENT "${intentMatch[1].trim()}" (defaulted to "statement")`);
    }

    if (scene.intent === "list" && scene.items.length === 0) {
      errors.push(`Scene ${n}: INTENT is "list" but no ITEM lines found`);
    }
    if (scene.intent === "process" && scene.steps.length === 0) {
      errors.push(`Scene ${n}: INTENT is "process" but no STEP lines found`);
    }
    if (scene.intent === "statistic" && !scene.stat) {
      errors.push(`Scene ${n}: INTENT is "statistic" but no STAT line found`);
    }
    if (scene.asset_requirement !== "none" && !scene.asset_hint) {
      errors.push(`Scene ${n}: ASSET_REQUIREMENT is "${scene.asset_requirement}" but no ASSET_HINT provided`);
    }
  });

  return { valid: errors.length === 0, errors };
}
