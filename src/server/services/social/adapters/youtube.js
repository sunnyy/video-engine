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
    let bytes;
    if (video?.url) {
      const r = await fetch(video.url);
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
    });
    if (init.status === 401 || init.status === 403) throw permanent(`YouTube auth/permission error: ${(await init.text()).slice(0, 200)}`);
    if (!init.ok) throw transient(`YouTube init failed (${init.status}): ${(await init.text()).slice(0, 200)}`);
    const uploadUrl = init.headers.get("location");
    if (!uploadUrl) throw transient("YouTube did not return an upload URL");

    // 2) Upload the bytes.
    const up = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": "video/*", "Content-Length": String(bytes.length) }, body: bytes });
    if (up.status === 401 || up.status === 403) throw permanent(`YouTube auth/permission error during upload: ${(await up.text()).slice(0, 200)}`);
    if (!up.ok) throw transient(`YouTube upload failed (${up.status}): ${(await up.text()).slice(0, 200)}`);

    const data = await up.json().catch(() => ({}));
    const videoId = data.id || null;
    return {
      platform_post_id: videoId,
      url: videoId ? `https://youtu.be/${videoId}` : null,
      meta: { httpStatus: up.status, privacyStatus: status.privacyStatus, publishAt: status.publishAt || null },
    };
  },
};
