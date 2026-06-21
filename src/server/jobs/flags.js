/**
 * jobs/flags.js — runtime flags (toggle without redeploy). Currently: the global worker
 * kill switch. Cached briefly so the worker poll loop doesn't hammer the DB.
 */
import { supabaseAdmin } from "../middleware/shared.js";

const cache = new Map(); // key -> { value, t }
const TTL = 5000;

async function getBool(key) {
  const c = cache.get(key);
  if (c && Date.now() - c.t < TTL) return c.value;
  let value = false;
  try {
    const { data } = await supabaseAdmin.from("system_flags").select("bool_value").eq("key", key).maybeSingle();
    value = !!data?.bool_value;
  } catch { /* default off */ }
  cache.set(key, { value, t: Date.now() });
  return value;
}

async function setBool(key, on) {
  await supabaseAdmin.from("system_flags").upsert({ key, bool_value: !!on, updated_at: new Date().toISOString() }, { onConflict: "key" });
  cache.set(key, { value: !!on, t: Date.now() });
}

/** Global kill switch: stop claiming/starting new jobs. Env var forces it on. */
export async function isKillSwitchOn() {
  if (process.env.WORKER_KILL_SWITCH === "1" || process.env.WORKER_KILL_SWITCH === "true") return true;
  return getBool("worker_kill_switch");
}
export function setKillSwitch(on) { return setBool("worker_kill_switch", on); }
export async function getKillSwitch() { return getBool("worker_kill_switch"); }
