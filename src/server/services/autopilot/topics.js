/**
 * autopilot/topics.js — the AutoPilot topic queue. Self-contained: it knows nothing about
 * rendering, publishing, calendars, OAuth, or jobs. It only answers "give me the next best
 * topic for this user" and keeps the queue topped up.
 *
 * Strategy: user picks niche(s) → AI internally derives content pillars (never surfaced)
 * → generates topics → keep 10-20 queued, refilling to 20 when it drops below 10.
 * Reservation prevents two workers grabbing the same topic. Dedup is heuristic (title +
 * keyword overlap + angle vs history/queue); embeddings can be added later.
 */
import { supabaseAdmin, openai } from "../../middleware/shared.js";
import { getSettings } from "./settings.js";

const MIN_QUEUE = 10;
const TARGET_QUEUE = 20;
const MODEL = "gpt-4.1";

const normalize = (t) => String(t || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const kwSet = (a) => new Set((a || []).map((k) => String(k).toLowerCase().trim()).filter(Boolean));
function kwOverlap(a, b) {
  const A = kwSet(a), B = kwSet(b);
  if (!A.size || !B.size) return 0;
  let n = 0; for (const x of A) if (B.has(x)) n++;
  return n / Math.min(A.size, B.size);
}
function isDuplicate(cand, existing) {
  const ct = normalize(cand.title);
  for (const e of existing) {
    if (!e) continue;
    if (normalize(e.title) === ct) return true;
    if ((e.angle || "") === (cand.angle || "") && kwOverlap(cand.keywords, e.keywords) >= 0.6) return true;
  }
  return false;
}

export async function getQueuedCount(userId) {
  const { count, error } = await supabaseAdmin.from("autopilot_topics")
    .select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "queued");
  if (error) throw new Error(error.message);
  return count || 0;
}

// Everything we should avoid repeating: consumed history + anything already in the queue.
async function avoidContext(userId) {
  const [hist, topics] = await Promise.all([
    supabaseAdmin.from("autopilot_topic_history").select("title,angle,keywords").eq("user_id", userId).order("consumed_at", { ascending: false }).limit(80),
    supabaseAdmin.from("autopilot_topics").select("title,angle,keywords").eq("user_id", userId).limit(80),
  ]);
  return [...(hist.data || []), ...(topics.data || [])];
}

async function generateTopics(settings, count, avoid) {
  const sys = `You are a short-form video content strategist. Given a creator's niche(s) and preferences, invent FRESH, distinct video topics for continuous posting.
First, internally derive 3-5 content pillars spanning the niche(s) — do NOT output the pillars. Then produce exactly ${count} topics distributed across them so the set feels varied, not repetitive.
Each topic: { "title": punchy specific scroll-stopping line <=70 chars (no emojis, no clickbait fluff), "niche": the sub-area it belongs to (short), "angle": one of how-to|mistake|list|contrarian|story|comparison|stat|question (vary across the set), "keywords": 3-6 short lowercase keywords }.
Every topic must be DISTINCT from the others and from the AVOID list (no paraphrases). Return ONLY JSON: {"topics":[{"title":"","niche":"","angle":"","keywords":[]}]}`;

  const user = [
    `NICHE(S): ${(settings.niches || []).join(", ")}`,
    settings.audience ? `AUDIENCE: ${settings.audience}` : "",
    settings.tone ? `TONE: ${settings.tone}` : "",
    settings.keywords_emphasize?.length ? `EMPHASIZE: ${settings.keywords_emphasize.join(", ")}` : "",
    settings.keywords_avoid?.length ? `AVOID THEMES: ${settings.keywords_avoid.join(", ")}` : "",
    `COUNT: ${count}`,
    `AVOID (already used — do not repeat or paraphrase):`,
    (avoid.slice(0, 60).map((t) => `- ${t.title}`).join("\n") || "- (none yet)"),
  ].filter(Boolean).join("\n");

  const res = await openai.chat.completions.create({
    model: MODEL, temperature: 0.9, max_tokens: 1600, response_format: { type: "json_object" },
    messages: [{ role: "system", content: sys }, { role: "user", content: user }],
  });
  try { return JSON.parse(res.choices[0].message.content).topics || []; }
  catch { return []; }
}

/** Top the queue up to TARGET_QUEUE when it's below MIN_QUEUE. Returns { added }. */
export async function ensureTopics(userId) {
  const settings = await getSettings(userId);
  if (!settings.niches?.length) return { added: 0, reason: "no niches set" };

  const queued = await getQueuedCount(userId);
  if (queued >= MIN_QUEUE) return { added: 0 };

  const need = TARGET_QUEUE - queued;
  const avoid = await avoidContext(userId);
  const raw = await generateTopics(settings, need + 5, avoid); // overproduce for dedup headroom

  const accepted = [];
  for (const c of raw) {
    if (!c?.title) continue;
    const cand = {
      title: String(c.title).slice(0, 120),
      niche: c.niche ? String(c.niche).slice(0, 60) : null,
      angle: c.angle ? String(c.angle).slice(0, 40) : null,
      keywords: Array.isArray(c.keywords) ? c.keywords.slice(0, 8).map((k) => String(k).toLowerCase().trim()).filter(Boolean) : [],
    };
    if (isDuplicate(cand, [...avoid, ...accepted])) continue;
    accepted.push(cand);
    if (accepted.length >= need) break;
  }
  if (!accepted.length) return { added: 0 };

  const rows = accepted.map((c) => ({ user_id: userId, ...c, status: "queued" }));
  const { error } = await supabaseAdmin.from("autopilot_topics").insert(rows);
  if (error) throw new Error(error.message);
  return { added: rows.length };
}

/** Atomically reserve the oldest queued topic (status → reserved). Null if queue empty. */
export async function reserveNextTopic(userId) {
  const { data, error } = await supabaseAdmin.rpc("reserve_topic", { p_user_id: userId });
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? (data[0] ?? null) : (data ?? null);
}

/** The public answer: reserve a topic, refilling first if the queue is empty. */
export async function getNextTopic(userId) {
  let topic = await reserveNextTopic(userId);
  if (!topic) { await ensureTopics(userId); topic = await reserveNextTopic(userId); }
  return topic;
}

/** Mark a reserved topic consumed and copy it to permanent history (with the real hook). */
export async function consumeTopic(topicId, { hook = null } = {}) {
  const { data: t } = await supabaseAdmin.from("autopilot_topics").select("*").eq("id", topicId).single();
  if (!t) return;
  await supabaseAdmin.from("autopilot_topic_history").insert({
    user_id: t.user_id, title: t.title, niche: t.niche, angle: t.angle, keywords: t.keywords, hook,
  });
  await supabaseAdmin.from("autopilot_topics").update({ status: "consumed" }).eq("id", topicId);
}

/** Return a reserved topic to the queue (e.g. generation failed). */
export async function releaseTopic(topicId) {
  await supabaseAdmin.from("autopilot_topics").update({ status: "queued" }).eq("id", topicId);
}

/** Permanently skip a topic. */
export async function skipTopic(topicId) {
  await supabaseAdmin.from("autopilot_topics").update({ status: "skipped" }).eq("id", topicId);
}
