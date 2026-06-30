/**
 * automation/topics.js — the per-CAMPAIGN topic queue. Self-contained: knows nothing about
 * rendering, publishing, calendars, OAuth, or jobs. It only answers "give me the next best
 * topic for this campaign" and keeps that campaign's queue topped up.
 *
 * Strategy: campaign niche(s) → AI internally derives content pillars (never surfaced) →
 * generates topics → keep 10-20 queued per campaign, refilling to 20 when below 10.
 * Reservation prevents two workers grabbing the same topic. Dedup is heuristic (title +
 * keyword overlap + angle vs that campaign's history/queue).
 */
import { supabaseAdmin, openai } from "../../middleware/shared.js";

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

export async function getQueuedCount(campaignId) {
  const { count, error } = await supabaseAdmin.from("automation_topics")
    .select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "queued");
  if (error) throw new Error(error.message);
  return count || 0;
}

// Everything we should avoid repeating for THIS campaign: its consumed history + its queue.
async function avoidContext(campaignId) {
  const [hist, topics] = await Promise.all([
    supabaseAdmin.from("automation_topic_history").select("title,angle,keywords").eq("campaign_id", campaignId).order("consumed_at", { ascending: false }).limit(80),
    supabaseAdmin.from("automation_topics").select("title,angle,keywords").eq("campaign_id", campaignId).limit(80),
  ]);
  return [...(hist.data || []), ...(topics.data || [])];
}

async function generateTopics(campaign, count, avoid) {
  const sys = `You are a short-form video content strategist. Given a creator's niche(s) and preferences, invent FRESH, distinct video topics for continuous posting.
First, internally derive 3-5 content pillars spanning the niche(s) — do NOT output the pillars. Then produce exactly ${count} topics distributed across them so the set feels varied, not repetitive.
Each topic: { "title": punchy specific scroll-stopping line <=70 chars (no emojis, no clickbait fluff), "niche": the sub-area it belongs to (short), "angle": one of how-to|mistake|list|contrarian|story|comparison|stat|question (vary across the set), "keywords": 3-6 short lowercase keywords }.
Every topic must be DISTINCT from the others and from the AVOID list (no paraphrases). Return ONLY JSON: {"topics":[{"title":"","niche":"","angle":"","keywords":[]}]}`;

  const user = [
    `NICHE(S): ${(campaign.niches || []).join(", ")}`,
    campaign.audience ? `AUDIENCE: ${campaign.audience}` : "",
    campaign.tone ? `TONE: ${campaign.tone}` : "",
    campaign.keywords_emphasize?.length ? `EMPHASIZE: ${campaign.keywords_emphasize.join(", ")}` : "",
    campaign.keywords_avoid?.length ? `AVOID THEMES: ${campaign.keywords_avoid.join(", ")}` : "",
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

/** Top a campaign's queue up to TARGET_QUEUE when below MIN_QUEUE. Returns { added }. */
export async function ensureTopics(campaign) {
  if (!campaign?.niches?.length) return { added: 0, reason: "no niches set" };

  const queued = await getQueuedCount(campaign.id);
  if (queued >= MIN_QUEUE) return { added: 0 };

  const need = TARGET_QUEUE - queued;
  const avoid = await avoidContext(campaign.id);
  const raw = await generateTopics(campaign, need + 5, avoid); // overproduce for dedup headroom

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

  const rows = accepted.map((c) => ({ user_id: campaign.user_id, campaign_id: campaign.id, ...c, status: "queued" }));
  const { error } = await supabaseAdmin.from("automation_topics").insert(rows);
  if (error) throw new Error(error.message);
  return { added: rows.length };
}

/** Atomically reserve the oldest queued topic for a campaign (status → reserved). */
export async function reserveNextTopic(campaignId) {
  const { data, error } = await supabaseAdmin.rpc("reserve_campaign_topic", { p_campaign_id: campaignId });
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? (data[0] ?? null) : (data ?? null);
}

/** The public answer: reserve a topic for this campaign, refilling first if the queue is empty. */
export async function getNextTopic(campaign) {
  let topic = await reserveNextTopic(campaign.id);
  if (!topic) { await ensureTopics(campaign); topic = await reserveNextTopic(campaign.id); }
  return topic;
}

/** Mark a reserved topic consumed and copy it to permanent history (with the real hook). */
export async function consumeTopic(topicId, { hook = null } = {}) {
  const { data: t } = await supabaseAdmin.from("automation_topics").select("*").eq("id", topicId).single();
  if (!t) return;
  await supabaseAdmin.from("automation_topic_history").insert({
    user_id: t.user_id, campaign_id: t.campaign_id, title: t.title, niche: t.niche, angle: t.angle, keywords: t.keywords, hook,
  });
  await supabaseAdmin.from("automation_topics").update({ status: "consumed" }).eq("id", topicId);
}

/** Return a reserved topic to the queue (e.g. generation failed). */
export async function releaseTopic(topicId) {
  await supabaseAdmin.from("automation_topics").update({ status: "queued" }).eq("id", topicId);
}

/** Permanently skip a topic. */
export async function skipTopic(topicId) {
  await supabaseAdmin.from("automation_topics").update({ status: "skipped" }).eq("id", topicId);
}

/** Delete all UNUSED (queued) topics for a campaign — used when settings that drive topic
 *  generation change, so the stale queue can be regenerated from the new niche. Reserved
 *  (mid-generation), consumed, and skipped topics are left intact. Returns the count removed. */
export async function clearQueuedTopics(campaignId) {
  const { error, count } = await supabaseAdmin.from("automation_topics")
    .delete({ count: "exact" }).eq("campaign_id", campaignId).eq("status", "queued");
  if (error) throw new Error(error.message);
  return count || 0;
}

/** Skip the oldest queued topic for a campaign. Returns true if one was skipped. */
export async function skipOldestQueued(campaignId) {
  const { data } = await supabaseAdmin.from("automation_topics")
    .select("id").eq("campaign_id", campaignId).eq("status", "queued").order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (data) await supabaseAdmin.from("automation_topics").update({ status: "skipped" }).eq("id", data.id);
  return !!data;
}
