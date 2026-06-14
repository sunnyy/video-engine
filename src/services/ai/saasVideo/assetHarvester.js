/**
 * assetHarvester.js
 * src/services/ai/saasVideo/assetHarvester.js
 *
 * Stage 0 of the SaaS Video pipeline — runs BEFORE any AI call.
 *
 * Given the product's URL it gathers everything real we can use so the
 * creative director plans against assets that actually exist:
 *   - page copy: title, description, headlines, feature bullets, body sample
 *   - brand: logo URL, brand color (theme-color meta → logo dominant → screenshot dominant)
 *   - screenshots: real product/landing screenshots via headless Chromium (puppeteer)
 *
 * Every sub-step is non-fatal. Worst case returns an empty harvest and the
 * pipeline proceeds from user-provided inputs alone.
 */

import { parse } from "node-html-parser";
import sharp from "sharp";
import { normalizeHex, ensureVividAccent, uploadBufferToStorage, absoluteUrl, cleanText } from "./utils.js";

const FETCH_TIMEOUT_MS  = 12000;
const PAGE_TIMEOUT_MS   = 25000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// ── HTML fetch + copy extraction ─────────────────────────────────────────────

async function fetchPageHTML(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml" },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function extractCopy(root, pageUrl) {
  const meta = (name) =>
    root.querySelector(`meta[property="${name}"]`)?.getAttribute("content") ||
    root.querySelector(`meta[name="${name}"]`)?.getAttribute("content") || null;

  const title       = cleanText(meta("og:title") || root.querySelector("title")?.text, 120);
  const description = cleanText(meta("og:description") || meta("description"), 300);
  const ogImage     = absoluteUrl(meta("og:image"), pageUrl);
  const themeColor  = meta("theme-color");

  // Headlines: h1s then h2s, deduped, short ones only
  const headlines = [];
  for (const sel of ["h1", "h2", "h3"]) {
    for (const el of root.querySelectorAll(sel)) {
      const t = cleanText(el.text, 120);
      if (t && t.length >= 4 && !headlines.includes(t)) headlines.push(t);
      if (headlines.length >= 12) break;
    }
    if (headlines.length >= 12) break;
  }

  // Feature bullets: list items that read like product copy
  const bullets = [];
  for (const li of root.querySelectorAll("li")) {
    const t = cleanText(li.text, 110);
    if (t && t.length >= 12 && t.length <= 110 && !/cookie|privacy|terms|login|sign in/i.test(t) && !bullets.includes(t)) {
      bullets.push(t);
    }
    if (bullets.length >= 14) break;
  }

  // Body text sample for the director/script writer (numbers, claims, social proof)
  for (const sel of ["script", "style", "noscript", "svg", "nav", "footer"]) {
    root.querySelectorAll(sel).forEach(el => el.remove());
  }
  const bodyText = cleanText(root.querySelector("body")?.text ?? "", 4000);

  // Logo candidates: explicit logo imgs → apple-touch-icon → og:logo → favicon
  let logoUrl = null;
  const logoImg = root.querySelector('img[class*="logo" i], img[id*="logo" i], img[alt*="logo" i], header img');
  if (logoImg) logoUrl = absoluteUrl(logoImg.getAttribute("src"), pageUrl);
  if (!logoUrl) {
    const touchIcon = root.querySelector('link[rel="apple-touch-icon"]');
    if (touchIcon) logoUrl = absoluteUrl(touchIcon.getAttribute("href"), pageUrl);
  }
  if (!logoUrl) logoUrl = absoluteUrl(meta("og:logo"), pageUrl);

  return { title, description, ogImage, themeColor, headlines, bullets, bodyText, logoUrl };
}

// ── Screenshots via puppeteer ────────────────────────────────────────────────

async function captureScreenshots(url, runId) {
  let puppeteer;
  try {
    puppeteer = (await import("puppeteer")).default;
  } catch (e) {
    console.warn("[saas/harvest] puppeteer unavailable:", e.message);
    return [];
  }

  let browser = null;
  const urls = [];
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });
    await page.setUserAgent(UA);
    await page.goto(url, { waitUntil: "networkidle2", timeout: PAGE_TIMEOUT_MS });
    await new Promise(r => setTimeout(r, 1200)); // settle animations/fonts

    // Best-effort: dismiss common cookie banners so they don't pollute shots
    await page.evaluate(() => {
      const kill = ['[class*="cookie" i]', '[id*="cookie" i]', '[class*="consent" i]', '[id*="consent" i]'];
      for (const sel of kill) document.querySelectorAll(sel).forEach(el => {
        if (el.tagName !== "HTML" && el.tagName !== "BODY") el.style.display = "none";
      });
    }).catch(() => {});

    // Shot 1: hero (top of page)
    const heroBuf = await page.screenshot({ type: "png" });
    const heroUrl = await uploadBufferToStorage(
      heroBuf, `saas-video/${runId}/shot-hero-${Date.now()}.png`, "image/png");
    if (heroUrl) urls.push(heroUrl);

    // Shot 2: features / mid-page
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    if (pageHeight > 1400) {
      await page.evaluate(h => window.scrollTo({ top: h }), Math.floor(pageHeight * 0.35));
      await new Promise(r => setTimeout(r, 900));
      const midBuf = await page.screenshot({ type: "png" });
      const midUrl = await uploadBufferToStorage(
        midBuf, `saas-video/${runId}/shot-mid-${Date.now()}.png`, "image/png");
      if (midUrl) urls.push(midUrl);
    }

    return urls;
  } catch (e) {
    console.warn("[saas/harvest] screenshot capture failed:", e.message);
    return urls;
  } finally {
    if (browser) { try { await browser.close(); } catch {} }
  }
}

// ── Brand color ──────────────────────────────────────────────────────────────

async function dominantColorFromImage(imageUrl) {
  try {
    const res = await fetch(imageUrl, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const { dominant } = await sharp(buf).stats();
    if (!dominant) return null;
    const hex = `#${[dominant.r, dominant.g, dominant.b]
      .map(n => n.toString(16).padStart(2, "0")).join("")}`;
    // Reject near-black/near-white/grey dominants — useless as video accents
    return ensureVividAccent(hex, null);
  } catch {
    return null;
  }
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * harvestAssets(url, runId)
 * @returns {object} harvest — never throws; fields are null/[] when unavailable
 */
export async function harvestAssets(url, runId) {
  const harvest = {
    url,
    title: null, description: null, headlines: [], bullets: [], bodyText: "",
    logoUrl: null, ogImage: null, brandColor: null,
    screenshotUrls: [],
  };
  if (!url) return harvest;

  // 1. HTML copy extraction
  let copy = null;
  try {
    const html = await fetchPageHTML(url);
    const root = parse(html, { comment: false });
    copy = extractCopy(root, url);
    Object.assign(harvest, {
      title:       copy.title,
      description: copy.description,
      headlines:   copy.headlines,
      bullets:     copy.bullets,
      bodyText:    copy.bodyText,
      logoUrl:     copy.logoUrl,
      ogImage:     copy.ogImage,
    });
    console.log(`[saas/harvest] copy: "${copy.title}" — ${copy.headlines.length} headlines, ${copy.bullets.length} bullets`);
  } catch (e) {
    console.warn("[saas/harvest] page fetch failed (non-fatal):", e.message);
  }

  // 2. Screenshots (real product visuals — the core of this stage)
  harvest.screenshotUrls = await captureScreenshots(url, runId);
  console.log(`[saas/harvest] screenshots: ${harvest.screenshotUrls.length}`);

  // 3. Brand color: theme-color meta → logo dominant → hero screenshot dominant
  // (vividness-guarded at every step — monochrome sites yield null, director picks instead)
  let brand = copy?.themeColor ? ensureVividAccent(normalizeHex(copy.themeColor, null), null) : null;
  if (!brand && harvest.logoUrl)             brand = await dominantColorFromImage(harvest.logoUrl);
  if (!brand && harvest.screenshotUrls[0])   brand = await dominantColorFromImage(harvest.screenshotUrls[0]);
  harvest.brandColor = brand; // may stay null — director will choose
  if (brand) console.log(`[saas/harvest] brand color: ${brand}`);

  return harvest;
}
