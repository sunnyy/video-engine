/**
 * shared/entityImage.js — real photo of a named entity (person, company, place,
 * landmark, product) from FREE, COMMERCIALLY-LICENSED sources only. Generated
 * likenesses of real subjects are the weakest AI frames; a real photo is free and
 * far stronger.
 *
 * Source order (first hit wins) — all CC / public-domain, safe to embed in paid
 * exports. We deliberately do NOT scrape Google/Bing: open-web images are mostly
 * copyrighted (legal risk in a commercial render) and scraping is fragile + ToS.
 *   1. Wikipedia REST summary lead image
 *   2. Wikipedia title-search → summary lead image
 *   3. Wikidata P18 (the entity's canonical "image" property) → Wikimedia Commons
 *   4. Wikimedia Commons file search (broadest free catalogue)
 */
import { persistRemote } from "./persist.js";

const WIKI_HEADERS = { Accept: "application/json", "User-Agent": "Vidquence/1.0 (entity image lookup)" };

function contentTypeFor(url) {
  return /\.png(\?|$)/i.test(url) ? "image/png" : "image/jpeg";
}

// A Commons filename → a scaled, hotlink-safe image URL (Special:FilePath redirects
// to the real file; ?width gives a sane-sized render and rasterises SVGs to PNG).
function commonsFilePath(filename, width = 1200) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=${width}`;
}

// ── 1/2. Wikipedia REST summary ────────────────────────────────────────────────
async function wikiSummaryImage(title) {
  const res = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/\s+/g, "_"))}`,
    { headers: WIKI_HEADERS },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.originalimage?.source ?? data?.thumbnail?.source ?? null;
}

async function wikiTitleSearchImage(name) {
  const sRes = await fetch(
    `https://en.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(name)}&limit=1`,
    { headers: WIKI_HEADERS },
  );
  if (!sRes.ok) return null;
  const sData = await sRes.json();
  const found = sData?.pages?.[0]?.title;
  return found ? wikiSummaryImage(found) : null;
}

// ── 3. Wikidata P18 (canonical image of the entity) ────────────────────────────
async function wikidataImage(name) {
  // Resolve the entity name → a Wikidata item id (Q…)
  const sRes = await fetch(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}` +
    `&language=en&type=item&limit=1&format=json&origin=*`,
    { headers: WIKI_HEADERS },
  );
  if (!sRes.ok) return null;
  const sData = await sRes.json();
  const qid = sData?.search?.[0]?.id;
  if (!qid) return null;

  // Read its P18 (image) claim → a Commons filename
  const cRes = await fetch(
    `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${qid}&property=P18&format=json&origin=*`,
    { headers: WIKI_HEADERS },
  );
  if (!cRes.ok) return null;
  const cData = await cRes.json();
  const filename = cData?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  return filename ? commonsFilePath(filename) : null;
}

// ── 4. Wikimedia Commons file search (broadest free catalogue) ─────────────────
async function commonsSearchImage(name) {
  const res = await fetch(
    `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6` +
    `&gsrsearch=${encodeURIComponent(name)}&gsrlimit=8&prop=imageinfo&iiprop=url&iiurlwidth=1200` +
    `&format=json&origin=*`,
    { headers: WIKI_HEADERS },
  );
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data?.query?.pages ? Object.values(data.query.pages) : [];
  // Prefer real raster photos; skip SVG/GIF (logos, icons, animations render poorly).
  for (const p of pages) {
    const info = p?.imageinfo?.[0];
    const src  = info?.thumburl || info?.url;
    if (src && /\.(jpe?g|png)(\?|$)/i.test(info?.url || src)) return src;
  }
  return null;
}

/** resolveEntityImage(name, { runId, label }) → persisted image URL or null. */
export async function resolveEntityImage(entityName, { runId, label } = {}) {
  if (!entityName) return null;

  const tiers = [
    ["Wikipedia",      () => wikiSummaryImage(entityName)],
    ["Wikipedia",      () => wikiTitleSearchImage(entityName)],
    ["Wikidata",       () => wikidataImage(entityName)],
    ["Wikimedia Commons", () => commonsSearchImage(entityName)],
  ];

  for (const [source, lookup] of tiers) {
    let imgUrl = null;
    try { imgUrl = await lookup(); }
    catch (e) { console.warn(`[assets/entity] ${source} lookup failed (${entityName}):`, e.message); }
    if (!imgUrl) continue;

    const persisted = await persistRemote(imgUrl, { runId, label, contentType: contentTypeFor(imgUrl) });
    if (persisted) {
      console.log(`[assets/entity] real photo for "${entityName}" via ${source}`);
      return persisted;
    }
  }
  return null;
}
