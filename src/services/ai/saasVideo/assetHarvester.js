/**
 * assetHarvester.js
 * src/services/ai/saasVideo/assetHarvester.js
 *
 * Product-URL harvesting for the Promo Video pipeline. Ported (self-contained) from
 * the SaaS Video pipeline so Promo can offer a "paste your URL" mode and the SaaS
 * service can later be removed without breaking this.
 *
 * Given a product URL it gathers everything real we can ground the video in:
 *   - page copy: title, description, headlines, feature bullets, body sample
 *   - brand: logo URL, brand color (theme-color meta → logo dominant → screenshot dominant)
 *   - screenshots: real product/landing screenshots via headless Chromium (puppeteer)
 *
 * Every sub-step is non-fatal — worst case it returns an empty harvest and the promo
 * pipeline proceeds from the user-provided inputs alone.
 */

import { parse } from "node-html-parser";
import sharp from "sharp";
import { supabaseAdmin } from "../../../server/middleware/shared.js";

const FETCH_TIMEOUT_MS = 12000;
const PAGE_TIMEOUT_MS  = 25000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// ── helpers (inlined so this module has no cross-folder deps) ───────────────────

function normalizeHex(color, fallback = "#6366f1") {
  if (typeof color !== "string") return fallback;
  const c = color.trim().toLowerCase();
  const m6 = c.match(/^#([0-9a-f]{6})$/); if (m6) return `#${m6[1]}`;
  const m3 = c.match(/^#([0-9a-f]{3})$/); if (m3) { const [r, g, b] = m3[1]; return `#${r}${r}${g}${g}${b}${b}`; }
  const mRgb = c.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
  if (mRgb) return `#${[mRgb[1], mRgb[2], mRgb[3]].map(n => Math.min(255, parseInt(n, 10)).toString(16).padStart(2, "0")).join("")}`;
  return fallback;
}

// Accent must read on dark video + carry identity. Reject near-black/white and greys.
function ensureVividAccent(hex, fallback = "#38bdf8") {
  const m = /^#([0-9a-f]{6})$/.exec((hex ?? "").toLowerCase());
  if (!m) return fallback;
  const r = parseInt(m[1].slice(0, 2), 16), g = parseInt(m[1].slice(2, 4), 16), b = parseInt(m[1].slice(4, 6), 16);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const max = Math.max(r, g, b);
  const sat = max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
  if (lum < 60 || lum > 225) return fallback;
  if (sat < 0.25) return fallback;
  return hex;
}

async function uploadBufferToStorage(buffer, filePath, contentType = "image/png") {
  try {
    const { error } = await supabaseAdmin.storage.from("user-assets").upload(filePath, buffer, { contentType, upsert: true });
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from("user-assets").getPublicUrl(filePath);
    return pub?.publicUrl ?? null;
  } catch (e) {
    console.warn(`[promo/harvest] storage upload failed (${filePath}):`, e.message);
    return null;
  }
}

function absoluteUrl(maybeRelative, baseUrl) {
  if (!maybeRelative) return null;
  try { return new URL(maybeRelative, baseUrl).href; } catch { return null; }
}

function cleanText(str, maxLen = 200) {
  if (!str) return "";
  return String(str).replace(/\s+/g, " ").trim().slice(0, maxLen);
}

// ── HTML fetch + copy extraction ────────────────────────────────────────────────

async function fetchPageHTML(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml" }, signal: controller.signal, redirect: "follow" });
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

  const headlines = [];
  for (const sel of ["h1", "h2", "h3"]) {
    for (const el of root.querySelectorAll(sel)) {
      const t = cleanText(el.text, 120);
      if (t && t.length >= 4 && !headlines.includes(t)) headlines.push(t);
      if (headlines.length >= 12) break;
    }
    if (headlines.length >= 12) break;
  }

  const bullets = [];
  for (const li of root.querySelectorAll("li")) {
    const t = cleanText(li.text, 110);
    if (t && t.length >= 12 && t.length <= 110 && !/cookie|privacy|terms|login|sign in/i.test(t) && !bullets.includes(t)) bullets.push(t);
    if (bullets.length >= 14) break;
  }

  for (const sel of ["script", "style", "noscript", "svg", "nav", "footer"]) {
    root.querySelectorAll(sel).forEach(el => el.remove());
  }
  const bodyText = cleanText(root.querySelector("body")?.text ?? "", 4000);

  let logoUrl = null;
  const logoImg = root.querySelector('img[class*="logo" i], img[id*="logo" i], img[alt*="logo" i], header img');
  if (logoImg) logoUrl = absoluteUrl(logoImg.getAttribute("src"), pageUrl);
  if (!logoUrl) { const touchIcon = root.querySelector('link[rel="apple-touch-icon"]'); if (touchIcon) logoUrl = absoluteUrl(touchIcon.getAttribute("href"), pageUrl); }
  if (!logoUrl) logoUrl = absoluteUrl(meta("og:logo"), pageUrl);

  return { title, description, ogImage, themeColor, headlines, bullets, bodyText, logoUrl };
}

// ── Screenshots via puppeteer ─────────────────────────────────────────────────────

async function captureScreenshots(url, runId) {
  let puppeteer;
  try { puppeteer = (await import("puppeteer")).default; }
  catch (e) { console.warn("[promo/harvest] puppeteer unavailable:", e.message); return []; }

  let browser = null;
  const urls = [];
  try {
    browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });
    await page.setUserAgent(UA);
    await page.goto(url, { waitUntil: "networkidle2", timeout: PAGE_TIMEOUT_MS });
    await new Promise(r => setTimeout(r, 1200));

    await page.evaluate(() => {
      const kill = ['[class*="cookie" i]', '[id*="cookie" i]', '[class*="consent" i]', '[id*="consent" i]'];
      for (const sel of kill) document.querySelectorAll(sel).forEach(el => { if (el.tagName !== "HTML" && el.tagName !== "BODY") el.style.display = "none"; });
    }).catch(() => {});

    const heroBuf = await page.screenshot({ type: "png" });
    const heroUrl = await uploadBufferToStorage(heroBuf, `promo-video/${runId}/shot-hero-${Date.now()}.png`, "image/png");
    if (heroUrl) urls.push(heroUrl);

    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    if (pageHeight > 1400) {
      await page.evaluate(h => window.scrollTo({ top: h }), Math.floor(pageHeight * 0.35));
      await new Promise(r => setTimeout(r, 900));
      const midBuf = await page.screenshot({ type: "png" });
      const midUrl = await uploadBufferToStorage(midBuf, `promo-video/${runId}/shot-mid-${Date.now()}.png`, "image/png");
      if (midUrl) urls.push(midUrl);
    }
    return urls;
  } catch (e) {
    console.warn("[promo/harvest] screenshot capture failed:", e.message);
    return urls;
  } finally {
    if (browser) { try { await browser.close(); } catch {} }
  }
}

// ── Brand color ────────────────────────────────────────────────────────────────

async function dominantColorFromImage(imageUrl) {
  try {
    const res = await fetch(imageUrl, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const { dominant } = await sharp(buf).stats();
    if (!dominant) return null;
    const hex = `#${[dominant.r, dominant.g, dominant.b].map(n => n.toString(16).padStart(2, "0")).join("")}`;
    return ensureVividAccent(hex, null);
  } catch {
    return null;
  }
}

// ── Main export ──────────────────────────────────────────────────────────────────

/**
 * harvestAssets(url, runId) → harvest object (never throws; fields null/[] when unavailable)
 */
export async function harvestAssets(url, runId) {
  const harvest = {
    url, title: null, description: null, headlines: [], bullets: [], bodyText: "",
    logoUrl: null, ogImage: null, brandColor: null, screenshotUrls: [],
  };
  if (!url) return harvest;

  let copy = null;
  try {
    const html = await fetchPageHTML(url);
    const root = parse(html, { comment: false });
    copy = extractCopy(root, url);
    Object.assign(harvest, {
      title: copy.title, description: copy.description, headlines: copy.headlines,
      bullets: copy.bullets, bodyText: copy.bodyText, logoUrl: copy.logoUrl, ogImage: copy.ogImage,
    });
    console.log(`[promo/harvest] copy: "${copy.title}" — ${copy.headlines.length} headlines, ${copy.bullets.length} bullets`);
  } catch (e) {
    console.warn("[promo/harvest] page fetch failed (non-fatal):", e.message);
  }

  harvest.screenshotUrls = await captureScreenshots(url, runId);
  console.log(`[promo/harvest] screenshots: ${harvest.screenshotUrls.length}`);

  let brand = copy?.themeColor ? ensureVividAccent(normalizeHex(copy.themeColor, null), null) : null;
  if (!brand && harvest.logoUrl)           brand = await dominantColorFromImage(harvest.logoUrl);
  if (!brand && harvest.screenshotUrls[0]) brand = await dominantColorFromImage(harvest.screenshotUrls[0]);
  harvest.brandColor = brand;
  if (brand) console.log(`[promo/harvest] brand color: ${brand}`);

  return harvest;
}
