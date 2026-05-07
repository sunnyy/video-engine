/**
 * generateScript.js
 * src/services/ai/generateScript.js
 *
 * ONE function, ONE GPT-4o call, complete structured video script.
 * Replaces contentGenerator.js + classifier.js + patterns.js.
 */

import { serverFetch } from "../serverApi";

export async function generateScript({ topic, niche, language, audience, tone }) {
  const lang   = (language || "english").toLowerCase();
  const aud    = audience || "general";
  const tn     = tone     || "bold";
  const ni     = niche    || "general";

  let langRule = "";
  if (lang === "hinglish") {
    langRule = `LANGUAGE: Write ALL spoken text in Hinglish — natural Hindi-English mix as spoken by Indian creators. English structure with Hindi words woven in naturally. Example: "Yaar, ye 5 cheezein tumhari life badal sakti hain." Display/label/stat fields stay in English ALL CAPS.`;
  } else if (lang === "hindi") {
    langRule = `LANGUAGE: Write ALL spoken text in Hindi (Devanagari script). Display/label fields stay in Roman ALL CAPS.`;
  } else if (lang !== "english") {
    langRule = `LANGUAGE: Write ALL spoken text in ${language}. Display/label/stat fields stay in English ALL CAPS.`;
  }

  const prompt = `You are a viral short-form video scriptwriter for TikTok/Reels/Shorts.

Write a complete video script for this topic: "${topic}"

AUDIENCE: ${aud}
TONE: ${tn}
NICHE: ${ni}
${langRule}

SCRIPT RULES:
- Hook must grab attention in first 2 seconds — direct bold statement or surprising fact. Never use fear tactics, rhetorical questions that repeat words, or cheap clickbait. State the topic directly and confidently. Bad: "Think X is safe? Think again!" Good: "Here are 5 AI tools quietly replacing video editors right now"
- Hook beat: display field = max 4 words punchy ALL CAPS hook phrase. sub field = the full topic title written naturally, max 10 words. This sub field will appear as a subtitle under the hook phrase on screen.
- Each beat spoken text = 1-2 sentences maximum, natural speech
- Item beats: state the item directly and specifically — no vague generalities
- For listicle item beats, number field starts at "01" for the first item beat. The hook beat is never counted. Increment sequentially: 01, 02, 03… based on item order only
- Fact beats: must contain a real specific fact with a number, date, or name — never invented
- Stat beats: only use stats explicitly mentioned in item/fact spoken text — never invent percentages
- CTA: earn it — reference what was just shown, not generic "follow me"
- CTA beats must always have image_needed: false and asset_prompt: null
- Total beats: 6-10 maximum
- entity field: ONLY set when the beat is specifically about a named real product, person, brand, or place. Must be the exact real name. Set to null for all other beats.
- display: max 4 words, ALL CAPS, punchy — this is the big text on screen
- sub: max 10 words, completes or contrasts the display text
- asset_prompt: describe a specific real-world photographable scene. Never echo the spoken text. Never describe a logo or brand icon.
  Good: "laptop screen showing ChatGPT interface with chat bubbles"
  Bad: "AI tools replacing creators, futuristic"
- When an item beat has entity set, asset_prompt must describe a real scene showing the tool or product in use — never a logo or icon. Example: "person using Runway ML interface on a laptop screen, professional video editing setup"

PATTERN SELECTION:
- If topic is a list ("5 tools", "top 3", "N facts") → use "listicle"
  Beat sequence: hook, item×N, [stat after items if data exists], cta
- If topic is a story/history ("story of X", "rise and fall", "how X lost") → use "story"
  Beat sequence: hook, setup, conflict, escalate, reveal, ending, cta
- If topic is a question/explanation ("why X", "what happens if", "how does X work") → use "explainer"
  Beat sequence: hook, explanation×3-5, insight, cta
- If topic is opinion/viral ("why X goes viral", "the truth about X", "nobody talks about X") → use "viral"
  Beat sequence: hook, claim, proof, contrast, punchline, cta

Return ONLY valid JSON matching this exact schema. No markdown, no explanation:
{
  "niche": "detected or provided niche",
  "pattern": "listicle|story|explainer|viral",
  "beats": [
    {
      "type": "hook|item|fact|stat|explanation|reveal|contrast|cta",
      "spoken": "exact natural speech words for TTS",
      "display": "SHORT CAPS",
      "sub": "supporting line",
      "entity": "ExactName or null",
      "number": "01 or null",
      "stat": "real number/% or null",
      "label": "CATEGORY or null",
      "image_needed": true,
      "asset_prompt": "specific photographable scene or null"
    }
  ]
}`;

  const res = await serverFetch("/api/generate", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) throw new Error(`Script generation failed: ${res.status}`);

  const data = await res.json();

  if (!Array.isArray(data?.beats) || data.beats.length === 0) {
    throw new Error("Script generation returned no beats");
  }

  return {
    niche:   data.niche   || ni,
    pattern: data.pattern || "viral",
    beats:   data.beats,
  };
}
