/**
 * autopilot/settings.js — per-user AutoPilot configuration (autopilot_settings).
 * The topic queue only reads niches/audience/tone/keywords; the scheduler uses the rest.
 */
import { supabaseAdmin } from "../../middleware/shared.js";

const DEFAULTS = {
  enabled: false, auto_publish: true, niches: [], audience: null, tone: null, language: "en",
  orientation: "9:16", style_id: "auto", voice_id: null, posts_per_day: 1,
  posting_times: [], ai_decide_times: true, platforms: [],
  keywords_emphasize: [], keywords_avoid: [], brand_kit_id: null,
};

const EDITABLE = Object.keys(DEFAULTS);

export async function getSettings(userId) {
  const { data, error } = await supabaseAdmin.from("autopilot_settings").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data || { user_id: userId, ...DEFAULTS };
}

export async function saveSettings(userId, patch = {}) {
  const row = { user_id: userId, updated_at: new Date().toISOString() };
  for (const k of EDITABLE) if (k in patch) row[k] = patch[k];
  const { data, error } = await supabaseAdmin.from("autopilot_settings").upsert(row, { onConflict: "user_id" }).select().single();
  if (error) throw new Error(error.message);
  return data;
}
