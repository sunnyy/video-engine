/**
 * social/appCredentials.js — per-user "bring your own" OAuth app credentials.
 *
 * For platforms (currently YouTube) where each user connects through THEIR OWN cloud project,
 * we store their OAuth client_id + client_secret so uploads run on the user's own API quota —
 * removing our shared per-project ceiling and our app as a single point of failure.
 *
 * The client_secret is encrypted at rest (same AES-256-GCM as tokens). These are read ONLY
 * server-side at connect / callback / refresh time and are NEVER sent to the client.
 */
import { supabaseAdmin } from "../../middleware/shared.js";
import { encrypt, decrypt } from "./crypto.js";

/** Save (or update) a user's OAuth app credentials for a platform. */
export async function saveAppCredentials(userId, platform, { clientId, clientSecret }) {
  const cid = String(clientId || "").trim();
  const sec = String(clientSecret || "").trim();
  if (!cid || !sec) throw new Error("client_id and client_secret are required");
  const row = {
    user_id: userId, platform,
    client_id: cid,
    client_secret: encrypt(sec),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabaseAdmin.from("social_app_credentials")
    .upsert(row, { onConflict: "user_id,platform" });
  if (error) throw new Error(error.message);
  return { platform, clientId: cid };
}

/** Server-only: decrypted { id, secret } for the adapter, or null if the user hasn't set them. */
export async function getAppCredentials(userId, platform) {
  const { data, error } = await supabaseAdmin.from("social_app_credentials")
    .select("client_id, client_secret").eq("user_id", userId).eq("platform", platform).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { id: data.client_id, secret: decrypt(data.client_secret) };
}

export async function deleteAppCredentials(userId, platform) {
  const { error } = await supabaseAdmin.from("social_app_credentials")
    .delete().eq("user_id", userId).eq("platform", platform);
  if (error) throw new Error(error.message);
}

/** Public (no secret): has the user configured BYO credentials for this platform? */
export async function hasAppCredentials(userId, platform) {
  const { data } = await supabaseAdmin.from("social_app_credentials")
    .select("client_id").eq("user_id", userId).eq("platform", platform).maybeSingle();
  return { configured: !!data, clientId: data?.client_id || null };
}
