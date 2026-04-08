/**
 * generateZoneContent.js
 * src/services/ai/generateZoneContent.js
 *
 * Phase 3 of video generation.
 * Single batched AI call that fills ALL zone content for ALL beats intelligently.
 * Takes beats (with layouts already selected) and returns zone-by-zone content.
 *
 * Text zones: AI rewrites spoken text to fit the zone role + maxChars.
 * Asset zones: AI writes specific, photographable scene prompts per zone.
 */

const ZONE_ROLE_GUIDE = `
ZONE ROLE GUIDE — follow strictly:
- headline     : Short, punchy, UPPERCASE-feel. The main message. Respect maxChars.
- subtext      : Supporting detail in natural language. Can be sentence case. Respect maxChars.
- label        : 2-3 word category tag. e.g. "WILD FACT", "PRO TIP", "DID YOU KNOW". ALL CAPS.
- stat         : The key number/metric ONLY. e.g. "73%", "10X", "$2M", "15". Just the number.
- quote        : Full natural sentence or testimonial. Can be longer.
- hero_image   : Primary image — specific, photographable, cinematic. No abstract concepts.
- supporting_image : Secondary visual — complements the hero, specific and concrete.
- background_image : Atmospheric wide shot. Sets the mood/scene behind text.
`.trim();

const CRITICAL_RULES = `
CRITICAL RULES:
- NEVER exceed maxChars for ANY text zone — count carefully
- NEVER split a sentence mid-word or awkwardly — rewrite to fit naturally
- headline zones: rewrite spoken text as short punchy headline, NOT a literal split
- stat zones: extract ONLY the number/metric from spoken text. If the spoken text has NO number, write a single impactful word (max 4 chars) like "NOW", "0%", or "—". NEVER put a sentence in a stat zone.
- label zones: create a short 2-3 word context tag relevant to the beat (e.g. "WILD FACT", "THE TRUTH", "DID YOU KNOW")
- quote zones: write as a natural quote or sentence, not clipped
- hero_image prompts: specific, real-world scenes. No vague abstractions.
- Each beat should feel DISTINCT from adjacent beats
- Preserve the emotional intent of each beat (shock, curiosity, proof, etc.)
- Do NOT include quotation marks in text content
- If a label zone has no obvious tag for the content, use the intent as a tag (e.g. "REVEALED", "PROOF", "FACT")
`.trim();

function buildZoneContentPrompt(beatsPayload, videoDNA) {
  return `You are filling content for short-form vertical video beats (TikTok/Reels style).

VIDEO CONTEXT:
- Niche: ${videoDNA?.niche || "entertainment"}
- Typography: ${videoDNA?.typographySystem || "brutal"}
- Tone: bold, direct, punchy

${ZONE_ROLE_GUIDE}

${CRITICAL_RULES}

BEATS TO FILL:
${JSON.stringify(beatsPayload, null, 2)}

Return ONLY valid JSON, no markdown, no explanation:
{
  "beats": [
    {
      "beatIndex": 0,
      "zones": {
        "z1": { "prompt": "specific photographable scene description" },
        "z2": { "text": "HEADLINE TEXT HERE" },
        "z3": { "text": "Supporting subtext here" }
      }
    }
  ]
}

For asset zones: use "prompt" key.
For text zones: use "text" key.
Fill every zone listed. Skip nothing.`;
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
 * @returns {Promise<object[]>}  - Array of { beatIndex, zones: { zoneId: { text? | prompt? } } }
 */
export async function generateZoneContent({ beats, layoutDefs, topic, videoDNA }) {
  const beatsPayload = beats.map((beat, i) => {
    const layoutDef = layoutDefs[i];
    if (!layoutDef) return null;

    const textZones = (layoutDef.zones || [])
      .filter(z => z.type === "text")
      .map(z => ({
        id:       z.id,
        role:     z.role     || "subtext",
        maxChars: z.maxChars || 50,
      }));

    const assetZones = (layoutDef.zones || [])
      .filter(z => z.type === "asset")
      .map(z => ({
        id:   z.id,
        role: z.role || "hero_image",
      }));

    return {
      beatIndex:  i,
      spoken:     beat.spoken,
      intent:     beat.intent,
      energy:     beat.energy,
      topic,
      textZones,
      assetZones,
    };
  }).filter(Boolean);

  const prompt = buildZoneContentPrompt(beatsPayload, videoDNA);

  const response = await fetch("http://localhost:5000/api/generate", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error(`Zone content AI call failed: ${response.status}`);
  }

  const data    = await response.json();
  const rawText = data.text || data.content || JSON.stringify(data);

  return parseZoneContentResponse(rawText);
}
