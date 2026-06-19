/**
 * shared/entityImage.js — real photo of a named entity (person, company, place,
 * landmark, product) via Wikipedia's REST summary image. Generated likenesses of
 * famous people are the weakest AI frames; a real photo is free and far stronger.
 */
import { persistRemote } from "./persist.js";

async function wikiSummaryImage(title) {
  const res = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/\s+/g, "_"))}`,
    { headers: { Accept: "application/json", "User-Agent": "Vidquence/1.0" } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.originalimage?.source ?? data?.thumbnail?.source ?? null;
}

/** resolveEntityImage(name, { runId, label }) → persisted image URL or null. */
export async function resolveEntityImage(entityName, { runId, label } = {}) {
  if (!entityName) return null;
  try {
    let imgUrl = await wikiSummaryImage(entityName);
    if (!imgUrl) {
      const sRes = await fetch(
        `https://en.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(entityName)}&limit=1`,
        { headers: { Accept: "application/json", "User-Agent": "Vidquence/1.0" } },
      );
      if (sRes.ok) {
        const sData = await sRes.json();
        const found = sData?.pages?.[0]?.title;
        if (found) imgUrl = await wikiSummaryImage(found);
      }
    }
    if (!imgUrl) return null;
    const persisted = await persistRemote(imgUrl, { runId, label, contentType: "image/jpeg" });
    if (persisted) console.log(`[assets/entity] real photo for "${entityName}" via Wikipedia`);
    return persisted;
  } catch (e) {
    console.warn(`[assets/entity] lookup failed (${entityName}):`, e.message);
    return null;
  }
}
