/**
 * contentGenerator.js
 * Pattern-aware content generation.
 * Each pattern has its own prompt that tells the model exactly what to produce.
 */

import { serverFetch } from "../serverApi";

const NICHE_VOICE = {
  entertainment: "conversational, punchy, uses 'you', rhetorical questions",
  finance:       "authoritative, uses specific numbers, contrarian takes",
  tech:          "precise, slightly nerdy, future-focused",
  health:        "empowering, science-backed, avoids fear-mongering",
  motivational:  "direct, no fluff, uses 'you' aggressively, action-oriented",
  education:     "curious, builds on what viewer knows, aha-moment focused",
  business:      "results-focused, ROI-minded, respects viewer's time",
  food:          "sensory language, descriptive, makes viewer hungry",
  travel:        "wanderlust-inducing, vivid scene-setting",
  sports:        "high energy, stats-driven, celebrates effort",
  gaming:        "energetic, competitive framing, hype language",
  spiritual:     "reverent but modern, poetic rhythm, metaphorical",
  lifestyle:     "relatable, aspirational, first-person feel",
  comedy:        "subverts expectations, timing-aware",
  music:         "emotional, scene-setting, artist/culture aware",
  news:          "urgent, factual",
  skincare:      "aspirational, gentle, transformation-focused",
};

const BEAT_OUTPUT_SCHEMA = `
Return ONLY a valid JSON array of beat objects — no markdown, no explanation:
[
  {
    "order": 0,
    "beatType": "hook",
    "spoken": "exact words to be spoken aloud",
    "headline": "SHORT HEADLINE — max 6 words ALL CAPS",
    "subtext": "supporting detail, max 10 words",
    "label": "CATEGORY TAG — max 12 chars ALL CAPS",
    "stat": null,
    "tagline": null,
    "quote": null,
    "cta": null,
    "intent": "shock|curiosity|proof|reveal|empathy|urgency|explanation|contrast|punchline|irony",
    "energy": 0.9,
    "visual_hint": "text_only|faces|stat|comparison|list|scene|product|none",
    "text_density": "simple|medium|rich",
    "image_count_needed": 0,
    "asset_hint": {
      "prompt": "specific photographable scene — NEVER echo spoken text words",
      "keywords": ["keyword1", "keyword2"],
      "visual_type": "abstract|entity",
      "search_query": null
    }
  }
]

ASSET HINT RULES — critical:
- prompt must describe a REAL SCENE, never echo the spoken text
- Good: "a person whispering into someone's ear, dramatic lighting, close-up"
- Bad: "Nobody is telling you this, photorealistic scene"
- If image_count_needed is 0, set asset_hint.prompt to a generic scene anyway (used as fallback)
`;

const PATTERN_PROMPTS = {

  listicle_simple: ({ topic, listCount, niche, language, audience, expandedSequence, researchContext }) => `
You are writing a viral short-form video script for a listicle.

TOPIC: ${topic}
LIST COUNT: ${listCount} items
LANGUAGE: ${language}
AUDIENCE: ${audience}
NICHE VOICE: ${NICHE_VOICE[niche] || "conversational, engaging"}
${researchContext ? `\nRESEARCH CONTEXT:\n${researchContext}` : ""}

CRITICAL RULE: You are DELIVERING the list, not talking ABOUT the list.
- Each item beat spoken text = one actual list item, stated directly and creatively
- Never say "studies show" or add statistics unless the topic is specifically about facts
- Never explain what you're about to do — just do it
- The hook spoken text MUST NOT be a question. State something directly. A question hook is a failure.

BEAT STRUCTURE — generate exactly ${expandedSequence.length} beats:
${expandedSequence.map((type, i) => {
  if (type === "hook") return `Beat 0 (hook): A punchy hook that teases the list. Max 10 words. Creates urgency to watch all items.`;
  if (type === "item") {
    const itemNum = expandedSequence.slice(0, i).filter(t => t === "item").length + 1;
    return `Beat ${i} (item #${itemNum}): State list item #${itemNum} directly. The spoken text IS the item. Short, punchy, memorable.`;
  }
  if (type === "fact") return `Beat ${i} (fact): A supporting fact or stat that reinforces the previous item. Specific number or detail.`;
  if (type === "cta") return `Beat ${i} (cta): Direct call to action. Make them WANT to follow — never say "follow for more".`;
  return `Beat ${i} (${type}): Content for this beat.`;
}).join("\n")}

For item beats:
- label: "HOOK #N" where N is the item number (e.g. "HOOK #1")
- headline: the item/hook condensed to max 5 words in ALL CAPS
- cta: hook type in one word ALL CAPS (CURIOSITY/NEGATIVE/PERSONAL/URGENCY/EMPATHY/STORY/FOMO)
- spoken: the full item stated naturally as voiceover
- stat: MUST be null — never put hook types (STORY/FOMO/CURIOSITY/NEGATIVE/PERSONAL/URGENCY/EMPATHY) in stat. stat is ONLY for real numbers/metrics (e.g. "40%", "$10M", "3X"). Item beats have no stats — always null.

${BEAT_OUTPUT_SCHEMA}
`,

  listicle_with_facts: ({ topic, listCount, niche, language, audience, expandedSequence, researchContext }) => `
You are writing a viral short-form video script for a listicle with supporting facts.

TOPIC: ${topic}
LIST COUNT: ${listCount} items
LANGUAGE: ${language}
AUDIENCE: ${audience}
NICHE VOICE: ${NICHE_VOICE[niche] || "conversational, engaging"}
${researchContext ? `\nRESEARCH CONTEXT:\n${researchContext}` : ""}

CRITICAL RULE: Each item beat IS the item — stated directly. Each fact beat adds a real specific stat or detail that makes the item more credible or surprising.
- The hook spoken text MUST NOT be a question. State something directly. A question hook is a failure.

BEAT STRUCTURE — generate exactly ${expandedSequence.length} beats:
${expandedSequence.map((type, i) => {
  if (type === "hook") return `Beat 0 (hook): Hook that teases the list. Max 10 words.`;
  if (type === "item") {
    const itemNum = expandedSequence.slice(0, i).filter(t => t === "item").length + 1;
    return `Beat ${i} (item #${itemNum}): State list item #${itemNum} directly and creatively.`;
  }
  if (type === "fact") return `Beat ${i} (fact): One specific surprising stat or detail reinforcing the previous item. Real number or name.`;
  if (type === "cta") return `Beat ${i} (cta): Earned call to action.`;
  return `Beat ${i} (${type})`;
}).join("\n")}

For item beats: label="HOOK #N", headline=item condensed to 5 words ALL CAPS, cta=hook type (CURIOSITY/NEGATIVE/PERSONAL/URGENCY/EMPATHY/STORY/FOMO), stat=null (NEVER put hook types in stat)
For fact beats: label="THE PROOF", visual_hint="stat", stat=the key number, image_count_needed=0

${BEAT_OUTPUT_SCHEMA}
`,

  facts_rapid: ({ topic, listCount, niche, language, audience, expandedSequence, researchContext }) => `
You are writing a viral rapid-fire facts video script.

TOPIC: ${topic}
FACT COUNT: ${listCount || 5}
LANGUAGE: ${language}
AUDIENCE: ${audience}
NICHE VOICE: ${NICHE_VOICE[niche] || "conversational, engaging"}
${researchContext ? `\nRESEARCH CONTEXT:\n${researchContext}` : ""}

CRITICAL RULE: Each fact beat must contain ONE real, specific, surprising fact.
- Use actual numbers, names, dates — never vague generalities
- "Popcorn kernels pop at 180°C because of a trapped water pocket" NOT "popcorn is interesting"
- Hook: the most counterintuitive fact — state it directly, don't tease it
- The hook spoken text MUST NOT be a question. State the most shocking fact directly. A question hook is a failure.
- NEVER open with "Did you know" or any question form.
- Each fact more surprising than the last

Generate exactly ${expandedSequence.length} beats:
${expandedSequence.map((type, i) => {
  if (type === "hook")    return `Beat 0 (hook): Most shocking fact stated directly.`;
  if (type === "fact")    return `Beat ${i} (fact): One specific surprising fact with a real number or detail.`;
  if (type === "insight") return `Beat ${i} (insight): Connect all facts with one surprising insight or pattern.`;
  if (type === "cta")     return `Beat ${i} (cta): CTA that feels earned from the facts shared.`;
  return `Beat ${i} (${type})`;
}).join("\n")}

For fact beats: label="FACT #N", stat=the key number if any, visual_hint="stat", image_count_needed=0

${BEAT_OUTPUT_SCHEMA}
`,

  explainer: ({ topic, niche, language, audience, expandedSequence, researchContext }) => `
You are writing a viral short-form explainer video script.

TOPIC: ${topic}
LANGUAGE: ${language}
AUDIENCE: ${audience}
NICHE VOICE: ${NICHE_VOICE[niche] || "clear, confident, slightly conversational"}
${researchContext ? `\nRESEARCH CONTEXT:\n${researchContext}` : ""}

CRITICAL RULE: Actually explain the thing. Don't talk about explaining it.
- Open with the problem/pain the viewer already has
- Walk through the actual mechanism, concept, or steps
- Each step beat: one specific actionable step, not a vague principle
- Close with the real transformation or result
- The hook spoken text MUST NOT be a question. State something directly. A question hook is a failure.
- Even if the topic itself is phrased as a question (e.g. "What happens inside a microwave"), the hook spoken text must REFRAME it as a statement — never repeat the question. Example: topic "What happens inside a microwave" → hook "What's happening inside your microwave will change how you use it forever." NOT "Ever wonder what happens inside a microwave?"

TOPIC FIDELITY — critical: The video must explain the EXACT topic given, not a subtopic or related concept. Topic "What happens inside a microwave" → explain the actual mechanism inside a microwave (magnetron, radiation, water molecules, rotation). Do NOT drift to "why food heats unevenly" or any other subtopic unless the topic explicitly asks for it.

Generate exactly ${expandedSequence.length} beats:
${expandedSequence.map((type, i) => {
  if (type === "problem") return `Beat 0 (problem): The relatable pain or question the viewer already has.`;
  if (type === "concept") return `Beat ${i} (concept): The core concept explained in one sentence. No jargon.`;
  if (type === "step") {
    const stepNum = expandedSequence.slice(0, i).filter(t => t === "step").length + 1;
    return `Beat ${i} (step #${stepNum}): One specific actionable step. Not a principle — an action.`;
  }
  if (type === "result") return `Beat ${i} (result): The transformation. What life looks like after applying this.`;
  if (type === "cta")    return `Beat ${i} (cta): Earned CTA.`;
  return `Beat ${i} (${type})`;
}).join("\n")}

${BEAT_OUTPUT_SCHEMA}
`,

  revealing: ({ topic, niche, language, audience, expandedSequence, researchContext }) => `
You are writing a viral revealing/mystery video script.

TOPIC: ${topic}
LANGUAGE: ${language}
AUDIENCE: ${audience}
NICHE VOICE: ${NICHE_VOICE[niche] || "punchy, surprising"}
${researchContext ? `\nRESEARCH CONTEXT:\n${researchContext}` : ""}

CRITICAL RULE: Withhold the answer until the reveal beat. Build genuine tension.
- Hook: tease without revealing. Open a loop that MUST be closed.
- The hook spoken text MUST NOT be a question. State something that creates tension. A question hook is a failure.
- Tension/escalate beats: raise stakes, add evidence, build curiosity — never reveal yet
- Reveal beat: the payoff. Must feel earned and surprising.
- Never resolve tension early. Never be predictable.

Generate exactly ${expandedSequence.length} beats:
${expandedSequence.map((type, i) => {
  if (type === "hook")     return `Beat 0 (hook): Tease the reveal — open a loop without closing it.`;
  if (type === "tension")  return `Beat ${i} (tension): Raise stakes. Add evidence. Build curiosity.`;
  if (type === "escalate") return `Beat ${i} (escalate): Make it worse / more surprising. Still no reveal.`;
  if (type === "reveal")   return `Beat ${i} (reveal): The payoff. Make it feel earned.`;
  if (type === "cta")      return `Beat ${i} (cta): Earned CTA.`;
  return `Beat ${i} (${type})`;
}).join("\n")}

${BEAT_OUTPUT_SCHEMA}
`,

  viral: ({ topic, niche, language, audience, expandedSequence, researchContext }) => `
You are writing a maximum-impact viral short-form video script.

TOPIC: ${topic}
LANGUAGE: ${language}
AUDIENCE: ${audience}
NICHE VOICE: ${NICHE_VOICE[niche] || "punchy, surprising, every line makes you want to hear the next"}
${researchContext ? `\nRESEARCH CONTEXT:\n${researchContext}` : ""}

CRITICAL RULE: Every beat must make the viewer think "wait, what?" Pattern interrupt every 3-4 seconds.
- Hook: maximum pattern interrupt. Say something that makes no sense until context arrives.
- The hook spoken text MUST NOT be a question. State something directly. A question hook is a failure.
- Never resolve tension early. Never be predictable.
- Satisfying payoff that reframes everything at the end.

Generate exactly ${expandedSequence.length} beats:
${expandedSequence.map((type, i) => `Beat ${i} (${type}): High-impact content for this beat type.`).join("\n")}

${BEAT_OUTPUT_SCHEMA}
`,
};

export async function generateContent({
  topic, pattern, expandedSequence, listCount,
  niche, language, audience, researchContext,
}) {
  const promptFn = PATTERN_PROMPTS[pattern] || PATTERN_PROMPTS.viral;
  const prompt = promptFn({ topic, listCount, niche, language, audience, expandedSequence, researchContext });

  const res = await serverFetch("/api/generate-content", {
    method: "POST",
    body: JSON.stringify({ prompt, expectedBeats: expandedSequence.length }),
  });

  if (!res.ok) throw new Error(`Content generation failed: ${res.status}`);
  const data = await res.json();

  if (!Array.isArray(data.beats) || data.beats.length === 0) {
    throw new Error("Content generation returned no beats");
  }

  return data.beats;
}
