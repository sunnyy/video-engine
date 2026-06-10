/**
 * contentFetcher.js
 * Fetches social media post content from a URL.
 *
 * Supported:
 *   Twitter/X  — fxtwitter.com API (free, no key, returns full tweet JSON)
 *   Generic    — Open Graph meta tag fallback (works for any public URL)
 */

const FXTWITTER_API = "https://api.fxtwitter.com";

export function detectPlatform(url) {
  if (!url) return "unknown";
  if (/twitter\.com|x\.com/i.test(url)) return "twitter";
  return "generic";
}

function extractTweetId(url) {
  const m = url.match(/\/status\/(\d+)/);
  return m ? m[1] : null;
}

async function fetchOneTweet(tweetId) {
  const res = await fetch(`${FXTWITTER_API}/status/${tweetId}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SocialVideoBot/1.0)" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`fxtwitter returned ${res.status}`);
  const data = await res.json();
  if (!data.tweet) throw new Error("Tweet not found or account is private");
  return data.tweet;
}

async function fetchTwitterContent(url) {
  const tweetId = extractTweetId(url);
  if (!tweetId) throw new Error("Could not extract tweet ID — make sure the URL contains /status/...");

  const rootTweet = await fetchOneTweet(tweetId);

  // Follow thread: fxtwitter returns tweet.thread for self-replies by the same author
  const threadTexts  = [rootTweet.text ?? ""];
  const MAX_THREAD   = 15;
  let   cursor       = rootTweet;

  while (threadTexts.length < MAX_THREAD) {
    const next = cursor.thread?.tweet ?? cursor.thread ?? null;
    if (!next?.id) break;
    // Only follow if same author (self-reply thread, not a reply from someone else)
    if (next.author?.screen_name !== rootTweet.author?.screen_name) break;
    threadTexts.push(next.text ?? "");
    cursor = next;
  }

  const combinedText = threadTexts.join("\n\n").trim();
  const isThread     = threadTexts.length > 1;
  if (isThread) {
    console.log(`[contentFetcher] thread detected: ${threadTexts.length} tweets from @${rootTweet.author?.screen_name}`);
  }

  const photos = rootTweet.media?.photos ?? [];
  const videos = rootTweet.media?.videos ?? [];

  return {
    platform:     "twitter",
    text:         combinedText,
    isThread,
    threadLength: threadTexts.length,
    author:       rootTweet.author?.name ?? "",
    authorHandle: `@${rootTweet.author?.screen_name ?? ""}`,
    imageUrl:     photos[0]?.url ?? videos[0]?.thumbnail_url ?? null,
    videoUrl:     videos[0]?.url ?? null,
    metrics: {
      likes:    rootTweet.likes    ?? 0,
      retweets: rootTweet.retweets ?? 0,
      replies:  rootTweet.replies  ?? 0,
      views:    rootTweet.views    ?? 0,
    },
    originalUrl: url,
  };
}

async function fetchOGContent(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Twitterbot/1.0)",
      "Accept": "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) throw new Error(`Page returned ${res.status}`);
  const html = await res.text();

  function getMeta(prop) {
    const patterns = [
      new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, "i"),
      new RegExp(`<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${prop}["']`, "i"),
    ];
    for (const p of patterns) { const m = html.match(p); if (m) return m[1]; }
    return null;
  }

  return {
    platform:     "generic",
    text:         getMeta("og:description") ?? getMeta("description") ?? getMeta("twitter:description") ?? "",
    title:        getMeta("og:title")       ?? getMeta("twitter:title") ?? "",
    author:       getMeta("og:site_name")   ?? "",
    authorHandle: "",
    imageUrl:     getMeta("og:image") ?? getMeta("twitter:image") ?? null,
    videoUrl:     getMeta("og:video:url") ?? getMeta("og:video") ?? null,
    metrics:      null,
    originalUrl:  url,
  };
}

export async function fetchSocialContent(url) {
  if (!url?.trim()) throw new Error("URL is required");

  const platform = detectPlatform(url.trim());

  try {
    if (platform === "twitter") return await fetchTwitterContent(url.trim());
    return await fetchOGContent(url.trim());
  } catch (err) {
    if (platform !== "generic") {
      console.warn(`[contentFetcher] ${platform} fetch failed, trying OG fallback: ${err.message}`);
      try { return await fetchOGContent(url.trim()); } catch (ogErr) {
        throw new Error(`Could not fetch content: ${err.message}`);
      }
    }
    throw err;
  }
}
