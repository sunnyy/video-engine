/**
 * social/accounts.js — encrypted token store for connected platforms (social_accounts).
 * The only place that reads/writes tokens; everything else gets a public view (no tokens)
 * or a freshly-refreshed access token via getFreshAccessToken().
 */
import { supabaseAdmin } from "../../middleware/shared.js";
import { encrypt, decrypt } from "./crypto.js";
import { getAdapter } from "./adapters/index.js";
import { getAppCredentials } from "./appCredentials.js";

/** Public, token-free view safe to send to the client. */
function publicAccount(row) {
  if (!row) return null;
  return {
    id: row.id, platform: row.platform, platform_account_id: row.platform_account_id,
    display_name: row.display_name, status: row.status, expires_at: row.expires_at, created_at: row.created_at,
  };
}

export async function saveAccount(userId, platform, tok) {
  const row = {
    user_id: userId, platform,
    platform_account_id: tok.platform_account_id ?? null,
    display_name:        tok.display_name ?? null,
    access_token:        encrypt(tok.access_token),
    refresh_token:       encrypt(tok.refresh_token),
    expires_at:          tok.expires_at ?? null,
    scopes:              tok.scopes ?? null,
    status:              "connected",
    updated_at:          new Date().toISOString(),
  };
  const { data, error } = await supabaseAdmin.from("social_accounts")
    .upsert(row, { onConflict: "user_id,platform" }).select().single();
  if (error) throw new Error(error.message);
  return publicAccount(data);
}

export async function listAccounts(userId) {
  const { data, error } = await supabaseAdmin.from("social_accounts").select("*").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data || []).map(publicAccount);
}

export async function deleteAccount(userId, platform) {
  const { error } = await supabaseAdmin.from("social_accounts").delete().eq("user_id", userId).eq("platform", platform);
  if (error) throw new Error(error.message);
}

/** Raw account row by id (server-internal — includes encrypted tokens). */
export async function getAccountById(accountId) {
  const { data, error } = await supabaseAdmin.from("social_accounts").select("*").eq("id", accountId).maybeSingle();
  if (error) throw new Error(error.message);
  return data || null;
}

/**
 * Account-level fresh token: same refresh-if-expiring logic as getFreshAccessToken, but keyed
 * by a specific connected account id (so a campaign can target a particular channel, and
 * future multi-account-per-platform works). Returns { accessToken, platform }.
 */
export async function getFreshAccessTokenByAccountId(accountId) {
  const data = await getAccountById(accountId);
  if (!data) throw new Error("connected account not found");

  const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : 0;
  if (expiresAt - Date.now() > 60_000) return { accessToken: decrypt(data.access_token), platform: data.platform };

  const refreshToken = decrypt(data.refresh_token);
  if (!refreshToken) {
    await supabaseAdmin.from("social_accounts").update({ status: "error" }).eq("id", data.id);
    throw new Error(`${data.platform} token expired and has no refresh token — reconnect required`);
  }
  const creds = await getAppCredentials(data.user_id, data.platform);
  const fresh = await getAdapter(data.platform).refresh(refreshToken, creds);
  await supabaseAdmin.from("social_accounts").update({
    access_token: encrypt(fresh.access_token), expires_at: fresh.expires_at,
    status: "connected", updated_at: new Date().toISOString(),
  }).eq("id", data.id);
  return { accessToken: fresh.access_token, platform: data.platform };
}

/**
 * Return a valid access token for publishing, refreshing it (and persisting the new one)
 * if it's within 60s of expiry. Throws if not connected or no refresh token is available.
 */
export async function getFreshAccessToken(userId, platform) {
  const { data, error } = await supabaseAdmin.from("social_accounts")
    .select("*").eq("user_id", userId).eq("platform", platform).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`${platform} is not connected`);

  const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : 0;
  if (expiresAt - Date.now() > 60_000) return decrypt(data.access_token);

  const refreshToken = decrypt(data.refresh_token);
  if (!refreshToken) {
    await supabaseAdmin.from("social_accounts").update({ status: "error" }).eq("id", data.id);
    throw new Error(`${platform} token expired and has no refresh token — reconnect required`);
  }
  const creds = await getAppCredentials(userId, platform);
  const fresh = await getAdapter(platform).refresh(refreshToken, creds);
  await supabaseAdmin.from("social_accounts").update({
    access_token: encrypt(fresh.access_token), expires_at: fresh.expires_at,
    status: "connected", updated_at: new Date().toISOString(),
  }).eq("id", data.id);
  return fresh.access_token;
}
