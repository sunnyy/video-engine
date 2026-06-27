/**
 * productScraper.js
 * Scrapes product title, description, brand, price, and image from
 * Amazon, Flipkart, and generic product pages (OG meta + JSON-LD).
 */

import { parse } from "node-html-parser";
import { supabaseAdmin } from "../../../server/middleware/shared.js";
import { safeFetch } from "../shared/safeFetch.js";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const STORAGE_BUCKET = "user-assets";

export function detectProductPlatform(url) {
  if (/amazon\.(in|com|co\.uk|de|fr|ca|co\.jp)/i.test(url)) return "amazon";
  if (/flipkart\.com/i.test(url)) return "flipkart";
  return "generic";
}

async function fetchPage(url) {
  // SSRF-safe: validates the host (+ each redirect hop) is public before connecting.
  const res = await safeFetch(url, {
    headers: {
      "User-Agent":                BROWSER_UA,
      "Accept":                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language":           "en-US,en;q=0.9",
      "Cache-Control":             "max-age=0",
      "Upgrade-Insecure-Requests": "1",
    },
    timeoutMs: 14000,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching product page`);
  return res.text();
}

function extractJsonLd(root) {
  const results = [];
  root.querySelectorAll('script[type="application/ld+json"]').forEach(el => {
    try {
      const data = JSON.parse(el.rawText ?? "{}");
      if (Array.isArray(data)) results.push(...data);
      else results.push(data);
    } catch {}
  });
  return results;
}

function findProductSchema(items) {
  for (const item of items) {
    if (item["@type"] === "Product") return item;
    if (Array.isArray(item["@graph"])) {
      const p = item["@graph"].find(n => n["@type"] === "Product");
      if (p) return p;
    }
  }
  return null;
}

async function uploadProductImage(sourceUrl, prefix = "product") {
  if (!sourceUrl) return null;
  try {
    const res = await safeFetch(sourceUrl, { headers: { "User-Agent": BROWSER_UA }, timeoutMs: 12000 });
    if (!res.ok) throw new Error(`Image fetch ${res.status}`);

    const buffer      = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext         = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const storageKey  = `product-scrape/${prefix}/${Date.now()}.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storageKey, buffer, { contentType, upsert: true });

    if (error) throw new Error(error.message);

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storageKey);

    return publicUrl;
  } catch (err) {
    console.warn(`[productScraper] image upload failed: ${err.message}`);
    return null;
  }
}

async function scrapeAmazon(url) {
  const html = await fetchPage(url);
  const root = parse(html);

  if (root.querySelector("#captchacharacters") || html.includes("Enter the characters you see below")) {
    throw new Error("Amazon is blocking automated access for this product. Please upload the product image manually or try a different URL.");
  }

  const title = root.querySelector("#productTitle")?.text.trim()
    ?? root.querySelector("h1.a-size-large")?.text.trim()
    ?? root.querySelector("h1")?.text.trim()
    ?? "";

  const brand = root.querySelector("#bylineInfo")?.text.replace(/^Visit the|Store$/g, "").trim()
    ?? root.querySelector("tr.po-brand td.a-span9 span")?.text.trim()
    ?? "";

  const price = root.querySelector(".a-price .a-offscreen")?.text.trim()
    ?? root.querySelector("#priceblock_ourprice")?.text.trim()
    ?? root.querySelector("#price_inside_buybox")?.text.trim()
    ?? "";

  const bullets = [];
  root.querySelectorAll("#feature-bullets li span.a-list-item").forEach(el => {
    const text = el.text.trim();
    if (text && !text.toLowerCase().includes("make sure this fits")) bullets.push(text);
  });

  // Try to extract high-res image from inline JSON first
  let imageUrl = null;
  const imgJsonMatch = html.match(/"colorImages":\s*\{"initial":\s*(\[.*?\])\s*\}/s);
  if (imgJsonMatch) {
    try {
      const imgs = JSON.parse(imgJsonMatch[1]);
      imageUrl = imgs[0]?.hiRes ?? imgs[0]?.large ?? null;
    } catch {}
  }
  if (!imageUrl) {
    imageUrl = root.querySelector("#landingImage")?.getAttribute("data-old-hires")
      ?? root.querySelector("#landingImage")?.getAttribute("src")
      ?? null;
  }

  return {
    brandName:          brand || title.split(" ")[0] || "",
    productDescription: bullets.slice(0, 5).join(". "),
    rawImageUrl:        imageUrl,
    price,
    platform: "amazon",
  };
}

async function scrapeFlipkart(url) {
  const html = await fetchPage(url);
  const root = parse(html);
  const jsonLdItems = extractJsonLd(root);
  const product = findProductSchema(jsonLdItems);

  const title = product?.name
    ?? root.querySelector("h1.yhB1nd")?.text.trim()
    ?? root.querySelector("span.B_NuCI")?.text.trim()
    ?? root.querySelector("h1")?.text.trim()
    ?? "";

  const brand = product?.brand?.name
    ?? root.querySelector("span.G6XhRU")?.text.trim()
    ?? title.split(" ")[0]
    ?? "";

  const price = product?.offers?.price
    ? `₹${product.offers.price}`
    : root.querySelector("div._30jeq3._16Jk6d")?.text.trim()
      ?? root.querySelector("div._30jeq3")?.text.trim()
      ?? "";

  const bullets = [];
  root.querySelectorAll("div._2418kt li").forEach(el => {
    const text = el.text.trim();
    if (text) bullets.push(text);
  });

  const rawImageUrl = (Array.isArray(product?.image) ? product.image[0] : product?.image)
    ?? root.querySelector("img._396cs4")?.getAttribute("src")
    ?? root.querySelector("img.q6DClP")?.getAttribute("src")
    ?? null;

  return {
    brandName:          brand,
    productDescription: bullets.slice(0, 5).join(". ") || product?.description || "",
    rawImageUrl,
    price,
    platform: "flipkart",
  };
}

async function scrapeGeneric(url) {
  const html = await fetchPage(url);
  const root = parse(html);
  const jsonLdItems = extractJsonLd(root);
  const product = findProductSchema(jsonLdItems);

  const ogTitle = root.querySelector('meta[property="og:title"]')?.getAttribute("content")?.trim() ?? "";
  const ogDesc  = root.querySelector('meta[property="og:description"]')?.getAttribute("content")?.trim() ?? "";
  const ogImage = root.querySelector('meta[property="og:image"]')?.getAttribute("content")?.trim() ?? null;
  const metaDesc = root.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ?? "";

  const brand = product?.brand?.name
    ?? root.querySelector('meta[property="product:brand"]')?.getAttribute("content")?.trim()
    ?? "";

  const price = product?.offers?.price
    ? `${product.offers.priceCurrency ?? ""}${product.offers.price}`.trim()
    : "";

  const rawImageUrl = (Array.isArray(product?.image) ? product.image[0] : product?.image)
    ?? ogImage
    ?? null;

  return {
    brandName:          brand,
    productDescription: product?.description || ogDesc || metaDesc,
    rawImageUrl,
    price,
    platform: "generic",
    title:    product?.name || ogTitle || root.querySelector("h1")?.text.trim() || "",
  };
}

export async function scrapeProductUrl(url) {
  const platform = detectProductPlatform(url);

  let scraped;
  if (platform === "amazon")   scraped = await scrapeAmazon(url);
  else if (platform === "flipkart") scraped = await scrapeFlipkart(url);
  else scraped = await scrapeGeneric(url);

  // Upload image to Supabase so it's accessible to OpenAI Vision
  const productImageUrl = await uploadProductImage(scraped.rawImageUrl, platform);

  return {
    brandName:          scraped.brandName,
    productDescription: scraped.productDescription,
    productImageUrl,
    price:              scraped.price,
    platform:           scraped.platform,
    title:              scraped.title ?? scraped.brandName,
  };
}
