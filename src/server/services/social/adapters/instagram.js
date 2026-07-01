/**
 * adapters/instagram.js — Instagram (Instagram Login / Instagram API with Instagram Login) adapter.
 * Implements the same platform adapter contract as youtube.js: getAuthUrl / handleCallback /
 * refresh / publish (+ capabilities). All Instagram-specific code lives here.
 *
 * CENTRAL-APP model (NOT bring-your-own, unlike YouTube): every user connects through OUR ONE
 * Meta app, because Meta's `instagram_business_content_publish` permission requires a single
 * App-Reviewed + business-verified app — you can't ask each user to pass App Review. So the
 * OAuth client is read from env, not per-user credentials:
 *   IG_APP_ID       — the Instagram app's client id
 *   IG_APP_SECRET   — the Instagram app's client secret
 *   OAUTH_REDIRECT_BASE — the PUBLIC URL of this API (e.g. https://api.vidquence.com); the
 *                         redirect `${OAUTH_REDIRECT_BASE}/api/social/instagram/callback` must be
 *                         registered in the Meta app's Instagram Business Login OAuth settings.
 *
 * Requirements for the connecting user: a Business or Creator Instagram account (the publishing
 * API does NOT work on personal accounts). Until the Meta app passes App Review, only accounts
 * added as app testers can connect/publish.
 *
 * Token model: Instagram Login issues a SHORT-lived token (~1h) which we immediately exchange for
 * a LONG-lived token (~60 days). There is NO separate refresh_token — the long-lived token is
 * refreshed in place (ig_refresh_token) before it expires. To fit the shared token store we save
 * the long-lived token as BOTH access_token and refresh_token, and accounts.js persists the
 * rotated token on every refresh.
 *
 * Publishing (Reels): Instagram is a two-step, URL-based publish (Meta pulls the rendered MP4 from
 * a PUBLIC url — it cannot accept a raw byte upload): create a media container → poll until the
 * container finishes processing → publish the container. Returns { platform_post_id, url, meta }.
 */

// Errors marked `noRetry` are permanent (auth/permission/rejected) — the queue won't retry them.
function permanent(msg) { const e = new Error(msg); e.noRetry = true; return e; }
function transient(msg) { return new Error(msg); }
// Meta's per-account publishing limit (25 posts / 24h) resets like a daily quota → mark `quota` so
// the handler defers the retry rather than hammering it.
function quotaErr(msg, kind) { const e = new Error(msg); e.quota = true; e.quotaKind = kind || "uploadLimit"; return e; }
// Short-term throttle / transient Meta blip → normal exponential backoff retry.
function rateErr(msg) { const e = new Error(msg); e.rateLimit = true; return e; }

const GRAPH = "https://graph.instagram.com";                 // Instagram Login graph host
const GRAPH_VERSION = "v21.0";
const AUTH_URL  = "https://www.instagram.com/oauth/authorize";
const TOKEN_URL = "https://api.instagram.com/oauth/access_token";
// instagram_business_basic → identity (user_id, username); instagram_business_content_publish → publish.
const SCOPES = ["instagram_business_basic", "instagram_business_content_publish"];

// Meta rate/limit signatures. Meta error codes: 4/17/32 = app/user rate limit; 613 = custom rate
// limit; message often mentions "limit". The 25/24h publish cap surfaces as an OAuthException about
// the publishing limit.
const PUBLISH_LIMIT = /publish(ing)? limit|25 posts|reached the (maximum|limit)/i;
const RATE_LIMIT    = /rate limit|too many|temporarily blocked|reduce the (amount|rate)|please (retry|wait)/i;
const isPublishLimit = (txt) => PUBLISH_LIMIT.test(txt || "");
const isRateLimit    = (txt) => RATE_LIMIT.test(txt || "");

// Resolve the central Meta app credentials. `creds` (per-user BYO) is intentionally ignored —
// Instagram runs on OUR one App-Reviewed app.
function cfg() {
  const id     = process.env.IG_APP_ID;
  const secret = process.env.IG_APP_SECRET;
  const base   = process.env.OAUTH_REDIRECT_BASE || process.env.VITE_APP_URL || "http://localhost:5000";
  if (!id || !secret) throw new Error("Instagram isn't configured on the server yet (missing IG_APP_ID / IG_APP_SECRET)");
  return { id, secret, redirect: `${base}/api/social/instagram/callback` };
}

// Short-lived token → long-lived (~60d). Returns { token, expiresIn }.
async function toLongLived(shortToken, secret) {
  const p = new URLSearchParams({ grant_type: "ig_exchange_token", client_secret: secret, access_token: shortToken });
  const res = await fetch(`${GRAPH}/access_token?${p.toString()}`, { signal: AbortSignal.timeout(20000) })
    .catch((e) => { throw transient(`Instagram long-lived exchange stalled: ${e.message}`); });
  if (!res.ok) throw new Error(`Instagram long-lived exchange failed: ${(await res.text()).slice(0, 200)}`);
  const t = await res.json();
  if (!t.access_token) throw new Error("Instagram long-lived exchange returned no token");
  return { token: t.access_token, expiresIn: t.expires_in || 60 * 24 * 3600 };
}

// Who connected — { id, username }. With Instagram Login `me` returns the IG business user.
async function fetchIdentity(accessToken) {
  try {
    const res = await fetch(`${GRAPH}/me?fields=user_id,username&access_token=${encodeURIComponent(accessToken)}`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return { id: null, username: "Instagram" };
    const j = await res.json();
    return { id: j.user_id || j.id || null, username: j.username || "Instagram" };
  } catch { return { id: null, username: "Instagram" }; }
}

export const instagram = {
  platform: "instagram",
  scopes: SCOPES,

  // What Instagram supports. Callers read this instead of hardcoding rules (see normalizeMetadata).
  capabilities: {
    label: "Instagram",
    scheduling: false,                // no native publishAt; the queue schedules the job itself
    privacyOptions: [],               // publishes to the connected account; no per-post privacy
    tags: false,                      // hashtags live in the caption, not a tags field
    maxTitle: 0,                      // no separate title — caption only
    maxDescription: 2200,             // caption character limit
    reels: true,
    needsPublicVideoUrl: true,        // Meta pulls the MP4 from a public URL (no byte upload)
    maxPostsPerDay: 25,               // Meta-enforced publish cap per account / 24h
  },

  getAuthUrl(state /* , creds */) {
    const { id, redirect } = cfg();
    const p = new URLSearchParams({
      client_id: id, redirect_uri: redirect, response_type: "code",
      scope: SCOPES.join(","), state,
    });
    return `${AUTH_URL}?${p.toString()}`;
  },

  async handleCallback(code /* , creds */) {
    const { id, secret, redirect } = cfg();
    // 1) code → short-lived token (+ ig user id).
    const res = await fetch(TOKEN_URL, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: id, client_secret: secret, grant_type: "authorization_code", redirect_uri: redirect, code }),
      signal: AbortSignal.timeout(20000),
    }).catch((e) => { throw transient(`Instagram token exchange stalled: ${e.message}`); });
    if (!res.ok) throw new Error(`Instagram token exchange failed: ${(await res.text()).slice(0, 200)}`);
    const raw = await res.json();
    const short = raw.access_token ? raw : (Array.isArray(raw.data) ? raw.data[0] : {}) || {};
    if (!short.access_token) throw new Error("Instagram token exchange returned no access token");

    // 2) short-lived → long-lived (~60d).
    const long = await toLongLived(short.access_token, secret);
    // 3) resolve identity (prefer the id from the token response).
    const identity = await fetchIdentity(long.token);
    const igUserId = short.user_id || identity.id || null;

    return {
      platform_account_id: igUserId ? String(igUserId) : null,
      display_name:        identity.username,
      access_token:        long.token,
      // No separate refresh_token — store the long-lived token so refresh() can rotate it in place.
      refresh_token:       long.token,
      expires_at:          new Date(Date.now() + long.expiresIn * 1000).toISOString(),
      scopes:              SCOPES.join(" "),
    };
  },

  // Refresh the long-lived token in place (ig_refresh_token). `refreshToken` is the current
  // long-lived token. Returns the rotated token as BOTH access_token and refresh_token so
  // accounts.js persists the new value for the next cycle.
  async refresh(refreshToken /* , creds */) {
    const p = new URLSearchParams({ grant_type: "ig_refresh_token", access_token: refreshToken });
    const res = await fetch(`${GRAPH}/refresh_access_token?${p.toString()}`, { signal: AbortSignal.timeout(20000) })
      .catch((e) => { throw transient(`Instagram token refresh stalled: ${e.message}`); });
    if (!res.ok) throw new Error(`Instagram token refresh failed: ${(await res.text()).slice(0, 200)}`);
    const t = await res.json();
    if (!t.access_token) throw new Error("Instagram token refresh returned no token");
    const expiresIn = t.expires_in || 60 * 24 * 3600;
    return {
      access_token: t.access_token,
      refresh_token: t.access_token,
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
  },

  /**
   * Publish an already-rendered MP4 as a Reel. Consumes a PUBLIC video URL + metadata only —
   * Meta pulls the file itself, so a local path is not usable. Two steps + processing poll.
   * metadata: { title, description, caption } → collapsed to one caption.
   * `igUserId` is the connected account's platform_account_id (passed via accountMeta).
   */
  async publish({ accessToken, video, metadata = {}, account = {} }) {
    const igUserId = account.platform_account_id || metadata.igUserId;
    if (!igUserId) throw permanent("Instagram publish: missing connected account id (reconnect Instagram)");
    if (!video?.url) throw permanent("Instagram publish: a public video URL is required (Meta pulls the file; a local path can't be used)");

    const caption = String(metadata.caption || metadata.description || metadata.title || "").slice(0, 2200);

    // 1) Create the media container (Reels).
    const createBody = new URLSearchParams({ media_type: "REELS", video_url: video.url, access_token: accessToken });
    if (caption) createBody.set("caption", caption);
    const create = await fetch(`${GRAPH}/${GRAPH_VERSION}/${igUserId}/media`, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: createBody, signal: AbortSignal.timeout(30000),
    }).catch((e) => { throw transient(`Instagram container create stalled: ${e.message}`); });
    if (!create.ok) {
      const txt = await create.text();
      if (isPublishLimit(txt)) throw quotaErr(`Instagram daily publish limit reached (create): ${txt.slice(0, 220)}`, "uploadLimit");
      if (isRateLimit(txt))    throw rateErr(`Instagram rate-limited (create): ${txt.slice(0, 220)}`);
      if (create.status === 401 || create.status === 403) throw permanent(`Instagram auth/permission error (create): ${txt.slice(0, 220)}`);
      throw transient(`Instagram container create failed (${create.status}): ${txt.slice(0, 220)}`);
    }
    const containerId = (await create.json()).id;
    if (!containerId) throw transient("Instagram container create returned no id");

    // 2) Poll until the container finishes processing (Reels transcode). FINISHED → ready to publish.
    let ready = false;
    for (let i = 0; i < 24 && !ready; i++) {                              // ~2 min cap (24 × 5s)
      await new Promise((r) => setTimeout(r, 5000));
      const st = await fetch(`${GRAPH}/${containerId}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`, { signal: AbortSignal.timeout(15000) })
        .catch(() => null);
      if (!st || !st.ok) continue;
      const code = (await st.json()).status_code;
      if (code === "FINISHED") ready = true;
      else if (code === "ERROR")   throw transient("Instagram rejected the video while processing (ERROR) — will retry");
      else if (code === "EXPIRED") throw transient("Instagram container expired before publish — will retry");
      // IN_PROGRESS → keep polling.
    }
    if (!ready) throw transient("Instagram video still processing after 2 min — will retry");

    // 3) Publish the container.
    const pub = await fetch(`${GRAPH}/${GRAPH_VERSION}/${igUserId}/media_publish`, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ creation_id: containerId, access_token: accessToken }),
      signal: AbortSignal.timeout(30000),
    }).catch((e) => { throw transient(`Instagram publish stalled: ${e.message}`); });
    if (!pub.ok) {
      const txt = await pub.text();
      if (isPublishLimit(txt)) throw quotaErr(`Instagram daily publish limit reached (publish): ${txt.slice(0, 220)}`, "uploadLimit");
      if (isRateLimit(txt))    throw rateErr(`Instagram rate-limited (publish): ${txt.slice(0, 220)}`);
      if (pub.status === 401 || pub.status === 403) throw permanent(`Instagram auth/permission error (publish): ${txt.slice(0, 220)}`);
      throw transient(`Instagram publish failed (${pub.status}): ${txt.slice(0, 220)}`);
    }
    const mediaId = (await pub.json()).id;
    if (!mediaId) throw transient("Instagram publish returned no media id — treating as failed");

    // Best-effort permalink (nice to store; not fatal if it fails).
    let url = null;
    try {
      const pl = await fetch(`${GRAPH}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(accessToken)}`, { signal: AbortSignal.timeout(15000) });
      if (pl.ok) url = (await pl.json()).permalink || null;
    } catch { /* ignore */ }

    return { platform_post_id: String(mediaId), url, meta: { containerId, permalink: url } };
  },
};
