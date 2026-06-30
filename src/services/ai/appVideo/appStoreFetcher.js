/**
 * appVideo/appStoreFetcher.js — input adapter for the App Promo Video service.
 *
 * Takes an App Store / Play Store link (or a bare app name) and returns a normalized listing in the
 * SAME shape the SaaS/Promo pipeline's URL harvest produces ({ title, description, screenshotUrls,
 * brandColor, logoUrl }) — PLUS an `app` block (store, rating, reviews) used for the app-mode script
 * (download CTA + ratings/review as social proof). Downstream (script → beats → design → render) is
 * unchanged because the shape matches.
 *
 * Apple: official iTunes Lookup API (no key) + customer-reviews RSS — solid.
 * Google Play: google-play-scraper — best-effort; failures degrade gracefully (no reviews / throw a
 * friendly error) rather than breaking the run.
 */

import sharp from "sharp";

const APPLE_ID_RE = /apps\.apple\.com\/(?:([a-z]{2})\/)?app\/[^/]*\/id(\d+)/i;
const APPLE_BARE_ID_RE = /\bid(\d{6,})\b/i;
const PLAY_ID_RE = /play\.google\.com\/store\/apps\/details\?[^#]*\bid=([a-zA-Z0-9._]+)/i;

const clampReviews = (arr, n = 6) => (Array.isArray(arr) ? arr.slice(0, n) : []);
const clampShots = (arr, n = 8) => (Array.isArray(arr) ? arr.filter(Boolean).slice(0, n) : []);

// Derive a usable brand accent from the app icon (the dominant colour). Rejects near-white/black or
// washed-out greys so we never set a useless accent — the pipeline then keeps its own default.
async function iconBrandColor(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const { dominant } = await sharp(buf).stats();
    if (!dominant) return null;
    const { r, g, b } = dominant;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    // Reject only near-WHITE (all channels high), near-black, or greyscale — KEEP saturated brights
    // (orange/red/yellow have a 255 channel and must NOT be rejected as "too light").
    if (min > 224 || max < 28 || (max - min) < 24) return null;
    const hex = (n) => Math.round(n).toString(16).padStart(2, "0");
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  } catch { return null; }
}

// ── Apple ─────────────────────────────────────────────────────────────────────
async function fetchApple(appId, country = "us") {
  const lookupUrl = `https://itunes.apple.com/lookup?id=${encodeURIComponent(appId)}&country=${country}`;
  const res = await fetch(lookupUrl, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`apple lookup failed: ${res.status}`);
  const data = await res.json();
  const app = data?.results?.[0];
  if (!app) throw new Error("We couldn't find that app on the App Store.");

  const screenshotUrls = clampShots([...(app.screenshotUrls || []), ...(app.ipadScreenshotUrls || [])]);
  let topReviews = [];
  try {
    const rssUrl = `https://itunes.apple.com/${country}/rss/customerreviews/page=1/id=${appId}/sortby=mosthelpful/json`;
    const rssRes = await fetch(rssUrl, { signal: AbortSignal.timeout(10000) });
    if (rssRes.ok) {
      const rss = await rssRes.json();
      const entries = rss?.feed?.entry;
      const list = Array.isArray(entries) ? entries : entries ? [entries] : [];
      topReviews = clampReviews(list
        .filter((e) => e?.["im:rating"]?.label)
        .map((e) => ({
          rating: parseInt(e["im:rating"].label, 10) || null,
          title: e.title?.label || "",
          text: (e.content?.label || "").trim(),
          author: e.author?.name?.label || "A user",
        }))
        .filter((r) => r.text));
    }
  } catch { /* reviews are optional */ }

  return {
    title: app.trackName || "",
    description: (app.description || "").trim(),
    screenshotUrls,
    brandColor: null, // Apple gives no brand color; designer derives a palette
    logoUrl: app.artworkUrl512 || app.artworkUrl100 || null,
    app: {
      store: "ios",
      storeUrl: app.trackViewUrl || null,
      genre: app.primaryGenreName || null,
      developer: app.sellerName || null,
      rating: app.averageUserRating ? Math.round(app.averageUserRating * 10) / 10 : null,
      ratingCount: app.userRatingCount || null,
      price: app.formattedPrice || null,
      topReviews,
    },
  };
}

// ── Google Play (best-effort) ───────────────────────────────────────────────────
async function fetchPlay(appId, country = "us") {
  let gplay;
  try {
    const mod = await import("google-play-scraper");
    gplay = mod.default ?? mod;
  } catch {
    throw new Error("Play Store lookups aren't available right now — try an App Store link.");
  }
  let app;
  try {
    app = await gplay.app({ appId, country, lang: "en" });
  } catch {
    throw new Error("We couldn't find that app on the Play Store.");
  }

  let topReviews = [];
  try {
    const r = await gplay.reviews({ appId, country, lang: "en", num: 8, sort: gplay.sort?.HELPFULNESS });
    topReviews = clampReviews((r?.data || []).map((rv) => ({
      rating: rv.score || null, title: rv.title || "", text: (rv.text || "").trim(), author: rv.userName || "A user",
    })).filter((rv) => rv.text));
  } catch { /* reviews optional */ }

  return {
    title: app.title || "",
    description: (app.description || app.summary || "").trim(),
    screenshotUrls: clampShots(app.screenshots),
    brandColor: null,
    logoUrl: app.icon || null,
    app: {
      store: "android",
      storeUrl: app.url || null,
      genre: app.genre || null,
      developer: app.developer || null,
      rating: app.score ? Math.round(app.score * 10) / 10 : null,
      ratingCount: app.ratings || null,
      price: app.free ? "Free" : (app.priceText || null),
      topReviews,
    },
  };
}

/**
 * fetchAppListing(input, { country }) → normalized listing (harvest-compatible + `app` block).
 * input: an App Store / Play Store URL, or a bare app name (→ Apple search).
 */
export async function fetchAppListing(input, { country = "us" } = {}) {
  const raw = String(input || "").trim();
  if (!raw) throw new Error("Please paste an App Store or Play Store link.");

  let listing;
  const playMatch = raw.match(PLAY_ID_RE);
  const appleMatch = raw.match(APPLE_ID_RE);
  const bareId = raw.match(APPLE_BARE_ID_RE);

  if (playMatch) {
    listing = await fetchPlay(playMatch[1], country);
  } else if (appleMatch) {
    listing = await fetchApple(appleMatch[2], appleMatch[1] || country);
  } else if (bareId) {
    listing = await fetchApple(bareId[1], country);
  } else {
    // No recognizable URL/id → treat as an app-name search on the App Store.
    const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(raw)}&entity=software&limit=1&country=${country}`;
    const res = await fetch(searchUrl, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error("We couldn't look up that app — paste the App Store or Play Store link.");
    const data = await res.json();
    const hit = data?.results?.[0];
    if (!hit?.trackId) throw new Error("No app matched — paste the App Store or Play Store link instead.");
    listing = await fetchApple(hit.trackId, country);
  }

  // Derive a brand accent from the icon so the promo is on-brand, not generic indigo.
  if (!listing.brandColor && listing.logoUrl) {
    listing.brandColor = await iconBrandColor(listing.logoUrl);
  }
  return listing;
}
