/**
 * researcher.js
 * src/services/ai/aiVideo/researcher.js
 *
 * Stage 0 — subject research BEFORE anything visual exists.
 *
 * What separated the market-leading example we deconstructed from generic AI
 * video was subject specificity: the real book cover, the famous prank, the
 * actual show logos. That specificity comes from knowing the subject — this
 * stage extracts entities, facts, numbers, contrasts, and concrete VISUAL
 * ARTIFACT ideas the director can cast into beats.
 */

import { openai } from "../../../server/middleware/shared.js";

const RESEARCH_MODEL = "gpt-5.4";

async function callResearch(prompt, model) {
  return openai.chat.completions.create({
    model,
    max_completion_tokens: 3000,
    response_format: { type: "json_object" },
    messages: buildMessages(prompt),
  });
}

function buildMessages(prompt) {
  return [
      {
        role: "system",
        content: `You are a research director for a short-form video studio. Given a video request, produce a tight research brief the creative team will build from. Use your real knowledge of the subject — names, numbers, famous moments, real artifacts. Never invent facts; if the subject is obscure, say less rather than fabricate.

Return ONLY valid JSON:
{
  "topic": "one-line restatement of what the video is about",
  "angle": "the most engaging framing for a short-form video (debate, countdown, reveal, story, comparison, explainer)",
  "tone": "fun | dramatic | informative | inspiring | provocative",
  "entities": [{ "name": "...", "kind": "person|company|product|place|concept", "visual_identity": "what they look like / are visually known for" }],
  "facts": ["short, true, interesting facts with numbers where possible — these become on-screen stats and script lines"],
  "contrasts": ["X vs Y framings inside the topic, if any"],
  "artifacts": ["concrete REAL visual artifacts the video can reference: famous moments, objects, logos, quotes, covers, datasets — each described in one line"],
  "hook_options": ["2-3 opening lines that would stop a scroll"],
  "cta_idea": "how the video should end (question to comments, follow prompt, takeaway)"
}`,
      },
      { role: "user", content: `VIDEO REQUEST:\n${prompt}` },
  ];
}

export async function researchTopic(prompt) {
  // gpt-5.4 for knowledge depth; fall back to gpt-4.1 if the call itself fails
  let response;
  try {
    response = await callResearch(prompt, RESEARCH_MODEL);
  } catch (e) {
    console.warn(`[ai-video/research] ${RESEARCH_MODEL} failed (${e.message}) — falling back to gpt-4.1`);
    response = await callResearch(prompt, "gpt-4.1");
  }

  let brief;
  try {
    brief = JSON.parse(response.choices[0].message.content);
  } catch (e) {
    throw new Error(`researcher returned invalid JSON: ${e.message}`);
  }

  brief.entities  = Array.isArray(brief.entities)  ? brief.entities.slice(0, 8)   : [];
  brief.facts     = Array.isArray(brief.facts)     ? brief.facts.slice(0, 12)     : [];
  brief.contrasts = Array.isArray(brief.contrasts) ? brief.contrasts.slice(0, 4)  : [];
  brief.artifacts = Array.isArray(brief.artifacts) ? brief.artifacts.slice(0, 8)  : [];
  if (!brief.topic) brief.topic = prompt.slice(0, 120);

  console.log(`[ai-video/research] "${brief.topic}" — ${brief.entities.length} entities, ${brief.facts.length} facts, ${brief.artifacts.length} artifacts`);
  return brief;
}
