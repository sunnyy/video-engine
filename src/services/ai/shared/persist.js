/**
 * shared/persist.js — download a remote asset and re-host it on Supabase storage
 * so the URL is permanent (stock/FAL/Wikipedia URLs expire or block hotlinking).
 * Shared by every asset tier (entity, stock, ai image).
 *
 * Wikimedia (and some stock hosts) return HTTP 429 when several downloads fire at once — which used
 * to silently drop the asset and fall the waterfall back to a WRONG image. We retry 429/503 (and
 * transient network errors) with backoff + jitter so parallel fetches de-sync and recover.
 */
import { supabaseAdmin } from "../../../server/middleware/shared.js";
import { reportOk, reportFail } from "../../../server/services/apiHealth.js";

const MAX_BYTES = 40 * 1024 * 1024; // covers stock video clips
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fetch the bytes, retrying only transient failures (429/503 + network). Non-transient HTTP
// errors throw immediately (no point retrying a 404). Returns a Buffer.
async function fetchBytes(url, { referer, maxBytes, attempts = 4 } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    if (i) await sleep(400 * 2 ** (i - 1) + Math.random() * 500); // 0.4s,1.2s,2.8s (+jitter)
    let res;
    try {
      res = await fetch(url, { headers: referer ? { Referer: referer } : {} });
    } catch (e) { lastErr = e; continue; } // network blip → retry
    if (res.status === 429 || res.status === 503) { lastErr = new Error(`HTTP ${res.status}`); continue; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > maxBytes) throw new Error(`too large (${Math.round(buffer.length / 1e6)}MB)`);
    return buffer;
  }
  throw lastErr ?? new Error("fetch failed");
}

export async function persistRemote(url, { runId, label, contentType = "image/jpeg", referer = null, maxBytes = MAX_BYTES } = {}) {
  try {
    const buffer = await fetchBytes(url, { referer, maxBytes });
    const ext  = contentType.includes("mp4") ? "mp4" : contentType.includes("png") ? "png" : "jpg";
    const path = `ai-assets/${runId}/${label}-${Date.now()}.${ext}`;
    const { error } = await supabaseAdmin.storage.from("user-assets").upload(path, buffer, { contentType, upsert: true });
    if (error) { reportFail("storage", { message: error.message }).catch(() => {}); throw new Error(error.message); }
    reportOk("storage").catch(() => {});   // Supabase storage responded — healthy
    const { data: pub } = supabaseAdmin.storage.from("user-assets").getPublicUrl(path);
    return pub?.publicUrl ?? null;
  } catch (e) {
    console.warn(`[assets/persist] failed (${label}):`, e.message);
    return null;
  }
}
