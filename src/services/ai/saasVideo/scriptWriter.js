/**
 * scriptWriter.js
 * src/services/ai/saasVideo/scriptWriter.js
 *
 * Stage 2 — writes the voiceover script that executes the director's
 * scene plan. Grounded in REAL website copy from the harvester: real feature
 * names, real numbers, real claims. Never invents statistics.
 *
 * Ports the proven rules from the v2 promo script generator (word budgets,
 * TTS punctuation pacing, banned buzzwords) but the structure comes from the
 * director's plan, not a random pattern draw.
 */

import { openai } from "../../../server/middleware/shared.js";

const WRITER_MODEL = "gpt-4.1";

const TONE_RULES = {
  professional: "Confident, precise, zero fluff. Speak to a busy operator who values their time.",
  casual:       "Conversational, warm, like a founder telling a friend. Contractions welcome.",
  energetic:    "Punchy, momentum-driven, short sentences. Every line pushes forward.",
  minimal:      "Sparse and deliberate. Few words, each one earning its place. Pauses are part of the rhythm.",
};

export async function writeScript({ brief, harvest, tone = "professional", language = "en", customScript = null }) {
  // Custom script bypass — user wrote their own copy; just segment it
  if (customScript?.trim()) {
    return segmentCustomScript(customScript.trim(), brief);
  }

  const planBlock = brief.scene_plan.map(s =>
    `Scene ${s.scene_index} — intent: ${s.intent}, word budget: ${s.word_budget} words MAX, visual: ${s.visual_concept}`
  ).join("\n");

  const factsBlock = (harvest.title || harvest.headlines.length) ? `
REAL PRODUCT FACTS (scraped from the product's website — use these, never invent):
Title: ${harvest.title ?? "n/a"}
Description: ${harvest.description ?? "n/a"}
Headlines: ${harvest.headlines.slice(0, 10).join(" | ") || "n/a"}
Features: ${harvest.bullets.slice(0, 12).join(" | ") || "n/a"}
Body sample: ${harvest.bodyText.slice(0, 1800) || "n/a"}` : `
No website copy available. Write from the positioning only. Do NOT invent statistics, customer counts, or award claims.`;

  const system = `You are an elite SaaS promo video copywriter. You write voiceover scripts that sound like a human speaking, not marketing copy being read.

THE DIRECTOR'S SCENE PLAN (you must follow this structure exactly):
${planBlock}

PRODUCT: ${brief.product_name}
POSITIONING: ${brief.positioning}
NICHE: ${brief.niche}
TONE: ${tone} — ${TONE_RULES[tone] ?? TONE_RULES.professional}
LANGUAGE: ${language === "en" ? "English" : language}

GROUNDING RULES:
- Use real feature names and real numbers from the product facts below when they exist.
- NEVER invent statistics, user counts, ratings, or "trusted by" claims.
- The product name appears ONLY in the solution scene (first reveal) and the cta scene. Nowhere else.

WRITING RULES:
- WORD BUDGETS ARE HARD LIMITS. Count the words per scene. Over budget = failure.
- Each scene's segment must flow naturally into the next — the full script is ONE continuous narration.
- script_segment values must be exact consecutive substrings of full_script with no gaps and no overlaps.
- Forbidden words: revolutionary, game-changing, next-gen, cutting-edge, unlock, leverage, seamless, supercharge, empower.
- TTS pacing: periods between list items (not commas), em-dashes for contrast beats, a comma before the CTA verb.
- The hook never mentions the product name. It names the pain or the prize.

Return ONLY valid JSON:
{
  "full_script": "the complete narration, flowing naturally start to finish",
  "scenes": [
    { "scene_index": 0, "script_segment": "exact consecutive substring of full_script" }
  ]
}
${factsBlock}`;

  const wordCount = (s) => (s ?? "").trim().split(/\s+/).filter(Boolean).length;

  const messages = [
    { role: "system", content: system },
    { role: "user",   content: `Write the script for all ${brief.scene_plan.length} scenes.` },
  ];

  let scenes = null;
  let fullScript = null;

  // Budget enforcement: one corrective rewrite if any scene blows its word
  // budget by >25% — over-budget scenes become long static scenes downstream.
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await openai.chat.completions.create({
      model: WRITER_MODEL,
      max_tokens: 2200,
      response_format: { type: "json_object" },
      messages,
    });

    let out;
    try {
      out = JSON.parse(response.choices[0].message.content);
    } catch (e) {
      throw new Error(`script writer returned invalid JSON: ${e.message}`);
    }
    if (!out.full_script || !Array.isArray(out.scenes) || out.scenes.length === 0) {
      throw new Error("script writer returned an incomplete result");
    }

    // Merge segments onto the director's plan (plan is the source of truth for structure)
    const merged = brief.scene_plan.map((planScene, i) => ({
      ...planScene,
      script_segment: out.scenes.find(s => s.scene_index === i)?.script_segment
        ?? out.scenes[i]?.script_segment
        ?? "",
    })).filter(s => s.script_segment.trim().length > 0);

    if (merged.length === 0) throw new Error("script writer produced no usable scene segments");

    const overBudget = merged.filter(s => wordCount(s.script_segment) > Math.ceil(s.word_budget * 1.25));

    scenes     = merged;
    fullScript = out.full_script;

    if (overBudget.length === 0 || attempt === 2) {
      if (overBudget.length > 0) {
        console.warn(`[saas/script] ${overBudget.length} scene(s) still over budget after rewrite — accepting (${overBudget.map(s => `s${s.scene_index}:${wordCount(s.script_segment)}w/${s.word_budget}w`).join(", ")})`);
      }
      break;
    }

    console.log(`[saas/script] over budget: ${overBudget.map(s => `scene ${s.scene_index} (${wordCount(s.script_segment)}w, budget ${s.word_budget}w)`).join(", ")} — requesting rewrite`);
    messages.push({ role: "assistant", content: JSON.stringify(out) });
    messages.push({
      role: "user",
      content: `REJECTED — word budgets violated:\n${overBudget.map(s => `Scene ${s.scene_index}: ${wordCount(s.script_segment)} words, budget is ${s.word_budget} MAX`).join("\n")}\n\nRewrite the COMPLETE script. Cut the over-budget scenes down to their budgets — shorter sentences, cut adjectives, one idea per scene. Do not pad other scenes. Same JSON format.`,
    });
  }

  console.log(`[saas/script] ${scenes.length} scenes, ${wordCount(fullScript)} words total`);
  return { full_script: fullScript, scenes };
}

// ── Custom script path — split user copy across the planned scenes ──────────

function segmentCustomScript(script, brief) {
  const sentences = script.match(/[^.!?]+[.!?]+["']?\s*/g) ?? [script];
  const n = brief.scene_plan.length;
  const perScene = Math.max(1, Math.ceil(sentences.length / n));

  const scenes = brief.scene_plan.map((planScene, i) => {
    const seg = sentences.slice(i * perScene, (i + 1) * perScene).join("").trim();
    return { ...planScene, script_segment: seg };
  }).filter(s => s.script_segment.length > 0);

  console.log(`[saas/script] custom script segmented into ${scenes.length} scenes`);
  return { full_script: script, scenes };
}
