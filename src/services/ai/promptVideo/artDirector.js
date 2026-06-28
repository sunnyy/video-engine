/**
 * artDirector.js
 * src/services/ai/promptVideo/artDirector.js
 *
 * Stage 1b — THE ART-DIRECTOR. The visual brain. Given the writer's beats (words + on-screen
 * content) and the TRUTHFUL capability envelope, it makes EVERY per-scene visual decision and the
 * global style + palette.
 *
 * Per beat it returns an `assets` array — ONE asset for a normal scene, or SEVERAL for a scene that
 * is genuinely multiple subjects (a list like "Visigoths / Vandals / Huns", a comparison, a
 * before/after). The DESIGNER then composes those image(s) into the frame freely (full-bleed,
 * framed, split, triptych, or a typographic frame when there are none) — so the treatment varies
 * scene to scene instead of being "full-bleed photo + caption" every time.
 *
 * Free sources (entity/stock) are unlimited; only ai_image is budgeted. Downstream the executor
 * faithfully fetches every asset; nothing silently downgrades to an empty frame.
 */
import { openai } from "../../../server/middleware/shared.js";
import { STYLE_PRESETS, STYLE_IDS, styleMenuForDirector, styleDirectiveBlock } from "./styleSystem.js";
import { normalizeHex, ensureVividAccent } from "./utils.js";
import { resolveThemePalette, themeDirective } from "../shared/themeRegistry.js";
import { buildCapabilityEnvelope, ASSET_SOURCES, AIV_TRANSITIONS, AIV_CAMERAS, SFX_PALETTES } from "../shared/capabilityEnvelope.js";

const DIRECTOR_MODEL = "gpt-4.1";

// ai_image is the only paid source. The director allocates within this; free sources are unlimited.
// Generous, bounded by a hard COGS ceiling the executor enforces. ~1 per 8s, min 3, cap 12.
const MAX_AI_IMAGES = 12;
export function aiImageBudgetFor(targetDuration) {
  return Math.max(3, Math.min(MAX_AI_IMAGES, Math.round((targetDuration || 45) / 8)));
}

const VTYPES = ["concept", "scene", "place", "object", "person", "texture", "abstract"];
// Sources that fetch a visual asset (typographic = no asset).
const VISUAL_SOURCES = new Set(["entity", "stock_video", "stock_image", "ai_image"]);

function beatsForPrompt(beats) {
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
    system: `You are the ART-DIRECTOR of a short-form video studio. The writer has already written the script and split it into beats (in the user message). You do NOT change a single spoken word. Your job: decide the VISUAL for every beat, and the overall look — using ONLY what our engine can actually produce.

${envelope}

${style ? styleDirectiveBlock(style) : `## VISUAL STYLE: choose ONE style_id for this whole video from:\n${styleMenuForDirector()}\nPick what fits the topic's tone, then lock it for every beat.`}
${themeBlock}

HOW TO DIRECT EACH BEAT — you give it an "assets" list, the designer composes them into the frame:
- Decide what the viewer should SEE, then list the asset(s) for the beat. ONE asset for a normal scene. SEVERAL assets when the beat is genuinely multiple subjects — a LIST ("Visigoths, Vandals, Huns" → three entity/stock images), a COMPARISON / versus, a before→after, a trio. Multi-asset scenes are how a list becomes three real images instead of a text list. Don't force multiple where one is right; don't collapse a real multi-subject moment into one.
- For EACH asset pick the cheapest source that shows it well (free first):
  • "entity" + exact Wikipedia title — for a named real person / group / org / place / landmark (e.g. Visigoths, Colosseum, Theodosian Walls). FREE, real, strongest — REACH FOR THIS whenever the subject is a real named thing with a Wikipedia page. Only skip it if that subject's canonical photo is anachronistic for the moment.
  • "stock_video" + a SHORT search phrase — real footage of a real-world moment.
  • "stock_image" + a SHORT search phrase — a real photo of a concrete subject/object/symbol/place/mood.
  • "ai_image" + a cinematic TEXT-FREE prompt — for a bespoke concept, a MAP or DIAGRAM, a metaphor, or a historical moment with no real photo. Budget = ${aiImageBudget} ai_images for the WHOLE video; allocate sparingly.
- A beat with NO assets ([]) is a deliberate TYPOGRAPHIC frame — for a pure-information moment (a stat, quote, title, CTA) where type alone is strongest. Use a few across the video for rhythm; the designer fills the frame.
- DEPICTABLE SUBJECTS GET IMAGERY — never leave a depictable beat empty.

CRITICAL SOURCE RULES (the lab caught these):
- MAPS, DIAGRAMS, charts, and ABSTRACT CONCEPTS are NOT on stock — use "ai_image" for them (a stock search for "empire map" returns a random statue).
- STOCK QUERIES MUST BE SHORT & ICONIC — 2-4 keywords ("roman emperor bust", "gold roman coins", "byzantine walls"), NOT a sentence. Stock matches keywords, not prose. Give different beats DIFFERENT queries.
- RESPECT THE MOOD — the chosen style/palette sets the mood; don't pick a source that breaks it (no bright midday stock in a dark, somber film). Add mood words to stock queries when needed ("dark", "ruins", "night").
- VARIETY — THE ANTI-SLIDESHOW RULE: consecutive beats must differ — vary SUBJECTS, mix single vs multi-asset, vary CAMERA and TRANSITION (never the same twice in a row). The designer will compose each scene differently; you make the underlying material varied.

PER BEAT ALSO CHOOSE:
- "fallback": the source to use if an asset returns nothing — one of ${ASSET_SOURCES.join(" | ")} (usually "stock_image" or "typographic"). A beat is NEVER allowed to end up empty.
- "camera" (for image/video scenes): ${AIV_CAMERAS.join(" | ")} — by emotion.
- "transition_out": ${AIV_TRANSITIONS.join(" | ")}.
- "sfx_hint": optional, one of ${SFX_PALETTES.join(" | ")} (or null).
- "visual_type": one of ${VTYPES.join(" | ")} and "keywords": 2-4 concrete lowercase nouns (image reuse).

For "ai_image" prompts write like a cinematographer: subject + composition + lighting + atmosphere; metaphor for abstract lines; NEVER request text-bearing objects (signs, documents, posters) — diffusion garbles text.

Return ONLY valid JSON. A directive for EVERY beat, in order:
{
  "style_id": "${style ? style.id : `one of: ${STYLE_IDS.join(" | ")}`}",
  "palette": { "bg": "#hex", "accent": "#hex", "accent2": "#hex", "text": "#hex" },
  "directives": [
    {
      "beat_index": 0,
      "assets": [
        { "source": "entity | stock_video | stock_image | ai_image", "entity": "Wikipedia title or null", "query": "short stock phrase or null", "prompt": "cinematic ai prompt or null", "label": "optional short label for this item (e.g. for a list), else null" }
      ],
      "fallback": "stock_image | stock_video | entity | ai_image | typographic",
      "camera": "slow_zoom_in | ... | hold (or null)",
      "transition_out": "zoom | slide-left | slide-up | slide-down | fade | none",
      "sfx_hint": "boom | impact | whoosh | pop | ding | success | tick | glitch | null",
      "visual_type": "concept | scene | place | object | person | texture | abstract",
      "keywords": ["noun", "noun"]
    }
  ]
}`,
    user: `RESEARCH BRIEF (for grounding subjects/entities):
${JSON.stringify({ topic: research.topic, angle: research.angle, entities: research.entities, facts: research.facts, artifacts: research.artifacts }, null, 2)}

THE WRITER'S BEATS (direct a visual for each — do NOT change any words):
${JSON.stringify(beatsForPrompt(beats), null, 2)}

ORIENTATION: ${orientation}. ai_image budget: ${aiImageBudget}. Give every beat an "assets" list (1 asset normally, several for a true multi-subject list/comparison, or [] for a typographic frame).`,
  };
}

// Validate + ground a single asset spec; returns a clean asset or null if unworkable.
function cleanAsset(a, beat) {
  if (!a || !VISUAL_SOURCES.has(a.source)) return null;
  const entity = typeof a.entity === "string" && a.entity.trim() ? a.entity.trim().slice(0, 60) : null;
  const query  = typeof a.query === "string" && a.query.trim() ? a.query.trim().slice(0, 80) : "";
  const prompt = typeof a.prompt === "string" && a.prompt.trim() ? a.prompt.trim() : "";
  const label  = typeof a.label === "string" && a.label.trim() ? a.label.trim().slice(0, 40) : null;
  const derived = (beat.visual_concept || beat.content?.headline || beat.script_line || "").trim();
  let source = a.source;
  if (source === "entity" && !entity) source = (query || derived) ? "stock_image" : null;
  if (source === "stock_video" && !(query || derived)) source = null;
  if (source === "stock_image" && !(query || derived)) source = null;
  if (source === "ai_image" && !(prompt || derived)) source = null;
  if (!source) return null;
  return { source, entity, query: query || (source.startsWith("stock") ? derived : ""), prompt: source === "ai_image" ? (prompt || derived) : "", label };
}

/**
 * directVisuals({ research, beats, targetDuration, styleId, theme, accentColor, accentColor2, orientation })
 * Returns { style, palette, beats: [writerBeat + { assets[], fallback, camera, transition_out, ... }] }.
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

  // ── Style + palette ──
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

  // ── Merge directives onto writer beats ──
  const directives = Array.isArray(plan.directives) ? plan.directives : [];
  const byIndex = new Map(directives.map(d => [d.beat_index, d]));

  let aiUsed = 0;
  const merged = beats.map((b, i) => {
    const d = byIndex.get(b.beat_index) ?? byIndex.get(i) ?? {};

    // Clean each asset; enforce the ai_image ceiling across the whole video (degrade extras to the
    // fallback or stock — a free real image beats blowing the budget).
    let assets = (Array.isArray(d.assets) ? d.assets : []).map(a => cleanAsset(a, b)).filter(Boolean);
    assets = assets.map(a => {
      if (a.source !== "ai_image") return a;
      if (aiUsed >= aiImageBudget) {
        const fb = (a.query || b.visual_concept) ? "stock_image" : null;
        if (!fb) return null;
        console.warn(`[ai-video/art-director] beat ${i} ai_image over budget (${aiImageBudget}) → stock_image`);
        return { ...a, source: "stock_image", query: a.query || (b.visual_concept || b.content?.headline || "").trim() };
      }
      aiUsed++; return a;
    }).filter(Boolean);

    let fallback = ASSET_SOURCES.includes(d.fallback) ? d.fallback : "typographic";

    const hasVisual = assets.length > 0;
    let transition = AIV_TRANSITIONS.includes(d.transition_out) ? d.transition_out : resolvedStyle.motion.transitions[i % resolvedStyle.motion.transitions.length];
    if (i === beats.length - 1) transition = "none";
    const camera = hasVisual ? (AIV_CAMERAS.includes(d.camera) ? d.camera : "slow_zoom_in") : null;
    const sfx_hint = SFX_PALETTES.includes(d.sfx_hint) ? d.sfx_hint : null;

    const visual_type = VTYPES.includes(d.visual_type) ? d.visual_type
      : assets[0]?.source === "ai_image" ? "concept" : assets[0]?.source === "entity" ? "person" : "scene";
    const keywords = (Array.isArray(d.keywords) && d.keywords.length)
      ? d.keywords.filter(k => typeof k === "string").map(k => k.toLowerCase().trim()).filter(Boolean).slice(0, 4)
      : `${assets[0]?.query || ""} ${assets[0]?.prompt || b.visual_concept || ""}`.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 3).slice(0, 4);

    // Legacy primary fields (capVisualHold / video handling / isFullBleed read these).
    const primary = assets[0] || null;
    const source = primary?.source || "typographic";
    const asset_type = !primary ? "none"
      : primary.source === "stock_video" ? "stock_video"
      : primary.source === "ai_image" ? "ai_image"
      : "photo";

    return {
      ...b,
      assets,            // full list (the executor resolves all)
      fallback,
      source,            // legacy: primary source
      subject_entity: primary?.source === "entity" ? primary.entity : null,
      shot_query: primary && primary.source.startsWith("stock") ? primary.query : null,
      image_prompt: primary?.source === "ai_image" ? primary.prompt : null,
      camera, transition_out: transition, sfx_hint, visual_type, keywords,
      asset_type,        // legacy alias
    };
  });

  const multi = merged.filter(b => b.assets.length > 1).length;
  console.log(`[ai-video/art-director] style=${resolvedStyle.id}, ai_image ${aiUsed}/${aiImageBudget}, multi-asset beats ${multi} — sources: ${merged.map(b => b.assets.map(a => a.source).join("+") || "typographic").join(",")}`);
  return { style: resolvedStyle, palette, beats: merged };
}
