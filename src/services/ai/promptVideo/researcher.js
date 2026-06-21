/**
 * researcher.js
 * src/services/ai/promptVideo/researcher.js
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
const WIKI_HEADERS   = { Accept: "application/json", "User-Agent": "Vidquence/1.0" };

// ── Wikipedia grounding — real source text so facts aren't just recalled ──────
async function wikiSearchTitles(query, limit = 3) {
  try {
    const res = await fetch(`https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=${limit}`, { headers: WIKI_HEADERS });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.pages ?? []).map(p => p.title).filter(Boolean);
  } catch { return []; }
}

async function wikiExtract(title) {
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/\s+/g, "_"))}`, { headers: WIKI_HEADERS });
    if (!res.ok) return null;
    const d = await res.json();
    if (d?.type === "disambiguation" || !d?.extract) return null;
    return { title: d.title, extract: d.extract };
  } catch { return null; }
}

// Top matching articles for the prompt → their intro extracts, as ground truth.
async function fetchGrounding(prompt) {
  const titles = await wikiSearchTitles(prompt, 3);
  if (!titles.length) return "";
  const extracts = (await Promise.all(titles.map(wikiExtract))).filter(Boolean);
  if (!extracts.length) return "";
  return extracts.map(e => `## ${e.title}\n${e.extract}`).join("\n\n");
}

async function callResearch(prompt, model, grounding) {
  return openai.chat.completions.create({
    model,
    max_completion_tokens: 3000,
    response_format: { type: "json_object" },
    messages: buildMessages(prompt, grounding),
  });
}

function buildMessages(prompt, grounding) {
  const sourceBlock = grounding
    ? `\n\nSOURCE MATERIAL (real, from Wikipedia — treat as ground truth):\n${grounding}`
    : "";
  return [
      {
        role: "system",
        content: `You are a research director for a short-form video studio. Given a video request, produce a tight research brief the creative team will build from. Use your knowledge of the subject AND the SOURCE MATERIAL provided.

ACCURACY — the most important rule:
- When SOURCE MATERIAL is provided, ground your facts in it and NEVER contradict it.
- Do NOT state a specific number, date, statistic, or quote unless you are confident it is correct, or it appears in the source. When unsure, omit the specific or phrase it qualitatively ("collapsed gradually over centuries", not "fell in 476 AD when 80%…"). A wrong fact on screen is worse than a missing one.
- If the subject is obscure or you are not confident, return FEWER facts rather than fabricate.

Return ONLY valid JSON:
{
  "topic": "one-line restatement of what the video is about",
  "angle": "the most engaging framing for a short-form video (debate, countdown, reveal, story, comparison, explainer)",
  "tone": "fun | dramatic | informative | inspiring | provocative",
  "entities": [{ "name": "...", "kind": "person|company|product|place|concept", "visual_identity": "what they look like / are visually known for" }],
  "facts": ["short, true, interesting facts with numbers ONLY where you are confident — these become on-screen stats and script lines"],
  "contrasts": ["X vs Y framings inside the topic, if any"],
  "artifacts": ["concrete REAL visual artifacts the video can reference: famous moments, objects, logos, quotes, covers, datasets — each described in one line"],
  "hook_options": ["2-3 opening lines that would stop a scroll"],
  "cta_idea": "how the video should end (question to comments, follow prompt, takeaway)"
}`,
      },
      { role: "user", content: `VIDEO REQUEST:\n${prompt}${sourceBlock}` },
  ];
}

export async function researchTopic(prompt) {
  const grounding = await fetchGrounding(prompt); // "" if nothing relevant → graceful ungrounded

  // gpt-5.4 for knowledge depth; fall back to gpt-4.1 if the call itself fails
  let response;
  try {
    response = await callResearch(prompt, RESEARCH_MODEL, grounding);
  } catch (e) {
    console.warn(`[ai-video/research] ${RESEARCH_MODEL} failed (${e.message}) — falling back to gpt-4.1`);
    response = await callResearch(prompt, "gpt-4.1", grounding);
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

  console.log(`[ai-video/research] "${brief.topic}" — ${brief.entities.length} entities, ${brief.facts.length} facts, ${brief.artifacts.length} artifacts (grounded: ${grounding ? "wikipedia" : "none"})`);
  return brief;
}
