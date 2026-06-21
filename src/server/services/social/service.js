/**
 * social/service.js — the platform-agnostic interface the rest of the app uses:
 *   connect(userId, platform)            → OAuth URL to send the user to
 *   completeConnect(state, code)         → finish OAuth, store encrypted tokens
 *   disconnect(userId, platform)
 *   refreshToken(userId, platform)       → force a fresh access token
 *   publish(userId, platform, video, metadata)
 *
 * All platform specifics live in adapters/. Adding TikTok/Instagram/etc. requires no
 * change here — only a new adapter.
 */
import { getAdapter } from "./adapters/index.js";
import { signState, verifyState } from "./crypto.js";
import { saveAccount, deleteAccount, getFreshAccessToken } from "./accounts.js";

/** Build the OAuth consent URL (state carries the userId across the redirect). */
export function connect(userId, platform) {
  const adapter = getAdapter(platform);
  return adapter.getAuthUrl(signState({ userId, platform }));
}

/** Finish OAuth: verify state, exchange the code, persist encrypted tokens. */
export async function completeConnect(state, code) {
  const data = verifyState(state);
  if (!data?.userId || !data?.platform) throw new Error("Invalid or expired OAuth state");
  const adapter = getAdapter(data.platform);
  const tokens = await adapter.handleCallback(code);
  await saveAccount(data.userId, data.platform, tokens);
  return { userId: data.userId, platform: data.platform };
}

export function disconnect(userId, platform) {
  getAdapter(platform); // validate platform
  return deleteAccount(userId, platform);
}

/** Force-refresh and return a valid access token (also persists the new one). */
export function refreshToken(userId, platform) {
  return getFreshAccessToken(userId, platform);
}

/** Publish a rendered video to a connected platform (adapter does the upload). */
export async function publish(userId, platform, video, metadata) {
  const adapter = getAdapter(platform);
  const accessToken = await getFreshAccessToken(userId, platform);
  return adapter.publish({ accessToken, video, metadata });
}
