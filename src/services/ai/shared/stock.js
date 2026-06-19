/**
 * shared/stock.js — unified stock media sourcing for all video services.
 *
 * One place for: orientation-aware search (driven by the project's real
 * orientation, NOT GPT), RANDOM selection from the result pool (so the same
 * query stops returning the same first hit every time), both photos AND videos,
 * and the asset shape analyser. Pexels is primary (better curation + orientation
 * for photos and videos); Pixabay is the automatic fallback.
 *
 * Callers pass the subject query + the project orientation and persist the
 * returned URL themselves (storage paths are service-specific).
 */
import sharp from "sharp";

const pexelsKey  = () => process.env.PEXELS_API_KEY;
const pixabayKey = () => process.env.VITE_PIXABAY_API_KEY;

// Project orientation → provider params + the aspect we want results to be.
export function orientationSpec(orientation = "9:16") {
  switch (orientation) {
    case "16:9": return { pexels: "landscape", pixabay: "horizontal", want: "landscape" };
    case "1:1":  return { pexels: "square",    pixabay: "all",        want: "square"    };
    case "9:16":
    default:     return { pexels: "portrait",  pixabay: "vertical",   want: "portrait"  };
  }
}

function aspectKind(w, h) {
  if (!w || !h) return null;
  const r = w / h;
  if (r <= 0.85) return "portrait";
  if (r >= 1.18) return "landscape";
  return "square";
}

// Random pick from the (relevance-ranked) pool — this is the variety fix.
function pickRandom(arr) {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
}

// ── Pexels ──────────────────────────────────────────────────────────────────
async function pexelsImages(query, spec) {
  const key = pexelsKey(); if (!key) return [];
  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=${spec.pexels}&per_page=20`;
    const res = await fetch(url, { headers: { Authorization: key } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.photos ?? []).map(p => p.src?.large2x ?? p.src?.large ?? p.src?.original).filter(Boolean);
  } catch { return []; }
}

async function pexelsVideos(query, spec, minDuration) {
  const key = pexelsKey(); if (!key) return [];
  try {
    const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=${spec.pexels}&per_page=20`;
    const res = await fetch(url, { headers: { Authorization: key } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const out = [];
    for (const v of data.videos ?? []) {
      if ((v.duration ?? 0) < minDuration) continue;
      const files = (v.video_files ?? [])
        .filter(f => f.file_type === "video/mp4" && aspectKind(f.width, f.height) === spec.want)
        .sort((a, b) => (a.height ?? 0) - (b.height ?? 0));
      // prefer the smallest file that's still >=1080 on the long edge; else the largest available
      const file = files.find(f => Math.max(f.width ?? 0, f.height ?? 0) >= 1080) ?? files[files.length - 1];
      if (file?.link) out.push(file.link);
    }
    return out;
  } catch { return []; }
}

// ── Pixabay ─────────────────────────────────────────────────────────────────
async function pixabayImages(query, spec) {
  const key = pixabayKey(); if (!key) return [];
  try {
    const url = `https://pixabay.com/api/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(query)}&image_type=photo&orientation=${spec.pixabay}&per_page=20&safesearch=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.hits ?? []).map(h => h.largeImageURL).filter(Boolean);
  } catch { return []; }
}

async function pixabayVideos(query, spec, minDuration) {
  const key = pixabayKey(); if (!key) return [];
  try {
    const url = `https://pixabay.com/api/videos/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(query)}&per_page=20&safesearch=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const usable = (data.hits ?? []).filter(h => (h.duration ?? 0) >= minDuration);
    // Pixabay videos have no orientation param — filter by the rendition's dims.
    const matched = usable.filter(h => {
      const v = h.videos?.large ?? h.videos?.medium ?? h.videos?.small;
      const k = aspectKind(v?.width, v?.height);
      return !k || k === spec.want;
    });
    const pool = matched.length ? matched : usable;
    return pool.map(h => (h.videos?.large ?? h.videos?.medium ?? h.videos?.small)?.url).filter(Boolean);
  } catch { return []; }
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function searchStockImage(query, { orientation = "9:16" } = {}) {
  if (!query) return null;
  const spec = orientationSpec(orientation);
  let pool = await pexelsImages(query, spec);
  if (!pool.length) pool = await pixabayImages(query, spec);
  const url = pickRandom(pool);
  return url ? { url, kind: "image" } : null;
}

export async function searchStockVideo(query, { orientation = "9:16", minDuration = 2 } = {}) {
  if (!query) return null;
  const spec = orientationSpec(orientation);
  let pool = await pexelsVideos(query, spec, minDuration);
  if (!pool.length) pool = await pixabayVideos(query, spec, minDuration);
  const url = pickRandom(pool);
  return url ? { url, kind: "video" } : null;
}

// ── Asset shape analyser (shared) ───────────────────────────────────────────
// Measure a resolved asset so the designer composes AROUND its real shape:
// portrait/square → full-bleed cover; landscape/wide → framed over a blurred backdrop.
export async function probeImageDims(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const m = await sharp(buf).metadata();
    if (!m.width || !m.height) return null;
    return { width: m.width, height: m.height };
  } catch { return null; }
}

export function treatmentFor(dims) {
  if (!dims) return { treatment: "full_bleed", orientation: "portrait", aspect: null };
  const aspect = dims.width / dims.height;
  if (aspect <= 1.15) {
    return { treatment: "full_bleed", orientation: aspect < 0.85 ? "portrait" : "square", aspect: +aspect.toFixed(2), width: dims.width, height: dims.height };
  }
  return { treatment: "framed", orientation: "landscape", aspect: +aspect.toFixed(2), width: dims.width, height: dims.height };
}
