/**
 * adapters/youtube.js — YouTube (Google OAuth) adapter. Implements the platform adapter
 * contract: getAuthUrl / handleCallback / refresh / publish. All Google-specific code
 * lives here so other platforms are just sibling adapters.
 *
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and OAUTH_REDIRECT_BASE (the PUBLIC URL of
 * this API, e.g. https://api.vidquence.com). The registered redirect URI must be exactly
 * `${OAUTH_REDIRECT_BASE}/api/social/youtube/callback`.
 */
const AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
];

function cfg() {
  const id     = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  const base   = process.env.OAUTH_REDIRECT_BASE || process.env.VITE_APP_URL || "http://localhost:5000";
  if (!id || !secret) throw new Error("YouTube is not configured (set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)");
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

  getAuthUrl(state) {
    const { id, redirect } = cfg();
    const p = new URLSearchParams({
      client_id: id, redirect_uri: redirect, response_type: "code",
      scope: SCOPES.join(" "), access_type: "offline", prompt: "consent",
      include_granted_scopes: "true", state,
    });
    return `${AUTH_URL}?${p.toString()}`;
  },

  async handleCallback(code) {
    const { id, secret, redirect } = cfg();
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

  async refresh(refreshToken) {
    const { id, secret } = cfg();
    const res = await fetch(TOKEN_URL, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ refresh_token: refreshToken, client_id: id, client_secret: secret, grant_type: "refresh_token" }),
    });
    if (!res.ok) throw new Error(`Google token refresh failed: ${(await res.text()).slice(0, 200)}`);
    const t = await res.json();
    return { access_token: t.access_token, expires_at: new Date(Date.now() + (t.expires_in || 3600) * 1000).toISOString() };
  },

  // Implemented in the YouTube-publishing phase (resumable upload of the rendered MP4).
  async publish(/* { accessToken, video, metadata } */) {
    throw new Error("YouTube publish is not implemented yet (next phase)");
  },
};
