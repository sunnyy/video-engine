/**
 * editorialCaption.js — pure layout logic for the "editorial" caption style, shared by the
 * editor renderer, the animated preview, AND the export renderer so they can never drift.
 *
 * Multi-size serif: small connective words, the "hero" word (longest non-stopword) big + italic
 * on its own line. Sizes are absolute design px (for a 1080-wide canvas); renderers multiply by
 * the caption scale.
 */
export const EDITORIAL_STOPWORDS = new Set([
  "a","an","the","to","of","in","on","at","is","it","be","by","or","and","so","but","you","your",
  "we","i","me","my","as","if","for","that","this","with","they","them","he","she","its","do","not",
  "no","up","out","are","was","were","will","just","than","then","from","our","us",
]);

export const EDITORIAL_SIZES = { hero: 96, normal: 58, stop: 40 };

/** editorialWords(text) → [{ word, size, hero, italic, stop }] in reading order. */
export function editorialWords(text) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  let hero = 0, best = -1;
  words.forEach((w, i) => {
    const clean = w.replace(/[^\p{L}\p{N}]/gu, "");
    const len = EDITORIAL_STOPWORDS.has(clean.toLowerCase()) ? -1 : clean.length;
    if (len > best) { best = len; hero = i; }
  });
  return words.map((w, i) => {
    const clean = w.replace(/[^\p{L}\p{N}]/gu, "");
    const isStop = EDITORIAL_STOPWORDS.has(clean.toLowerCase());
    const isHero = i === hero;
    return { word: w, size: isHero ? EDITORIAL_SIZES.hero : isStop ? EDITORIAL_SIZES.stop : EDITORIAL_SIZES.normal, hero: isHero, italic: isHero, stop: isStop };
  });
}

/** Word-by-word reveal: opacity + slight rise for word i, given elapsed time within the caption. */
export function wordReveal(localTime, duration, i, n) {
  if (!duration || n <= 0) return { opacity: 1, dy: 0 };
  const t = (i / n) * (duration * 0.82);   // stagger the start of each word across the caption
  const p = Math.min(Math.max((localTime - t) / 0.2, 0), 1);
  return { opacity: p, dy: (1 - p) * 14 };
}
