/**
 * scriptGenerator.js
 * src/services/ai/promoVideo/v2/scriptGenerator.js
 *
 * GPT-4.1 acts as creative director + copywriter: it reads a product and decides
 * the narrative angle and beat structure that best sell THAT product (no fixed
 * funnel template), then writes one continuous full_script + scene array.
 * Scene durations are soft budgets; actual timing comes from Whisper
 * transcription of the single voiceover in pipelineOrchestrator.
 */

import { openai } from "../../../server/middleware/shared.js";

const INTENT_DURATIONS = {
  hook:        4.0,
  problem:     5.0,
  solution:    4.0,
  benefit:     4.0,
  feature:     5.0,
  process:     6.0,
  proof:       4.0,
  cta:         4.0,
  standalone:  8.0,
};

// Kept for parseCustomScript (user-provided scripts) and any legacy callers.
export const INTENT_PATTERNS = {
  1: [
    { name: 'standalone', intents: ['standalone'], tone: 'Complete story in one scene — pain, product, CTA.' },
  ],
  3: [
    { name: 'classic',       intents: ['hook', 'solution', 'cta'],    tone: 'Pain opens the story, product is the answer, CTA closes it.' },
    { name: 'product_first', intents: ['solution', 'benefit', 'cta'], tone: 'Lead with the product confidently. Skip the pain setup. Show what it does and what the viewer gets.' },
    { name: 'challenge',     intents: ['hook', 'benefit', 'cta'],     tone: 'Open with a direct challenge or provocative question to the viewer. Skip naming the product until benefit scene.' },
  ],
  5: [
    { name: 'full_arc',     intents: ['hook', 'problem', 'solution', 'benefit', 'cta'],   tone: 'Classic narrative. Pain → deepen pain → product reveal → outcome → action.' },
    { name: 'product_led',  intents: ['solution', 'benefit', 'feature', 'proof', 'cta'], tone: 'No pain setup. Lead with the product, show the outcome, prove it works, drive action.' },
    { name: 'early_reveal', intents: ['hook', 'solution', 'feature', 'benefit', 'cta'],  tone: 'Quick pain hook, then reveal the product early. Spend more time on what it does.' },
    { name: 'deep_problem', intents: ['problem', 'hook', 'solution', 'benefit', 'cta'],  tone: 'Start deep in the problem, use the hook to make it personal, then reveal the product as relief.' },
  ],
  7: [
    { name: 'full_funnel',        intents: ['hook', 'problem', 'solution', 'benefit', 'feature', 'proof', 'cta'],  tone: 'Complete funnel. Awareness → pain → product → outcome → capability → proof → action.' },
    { name: 'product_first_full', intents: ['solution', 'benefit', 'feature', 'proof', 'hook', 'problem', 'cta'], tone: 'Confident product-first open. Show the product working before explaining the pain it solves.' },
    { name: 'early_reveal_full',  intents: ['hook', 'solution', 'feature', 'benefit', 'proof', 'problem', 'cta'], tone: 'Hook the viewer, reveal product early, build desire, then remind them of the pain they had before.' },
    { name: 'double_problem',     intents: ['problem', 'hook', 'solution', 'feature', 'benefit', 'proof', 'cta'], tone: 'Double down on pain before revealing the product. For cold audiences who need convincing they have a problem.' },
  ],
};

// Legacy flat export for any callers that still reference INTENT_SEQUENCES
export const INTENT_SEQUENCES = Object.fromEntries(
  Object.entries(INTENT_PATTERNS).map(([k, patterns]) => [k, patterns[0].intents])
);

export const SCENE_WORD_BUDGETS = {
  hook:       { duration: 4, words: 16 },
  problem:    { duration: 5, words: 20 },
  solution:   { duration: 4, words: 16 },
  benefit:    { duration: 4, words: 16 },
  feature:    { duration: 5, words: 20 },
  process:    { duration: 6, words: 24 },
  proof:      { duration: 4, words: 16 },
  cta:        { duration: 4, words: 16 },
  standalone: { duration: 8, words: 32 },
};

export const INTENT_DESCRIPTIONS = {
  hook:       'Open with a specific recognizable question or statement that signals the product category instantly.',
  problem:    'Deepen the pain with specific tasks or scenarios the target customer lives through daily.',
  solution:   'Introduce the product by name. One clear line on what it does. Show the relief.',
  benefit:    'One clear customer outcome — what the customer gets, not what the product does.',
  feature:    'One specific capability shown in action. Concrete, visual, demonstrable.',
  process:    'Show how it works step by step. Simple, fast, logical.',
  proof:      'Social proof, numbers, or results. Real and specific.',
  cta:        'One direct energetic action — product name + call to action as a single flowing thought.',
  standalone: 'Complete self-contained video: pain, product by name, and CTA in one flowing script.',
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
  return `You are an elite creative director and SaaS promo video copywriter who writes scripts that make people stop scrolling.

You read a product and decide — like a creative director — the single best way to tell ITS story. You are NOT filling a fixed funnel template.

STEP 1 — THINK LIKE A DIRECTOR (before writing):
1. Who specifically uses this product? What does their day look like? What frustrates them?
2. What painful thing does this product eliminate or replace?
3. What does success feel like for this customer after using it?
4. What is the most compelling ANGLE for THIS product? Pain-led story, confident product-first reveal, a bold provocative claim, a transformation, a "you're doing it wrong" hook, a fast demo… Choose the angle that fits this product — not a default.

STEP 2 — DESIGN THE SCRIPT AROUND THAT ANGLE:
- YOU decide the beats, their order, and how many scenes (within the requested count).
- There is NO mandatory opening or closing beat. A CTA close is common for promos but optional if another ending lands harder.
- Give each scene a short intent keyword in your own words (e.g. "hook", "pain", "reveal", "outcome", "proof", "demo", "cta" — invent what fits the story).
- Write from inside the customer's frustration, never from a feature list.

HOOK OPENING RULE — the first scene is special:
- The opening line must be a relatable, second-person question or statement about the ACTIVITY / job-to-be-done at a HIGH level — the thing the viewer is tired of doing.
  RIGHT: "Still editing every video by hand?" / "Tired of making videos manually?" / "Spending hours producing one short video?"
  WRONG (do NOT open with a list of micro-tasks): "Writing scripts. Finding assets. Tweaking timelines. Fixing captions."
- Name the broad pain the viewer instantly recognizes — not the granular sub-tasks. Within 2 seconds the viewer must know what kind of product this is for.
- Never abstract or poetic. Never a feature. Never a task checklist.
- The rapid-fire list of granular pain points belongs in a LATER problem/pain scene — never in the hook.

${languageInstruction}
${toneInstruction}

SCRIPT RULES:
- Sound like a founder talking to a friend. Casual, direct, confident.
- Write in short fragments, not complete sentences. One idea per line. Like a human talking fast.
- Vary sentence length dramatically — mix very short punchy lines with slightly longer ones for rhythm.
- In a problem/pain scene (AFTER the hook — never the opening line): use a rapid-fire list of specific pain points the customer recognizes. Each item 2–4 words. "Writing scripts. Finding assets. Tweaking layouts. Fixing captions."
- Never list features. Never use buzzwords.
- Never say: revolutionize, unlock, game-changing, next-generation, cutting-edge, leverage, utilize.
- The product should feel like the solution, not the subject.
- Every word must earn its place. Read it out loud — if it sounds like a press release, rewrite it.

PRODUCT NAME RULE:
Never mention "AI" in the script. Refer to the product by name instead.
Wrong: "AI builds your video in seconds"
Right: "[Product name] turns your topic into a finished video in seconds"
The product name must appear at least twice across the script — once when you reveal the product, once in the closing action.

PRODUCT REVEAL:
Whenever you first introduce the product, name it directly and say what it does in one clear line, then show the relief — what changes for the customer.

PUNCTUATION RULE:
- Periods: use after each complete pain point or statement. Each item in a list of frustrations gets its own period — natural breath between each one.
- Commas: use only to connect fragments that are part of the same single thought. Never for separating list items.
- Em dash (—): dramatic pause between two contrasting beats. "Stuck for hours — done in seconds."
- Question marks: perfect for opening hooks that address the viewer directly.

PAIN POINT LISTS (problem scene only, never the hook) — always use periods, never commas:
WRONG: "Writing scripts, finding stock, endless cuts, audio won't sync."
RIGHT: "Writing scripts. Finding stock. Endless cuts. Audio won't sync."

FLOWING SINGLE THOUGHTS — use commas:
RIGHT: "Just drop your topic and get a finished video, done."

CTA PUNCTUATION — never use em dash in CTA. Use a comma instead.
The CTA must read as one continuous energetic thought, not two separate statements.
WRONG: "Stop wasting hours — try Vidquence free today"
RIGHT: "Stop wasting hours, try Vidquence free today"

PER-SCENE CREATIVE BRIEF:
For each scene, brief the art director who will design the frame:
- intent: your keyword for this scene's job.
- creative_brief: 1–2 sentences — what this scene DOES narratively AND how it should LOOK and FEEL (focal point, energy, motion feeling). This is the most important field; be vivid and specific.
- script_segment: the spoken words for this scene (consecutive substring of full_script, no gaps).
- wants_product_visual: true if this scene should SHOW the actual product (a screenshot / UI), false otherwise. You decide per beat — typically true when revealing the product, showing a feature, or demoing; false for pure pain, hook, or CTA moments.

OUTPUT FORMAT — return only valid JSON:
{
  "creative_direction": "one sentence: the angle you chose and why it fits this product",
  "full_script": "complete voiceover from start to finish as natural flowing speech",
  "scenes": [
    {
      "scene_index": 0,
      "intent": "hook",
      "creative_brief": "what this scene does narratively + how it looks and feels",
      "script_segment": "exact words from full_script for this scene",
      "wants_product_visual": false,
      "duration_seconds": 4
    }
  ]
}

${sceneCountInstruction}

PACING:
- One beat per scene. Never combine two beats into one scene.
- script_segment values must be consecutive substrings of full_script with no gaps.
- Keep each spoken segment tight — roughly 10–20 words. Do not pad to reach a duration.

VISUAL VARIETY:
Plan the video's visual arc so consecutive scenes don't look identical. Vary composition where it serves the story — never force variety that hurts clarity.`;
}

/**
 * generateScriptV2(project)
 * Returns { ...project, scenes, full_script, scene_format: 'v2' }
 */
export async function generateScriptV2(project) {
  const requested   = project.scene_count;
  const isAuto      = requested === "auto" || requested == null;
  const targetCount = isAuto ? null : (parseInt(requested, 10) || 3);

  const sceneCountInstruction = targetCount === 1
    ? `SCENE COUNT — MANDATORY:
Generate EXACTLY 1 self-contained scene with intent "standalone".
Pain, product introduction by name, and a clear call to action — all in one flowing script.
Maximum ${SCENE_WORD_BUDGETS.standalone.words} words. Target duration: ~${SCENE_WORD_BUDGETS.standalone.duration}s.`
    : targetCount
      ? `SCENE COUNT — MANDATORY:
Generate EXACTLY ${targetCount} scenes. No more, no fewer.
YOU decide the beats and their order — design the structure that best sells THIS product.`
      : `SCENE COUNT:
Choose the number of scenes that best fits this product — between 3 and 7.
YOU decide the beats and their order — design the structure that best sells THIS product.`;

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

Example Hinglish style (note the hook opens with a relatable high-level question, NOT a task list — the task list comes later as the problem beat):
"Abhi bhi har video manually edit kar rahe ho? Ghanton ka kaam. Scripts likhna. Assets dhundhna. Captions fix karna. [Product] try karo — topic daalo, video ready. Baki sab [Product] handle karega. Abhi start karo, free mein."

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

Example Spanish style (note the hook opens with a relatable high-level question, NOT a task list — the task list comes later as the problem beat):
"¿Todavía editas cada video a mano? Horas de trabajo. Escribir scripts. Buscar assets. Ajustar captions. [Product] lo hace por ti. Pon tu tema, el video está listo. Pruébalo gratis ahora."

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
Scene Count: ${isAuto ? "Auto — you decide (3–7 scenes)" : targetCount}`;

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

  const scenes = rawScenes.map((s, i) => {
    const brief = s.creative_brief ?? s.visual_concept ?? null;
    return {
      scene_index:       i,
      scene_id:          i + 1,
      // spoken = script_segment so sceneDesigner still gets per-scene text for the HTML prompt
      spoken:            s.script_segment ?? s.spoken ?? "",
      script_segment:    s.script_segment ?? s.spoken ?? "",
      intent:            s.intent         ?? "scene",
      creative_brief:    brief,
      wants_product_visual: s.wants_product_visual === true,
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
      archetype:         s.archetype       ?? null,
      visual_concept:    brief,
      // duration = soft budget; overwritten by Whisper timestamps in the orchestrator
      duration:          s.duration       ?? INTENT_DURATIONS[s.intent] ?? 4.0,
      duration_seconds:  s.duration       ?? INTENT_DURATIONS[s.intent] ?? 4.0,
    };
  });

  const creativeDirection = typeof parsed.creative_direction === "string" && parsed.creative_direction.trim()
    ? parsed.creative_direction.trim()
    : null;

  console.log(`[scriptGenerator] ${scenes.length} scenes for ${project.id}`);
  if (creativeDirection) console.log(`[scriptGenerator] direction: ${creativeDirection}`);

  return {
    ...project,
    scenes,
    full_script: full_script ?? scenes.map(s => s.script_segment).join(" "),
    scene_format:      "v2",
    pattern_name:      "director",
    pattern_tone:      creativeDirection,
    creative_direction: creativeDirection,
    status:            "script_generated",
    updated_at:        new Date().toISOString(),
  };
}

// ── Narration-only generation (beat pipeline) ──────────────────────────────────
// Writes ONE continuous voiceover, with no scene split. The visual director
// segments it into timed beats AFTER the voiceover is generated.

function buildLanguageInstruction(language) {
  if (language === "hinglish") return `LANGUAGE — HINGLISH:
Write the entire script in Hinglish (natural Hindi+English in Roman script). Casual, energetic, FOMO-driven.
Product name and technical terms (video, script, caption, timeline, upload, content) stay in English. Emotion and flow in Hindi.
Never pure formal Hindi — sound like how someone actually talks in a reel.`;
  if (language === "es") return `LANGUAGE — SPANISH:
Write the entire script in conversational Latin American Spanish. Casual, energetic, direct. Always "tú", never "usted".
Product name and technical terms (video, script, caption, timeline, upload) stay in English.`;
  return `LANGUAGE — ENGLISH:\nWrite the entire script in English.`;
}

/**
 * generateNarration(project)
 * Returns { full_script, creative_direction, projectName }.
 * The script is a single continuous voiceover — NOT split into scenes.
 */
export async function generateNarration(project) {
  const tone            = project.tone ?? "professional";
  const languageInstruction = buildLanguageInstruction(project.language);

  // Soft length target — scale words to a ~25–40s read unless the project hints otherwise.
  const targetSeconds = Number(project.target_duration) || 32;
  const targetWords   = Math.round((targetSeconds / 60) * 150); // ~150 wpm

  const systemPrompt = `You are an elite creative director and SaaS promo video copywriter who writes scripts that make people stop scrolling.

You read a product and decide — like a creative director — the single best ANGLE to tell ITS story (pain-led, confident product-first reveal, a bold provocative claim, a transformation, a fast demo…). Choose the angle that fits THIS product, not a default.

Then write ONE continuous voiceover script — natural flowing speech from first word to last. Do NOT split it into scenes or label sections. Just the spoken narration.

${languageInstruction}
Write in a ${tone} tone — interpret naturally what that means for THIS product and audience. Own the voice; don't follow a formula.

HOOK OPENING — the first line is special:
- Open at a HIGH level on the activity / job the viewer is tired of, in a way they instantly recognize (a relatable question or statement). Do NOT open with a granular list of micro-tasks — save any rapid-fire pain list for later in the script.

SCRIPT PRINCIPLES:
- Sound like a real person talking, not marketing copy. Short fragments, one idea per breath, varied sentence length for rhythm.
- Lead with feeling and outcome, not a feature list. Avoid generic marketing buzzwords and clichés.
- The product should feel like the solution, not the subject.

PRODUCT NAME RULE:
Never mention "AI". Refer to the product by name. The product name must appear at least twice — once when you reveal the product, once in the closing action.

PUNCTUATION (controls TTS pacing):
- Periods after each complete pain point or statement. In a pain list, each item gets its own period.
- Commas only to connect fragments within one continuous thought — never to separate list items.
- Em dash for a dramatic pause between two contrasting beats. Question marks for direct-address hooks.
- In the CTA never use an em dash — use a comma for one continuous energetic thought.

LENGTH: aim for roughly ${targetWords} words (~${targetSeconds}s spoken). Tight, no padding.

OUTPUT — valid JSON only:
{
  "creative_direction": "one sentence: the angle you chose and why it fits this product",
  "projectName": "short 3–6 word title capturing the core idea",
  "full_script": "the complete continuous voiceover"
}`;

  // When the product was scraped from a URL, ground the script in the real page copy
  // so the voiceover speaks the actual product's language, claims, and features.
  const h = project._harvest;
  const grounding = h ? `

REAL PRODUCT PAGE — ground the script in this; use the product's actual language, claims, and features, don't invent:
${h.title ? `Page title: ${h.title}\n` : ""}${h.description ? `Tagline: ${h.description}\n` : ""}${h.headlines?.length ? `Headlines: ${h.headlines.slice(0, 8).join(" | ")}\n` : ""}${h.bullets?.length ? `Features: ${h.bullets.slice(0, 10).join(" | ")}\n` : ""}${h.bodyText ? `Page text (excerpt): ${h.bodyText.slice(0, 1200)}` : ""}` : "";

  // Optional user-provided angle/notes — steer the script toward this direction.
  const noteLine = project.product_notes ? `\nUSER'S ANGLE / NOTES (prioritize this direction): ${project.product_notes}` : "";

  const userPrompt = `Product Name: ${project.product_name ?? "Unknown"}
Product Description: ${project.product_description ?? "Not provided"}
Tone: ${tone}${noteLine}${grounding}`;

  const response = await openai.chat.completions.create({
    model:       "gpt-4.1",
    temperature: 0.7,
    max_tokens:  1500,
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
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
    else throw new Error(`generateNarration: JSON parse failed\n${raw.slice(0, 300)}`);
  }

  const full_script = typeof parsed.full_script === "string" ? parsed.full_script.trim() : "";
  if (!full_script) throw new Error("generateNarration: empty full_script");

  const creative_direction = typeof parsed.creative_direction === "string" && parsed.creative_direction.trim()
    ? parsed.creative_direction.trim() : null;
  const projectName = typeof parsed.projectName === "string" && parsed.projectName.trim()
    ? parsed.projectName.trim() : null;

  console.log(`[generateNarration] ${full_script.split(/\s+/).length} words for ${project.id}`);
  if (creative_direction) console.log(`[generateNarration] direction: ${creative_direction}`);

  return { full_script, creative_direction, projectName };
}
