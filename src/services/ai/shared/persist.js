/**
 * shared/persist.js — download a remote asset and re-host it on Supabase storage
 * so the URL is permanent (stock/FAL/Wikipedia URLs expire or block hotlinking).
 * Shared by every asset tier (entity, stock, ai image).
 */
import { supabaseAdmin } from "../../../server/middleware/shared.js";

const MAX_BYTES = 40 * 1024 * 1024; // covers stock video clips

export async function persistRemote(url, { runId, label, contentType = "image/jpeg", referer = null, maxBytes = MAX_BYTES } = {}) {
  try {
    const res = await fetch(url, { headers: referer ? { Referer: referer } : {} });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > maxBytes) throw new Error(`too large (${Math.round(buffer.length / 1e6)}MB)`);
    const ext  = contentType.includes("mp4") ? "mp4" : contentType.includes("png") ? "png" : "jpg";
    const path = `ai-assets/${runId}/${label}-${Date.now()}.${ext}`;
    const { error } = await supabaseAdmin.storage.from("user-assets").upload(path, buffer, { contentType, upsert: true });
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from("user-assets").getPublicUrl(path);
    return pub?.publicUrl ?? null;
  } catch (e) {
    console.warn(`[assets/persist] failed (${label}):`, e.message);
    return null;
  }
}
