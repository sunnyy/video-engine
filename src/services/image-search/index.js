/**
 * src/services/image-search/index.js
 */

const PIXABAY_KEY = import.meta.env.VITE_PIXABAY_API_KEY;
const PIXABAY_IMAGE_URL = "https://pixabay.com/api/";
const PIXABAY_VIDEO_URL = "https://pixabay.com/api/videos/";

/**
 * Clean topic for Pixabay search.
 * - Keep the topic mostly intact — Pixabay handles English well
 * - Just remove Hinglish filler words that have no visual meaning
 * - Never strip meaningful English words like "morning", "habits", "success"
 */
function buildSearchQuery(topic = "") {
  // Only strip pure Hindi/Urdu grammatical particles — NOT English words
  const hindiOnly = [
    /\bne\b/g, /\bki\b/g, /\bka\b/g, /\bke\b/g,
    /\bhai\b/g, /\bhain\b/g, /\baur\b/g, /\bpe\b/g,
    /\bse\b/g, /\bko\b/g, /\btoh\b/g, /\bbhi\b/g,
    /\bsirf\b/g, /\bmein\b/g, /\bpar\b/g, /\bwoh\b/g,
    /\byeh\b/g, /\baapko\b/g, /\bkya\b/g, /\bjo\b/g,
    /\bho\b/g, /\btha\b/g, /\bthi\b/g, /\bthe\b/g,
  ];

  let cleaned = topic.toLowerCase();
  hindiOnly.forEach(r => { cleaned = cleaned.replace(r, " "); });
  cleaned = cleaned.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

  // Keep up to 5 words — more context = better Pixabay results
  const words = cleaned.split(" ").filter(w => w.length > 1);
  return words.slice(0, 5).join(" ") || "lifestyle people";
}

/**
 * Build a safe fallback query when primary returns poor results.
 * Extract only the most visually concrete noun/verb from topic.
 */
function buildFallbackQuery(topic = "") {
  // Visual anchor words — things Pixabay can actually photograph
  const visualWords = [
    "morning", "night", "city", "people", "business", "success",
    "money", "food", "travel", "nature", "sport", "fitness",
    "technology", "computer", "office", "school", "family",
    "friends", "celebration", "music", "movie", "film",
    "meditation", "yoga", "running", "workout", "reading",
    "writing", "coffee", "breakfast", "sunset", "beach",
  ];

  const topicLower = topic.toLowerCase();
  const found = visualWords.filter(w => topicLower.includes(w));

  if (found.length > 0) return found.slice(0, 2).join(" ");
  return "people lifestyle";
}

/**
 * Score an asset for relevance — filter out clearly wrong results.
 * Pixabay tags help identify mismatches.
 */
function isRelevantAsset(asset, query) {
  if (!asset.tags) return true; // no tags = keep it

  const tags = asset.tags.toLowerCase();
  const queryWords = query.toLowerCase().split(" ");

  // Blocklist — things that look wrong in most video contexts
  const blocklist = [
    "halloween", "horror", "ghost", "skeleton", "skull",
    "demon", "devil", "witch", "zombie", "monster",
    "funeral", "death", "graveyard", "cemetery",
    "monk", "robe", "medieval", "costume", "disguise",
  ];

  if (blocklist.some(b => tags.includes(b))) return false;

  return true;
}

/* ── Fetch images ─────────────────────────────────────────── */
async function fetchImages({ query, count = 10, orientation = "9:16" }) {
  const pixabayOrientation =
    orientation === "9:16" || orientation === "vertical"
      ? "vertical" : "horizontal";

  const params = new URLSearchParams({
    key:         PIXABAY_KEY,
    q:           query,
    image_type:  "photo",
    orientation: pixabayOrientation,
    safesearch:  "true",
    per_page:    String(Math.min(count, 20)),
    min_width:   "500",
  });

  try {
    const res  = await fetch(`${PIXABAY_IMAGE_URL}?${params}`);
    const data = await res.json();
    if (!data.hits?.length) return [];

    return data.hits
      .map(hit => ({
        url:        hit.webformatURL,
        type:       "image",
        width:      hit.webformatWidth,
        height:     hit.webformatHeight,
        pixabay_id: hit.id,
        tags:       hit.tags,
      }))
      .filter(a => isRelevantAsset(a, query));

  } catch (err) {
    console.warn("[image-search] Image fetch failed:", err.message);
    return [];
  }
}

/* ── Fetch videos ─────────────────────────────────────────── */
async function fetchVideos({ query, count = 10 }) {
  const params = new URLSearchParams({
    key:        PIXABAY_KEY,
    q:          query,
    video_type: "film",
    safesearch: "true",
    per_page:   String(Math.min(count, 20)),
  });

  try {
    const res  = await fetch(`${PIXABAY_VIDEO_URL}?${params}`);
    const data = await res.json();
    if (!data.hits?.length) return [];

    return data.hits
      .map(hit => {
        const video =
          hit.videos.medium?.url ||
          hit.videos.small?.url  ||
          hit.videos.tiny?.url;
        if (!video) return null;
        return {
          url:        video,
          type:       "video",
          width:      hit.videos.medium?.width  || 1280,
          height:     hit.videos.medium?.height || 720,
          pixabay_id: hit.id,
          tags:       hit.tags,
        };
      })
      .filter(Boolean)
      .filter(a => isRelevantAsset(a, query));

  } catch (err) {
    console.warn("[image-search] Video fetch failed:", err.message);
    return [];
  }
}

/* ── Main export ──────────────────────────────────────────── */
export async function fetchAssets({
  query,
  language    = "english",
  orientation = "9:16",
  count       = 20,
}) {
  if (!PIXABAY_KEY) {
    console.error("[image-search] VITE_PIXABAY_API_KEY not set in .env");
    return [];
  }

  const primaryQuery  = buildSearchQuery(query);
  const fallbackQuery = buildFallbackQuery(query);

  console.log(`[image-search] Primary query: "${primaryQuery}"`);
  console.log(`[image-search] Fallback query: "${fallbackQuery}"`);

  const videoCount = Math.ceil(count * 0.5);
  const imageCount = Math.floor(count * 0.5);

  // Fetch primary
  const [videos, images] = await Promise.all([
    fetchVideos({ query: primaryQuery, count: videoCount }),
    fetchImages({ query: primaryQuery, count: imageCount, orientation }),
  ]);

  let allAssets = [...videos, ...images];

  // If primary returns fewer than 8 good assets, supplement with fallback
  if (allAssets.length < 8) {
    console.log(`[image-search] Only ${allAssets.length} primary results, fetching fallback: "${fallbackQuery}"`);

    const [fbVideos, fbImages] = await Promise.all([
      fetchVideos({ query: fallbackQuery, count: videoCount }),
      fetchImages({ query: fallbackQuery, count: imageCount, orientation }),
    ]);

    // Add fallback assets not already in primary (deduplicate by pixabay_id)
    const existingIds = new Set(allAssets.map(a => a.pixabay_id));
    const newAssets   = [...fbVideos, ...fbImages]
      .filter(a => !existingIds.has(a.pixabay_id));

    allAssets = [...allAssets, ...newAssets];
  }

  // If still very thin, use a safe generic fallback
  if (allAssets.length < 4) {
    console.log("[image-search] Fetching generic lifestyle fallback");
    const [gv, gi] = await Promise.all([
      fetchVideos({ query: "people lifestyle urban", count: videoCount }),
      fetchImages({ query: "people lifestyle", count: imageCount, orientation }),
    ]);
    allAssets = [...allAssets, ...gv, ...gi];
  }

  // Shuffle and return
  return allAssets
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}