/**
 * utils.js
 * src/services/ai/aiVideo/utils.js
 *
 * Small shared helpers for the Prompt Video pipeline.
 */

import { supabaseAdmin } from "../../../server/middleware/shared.js";

/**
 * normalizeHex(color, fallback)
 * Returns a 6-digit lowercase hex string ("#rrggbb") or the fallback.
 * Accepts #rgb, #rrggbb, rgb(r,g,b). Anything else → fallback.
 * The designer prompt appends alpha suffixes (e.g. "40") to the accent color,
 * so a guaranteed 6-digit hex is a hard requirement.
 */
export function normalizeHex(color, fallback = "#6366f1") {
  if (typeof color !== "string") return fallback;
  const c = color.trim().toLowerCase();

  const m6 = c.match(/^#([0-9a-f]{6})$/);
  if (m6) return `#${m6[1]}`;

  const m3 = c.match(/^#([0-9a-f]{3})$/);
  if (m3) {
    const [r, g, b] = m3[1];
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  const mRgb = c.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
  if (mRgb) {
    const hex = [mRgb[1], mRgb[2], mRgb[3]]
      .map(n => Math.min(255, parseInt(n, 10)).toString(16).padStart(2, "0"))
      .join("");
    return `#${hex}`;
  }

  return fallback;
}

/**
 * ensureVividAccent(hex, fallback)
 * An accent color must be visible on dark video backgrounds AND carry identity.
 * Rejects near-black, near-white, and desaturated greys (e.g. #282828 from a
 * monochrome brand site) — returns the fallback instead.
 */
export function ensureVividAccent(hex, fallback = "#38bdf8") {
  const m = /^#([0-9a-f]{6})$/.exec((hex ?? "").toLowerCase());
  if (!m) return fallback;
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const max = Math.max(r, g, b);
  const sat = max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
  if (lum < 60 || lum > 225) return fallback;  // too dark / too light to read as color
  if (sat < 0.25) return fallback;             // grey — no identity, invisible as accent
  return hex;
}

/**
 * uploadBufferToStorage(buffer, filePath, contentType)
 * Uploads a buffer to the user-assets bucket and returns the public URL (or null).
 */
export async function uploadBufferToStorage(buffer, filePath, contentType = "image/png") {
  try {
    const { error } = await supabaseAdmin.storage
      .from("user-assets")
      .upload(filePath, buffer, { contentType, upsert: true });
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from("user-assets").getPublicUrl(filePath);
    return pub?.publicUrl ?? null;
  } catch (e) {
    console.warn(`[saas/utils] storage upload failed (${filePath}):`, e.message);
    return null;
  }
}

/** Resolve a possibly-relative URL against a page URL. Returns null if invalid. */
export function absoluteUrl(maybeRelative, baseUrl) {
  if (!maybeRelative) return null;
  try { return new URL(maybeRelative, baseUrl).href; } catch { return null; }
}

/** Strip a string to clean single-line text, capped at maxLen. */
export function cleanText(str, maxLen = 200) {
  if (!str) return "";
  return String(str).replace(/\s+/g, " ").trim().slice(0, maxLen);
}
