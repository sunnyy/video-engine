/**
 * scriptGenerator.js
 * src/services/ai/promoVideo/v2/scriptGenerator.js
 *
 * Generates one continuous full_script + scene array for a v2 promo video.
 * Scene durations are intent-driven budgets; actual timing comes from Whisper
 * transcription of the single voiceover in pipelineOrchestrator.
 */

import { openai } from "../../../../server/middleware/shared.js";

const INTENT_DURATIONS = {
  hook:        2.5,
  frustration: 4.0,
  benefit:     3.5,
  feature:     5.0,
  process:     6.0,
  statistic:   3.5,
  proof:       3.5,
  comparison:  4.5,
  list:        4.0,
  statement:   3.0,
  cta:         2.5,
};

export const INTENT_SEQUENCES = {
  1: ["standalone"],
  3: ["hook", "solution", "cta"],
  5: ["hook", "frustration", "solution", "feature", "cta"],
};

const SCENE_WORD_BUDGETS = {
  standalone:  { duration: 8,   words: 32 },
  hook:        { duration: 4,   words: 16 },
  frustration: { duration: 5,   words: 20 },
  solution:    { duration: 4,   words: 16 },
  benefit:     { duration: 4,   words: 16 },
  process:     { duration: 6,   words: 24 },
  feature:     { duration: 5,   words: 20 },
  proof:       { duration: 4,   words: 16 },
  comparison:  { duration: 5,   words: 20 },
  cta:         { duration: 4,   words: 16 },
};

const INTENT_DESCRIPTIONS = {
  standalone:  "complete self-contained video in one scene — (1) open with the customer pain using a specific recognizable question or rapid-fire list, (2) introduce the product by name as the direct solution, (3) end with a clear energetic CTA. All three beats in one flowing script. The product name must appear at least once. Never leave the viewer without knowing what the product is and what to do next.",
  hook:        "open with a specific recognizable question that signals the product category immediately — the viewer must know within 2 seconds what kind of product this is for. Follow with a rapid-fire list of specific painful tasks the target customer actually does. Never open with abstract mood or atmosphere.",
  frustration: "build the frustration — what makes it worse",
  solution:    "introduce the product by name — what it is, what it does, why it exists. This is the first time the product name appears in the video",
  benefit:     "one specific emotional outcome",
  process:     "show how it works, briefly",
  feature:     "one specific capability, one proof",
  proof:       "one number or metric that proves it works",
  comparison:  "before vs after, make the contrast obvious",
  cta:         "one direct energetic action — product name + call to action as a single flowing thought. No em dashes. No full stops mid-sentence.",
};

const TONE_INSTRUCTIONS = {
  professional: `TONE — PROFESSIONAL:
Write with authority and measured confidence. Credible, direct, business-appropriate language.
No casual slang. Longer, complete thoughts where needed. Still human — never corporate jargon.
Energy: calm and assured. Pace: measured. Every line should feel considered.`,
  casual: `TONE — CASUAL:
Write exactly like a founder talking to a friend. Contractions everywhere. Loose conversational rhythm.
Slang is fine. Informal phrasing is good. If it sounds like a real person, it's right.
Energy: relaxed and warm. Pace: natural speech. Never stiff.`,
  energetic: `TONE — ENERGETIC:
Maximum energy throughout. Short, sharp, punchy lines. FOMO-driven urgency in every sentence.
Imperatives everywhere. Fast pace. Like a hype reel. Make the viewer feel they're missing out right now.
Energy: electric. Pace: fast. Every word should have momentum.`,
  minimal: `TONE — MINIMAL:
Strip everything back. Only say what absolutely must be said — nothing more.
No enthusiasm markers. No filler words. No "amazing" or "powerful". Just clean precise statements.
Energy: quiet confidence. Pace: deliberate. Fewer words is always better.`,
};

function buildSystemPrompt(sceneCountInstruction, languageInstruction, tone = "professional") {
  const toneInstruction = TONE_INSTRUCTIONS[tone] ?? TONE_INSTRUCTIONS.professional;
  return `You are an elite SaaS promo video copywriter who writes scripts that make people stop scrolling.

Your job is to read a product description and write a short-form promo video script that feels human, specific, and emotionally persuasive.

Before writing anything, think through:
1. Who specifically uses this product? What does their day look like? What frustrates them?
2. What specific painful thing does this product eliminate or replace?
3. What does success feel like for this customer after using the product?

Then write the script from inside that frustration — not from a feature list.

${languageInstruction}
${toneInstruction}

SCRIPT RULES:
- Sound like a founder talking to a friend. Casual, direct, confident.
- Write in short fragments, not complete sentences. One idea per line. Like a human talking fast.
- Vary sentence length dramatically — mix very short punchy lines with slightly longer ones for rhythm.
- For problem/frustration scenes: use a rapid-fire list of specific pain points the customer recognizes from their own life. Not a paragraph — each item 2–4 words. "Writing scripts. Finding assets. Tweaking layouts. Fixing captions."
- Never list features. Never use buzzwords.
- Never say: revolutionize, unlock, game-changing, next-generation, cutting-edge, leverage, utilize.
- The product should feel like the solution, not the subject.
- Every word must earn its place. Cut anything that doesn't move the story forward.
- Read the script out loud. If it sounds like a press release, rewrite it. If it sounds like a founder venting to a friend, it's right.

PRODUCT NAME RULE:
Never mention "AI" in the script. Refer to the product by name instead.
Wrong: "AI builds your video in seconds"
Right: "[Product name] turns your topic into a finished video in seconds"
The product name must appear at least twice: once in the solution scene, once in the CTA.

SOLUTION SCENE RULE:
The solution scene introduces the product for the first time. Name it directly.
Tell the viewer what it does in one clear line, then show the relief — what changes for the customer.
Structure: "[Product] is your [what it does]. [What the customer gets]."

PUNCTUATION RULE:
- Periods: use after each complete pain point or statement. Each item in a list of frustrations gets its own period — natural breath between each one.
- Commas: use only to connect fragments that are part of the same single thought. Never for separating list items.
- Em dash (—): dramatic pause between two contrasting beats. "Stuck for hours — done in seconds."
- Question marks: perfect for opening hooks that address the viewer directly.

PAIN POINT LISTS — always use periods, never commas:
WRONG: "Writing scripts, finding stock, endless cuts, audio won't sync."
RIGHT: "Writing scripts. Finding stock. Endless cuts. Audio won't sync."

FLOWING SINGLE THOUGHTS — use commas:
RIGHT: "Just drop your topic and get a finished video, done."

CTA PUNCTUATION — never use em dash in CTA. Use a comma instead.
The CTA must read as one continuous energetic thought, not two separate statements.
WRONG: "Stop wasting hours — try Vidquence free today"
RIGHT: "Stop wasting hours, try Vidquence free today"
RIGHT: "Skip the grind, launch Vidquence now"

OUTPUT FORMAT — return only valid JSON:
{
  "full_script": "complete voiceover from start to finish as natural flowing speech",
  "scenes": [
    {
      "scene_index": 0,
      "intent": "hook",
      "duration": 3,
      "script_segment": "exact words from full_script for this scene",
      "visual_concept": "one short phrase describing the visual approach for this scene — e.g. 'typography hero — single giant statement, dark atmosphere' or 'split composition — stock photo right, pain points list left'"
    }
  ]
}

${sceneCountInstruction}

SCENE RULES:
- One beat per scene. Never combine two beats into one scene.
- script_segment values must be consecutive substrings of full_script with no gaps.
- scene intents: hook | frustration | benefit | process | feature | proof | cta

VARIETY RULE:
Every scene must have a different visual_concept. Never repeat the same compositional approach twice.
Plan the full video's visual arc before assigning concepts — ensure the sequence feels dynamic and varied.
Examples of visual_concept:
- "typography hero — single giant statement, dark atmosphere, no cards"
- "split composition — frustrated person stock photo right, pain points list left"
- "hub and spoke diagram — product center, inputs radiating outward"
- "full-bleed AI image background, headline overlay bottom third"
- "numbered steps left panel, product visual right"
- "single metric enormous centered, deep atmospheric glow"
- "product name giant with gradient, clean minimal CTA"

WORD COUNT IS MANDATORY:
Each scene's script_segment must not exceed the word limit shown. Count the words before submitting. If over limit, cut until within budget. This is not a suggestion.
Do not pad. Do not add filler sentences to reach a duration.`;
}

/**
 * generateScriptV2(project)
 * Returns { ...project, scenes, full_script, scene_format: 'v2' }
 */
export async function generateScriptV2(project) {
  const sceneCount = INTENT_SEQUENCES[project.scene_count] ? project.scene_count : 3;
  const sequence   = INTENT_SEQUENCES[sceneCount];

  const totalDuration  = sequence.reduce((s, intent) => s + (SCENE_WORD_BUDGETS[intent]?.duration ?? 3), 0);
  const structureLines = sequence.map((intent, i) => {
    const budget = SCENE_WORD_BUDGETS[intent] ?? { duration: 3, words: 8 };
    return `  Scene ${i + 1} — ${intent} (~${budget.duration}s, maximum ${budget.words} words): ${INTENT_DESCRIPTIONS[intent] ?? intent}`;
  }).join("\n");

  const sceneCountInstruction = sceneCount === 1
    ? `SCENE COUNT — MANDATORY:
Generate EXACTLY 1 scene with intent: standalone.
This is a complete self-contained video — problem, product introduction, and CTA all in one scene.
Maximum ${SCENE_WORD_BUDGETS.standalone.words} words. Target duration: ~${SCENE_WORD_BUDGETS.standalone.duration}s.
The product name must appear at least once. End with a clear call to action.
Count the words before submitting.`
    : `SCENE COUNT — MANDATORY:
Generate EXACTLY ${sequence.length} scenes. No more, no fewer.

STRUCTURE AND WORD LIMITS FOR THIS VIDEO:
${structureLines}
Total estimated duration: ~${totalDuration}s

Each scene's script_segment must stay within its word limit. Count the words.`;

  const languageInstruction =
    project.language === "hinglish" ? `LANGUAGE — HINGLISH:
Write the full_script entirely in Hinglish — the natural mix of Hindi and English with respect.
Tone: casual, energetic, relatable, FOMO-driven. Like a friend talking, not a formal voiceover.
Rules:
- Product name always in English
- Technical terms in English (video, script, caption, timeline, upload, AI, content)
- Emotion, flow, and conversational hooks in Hindi
- Never write pure formal Hindi — it must sound like how someone actually talks in a reel
- Use FOMO triggers naturally: "sab kar rahe hain", "peeche mat raho", "abhi try karo"

Example Hinglish style:
"Kya, abhi bhi hours waste kar rahe ho videos banane mein? Scripts likhna, assets dhundhna, captions fix karna — sab manually? [Product] try karo — topic daalo, video ready. Baki sab [Product] handle karega. Abhi start karo, free mein."

The full_script must be speakable naturally by an ElevenLabs multilingual voice at 1.1x speed.
`
    : project.language === "es" ? `LANGUAGE — SPANISH:
Write the full_script in conversational Latin American Spanish.
Tone: casual, energetic, direct, relatable. Like a creator talking to their audience.
Rules:
- Product name always in English
- Technical terms in English (video, script, caption, timeline, upload)
- Everything else in natural conversational Spanish
- Always use "tú" — never formal "usted"
- Use FOMO triggers naturally: "todos lo están usando", "no te quedes atrás", "pruébalo ahora"

Example Spanish style:
"¿Todavía pasas horas editando videos cortos? Escribiendo scripts, buscando assets, ajustando captions — todo a mano. [Product] lo hace por ti. Pon tu tema, el video está listo. Pruébalo gratis ahora."

The full_script must be speakable naturally by an ElevenLabs multilingual voice at 1.1x speed.
`
    : `LANGUAGE — ENGLISH:
Write the full_script in English.
`;

  const tone = project.tone ?? "professional";
  const systemPrompt = buildSystemPrompt(sceneCountInstruction, languageInstruction, tone);

  const userPrompt = `Product Name: ${project.product_name ?? "Unknown"}
Product Description: ${project.product_description ?? "Not provided"}
Tone: ${tone}
Scene Count: ${sceneCount === "auto" ? "Auto (5-7 scenes, you decide)" : sceneCount}
${sequence ? `Intent sequence to follow exactly: ${sequence.join(" → ")}` : ""}`;

  const response = await openai.chat.completions.create({
    model:       "gpt-4.1",
    temperature: 0.7,
    max_tokens:  4000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userPrompt   },
    ],
  });

  const raw = (response.choices[0].message.content ?? "").trim();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) parsed = JSON.parse(match[0]);
    else throw new Error(`scriptGenerator: JSON parse failed. GPT returned:\n${raw.slice(0, 500)}`);
  }

  // Support both new object format and legacy array format
  const full_script = typeof parsed.full_script === "string" ? parsed.full_script : null;
  const rawScenes   = Array.isArray(parsed) ? parsed
    : Array.isArray(parsed.scenes)          ? parsed.scenes
    : [];

  if (!rawScenes.length) {
    throw new Error(`scriptGenerator: no scenes found in response`);
  }

  const scenes = rawScenes.map((s, i) => ({
    scene_index:       i,
    scene_id:          i + 1,
    // spoken = script_segment so sceneDesigner still gets per-scene text for the HTML prompt
    spoken:            s.script_segment ?? s.spoken ?? "",
    script_segment:    s.script_segment ?? s.spoken ?? "",
    intent:            s.intent         ?? "statement",
    section_role:      s.section_role   ?? "body",
    mood:              s.mood           ?? null,
    headline:          s.headline       ?? null,
    subhead:           s.subhead        ?? null,
    body:              s.body           ?? null,
    stat:              s.stat           ?? null,
    label:             s.label          ?? null,
    emphasis:          s.emphasis       ?? null,
    steps:             Array.isArray(s.steps) ? s.steps : [],
    items:             Array.isArray(s.items) ? s.items : [],
    icon:              s.icon           ?? null,
    asset_requirement: s.asset_requirement ?? "none",
    asset_hint:        s.asset_hint     ?? null,
    visual_concept:    s.visual_concept  ?? null,
    // duration = intent budget; overwritten by Whisper timestamps in the orchestrator
    duration:          s.duration       ?? INTENT_DURATIONS[s.intent ?? "statement"] ?? 3.0,
    duration_seconds:  s.duration       ?? INTENT_DURATIONS[s.intent ?? "statement"] ?? 3.0,
  }));

  console.log(`[scriptGenerator] ${scenes.length} scenes for ${project.id}`);

  return {
    ...project,
    scenes,
    full_script: full_script ?? scenes.map(s => s.script_segment).join(" "),
    scene_format: "v2",
    status:       "script_generated",
    updated_at:   new Date().toISOString(),
  };
}
