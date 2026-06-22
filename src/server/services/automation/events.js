/**
 * automation/events.js — the audit trail (now campaign-aware). logEvent is BEST-EFFORT:
 * it never throws, so instrumenting a path can't break it. Everything in the automation
 * chain records here, giving an append-only history and the data behind the monitoring view.
 */
import { supabaseAdmin } from "../../middleware/shared.js";

export async function logEvent({ userId = null, campaignId = null, action, entity = null, entityId = null, status = "ok", message = null, meta = null }) {
  if (!action) return;
  try {
    await supabaseAdmin.from("automation_events").insert({
      user_id: userId, campaign_id: campaignId, action, entity,
      entity_id: entityId ? String(entityId) : null,
      status, message: message ? String(message).slice(0, 1000) : null, meta,
    });
  } catch (_) { /* audit must never break the caller */ }
}

export async function listCampaignEvents(campaignId, limit = 100) {
  const { data } = await supabaseAdmin.from("automation_events")
    .select("id, action, entity, entity_id, status, message, meta, created_at")
    .eq("campaign_id", campaignId).order("created_at", { ascending: false }).limit(limit);
  return data || [];
}

export async function listUserEvents(userId, limit = 100) {
  const { data } = await supabaseAdmin.from("automation_events")
    .select("id, campaign_id, action, entity, entity_id, status, message, meta, created_at")
    .eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  return data || [];
}

export async function listRecentEvents(limit = 200) {
  const { data } = await supabaseAdmin.from("automation_events")
    .select("id, user_id, campaign_id, action, entity, entity_id, status, message, meta, created_at")
    .order("created_at", { ascending: false }).limit(limit);
  return data || [];
}
