/**
 * artDirector.js
 * src/services/ai/promptVideo/artDirector.js
 *
 * Stage 1b — THE ART-DIRECTOR. The visual brain. Given the writer's beats (the words + on-screen
 * content) and the TRUTHFUL capability envelope (what our engine can actually produce + costs), it
 * makes EVERY per-scene visual decision: the visual source + its query, a fallback, overlay-vs-full
 * layout, camera, transition, and the global style + palette. It allocates the paid ai_image budget
 * itself; free sources (entity/stock) are unlimited.
 *
 * This is the half lifted out of the old single directBeats() call, now focused so the visual
 * decisions get full attention — and handed the envelope so it stops defaulting to empty text
 * frames for subjects that obviously have free imagery.
 *
 * Downstream the executor (visualResolver) faithfully fetches each directive; nothing overrides it
 * and nothing silently downgrades to an empty frame.
 */
import { openai } from "../../../server/middleware/shared.js";
import { STYLE_PRESETS, STYLE_IDS, styleMenuForDirector, styleDirectiveBlock } from "./styleSystem.js";
import { normalizeHex, ensureVividAccent } from "./utils.js";
import { resolveThemePalette, themeDirective } from "../shared/themeRegistry.js";
import { buildCapabilityEnvelope, ASSET_SOURCES, AIV_TRANSITIONS, AIV_CAMERAS, SFX_PALETTES } from "../shared/capabilityEnvelope.js";

const DIRECTOR_MODEL = "gpt-4.1";

// AI image is the ONLY paid source. The director allocates within this budget; free sources are
// unlimited. Generous (free media should carry most scenes), bounded by a hard COGS ceiling that
// the executor enforces. ~1 per 8s, min 3, capped at MAX_AI_IMAGES.
const MAX_AI_IMAGES = 12;
export function aiImageBudgetFor(targetDuration) {
  return Math.max(3, Math.min(MAX_AI_IMAGES, Math.round((targetDuration || 45) / 8)));
}

const VTYPES = ["concept", "scene", "place", "object", "person", "texture", "abstract"];

function beatsForPrompt(beats) {
  // Only the words + content the art-director needs to direct — keep it compact.
  return beats.map(b => ({
    beat_index: b.beat_index,
    script_line: b.script_line,
    visual_concept: b.visual_concept,
    content: b.content,
    continues_previous: b.continues_previous,
  }));
}

function buildArtDirectorPrompt({ research, beats, style, orientation, aiImageBudget, theme, accentColor, accentColor2 }) {
  const envelope = buildCapabilityEnvelope({ orientation, aiImageBudget });
  const themeBlock = themeDirective(theme, accentColor, accentColor2);

  return {
    system: `You are the ART-DIRECTOR of a short-form video studio. The writer has already written the script and broken it into beats (below, in the user message). You do NOT change a single spoken word. Your job: decide the VISUAL for every beat, and the overall look — using ONLY what our engine can actually produce.

${envelope}

${style ? styleDirectiveBlock(style) : `## VISUAL STYLE: choose ONE style_id for this whole video from:\n${styleMenuForDirector()}\nPick what fits the topic's tone, then lock it for every beat.`}
${themeBlock}

HOW TO DIRECT EACH BEAT:
- Read the beat's visual_concept + script_line + content and decide what the viewer should SEE. Then pick the cheapest source that shows it WELL (free first):
  • a named real person/org/place/landmark → "entity" with its exact Wikipedia title — BUT only when that subject's canonical photo actually fits the moment AND era. A generic place's Wikipedia lead image is often modern/anachronistic (e.g. "City of Rome" → a Baroque fountain); for era-specific or "crumbling/ancient" needs, prefer stock_image instead.
  • a real-world moment that footage shows → "stock_video" with a SHORT search phrase.
  • any other concrete/depictable subject, object, symbol, emblem, place, mood → "stock_image" with a SHORT search phrase (this includes iconic symbol art like zodiac signs, logos-as-concept, flags, animals).
  • a bespoke metaphor/concept NO free source can show → "ai_image" with a cinematic, TEXT-FREE prompt. Budget = ${aiImageBudget}; allocate sparingly.
  • a pure-information moment (stat, quote, list, title, CTA, comparison) OR nothing depictable → "typographic" (a deliberate FULL designed frame).
- STOCK QUERIES MUST BE SHORT & ICONIC — 2-4 words naming the core subject ("roman emperor bust", "gold roman coins", "roman ruins arch", "barbarian horsemen"), NOT a cinematic sentence. Stock engines match keywords, not prose — a long descriptive phrase returns a generic or wrong image. Save the cinematic composition/lighting/mood detail for "ai_image" image_prompts ONLY. Also: give DIFFERENT beats DIFFERENT queries (don't send two near-identical phrases — they fetch the same photo twice).
- DEPICTABLE SUBJECTS GET IMAGERY. If the beat is about something you could photograph or find as stock, it MUST be entity/stock/ai — never typographic. A topic that enumerates concrete subjects (each zodiac sign, each animal, each city, each tool) gives EVERY subject its own real image. Typographic is for genuine information frames only.
- VARIETY — THE ANTI-SLIDESHOW RULE: consecutive beats must not look alike. Vary the SUBJECT, the SOURCE, the CAMERA move and the TRANSITION scene to scene — never the same camera or transition twice in a row, never one source dominating a run. (The designer varies the typography per scene; you make sure the shots + motion underneath are varied too, so it never feels like one photo-with-a-caption repeated.)
- continues_previous beats inherit the previous beat's visual (a quick same-image build) — you may leave their source matching the previous.

PER BEAT YOU ALSO CHOOSE:
- "fallback": the source to use if the first choice returns nothing — one of ${ASSET_SOURCES.join(" | ")} (usually "stock_image" or "typographic"). A beat is NEVER allowed to end up empty.
- "layout": "overlay" (on an entity/stock/ai image, the on-screen text sits over the image) or "full" (a typographic designed frame fills the canvas). entity/stock/ai beats are usually "overlay"; a clean atmospheric shot with content.kind "none" can be "overlay" with no text. typographic is always "full".
- "camera" (for entity/stock/ai beats): ${AIV_CAMERAS.join(" | ")} — by emotion.
- "transition_out": ${AIV_TRANSITIONS.join(" | ")}.
- "sfx_hint": optional, one of ${SFX_PALETTES.join(" | ")} (or null) — the cut's sound mood.
- "visual_type": one of ${VTYPES.join(" | ")} and "keywords": 2-4 concrete lowercase nouns (for image reuse).

SHOT LANGUAGE — for "ai_image" only, write image_prompt like a cinematographer: subject + composition + lighting + atmosphere; use metaphor for abstract lines; state the emotional intent; NEVER request text-bearing objects (documents, posters, screens, signs) — diffusion garbles text.

Return ONLY valid JSON. Output a directive for EVERY beat, keyed by beat_index, in order:
{
  "style_id": "${style ? style.id : `one of: ${STYLE_IDS.join(" | ")}`}",
  "palette": { "bg": "#hex", "accent": "#hex", "accent2": "#hex", "text": "#hex" },
  "directives": [
    {
      "beat_index": 0,
      "source": "entity | stock_video | stock_image | ai_image | typographic",
      "fallback": "stock_image | stock_video | entity | ai_image | typographic",
      "subject_entity": "exact Wikipedia title (only for source=entity, else null)",
      "shot_query": "concrete search phrase (for stock_video/stock_image, else null)",
      "image_prompt": "cinematic text-free shot (only for source=ai_image, else null)",
      "layout": "overlay | full",
      "camera": "slow_zoom_in | ... | hold (for image beats, else null)",
      "transition_out": "zoom | slide-left | slide-up | slide-down | fade | none",
      "sfx_hint": "boom | impact | whoosh | pop | ding | success | tick | glitch | null",
      "visual_type": "concept | scene | place | object | person | texture | abstract",
      "keywords": ["noun", "noun"]
    }
  ]
}`,
    user: `RESEARCH BRIEF (for grounding subjects/entities — same one the writer used):
${JSON.stringify({ topic: research.topic, angle: research.angle, entities: research.entities, facts: research.facts, artifacts: research.artifacts }, null, 2)}

THE WRITER'S BEATS (direct a visual for each — do NOT change any words):
${JSON.stringify(beatsForPrompt(beats), null, 2)}

ORIENTATION: ${orientation}. ai_image budget: ${aiImageBudget}. Direct every beat.`,
  };
}

/**
 * directVisuals({ research, beats, targetDuration, language, styleId, theme, accentColor, accentColor2, orientation })
 * beats = the writer's beats. Returns { style, palette, beats: [writerBeat + directive...] }.
 */
export async function directVisuals({ research, beats, targetDuration = 45, styleId = "auto", theme = "auto", accentColor = null, accentColor2 = null, orientation = "9:16" }) {
  const style = styleId && styleId !== "auto" ? STYLE_PRESETS[styleId] : null;
  const aiImageBudget = aiImageBudgetFor(targetDuration);
  const prompt = buildArtDirectorPrompt({ research, beats, style, orientation, aiImageBudget, theme, accentColor, accentColor2 });

  let plan;
  try {
    const response = await openai.chat.completions.create({
      model: DIRECTOR_MODEL,
      max_tokens: 8000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompt.system },
        { role: "user",   content: prompt.user },
      ],
    });
    plan = JSON.parse(response.choices[0].message.content);
  } catch (e) {
    throw new Error(`art director returned invalid JSON: ${e.message}`);
  }

  // ── Style + palette (lifted from the old director) ──
  const resolvedStyle = STYLE_PRESETS[plan.style_id] ?? style ?? STYLE_PRESETS.editorial_retro;
  const palette = plan.palette ?? {};
  palette.bg      = normalizeHex(palette.bg, "#07080f");
  palette.accent  = ensureVividAccent(normalizeHex(palette.accent, "#f59e0b"), "#f59e0b");
  palette.accent2 = ensureVividAccent(normalizeHex(palette.accent2, "#38bdf8"), "#38bdf8");
  palette.text    = normalizeHex(palette.text, "#ffffff");
  const themePalette = resolveThemePalette(theme, accentColor);
  if (themePalette) {
    palette.bg   = themePalette.background;
    palette.text = themePalette.primaryText;
    if (accentColor) palette.accent = accentColor;
  }
  if (accentColor2) palette.accent2 = accentColor2;
  palette.theme = themePalette ? theme : "auto";

  // ── Merge each directive onto its writer beat, validated ──
  const directives = Array.isArray(plan.directives) ? plan.directives : [];
  const byIndex = new Map(directives.map(d => [d.beat_index, d]));

  let aiUsed = 0;
  const merged = beats.map((b, i) => {
    const d = byIndex.get(b.beat_index) ?? byIndex.get(i) ?? {};
    let source = ASSET_SOURCES.includes(d.source) ? d.source : "typographic";

    const subjectEntity = typeof d.subject_entity === "string" && d.subject_entity.trim() ? d.subject_entity.trim().slice(0, 60) : null;
    const shotQuery     = typeof d.shot_query === "string" && d.shot_query.trim() ? d.shot_query.trim().slice(0, 120) : "";
    const imagePrompt   = typeof d.image_prompt === "string" && d.image_prompt.trim() ? d.image_prompt.trim() : "";
    const derivedQuery  = (b.visual_concept || b.content?.headline || b.script_line || "").trim();

    // Ground each source to its required field; fall to typographic only if truly unworkable.
    if (source === "entity" && !subjectEntity) source = shotQuery || derivedQuery ? "stock_image" : "typographic";
    if (source === "stock_video" && !(shotQuery || derivedQuery)) source = "typographic";
    if (source === "stock_image" && !(shotQuery || derivedQuery)) source = "typographic";
    if (source === "ai_image" && !(imagePrompt || derivedQuery)) source = "typographic";

    // Enforce the paid ceiling: ai_image only while budget remains, else degrade to its fallback or
    // stock_image (a free real image is almost always better than blowing the budget anyway).
    if (source === "ai_image") {
      if (aiUsed >= aiImageBudget) {
        const fb = ASSET_SOURCES.includes(d.fallback) && d.fallback !== "ai_image" ? d.fallback : "stock_image";
        source = fb;
        console.warn(`[ai-video/art-director] beat ${i} ai_image over budget (${aiImageBudget}) → ${source}`);
      } else { aiUsed++; }
    }

    let fallback = ASSET_SOURCES.includes(d.fallback) ? d.fallback : "typographic";
    if (fallback === source) fallback = source === "typographic" ? "stock_image" : "typographic";

    const isVisual = source !== "typographic";
    let layout = d.layout === "overlay" || d.layout === "full" ? d.layout : (isVisual ? "overlay" : "full");
    if (!isVisual) layout = "full";

    let transition = AIV_TRANSITIONS.includes(d.transition_out) ? d.transition_out : resolvedStyle.motion.transitions[i % resolvedStyle.motion.transitions.length];
    if (i === beats.length - 1) transition = "none";

    const camera = isVisual ? (AIV_CAMERAS.includes(d.camera) ? d.camera : "slow_zoom_in") : null;
    const sfx_hint = SFX_PALETTES.includes(d.sfx_hint) ? d.sfx_hint : null;

    const visual_type = VTYPES.includes(d.visual_type) ? d.visual_type
      : source === "ai_image" ? "concept" : source === "entity" ? "person" : "scene";
    const keywords = (Array.isArray(d.keywords) && d.keywords.length)
      ? d.keywords.filter(k => typeof k === "string").map(k => k.toLowerCase().trim()).filter(Boolean).slice(0, 4)
      : `${shotQuery} ${imagePrompt || derivedQuery}`.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 3).slice(0, 4);

    // Legacy alias so any stage still keyed on asset_type keeps working (executor uses `source`).
    const asset_type = source === "typographic" ? "none"
      : source === "stock_video" ? "stock_video"
      : source === "ai_image" ? "ai_image"
      : "photo"; // entity + stock_image both resolve via the stock/entity photo path

    return {
      ...b,
      source, fallback,
      subject_entity: source === "entity" ? subjectEntity : (subjectEntity || null),
      shot_query: (source === "stock_image" || source === "stock_video") ? (shotQuery || derivedQuery) : (shotQuery || null),
      image_prompt: source === "ai_image" ? (imagePrompt || derivedQuery) : null,
      layout,
      camera,
      transition_out: transition,
      sfx_hint,
      visual_type,
      keywords,
      asset_type, // legacy alias
    };
  });

  console.log(`[ai-video/art-director] style=${resolvedStyle.id}, ai_image ${aiUsed}/${aiImageBudget} — sources: ${merged.map(b => b.source).join(",")}`);
  return { style: resolvedStyle, palette, beats: merged };
}
