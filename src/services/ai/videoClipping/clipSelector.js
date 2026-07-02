/**
 * videoClipping/clipSelector.js — the INTELLIGENCE of the clipping service.
 *
 * Given a long video's timestamped transcript (as numbered segments), GPT-4.1 picks the best
 * self-contained moments to become viral vertical clips. It does NOT slice on a timer — it reads
 * for hooks, complete thoughts, stories, strong claims, and quotable lines, and returns only as many
 * clips as are genuinely good (nothing rigid — no fixed count). Boundaries are chosen as segment
 * indices (not raw seconds) so the model can't hallucinate invalid timestamps.
 */
import { openai } from "../../../server/middleware/shared.js";

const MODEL = "gpt-4.1";

const mmss = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};

/**
 * selectClips(segments, { minLen, maxLen, maxClips, language }) → [{ start, end, title, reason }]
 * segments: [{ start, end, spoken }] (from segmentWords). Returns clip windows in SECONDS.
 */
export async function selectClips(segments, { minLen = 20, maxLen = 60, autoLength = false, maxClips = 10, language = "en" } = {}) {
  if (!segments?.length) return [];

  const lines = segments.map((s, i) => `#${i} [${mmss(s.start)}-${mmss(s.end)}] ${s.spoken}`).join("\n");

  const system = `You are an expert short-form video editor who turns long videos (podcasts, talks, interviews, streams) into viral vertical clips. From the timestamped transcript below, select the BEST standalone moments.

RULES:
- Each clip must be SELF-CONTAINED: a complete thought, story, tip, or insight that makes sense on its own without the rest of the video. Start on a strong hook; end on a satisfying or punchy beat. NEVER cut mid-sentence.
- Prefer genuinely engaging moments: a surprising claim, a vivid story, a strong actionable tip, an emotional or funny beat, a quotable one-liner. SKIP intros, sponsor reads, filler, rambling, and dead air.
${autoLength
  ? `- LENGTH IS YOURS PER CLIP — make each clip its OWN natural length (roughly ${minLen}-${maxLen}s): a punchy one-liner can be short, a story or full explanation can run longer. Do NOT force a uniform length; end exactly where the thought lands. Vary lengths across clips.`
  : `- Target length ${minLen}-${maxLen} seconds.`}
- Choose "start_index" and "end_index" from the numbered segments (inclusive, end_index >= start_index). Clips must NOT overlap.
- Quality over quantity: return ONLY as many clips as are truly good, at most ${maxClips}. If the video has few strong moments, return few. Do not pad.
- "title" and "reason" must be in ENGLISH/Latin script${language && language !== "en" ? ` (the speaker may talk in "${language}", but titles must be English/Latin)` : ""}.

Return ONLY valid JSON:
{ "clips": [ { "start_index": 0, "end_index": 4, "title": "punchy 3-8 word title", "reason": "one line on why this hooks" } ] }`;

  const user = `TRANSCRIPT SEGMENTS (index [mm:ss] spoken text):\n${lines}\n\nSelect the best clips.`;

  const res = await openai.chat.completions.create({
    model: MODEL, max_tokens: 4000, response_format: { type: "json_object" },
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
  });

  let parsed;
  try { parsed = JSON.parse(res.choices[0].message.content); }
  catch { return []; }

  const raw = Array.isArray(parsed?.clips) ? parsed.clips : [];
  const n = segments.length;
  const out = [];
  const used = []; // [start,end] windows already taken (overlap guard)

  for (const c of raw) {
    let si = Number(c.start_index), ei = Number(c.end_index);
    if (!Number.isInteger(si) || !Number.isInteger(ei)) continue;
    si = Math.max(0, Math.min(n - 1, si));
    ei = Math.max(si, Math.min(n - 1, ei));

    let start = segments[si].start;
    let end = segments[ei].end;
    if (end - start < 5) continue;                       // too short to be a clip
    if (end - start > maxLen + 20) end = start + maxLen;  // soft clamp absurdly long picks
    if (used.some(([s, e]) => start < e && end > s)) continue; // skip overlaps

    used.push([start, end]);
    out.push({
      start:  parseFloat(start.toFixed(3)),
      end:    parseFloat(end.toFixed(3)),
      title:  String(c.title || "Clip").trim().slice(0, 80) || "Clip",
      reason: String(c.reason || "").trim().slice(0, 200),
    });
    if (out.length >= maxClips) break;
  }

  return out;
}
