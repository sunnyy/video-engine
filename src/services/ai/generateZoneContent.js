import { serverFetch } from "../serverApi";

function truncateToMaxChars(text, maxChars) {
  if (!text || text.length <= maxChars) return text;
  const truncated = text.substring(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 0) return truncated.substring(0, lastSpace).trim();
  // No space before the limit — return the first complete word, never hard-cut mid-character
  const firstSpace = text.indexOf(' ');
  return firstSpace > 0 ? text.substring(0, firstSpace).trim() : text;
}

/**
 * generateZoneContent.js
 * src/services/ai/generateZoneContent.js
 *
 * Phase 3 of video generation.
 * Single batched AI call that fills ALL text zone content for ALL beats.
 * Takes beats (with layouts already selected) and returns zone-by-zone text content.
 *
 * KEY PRINCIPLE: Spoken text is CONTEXT ONLY — not content to distribute.
 * Each zone gets independently generated content appropriate for its role.
 * Asset zones are NOT passed here — they get images, not text.
 */

/** Thematic single-word options per intent for giant background display zones */
const GIANT_DISPLAY_WORDS = {
  shock:       ["WILD", "TRUTH", "REAL", "WAIT", "WOW"],
  hook:        ["WILD", "TRUTH", "REAL", "NOW", "WAIT"],
  curiosity:   ["WAIT", "REAL", "TRUE", "WOW", "HUH"],
  explanation: ["HOW", "WHY", "KEY", "KNOW", "FACTS"],
  proof:       ["PROOF", "DATA", "REAL", "TRUE", "FACT"],
  reveal:      ["BOOM", "WAIT", "SEE", "LOOK", "WOW"],
  urgency:     ["GO", "NOW", "DO", "ACT", "START"],
  cta:         ["GO", "NOW", "DO", "ACT", "JOIN"],
  punchline:   ["BOOM", "DONE", "WIN", "YES", "WOW"],
  contrast:    ["BUT", "WAIT", "REAL", "YET", "NAH"],
  empathy:     ["TRUE", "REAL", "FEEL", "YES", "SAME"],
  stat:        ["BIG", "REAL", "TRUE", "WOW", "YES"],
};

/** Zone hint per role — what to independently write (not copy from spoken text) */
function zoneHint(role, intent, maxChars, isGiantDisplay = false, ordinal = 1) {
  const target = Math.floor(maxChars * 0.8);
  const mc = `Aim for ${target} chars or less (hard max ${maxChars}).`;
  const isCTA = intent === "cta" || intent === "urgency" || intent === "punchline";

  // Giant display zones (fontSize >= 200): decorative background word — must be thematic, never spoken text
  if (isGiantDisplay) {
    const words = GIANT_DISPLAY_WORDS[intent] || ["NOW", "REAL", "TRUE", "WOW"];
    return `ONE single ALL-CAPS word only. ${mc} Choose from: ${words.join(", ")}. No other words. Never use spoken text.`;
  }

  switch (role) {
    case "headline": return `A short punchy version of the main idea — rewritten, NOT copied from spoken text. ${mc} Bold statement.`;
    case "subtext":  return `A supporting detail SPECIFIC to this beat's topic. ${mc} Complete sentence. NOT a generic CTA (never "Discover", "Explore Now", "Learn Today" etc). Must relate directly to the beat subject.`;
    case "label":    return `A very short category tag or descriptor. ${mc} 1-3 words only. ALL CAPS.`;
    case "tagline":  return isCTA
      ? `A punchy action phrase. ${mc} e.g. FOLLOW NOW, JOIN TODAY. NEVER a sentence fragment.`
      : `A short memorable phrase. ${mc} Like a brand slogan.`;
    case "stat":     return ordinal > 1
      ? `A DIFFERENT short metric or number related to this beat's topic. ${mc} e.g. 10X, 5 min, 3 steps. Do NOT split the primary stat into digit fragments — if no second stat exists, leave this blank.`
      : `The main number or percentage from this beat. ${mc} e.g. 94%, ₹10L, 3X. Never a sentence.`;
    case "metric":   return `A short metric with unit. ${mc} e.g. 1M views, ₹10 lakh.`;
    case "quote":    return `A full impactful quote. ${mc} Should feel quotable.`;
    case "cta":      return `A short action directive. ${mc} e.g. Follow Now, Learn More.`;
    case "display":  return isCTA
      ? `Single bold action word. ${mc} e.g. FOLLOW, JOIN, START.`
      : `Single bold word or very short phrase. ${mc}`;
    default:         return `Write content appropriate for a ${role} zone. ${mc}`;
  }
}

/** Format the zones list as readable lines — id | role | maxChars | what to write.
 *  When two zones share the same role, label them PRIMARY / SECONDARY so the AI
 *  knows they must receive completely different content.
 *  When headline + label coexist, adds an explicit cross-role differentiation note. */
function buildZonesList(textZones, intent) {
  // Count how many times each role appears
  const roleCounts = {};
  for (const z of textZones) {
    roleCounts[z.role] = (roleCounts[z.role] || 0) + 1;
  }

  const hasHeadline = textZones.some(z => z.role === "headline");
  const hasLabel    = textZones.some(z => z.role === "label");

  // Track ordinal position within each duplicated role
  const roleIndex = {};
  return textZones
    .map(z => {
      const isDup = roleCounts[z.role] > 1;
      roleIndex[z.role] = (roleIndex[z.role] || 0) + 1;
      const ordinal = isDup
        ? roleIndex[z.role] === 1 ? " (PRIMARY)" : ` (SECONDARY ${roleIndex[z.role] - 1})`
        : "";
      const dupNote = isDup && roleIndex[z.role] > 1
        ? ` Must be completely different from the PRIMARY ${z.role} zone above.`
        : "";

      // Cross-role differentiation: when headline + label coexist
      let crossNote = "";
      if (hasHeadline && hasLabel) {
        if (z.role === "headline") {
          crossNote = " Write a punchy COMPLETE STATEMENT about the beat topic. Do NOT start with the same words as the spoken text.";
        } else if (z.role === "label") {
          crossNote = " Write a SHORT CATEGORY TAG (1-3 words, ALL CAPS) that is COMPLETELY DIFFERENT from the headline zone. Must NOT share any opening words with the headline.";
        }
      }

      return `${z.id} | role: ${z.role}${ordinal} | maxChars: ${z.maxChars} | ${zoneHint(z.role, intent, z.maxChars, z.isGiantDisplay, roleIndex[z.role])}${dupNote}${crossNote}`;
    })
    .join("\n");
}

/** Build the prompt section for a single beat — no inline response template */
function buildBeatSection(bp) {
  const pg = bp.preGenerated || {};

  // Map seeds directly to zone IDs by role — so AI knows exactly which zone gets which seed
  const roleToZoneId = {};
  for (const z of bp.textZones) {
    if (!roleToZoneId[z.role]) roleToZoneId[z.role] = z.id;
  }

  const seedLines = [];
  if (pg.headline && roleToZoneId['headline']) seedLines.push(`  → Zone ${roleToZoneId['headline']} (headline): USE THIS EXACT TEXT: "${pg.headline}"`);
  if (pg.subtext  && roleToZoneId['subtext'])  seedLines.push(`  → Zone ${roleToZoneId['subtext']}  (subtext):  USE THIS EXACT TEXT: "${pg.subtext}"`);
  if (pg.label    && roleToZoneId['label'])    seedLines.push(`  → Zone ${roleToZoneId['label']}    (label):    USE THIS EXACT TEXT: "${pg.label}"`);
  if (pg.stat     && roleToZoneId['stat'])     seedLines.push(`  → Zone ${roleToZoneId['stat']}     (stat):     USE THIS EXACT TEXT: "${pg.stat}"`);
  if (pg.tagline  && roleToZoneId['tagline'])  seedLines.push(`  → Zone ${roleToZoneId['tagline']} (tagline):  USE THIS EXACT TEXT: "${pg.tagline}"`);
  if (pg.quote    && roleToZoneId['quote'])    seedLines.push(`  → Zone ${roleToZoneId['quote']}    (quote):    USE THIS EXACT TEXT: "${pg.quote}"`);
  if (pg.cta      && roleToZoneId['cta'])      seedLines.push(`  → Zone ${roleToZoneId['cta']}      (cta):      USE THIS EXACT TEXT: "${pg.cta}"`);


  const seedBlock = seedLines.length
    ? `\nPRE-ASSIGNED CONTENT — copy these directly into the specified zones exactly as written:\n${seedLines.join('\n')}\nFor zones NOT listed above, generate fresh content based on the spoken text and beat context.\n`
    : '';

  return `--- BEAT ${bp.beatIndex} ---
The spoken text for this beat is: "${bp.spoken}"
The beat intent is: ${bp.intent}
The beat energy is: ${bp.energy} (0=calm, 1=explosive)
The niche is: ${bp.niche}
${seedBlock}
For each zone below, generate INDEPENDENT content appropriate for that zone's role.
DO NOT split or fragment the spoken text across zones.
DO NOT copy the spoken text into zones — rewrite from scratch for zones not pre-assigned above.
Use the spoken text ONLY as context to understand what this beat is about.

Zones to fill:
${buildZonesList(bp.textZones, bp.intent)}`;
}

function buildZoneContentPrompt(beatsPayload, videoDNA) {
  const niche = videoDNA?.niche || "entertainment";
  const beatSections = beatsPayload.map(buildBeatSection).join("\n\n");

  return `You are filling content for zones in video beats (TikTok/Reels/Shorts style).
Niche: ${niche}.

ABSOLUTE BANS — VIOLATING THESE IS A CRITICAL FAILURE:
- NEVER INVENT A NUMBER, PERCENTAGE, OR METRIC UNLESS IT COMES FROM A PRE-ASSIGNED SEED. If a stat or metric zone has no pre-assigned seed, write a short phrase like "Top Pick", "Must See", or "No. 1" — never a made-up number.
- NEVER WRITE A ZONE WITH ONLY ONE WORD THAT IS AN ARTICLE, PREPOSITION, CONJUNCTION, OR VAGUE VERB: "The", "A", "An", "In", "Join", "Go", "Big", "His", "Check", "Get" as standalone zone content is forbidden. Always write a complete short phrase.

CRITICAL RULE — READ THIS FIRST, APPLY TO EVERY BEAT:
Every zone in a beat must have UNIQUE content.
Never repeat the same word, phrase, or sentence in two different zones of the same beat.
Never use the same opening words in two zones.
If two zones have the same role (e.g. two labels), give them completely different content.
Two zones in the same beat must NEVER contain the same or similar text.

STRICT RULES — follow every rule for every zone:
1. Never exceed maxChars for any zone — count characters carefully
2. Never fragment or split the spoken text — it is context only, not content to distribute
3. Never copy the spoken text into a zone — rewrite from scratch for the zone's role
4. Never leave a zone with just 1 word unless it is a stat, metric, label, or display role
5. Each zone must make sense independently — a viewer sees only that zone
6. Match the energy — high energy (0.7+) = short punchy explosive; low energy = fuller sentences
7. Write in the niche voice — finance = authoritative, food = appetizing, gaming = hype
8. Do not include quotation marks in text content
9. NEVER split a single number across multiple stat zones — 94% must stay "94%", NOT split into "9", "4", "2" across zones. If a beat has multiple stat zones but only one stat, put the stat in the first zone and leave secondary stat zones blank ("")
10. Subtext zones must be topic-specific — NEVER write generic phrases like "Discover", "Explore Now", "Learn Today", "Find Out More" — these add zero value
11. If a stat or metric zone has NO pre-assigned seed content, write a relevant SHORT PHRASE (e.g. "No. 1", "Top Pick", "Best Ever") — NEVER invent a random number or percentage that was not in the spoken text or seeds
12. Never write a zone with only an article, preposition, or conjunction ("The", "A", "An", "In", "Join", "And", "But") — these are incomplete thoughts. Write a complete short phrase instead

${beatSections}

Return ONLY valid JSON — no markdown, no explanation:
{
  "beats": [
    { "beatIndex": 0, "zones": { "z1": { "text": "..." }, "z2": { "text": "..." } } },
    { "beatIndex": 1, "zones": { "z3": { "text": "..." } } }
  ]
}

Fill every zone listed for every beat. Skip nothing.`;
}

function parseZoneContentResponse(raw) {
  try {
    const cleaned = raw
      .replace(/```json\n?/gi, "")
      .replace(/```\n?/gi, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed.beats)) throw new Error("No beats array");
    return parsed.beats;
  } catch (e) {
    console.error("[generateZoneContent] parse failed:", e.message);
    throw new Error("Zone content generation failed to parse: " + e.message);
  }
}

/**
 * @param {object[]} beats       - Beats with layouts selected (from buildBeatsFromScript)
 * @param {object[]} layoutDefs  - Layout definition for each beat (parallel array)
 * @param {string}   topic       - Video topic
 * @param {object}   videoDNA    - DNA object { niche, typographySystem, colorStory, motionStyle }
 * @returns {Promise<object[]>}  - Array of { beatIndex, zones: { zoneId: { text } } }
 */
/** Infer zone role from _presetId or font characteristics when the layout def lacks role metadata */
const PRESET_TO_ROLE = {
  "mixed-weight-headline": "headline",
  "slab-punch":            "headline",
  "brutal-stamp":          "headline",
  "serif-subtext":         "subtext",
  "minimal-caption":       "subtext",
  "spaced-caps-tag":       "label",
  "breaking-tag":          "label",
  "pill-tag":              "label",
  "hero":                  "label",
  "badge-label":           "label",
  "quote-highlight":       "label",
  "gradient-text":         "display",
  "neon-glow":             "display",
  "stat-flood":            "stat",
  "mono-tag":              "stat",
};

function inferRoleFromBeatZone(zone) {
  const presetId = zone?.style?._presetId;
  if (presetId && PRESET_TO_ROLE[presetId]) return PRESET_TO_ROLE[presetId];
  const fontSize   = zone?.style?.fontSize   || 0;
  const fontWeight = zone?.style?.fontWeight || 400;
  if (fontSize >= 80 && fontWeight >= 700) return "headline";
  if (fontSize >= 80) return "headline";
  // Default to label — safer than subtext (no 5-word minimum) for unknown zones
  return "label";
}

function maxCharsFromFontSize(fontSize) {
  if (!fontSize) return 60;
  if (fontSize >= 120) return 20;
  if (fontSize >= 80)  return 35;
  if (fontSize >= 60)  return 55;
  if (fontSize >= 40)  return 80;
  return 120;
}

export async function generateZoneContent({ beats, layoutDefs, topic, videoDNA }) {
  console.log("[zoneContent] generateZoneContent called, beats:", beats.length, "layoutDefs:", layoutDefs.length, "nullDefs:", layoutDefs.filter(d => !d).length);
  const beatsPayload = beats.map((beat, i) => {
    const layoutDef = layoutDefs[i];
    const beatId = beat.id; // carry beat ID so write-back can use it instead of fragile index

    let textZones;

    if (layoutDef?.zones?.length) {
      // Primary path: layout def has full zone metadata (role, maxChars, example text)
      textZones = layoutDef.zones
        .filter(z => z.type === "text")
        .map(z => {
          // Derive maxChars from the layout zone's own example text when not explicitly set.
          // This ensures AI-generated text matches the designer's intended scale.
          const exampleText = z.content?.text || z.text || "";
          const derivedMax  = exampleText
            ? Math.max(10, Math.round(exampleText.length * 1.2)) // 20% buffer over example length
            : 50;
          const fontSize      = z.style?.fontSize ?? 0;
          const isGiantDisplay = fontSize >= 200;
          const maxChars = isGiantDisplay ? 8 : (z.maxChars ?? derivedMax);
          return {
            id:   z.id,
            role: isGiantDisplay ? "display" : (z.role || "subtext"),
            maxChars,
            isGiantDisplay,
            // Check BOTH layout-def lock (Layout Editor) AND beat-zone lock (ZoneEditor per-beat toggle)
            locked: z.locked || beat.zones?.[z.id]?.locked || false,
            static: z.static  || false,
          };
        });
    } else {
      // Fallback path: layout def unavailable — derive text zones from beat's own zone data.
      // This handles custom layouts where getLayoutDef returns null.
      textZones = Object.entries(beat.zones || {})
        .filter(([, zone]) => zone?.content?.kind === "text")
        .map(([zoneId, zone]) => {
          const fontSize       = zone?.style?.fontSize ?? 0;
          const isGiantDisplay = fontSize >= 200;
          return {
            id:   zoneId,
            role: isGiantDisplay ? "display" : inferRoleFromBeatZone(zone),
            maxChars: isGiantDisplay ? 8 : maxCharsFromFontSize(fontSize),
            isGiantDisplay,
            locked: zone.locked || false,
            static: zone.static || false,
          };
        });
    }

    // Skip zones already filled by direct seed injection (Phase 3a) — no AI needed for those
    textZones = textZones.filter(z => !beat.zones?.[z.id]?.content?.text?.trim());

    // Skip locked/static zones — their content is fixed by the layout designer
    textZones = textZones.filter(z => !z.locked && !z.static);

    // Pre-generated zone content from the script director (headline, subtext, label, etc.)
    // These serve as high-quality seeds — the AI uses them as starting points per role.
    const preGenerated = {
      headline: beat.headline || null,
      subtext:  beat.subtext  || null,
      label:    beat.label    || null,
      stat:     beat.stat     || null,
      tagline:  beat.tagline  || null,
      quote:    beat.quote    || null,
      cta:      beat.cta      || null,
    };

    console.log(`[zoneContent] beat ${i} (id:${beat.id || i}) path:${layoutDef?.zones?.length ? "layoutDef" : "fallback"} textZones:`, textZones.map(z => z.id));
    return {
      beatIndex: i,
      beatId,
      spoken:    beat.spoken,
      intent:    beat.intent,
      energy:    beat.energy,
      topic,
      niche:      videoDNA?.niche || "entertainment",
      textZones,
      preGenerated,
    };
  }).filter(bp => bp.textZones.length > 0); // skip beats with no text zones

  if (beatsPayload.length === 0) return [];

  const prompt = buildZoneContentPrompt(beatsPayload, videoDNA);

  const response = await serverFetch("/api/generate", {
    method: "POST",
    body:   JSON.stringify({ prompt, model: "gpt-4o" }),
  });

  if (!response.ok) {
    throw new Error(`Zone content AI call failed: ${response.status}`);
  }

  const data    = await response.json();
  console.log("[zoneContent] raw API response keys:", Object.keys(data), "has beats:", Array.isArray(data.beats), "sample:", JSON.stringify(data).slice(0, 300));
  const rawText = data.text || data.content || JSON.stringify(data);

  const parsed = parseZoneContentResponse(rawText);
  console.log("[zoneContent] parsed beats count:", parsed.length);
  parsed.forEach(b => {
    const expected = (beatsPayload.find(bp => bp.beatIndex === b.beatIndex)?.textZones || []).map(z => z.id);
    const returned = Object.keys(b.zones || {});
    console.log(`[zoneContent] beat ${b.beatIndex} — expected zones: [${expected.join(",")}] | AI returned zones: [${returned.join(",")}] | writing back: ${returned.filter(id => b.zones[id]?.text?.trim()).length}`);
  });

  // Build per-beat zone metadata lookups used by validation passes below.
  const maxCharsMap = {}; // { beatIndex: { zoneId: maxChars } }
  const roleMap     = {}; // { beatIndex: { zoneId: role } }
  const spokenMap   = {}; // { beatIndex: spoken }
  for (const bp of beatsPayload) {
    maxCharsMap[bp.beatIndex] = {};
    roleMap[bp.beatIndex]     = {};
    spokenMap[bp.beatIndex]   = bp.spoken || "";
    for (const z of bp.textZones) {
      if (z.maxChars) maxCharsMap[bp.beatIndex][z.id] = z.maxChars;
      roleMap[bp.beatIndex][z.id] = z.role;
    }
  }

  // Pass 1: Enforce maxChars — truncate at word boundary.
  for (const beat of parsed) {
    const zoneMax = maxCharsMap[beat.beatIndex] || {};
    for (const [zoneId, content] of Object.entries(beat.zones || {})) {
      const max = zoneMax[zoneId];
      if (max && content.text) {
        content.text = truncateToMaxChars(content.text, max);
      }
    }
  }

  // Pass 3: Deduplication — clear any zone whose text is identical to an earlier zone
  // in the same beat. Better to show empty than to repeat content.
  for (const beat of parsed) {
    const usedTexts = new Set();
    for (const [zoneId, content] of Object.entries(beat.zones || {})) {
      if (!content.text) continue;
      const normalised = content.text.trim().toLowerCase();
      if (usedTexts.has(normalised)) {
        console.warn(`[generateZoneContent] beat ${beat.beatIndex} zone ${zoneId}: duplicate text cleared`);
        content.text = "";
      } else {
        usedTexts.add(normalised);
      }
    }
  }

  // Pass 4: Fragment detection — AI often copies the start of the spoken text verbatim.
  // Detect two patterns and clear the zone (empty > spoken-text fragment):
  //   1. Zone text is a word-level prefix of the spoken text
  //   2. Zone text contains any 4+ consecutive spoken words
  // Exemption: stat and metric roles — numbers from spoken text are valid content.
  const tokenise = t => t.toLowerCase().replace(/[^\w\s]/g, "").trim().split(/\s+/).filter(Boolean);
  for (const beat of parsed) {
    const spoken   = spokenMap[beat.beatIndex] || "";
    const zoneRole = roleMap[beat.beatIndex]   || {};
    if (!spoken) continue;
    const sWords = tokenise(spoken);
    const sStr   = sWords.join(" ");

    for (const [zoneId, content] of Object.entries(beat.zones || {})) {
      if (!content.text) continue;
      const role = zoneRole[zoneId];
      // stat / metric zones may legitimately contain numbers from spoken text.
      // label / display zones are short category tags (1-3 words) that intentionally
      // reference the beat topic — prefix detection would over-clear them.
      if (role === "stat" || role === "metric" || role === "label" || role === "display") continue;

      const zWords = tokenise(content.text);
      if (zWords.length < 2) continue; // single words — skip detection

      // Pattern 1: zone words are a prefix of spoken words
      const isPrefix = zWords.length <= sWords.length &&
        zWords.every((w, i) => w === sWords[i]);

      // Pattern 2: any run of 6+ consecutive zone words appears in the spoken word sequence
      // (Threshold intentionally high — legitimate headlines reuse key words from spoken text.
      //  Only flag near-verbatim copies, not creative rewrites that share common words.)
      let hasLongRun = false;
      if (zWords.length >= 6) {
        for (let i = 0; i <= zWords.length - 6 && !hasLongRun; i++) {
          if (sStr.includes(zWords.slice(i, i + 6).join(" "))) hasLongRun = true;
        }
      }

      if (isPrefix || hasLongRun) {
        console.warn(`[generateZoneContent] beat ${beat.beatIndex} zone ${zoneId}: spoken fragment detected — cleared ("${content.text.slice(0, 40)}")`);
        content.text = "";
      }
    }
  }

  // Attach beatId from beatsPayload so the caller can do ID-based write-back
  // instead of relying on beatIndex (which is relative to the filtered subset, not the full beats array).
  for (const item of parsed) {
    const bp = beatsPayload.find(b => b.beatIndex === item.beatIndex);
    if (bp?.beatId) item.beatId = bp.beatId;
  }

  return parsed;
}
