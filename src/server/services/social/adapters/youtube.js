/**
 * adapters/youtube.js — YouTube (Google OAuth) adapter. Implements the platform adapter
 * contract: getAuthUrl / handleCallback / refresh / publish. All Google-specific code
 * lives here so other platforms are just sibling adapters.
 *
 * BYO-only: per-user client_id/secret are passed in (stored via appCredentials.js); there is
 * no central app. Env: OAUTH_REDIRECT_BASE (the PUBLIC URL of this API, e.g.
 * https://api.vidquence.com). Each user registers `${OAUTH_REDIRECT_BASE}/api/social/youtube/callback`
 * as an authorized redirect URI in their own OAuth client.
 */
import fs from "fs";

// Errors marked `noRetry` are permanent (auth/permission) — the queue won't retry them.
function permanent(msg) { const e = new Error(msg); e.noRetry = true; return e; }
function transient(msg) { return new Error(msg); }
// YouTube throttling comes in two flavours that need DIFFERENT handling — conflating them is what
// made a momentary rate-limit defer an entire day:
//  • DAILY quota exhausted (resets at Pacific midnight) → mark `quota` so the handler defers the
//    retry to after the reset. videos.insert costs ~1600 of the project's 10k/day units (~6/day
//    default) so this is the common real cap. YouTube: 403 quotaExceeded/dailyLimitExceeded, or
//    400 uploadLimitExceeded (the channel's per-day video cap).
//  • SHORT-TERM rate limit (too many calls in a short window) → mark `rateLimit` so the handler
//    just retries with normal exponential backoff (seconds/minutes), NOT a next-day defer.
//    YouTube: 403 rateLimitExceeded/userRateLimitExceeded, or a 5xx/backendError blip.
function quotaErr(msg) { const e = new Error(msg); e.quota = true; return e; }
function rateErr(msg)  { const e = new Error(msg); e.rateLimit = true; return e; }
const DAILY_QUOTA = /quotaExceeded|dailyLimitExceeded|uploadLimitExceeded/i;
const RATE_LIMIT  = /rateLimitExceeded|userRateLimitExceeded|backendError|SERVICE_UNAVAILABLE|internalError/i;
const isDailyQuota = (txt) => DAILY_QUOTA.test(txt || "");
const isRateLimit  = (txt) => RATE_LIMIT.test(txt || "");
const AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
];

// Resolve the OAuth client for this call. BYO-only: each user supplies their own
// client_id/secret (creds), so uploads always run on the user's own project quota — there is
// no shared/central app. The redirect URI is always OURS (from OAUTH_REDIRECT_BASE); users add
// it to their own OAuth client's authorized redirects.
function cfg(creds) {
  const id     = creds?.id;
  const secret = creds?.secret;
  const base   = process.env.OAUTH_REDIRECT_BASE || process.env.VITE_APP_URL || "http://localhost:5000";
  if (!id || !secret) throw new Error("Connect your own Google project first — YouTube uses your own credentials");
  return { id, secret, redirect: `${base}/api/social/youtube/callback` };
}

async function fetchChannel(accessToken) {
  try {
    const res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { id: null, title: "YouTube" };
    const ch = (await res.json()).items?.[0];
    return { id: ch?.id || null, title: ch?.snippet?.title || "YouTube" };
  } catch { return { id: null, title: "YouTube" }; }
}

export const youtube = {
  platform: "youtube",
  scopes: SCOPES,

  // What this platform supports. Callers read this instead of hardcoding YouTube rules,
  // so adding TikTok/Instagram/etc. is just another adapter with its own capabilities.
  capabilities: {
    label: "YouTube",
    scheduling: true,                                  // status.publishAt
    privacyOptions: ["public", "unlisted", "private"],
    tags: true,
    thumbnails: false,                                 // not wired yet
    maxTitle: 100,
    maxDescription: 5000,
    maxTags: 30,
  },

  getAuthUrl(state, creds) {
    const { id, redirect } = cfg(creds);
    const p = new URLSearchParams({
      client_id: id, redirect_uri: redirect, response_type: "code",
      scope: SCOPES.join(" "), access_type: "offline", prompt: "consent",
      include_granted_scopes: "true", state,
    });
    return `${AUTH_URL}?${p.toString()}`;
  },

  async handleCallback(code, creds) {
    const { id, secret, redirect } = cfg(creds);
    const res = await fetch(TOKEN_URL, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: id, client_secret: secret, redirect_uri: redirect, grant_type: "authorization_code" }),
    });
    if (!res.ok) throw new Error(`Google token exchange failed: ${(await res.text()).slice(0, 200)}`);
    const t = await res.json();
    const identity = await fetchChannel(t.access_token);
    return {
      platform_account_id: identity.id,
      display_name:        identity.title,
      access_token:        t.access_token,
      refresh_token:       t.refresh_token || null,
      expires_at:          new Date(Date.now() + (t.expires_in || 3600) * 1000).toISOString(),
      scopes:              t.scope || SCOPES.join(" "),
    };
  },

  async refresh(refreshToken, creds) {
    const { id, secret } = cfg(creds);
    const res = await fetch(TOKEN_URL, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ refresh_token: refreshToken, client_id: id, client_secret: secret, grant_type: "refresh_token" }),
    });
    if (!res.ok) throw new Error(`Google token refresh failed: ${(await res.text()).slice(0, 200)}`);
    const t = await res.json();
    return { access_token: t.access_token, expires_at: new Date(Date.now() + (t.expires_in || 3600) * 1000).toISOString() };
  },

  /**
   * Resumable upload of an already-rendered MP4. Consumes a video URL/path + metadata
   * only — never generates or renders. Returns { platform_post_id, url, meta }.
   * metadata: { title, description, tags[], privacyStatus, scheduledAt, categoryId }
   */
  async publish({ accessToken, video, metadata = {} }) {
    // Resolve the rendered bytes (durable URL preferred; local path fallback).
    // Timeouts on every network call below: without them a stalled connection (seen on the worker)
    // hangs the publish_post job forever with no error → the editor sits at "Publishing…" with no
    // terminal state. A timeout instead surfaces a transient error so the job retries/fails cleanly.
    let bytes;
    if (video?.url) {
      const r = await fetch(video.url, { signal: AbortSignal.timeout(120000) }).catch((e) => {
        throw transient(`fetch rendered video stalled/failed: ${e.message}`);
      });
      if (!r.ok) throw transient(`fetch rendered video failed (${r.status})`);
      bytes = Buffer.from(await r.arrayBuffer());
    } else if (video?.path) {
      bytes = fs.readFileSync(video.path);
    } else {
      throw permanent("publish: no video url or path provided");
    }

    // Build snippet/status. Scheduling on YouTube = private + status.publishAt (RFC3339).
    const status = {
      privacyStatus: ["public", "unlisted", "private"].includes(metadata.privacyStatus) ? metadata.privacyStatus : "private",
      selfDeclaredMadeForKids: false,
    };
    if (metadata.scheduledAt) { status.privacyStatus = "private"; status.publishAt = new Date(metadata.scheduledAt).toISOString(); }
    const body = JSON.stringify({
      snippet: {
        title:       (metadata.title || "Untitled").slice(0, 100),
        description: (metadata.description || "").slice(0, 4900),
        tags:        Array.isArray(metadata.tags) ? metadata.tags.slice(0, 30) : [],
        categoryId:  metadata.categoryId || "22",
      },
      status,
    });

    // 1) Initiate resumable session.
    const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "video/*",
        "X-Upload-Content-Length": String(bytes.length),
      },
      body,
      signal: AbortSignal.timeout(30000),
    }).catch((e) => { throw transient(`YouTube init stalled/failed: ${e.message}`); });
    if (!init.ok) {
      const txt = await init.text();
      if (isRateLimit(txt))  throw rateErr(`YouTube rate-limited (init): ${txt.slice(0, 220)}`);
      if (isDailyQuota(txt)) throw quotaErr(`YouTube daily quota reached (init): ${txt.slice(0, 220)}`);
      if (init.status === 401 || init.status === 403) throw permanent(`YouTube auth/permission error: ${txt.slice(0, 220)}`);
      throw transient(`YouTube init failed (${init.status}): ${txt.slice(0, 220)}`);
    }
    const uploadUrl = init.headers.get("location");
    if (!uploadUrl) throw transient("YouTube did not return an upload URL");

    // 2) Upload the bytes.
    const up = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "video/*", "Content-Length": String(bytes.length) },
      body: bytes,
      signal: AbortSignal.timeout(300000), // 5 min — generous for short-form; only trips on a real stall
    }).catch((e) => { throw transient(`YouTube upload stalled/failed: ${e.message}`); });
    if (!up.ok) {
      const txt = await up.text();
      if (isRateLimit(txt))  throw rateErr(`YouTube rate-limited (upload): ${txt.slice(0, 220)}`);
      if (isDailyQuota(txt)) throw quotaErr(`YouTube daily quota reached (upload): ${txt.slice(0, 220)}`);
      if (up.status === 401 || up.status === 403) throw permanent(`YouTube auth/permission error during upload: ${txt.slice(0, 220)}`);
      throw transient(`YouTube upload failed (${up.status}): ${txt.slice(0, 220)}`);
    }

    const data = await up.json().catch(() => ({}));
    const videoId = data.id || null;
    // A 2xx with no video id means the upload didn't actually register — treat as transient so we
    // retry rather than recording a phantom "published" post with no video. (Was silently passing.)
    if (!videoId) throw transient(`YouTube upload returned ${up.status} but no video id — treating as failed`);
    return {
      platform_post_id: videoId,
      url: videoId ? `https://youtu.be/${videoId}` : null,
      meta: { httpStatus: up.status, privacyStatus: status.privacyStatus, publishAt: status.publishAt || null },
    };
  },
};
