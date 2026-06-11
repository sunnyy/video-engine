/**
 * contentFetcher.js
 * Fetches social media post content from a URL.
 *
 * Supported:
 *   Twitter/X  — fxtwitter.com API (free, no key, returns full tweet JSON)
 *   Generic    — Open Graph meta tag fallback (works for any public URL)
 */

import { supabaseAdmin } from "../../../server/middleware/shared.js";

const FXTWITTER_API  = "https://api.fxtwitter.com";
const STORAGE_BUCKET = "user-assets";

async function uploadImageToSupabase(sourceUrl, tweetId) {
  try {
    const res = await fetch(sourceUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SocialVideoBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Image fetch returned ${res.status}`);

    const buffer      = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext         = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const storageKey  = `social-video-images/${tweetId ?? Date.now()}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storageKey, buffer, { contentType, upsert: true });

    if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`);

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storageKey);

    console.log(`[contentFetcher] image uploaded → ${storageKey}`);
    return publicUrl;
  } catch (err) {
    console.warn(`[contentFetcher] image upload failed, using direct URL: ${err.message}`);
    return sourceUrl;
  }
}

export function detectPlatform(url) {
  if (!url) return "unknown";
  if (/twitter\.com|x\.com/i.test(url))   return "twitter";
  if (/instagram\.com/i.test(url))         return "instagram";
  if (/linkedin\.com/i.test(url))          return "linkedin";
  if (/reddit\.com/i.test(url))            return "reddit";
  return "generic";
}

function extractTweetMeta(url) {
  const idMatch   = url.match(/\/status\/(\d+)/);
  const userMatch = url.match(/(?:twitter\.com|x\.com)\/([^/]+)\/status/i);
  return {
    tweetId:  idMatch   ? idMatch[1]   : null,
    username: userMatch ? userMatch[1] : null,
  };
}

async function fetchOneTweet(tweetId, username = null) {
  const path = username ? `/${username}/status/${tweetId}` : `/status/${tweetId}`;
  const res = await fetch(`${FXTWITTER_API}${path}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SocialVideoBot/1.0)" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`fxtwitter returned ${res.status}`);
  const data = await res.json();
  if (!data.tweet) throw new Error("Tweet not found or account is private");
  return data.tweet;
}

async function fetchTwitterContent(url) {
  const { tweetId, username } = extractTweetMeta(url);
  if (!tweetId) throw new Error("Could not extract tweet ID — make sure the URL contains /status/...");

  const rootTweet = await fetchOneTweet(tweetId, username);

  // Follow thread: fxtwitter returns tweet.thread for self-replies by the same author
  const threadTexts  = [rootTweet.text ?? ""];
  const MAX_THREAD   = 15;
  let   cursor       = rootTweet;

  console.log(`[contentFetcher] root tweet fetched, thread field: ${JSON.stringify(rootTweet.thread)?.slice(0, 200)}`);

  while (threadTexts.length < MAX_THREAD) {
    // fxtwitter may nest the next tweet under .thread.tweet or directly under .thread
    const next = cursor.thread?.tweet ?? (cursor.thread?.id ? cursor.thread : null);
    if (!next?.id) break;
    // Only follow if same author (self-reply thread, not a reply from someone else)
    if (next.author?.screen_name !== rootTweet.author?.screen_name) break;
    threadTexts.push(next.text ?? "");
    cursor = next;
    console.log(`[contentFetcher] thread tweet ${threadTexts.length}: "${(next.text ?? "").slice(0, 60)}"`);
  }

  const combinedText = threadTexts.join("\n\n").trim();
  const isThread     = threadTexts.length > 1;
  if (isThread) {
    console.log(`[contentFetcher] thread detected: ${threadTexts.length} tweets from @${rootTweet.author?.screen_name}`);
  }

  // Collect media from all thread tweets, not just root
  const allTweets = [rootTweet];
  let threadCursor = rootTweet;
  while (true) {
    const next = threadCursor.thread?.tweet ?? (threadCursor.thread?.id ? threadCursor.thread : null);
    if (!next?.id) break;
    if (next.author?.screen_name !== rootTweet.author?.screen_name) break;
    allTweets.push(next);
    threadCursor = next;
  }

  function extractImages(tweet) {
    const media = tweet.media ?? {};
    console.log(`[contentFetcher] media for tweet ${tweet.id}:`, JSON.stringify(media).slice(0, 300));
    const photos = media.photos ?? [];
    const videos = media.videos ?? [];
    const all    = media.all    ?? [];
    const urls   = [];
    for (const p of photos) { if (p?.url) urls.push(p.url); }
    if (urls.length === 0) {
      for (const v of videos) { if (v?.thumbnail_url) urls.push(v.thumbnail_url); }
    }
    if (urls.length === 0) {
      for (const m of all) {
        if (m.type === "photo" && m.url) urls.push(m.url);
        else if (m.thumbnail_url) urls.push(m.thumbnail_url);
      }
    }
    return urls;
  }

  const rawImageUrls = [];
  for (const t of allTweets) {
    for (const u of extractImages(t)) {
      if (!rawImageUrls.includes(u)) rawImageUrls.push(u);
    }
  }

  const imageUrls = await Promise.all(
    rawImageUrls.map(u => uploadImageToSupabase(u, rootTweet.id))
  );
  const imageUrl = imageUrls[0] ?? null;

  return {
    platform:     "twitter",
    text:         combinedText,
    isThread,
    threadLength: threadTexts.length,
    author:       rootTweet.author?.name ?? "",
    authorHandle: `@${rootTweet.author?.screen_name ?? ""}`,
    imageUrl,
    imageUrls,
    videoUrl:     rootTweet.media?.videos?.[0]?.url ?? null,
    metrics: {
      likes:    rootTweet.likes    ?? 0,
      retweets: rootTweet.retweets ?? 0,
      replies:  rootTweet.replies  ?? 0,
      views:    rootTweet.views    ?? 0,
    },
    originalUrl: url,
  };
}

function extractRedditMeta(url) {
  const m = url.match(/reddit\.com\/r\/([^/]+)\/comments\/([a-zA-Z0-9]+)/i);
  return m ? { subreddit: m[1], postId: m[2] } : null;
}

async function fetchRedditContent(url) {
  const meta = extractRedditMeta(url);
  if (!meta) throw new Error("Could not extract Reddit post ID — make sure the URL contains /comments/...");

  const apiUrl = `https://www.reddit.com/r/${meta.subreddit}/comments/${meta.postId}.json`;
  const res = await fetch(apiUrl, {
    headers: { "User-Agent": "SocialVideoBot/1.0 (by /u/videoengine)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Reddit API returned ${res.status}`);

  const data = await res.json();
  const post = data[0]?.data?.children?.[0]?.data;
  if (!post) throw new Error("Reddit post not found or subreddit is private");

  const previewUrl = post.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, "&") ?? null;
  const directImg  = post.url?.match(/\.(jpg|jpeg|png|webp|gif)/i) ? post.url : null;
  const rawImageUrl = previewUrl ?? directImg;
  const imageUrl = rawImageUrl ? await uploadImageToSupabase(rawImageUrl, post.id) : null;

  const text = [post.title, post.selftext].filter(Boolean).join("\n\n").trim();

  console.log(`[contentFetcher] reddit post: "${post.title?.slice(0, 60)}" score=${post.score}`);
  return {
    platform:     "reddit",
    text,
    title:        post.title   ?? "",
    isThread:     false,
    threadLength: 1,
    author:       post.author  ?? "",
    authorHandle: `u/${post.author ?? ""}`,
    imageUrl,
    imageUrls:    imageUrl ? [imageUrl] : [],
    videoUrl:     null,
    metrics: {
      likes:    post.score        ?? 0,
      comments: post.num_comments ?? 0,
    },
    originalUrl: url,
  };
}

async function fetchInstagramContent(url) {
  const shortcodeMatch = url.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/i);
  const shortcode = shortcodeMatch?.[1];
  console.log(`[contentFetcher] instagram shortcode: ${shortcode}`);

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Accept": "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Instagram page returned ${res.status} — post may be private`);
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

  const caption     = getMeta("og:description") ?? getMeta("description") ?? "";
  const rawImage    = getMeta("og:image") ?? getMeta("twitter:image") ?? null;
  const uploadedUrl = rawImage ? await uploadImageToSupabase(rawImage, shortcode) : null;
  // Discard if upload failed and returned the raw Instagram CDN URL — OpenAI can't access it either
  const imageUrl    = (uploadedUrl && uploadedUrl !== rawImage) ? uploadedUrl : null;

  if (!caption && !imageUrl) throw new Error("Could not fetch Instagram post content — make sure the post is public");

  return {
    platform:     "instagram",
    text:         caption,
    title:        getMeta("og:title") ?? "",
    isThread:     false,
    threadLength: 1,
    author:       getMeta("og:site_name") ?? "",
    authorHandle: "",
    imageUrl,
    imageUrls:    imageUrl ? [imageUrl] : [],
    videoUrl:     null,
    metrics:      null,
    originalUrl:  url,
  };
}

async function fetchLinkedInContent(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient/VERSION (java 1.4))",
      "Accept": "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`LinkedIn page returned ${res.status} — post may require login`);
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

  const text        = getMeta("og:description") ?? getMeta("description") ?? "";
  const rawImage    = getMeta("og:image") ?? null;
  const uploadedUrl = rawImage ? await uploadImageToSupabase(rawImage, null) : null;
  const imageUrl    = (uploadedUrl && uploadedUrl !== rawImage) ? uploadedUrl : null;

  if (!text) throw new Error("Could not fetch LinkedIn post content — post may require login to view");

  return {
    platform:     "linkedin",
    text:         text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
    title:        getMeta("og:title") ?? "",
    isThread:     false,
    threadLength: 1,
    author:       getMeta("og:site_name") ?? "",
    authorHandle: "",
    imageUrl,
    imageUrls:    imageUrl ? [imageUrl] : [],
    videoUrl:     null,
    metrics:      null,
    originalUrl:  url,
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

  const rawImageUrl = getMeta("og:image") ?? getMeta("twitter:image") ?? null;
  const imageUrl    = rawImageUrl ? await uploadImageToSupabase(rawImageUrl, null) : null;
  const imageUrls   = imageUrl ? [imageUrl] : [];

  return {
    platform:     "generic",
    text:         getMeta("og:description") ?? getMeta("description") ?? getMeta("twitter:description") ?? "",
    title:        getMeta("og:title")       ?? getMeta("twitter:title") ?? "",
    author:       getMeta("og:site_name")   ?? "",
    authorHandle: "",
    imageUrl,
    imageUrls,
    videoUrl:     getMeta("og:video:url") ?? getMeta("og:video") ?? null,
    metrics:      null,
    originalUrl:  url,
  };
}

export async function fetchSocialContent(url) {
  if (!url?.trim()) throw new Error("URL is required");

  const platform = detectPlatform(url.trim());
  console.log(`[contentFetcher] platform detected: ${platform}`);

  try {
    if (platform === "twitter")   return await fetchTwitterContent(url.trim());
    if (platform === "reddit")    return await fetchRedditContent(url.trim());
    if (platform === "instagram") return await fetchInstagramContent(url.trim());
    if (platform === "linkedin")  return await fetchLinkedInContent(url.trim());
    return await fetchOGContent(url.trim());
  } catch (err) {
    if (platform !== "generic") {
      console.warn(`[contentFetcher] ${platform} fetch failed, trying OG fallback: ${err.message}`);
      try {
        const og = await fetchOGContent(url.trim());
        if (platform === "twitter") return { ...og, imageUrl: null, imageUrls: [] };
        return { ...og, platform };
      } catch (ogErr) {
        throw new Error(`Could not fetch content: ${err.message}`);
      }
    }
    throw err;
  }
}
