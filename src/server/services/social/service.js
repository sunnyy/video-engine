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
import { getAdapter, capabilitiesOf } from "./adapters/index.js";
import { signState, verifyState } from "./crypto.js";
import { saveAccount, disconnectAccount, getFreshAccessToken, getFreshAccessTokenByAccountId } from "./accounts.js";
import { getAppCredentials } from "./appCredentials.js";

/** Public capability descriptor for a platform (scheduling/tags/privacy/limits). */
export function capabilities(platform) {
  return capabilitiesOf(platform);
}

/**
 * Trim/normalize metadata to what a platform actually supports, so callers never have to
 * special-case a platform: drop scheduling if unsupported, coerce privacy to an allowed
 * value, strip tags if unsupported, and clamp title/description/tag limits.
 */
export function normalizeMetadata(platform, metadata = {}) {
  const cap = capabilitiesOf(platform);
  const out = { ...metadata };
  if (!cap.scheduling) delete out.scheduledAt;
  if (cap.privacyOptions?.length && !cap.privacyOptions.includes(out.privacyStatus)) out.privacyStatus = cap.privacyOptions[0];
  if (cap.tags === false) delete out.tags;
  else if (Array.isArray(out.tags) && cap.maxTags) out.tags = out.tags.slice(0, cap.maxTags);
  if (cap.maxTitle && typeof out.title === "string") out.title = out.title.slice(0, cap.maxTitle);
  if (cap.maxDescription && typeof out.description === "string") out.description = out.description.slice(0, cap.maxDescription);
  return out;
}

/** Build the OAuth consent URL (state carries the userId across the redirect). Uses the user's
 *  own OAuth app credentials (BYO) so consent + upload run on their project. */
export async function connect(userId, platform) {
  const adapter = getAdapter(platform);
  const creds = await getAppCredentials(userId, platform); // null → adapter falls back to env
  return adapter.getAuthUrl(signState({ userId, platform }), creds);
}

/** Finish OAuth: verify state, exchange the code with the user's credentials, persist tokens. */
export async function completeConnect(state, code) {
  const data = verifyState(state);
  if (!data?.userId || !data?.platform) throw new Error("Invalid or expired OAuth state");
  const adapter = getAdapter(data.platform);
  const creds = await getAppCredentials(data.userId, data.platform);
  const tokens = await adapter.handleCallback(code, creds);
  await saveAccount(data.userId, data.platform, tokens);
  return { userId: data.userId, platform: data.platform };
}

/** Disconnect: SOFT-disconnect the channel (mark the row 'disconnected', keep its id) and KEEP
 *  the user's BYO credentials, so reconnecting is one click AND reuses the same account id —
 *  campaigns/jobs that target this account survive the reconnect. A full wipe is a separate,
 *  explicit action (DELETE /credentials) or happens on account deletion. */
export function disconnect(userId, platform) {
  getAdapter(platform); // validate platform
  return disconnectAccount(userId, platform);
}

/** Force-refresh and return a valid access token (also persists the new one). */
export function refreshToken(userId, platform) {
  return getFreshAccessToken(userId, platform);
}

/** Publish a rendered video to a connected platform (adapter does the upload). */
export async function publish(userId, platform, video, metadata) {
  const adapter = getAdapter(platform);
  const accessToken = await getFreshAccessToken(userId, platform);
  return adapter.publish({ accessToken, video, metadata: normalizeMetadata(platform, metadata) });
}

/**
 * Account-level publish — targets a SPECIFIC connected account (by id), so a campaign can
 * publish to a particular channel. The platform is derived from the account row.
 */
export async function publishToAccount(accountId, video, metadata) {
  const { accessToken, platform } = await getFreshAccessTokenByAccountId(accountId);
  const adapter = getAdapter(platform);
  return adapter.publish({ accessToken, video, metadata: normalizeMetadata(platform, metadata) });
}
