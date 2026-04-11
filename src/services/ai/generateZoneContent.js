import { serverFetch } from "../serverApi";

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
Text roles:
- headline      : Short, punchy, UPPERCASE-feel. The main message of this beat. AIM FOR 70-90% of maxChars. Never just 1-2 words unless it's a pure stat. Write a full impactful phrase.
- subtext       : Supporting detail — write 1-2 complete sentences. Fill the space. This is where you add context, specificity, or drama. AIM FOR 70-90% of maxChars.
- label         : 2-4 word category tag. ALL CAPS. e.g. "WILD FACT", "PRO TIP", "DID YOU KNOW". Specific and relevant — not generic.
- tagline       : Short punchy phrase with personality — like a brand slogan. AIM FOR 70-90% of maxChars.
- stat          : Number + unit ONLY. e.g. "73%", "10X", "$1.2M", "3X faster", "10,000+". Never a sentence.
- quote         : A full quote with impact. At least 10-15 words. Should feel worth reading. AIM FOR 70-90% of maxChars.
Asset roles:
- primary_asset   : Main visual — specific, photographable, cinematic. No abstract concepts.
- secondary_asset : Secondary visual — complements primary, specific and concrete.
- asset_1/2/3/4  : Additional asset slots — each a distinct, specific photographable scene.
`.trim();

const ZONE_FILLING_RULES = `
ZONE FILLING RULES — critical, the AI is currently too conservative:
- headline zones (maxChars 20-35): Use ALL the space. Short punchy phrases, capitalize for impact. Never just 1-2 words unless it's a stat.
- subtext zones (maxChars 45-70): Write 1-2 complete sentences. Fill the space. This is supporting detail, make it count.
- label zones (maxChars 15-20): 2-4 words max, but make them specific and relevant — not generic tags.
- tagline zones (maxChars 15-25): A short punchy phrase with personality. Not a description.
- quote zones (maxChars 75-90): A full quote with impact. At least 10-15 words. Should feel like something worth reading.
- stat zones (maxChars 8-10): Number + unit only. Examples: '94%', '$1.2M', '3X faster', '10,000+'.
- Never leave a zone with just 1-2 words when maxChars allows much more.
- Never truncate mid-sentence — complete every thought.
- The maxChars is a ceiling, not a target — but content should use the space meaningfully (70-90%).
- Bad example: subtext with maxChars 65 filled with "Very surprising fact." — 3 words. WRONG.
- Good example: subtext with maxChars 65 filled with "Nokia once owned 40% of the mobile market before losing it all in just 5 years." CORRECT.
- Bad example: headline with maxChars 28 filled with "Nokia" — 1 word. WRONG.
- Good example: headline with maxChars 28 filled with "The Fall of Nokia" — specific, fills space. CORRECT.
- Match the niche voice and beat intent when writing zone content.
- For the same beat, all zones should feel like they belong together — consistent voice and message.
`.trim();

const CRITICAL_RULES = `
CRITICAL RULES:
- NEVER exceed maxChars for ANY text zone — count carefully
- NEVER split a sentence mid-word or awkwardly — rewrite to fit naturally
- headline/tagline zones: rewrite spoken text as short punchy headline, NOT a literal split
- stat zones: extract ONLY the number/metric. If no number, use one impactful word like "NOW" or "—". NEVER put a sentence in a stat zone.
- label zones: create a specific 2-4 word context tag (e.g. "WILD FACT", "THE TRUTH", "DID YOU KNOW")
- quote zones: write as a natural full quote or sentence, never clipped mid-thought
- asset prompt zones (primary_asset, secondary_asset, asset_1/2/3/4): specific, real-world, photographable scenes. No vague abstractions.
- Each beat should feel DISTINCT from adjacent beats
- Preserve the emotional intent of each beat (shock, curiosity, proof, etc.)
- Do NOT include quotation marks in text content
- If a label zone has no obvious tag, use the intent as a tag (e.g. "REVEALED", "PROOF", "FACT")
`.trim();

function buildZoneContentPrompt(beatsPayload, videoDNA) {
  const niche = videoDNA?.niche || "entertainment";
  return `You are a creative director filling zone content for short-form vertical video beats (TikTok/Reels style).
Your job is to write content that feels like a designer + copywriter pair worked on it — not an AI placeholder.

VIDEO CONTEXT:
- Niche: ${niche}
- Typography: ${videoDNA?.typographySystem || "brutal"}
- Tone: bold, direct, punchy — match the ${niche} niche voice throughout

${ZONE_ROLE_GUIDE}

${ZONE_FILLING_RULES}

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
        role: z.role || "primary_asset",
      }));

    // decorative and icon zones are skipped — they don't need AI content

    return {
      beatIndex:  i,
      spoken:     beat.spoken,
      intent:     beat.intent,
      energy:     beat.energy,
      topic,
      niche:      videoDNA?.niche || "entertainment",
      textZones,
      assetZones,
    };
  }).filter(Boolean);

  const prompt = buildZoneContentPrompt(beatsPayload, videoDNA);

  const response = await serverFetch("/api/generate", {
    method: "POST",
    body:   JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error(`Zone content AI call failed: ${response.status}`);
  }

  const data    = await response.json();
  const rawText = data.text || data.content || JSON.stringify(data);

  return parseZoneContentResponse(rawText);
}
