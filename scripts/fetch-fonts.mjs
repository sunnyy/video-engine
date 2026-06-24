#!/usr/bin/env node
/**
 * scripts/fetch-fonts.mjs
 *
 * Downloads every Google Font the video pipelines can emit into public/fonts/
 * as local .woff2 files and writes public/fonts/fonts.css (@font-face rules
 * pointing at those local files).
 *
 * WHY: the Remotion render runs in headless Chrome which (on restricted hosts,
 * and in this dev env) cannot fetch fonts.googleapis.com — fonts time out and
 * text falls back / flickers across the concurrent render tabs. Local fonts
 * load instantly and identically in every tab → correct, flicker-free text.
 *
 * Run once (and whenever the font list changes):  npm run fetch-fonts
 * Then rebuild the Remotion bundle:               npm run prebundle
 * Commit public/fonts/.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname    = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUT_DIR      = path.join(PROJECT_ROOT, "public", "fonts");

// Every family the pipelines / caption styles can emit, with the weights we use.
// Single-weight display faces are listed with just [400] (Google 400s otherwise).
const FONTS = {
  "Inter":              [400, 500, 600, 700, 800, 900],
  "Outfit":             [400, 500, 600, 700, 800, 900],
  "Raleway":            [400, 500, 600, 700, 800, 900],
  "DM Sans":            [400, 500, 600, 700, 800, 900],
  "Poppins":            [400, 500, 600, 700, 800, 900],
  "Montserrat":         [400, 500, 600, 700, 800, 900],
  "Manrope":            [400, 500, 600, 700, 800],
  "Plus Jakarta Sans":  [400, 500, 600, 700, 800],
  "Space Grotesk":      [400, 500, 600, 700],
  "Nunito":             [400, 600, 700, 800, 900],
  "Barlow":             [400, 500, 600, 700, 800, 900],
  "Barlow Condensed":   [400, 500, 600, 700],
  "Josefin Sans":       [400, 500, 600, 700],
  "Oswald":             [400, 500, 600, 700],
  "Roboto":             [400, 500, 700, 900],
  "Lato":               [400, 700, 900],
  "Unbounded":          [400, 500, 600, 700, 800, 900],
  "Playfair Display":   [400, 500, 600, 700, 800, 900],
  "Lora":               [400, 500, 600, 700],
  "Cormorant Garamond": [400, 500, 600, 700],
  "Bebas Neue":         [400],
  "Anton":              [400],
  "Archivo Black":      [400],
  "Fredoka One":        [400],
  "Caveat":             [400, 500, 600, 700],
  "Patrick Hand":       [400],
};

// Desktop UA so Google returns woff2 (latin) URLs.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const slug = (family) => family.replace(/\s+/g, "");

async function fetchCss(family, weight) {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`css ${res.status}`);
  return res.text();
}

// Pull the latin woff2 URL — Google emits subsets in order, latin is last.
function latinWoff2Url(css) {
  const urls = [...css.matchAll(/url\((https:\/\/[^)]+\.woff2)\)/g)].map((m) => m[1]);
  return urls.length ? urls[urls.length - 1] : null;
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`woff2 ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const faces = [];
  let ok = 0, fail = 0;

  for (const [family, weights] of Object.entries(FONTS)) {
    for (const weight of weights) {
      const file = `${slug(family)}-${weight}.woff2`;
      try {
        const css = await fetchCss(family, weight);
        const url = latinWoff2Url(css);
        if (!url) throw new Error("no woff2 in css");
        await download(url, path.join(OUT_DIR, file));
        faces.push(
          `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};` +
          `font-display:swap;src:url('./${file}') format('woff2');}`
        );
        ok++;
        process.stdout.write(`  ✓ ${family} ${weight}\n`);
      } catch (e) {
        fail++;
        process.stdout.write(`  ✗ ${family} ${weight} — ${e.message}\n`);
      }
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, "fonts.css"), faces.join("\n") + "\n", "utf8");
  console.log(`\nDone: ${ok} faces downloaded, ${fail} skipped.`);
  console.log(`Wrote ${path.join(OUT_DIR, "fonts.css")}`);
  console.log(`Next: npm run prebundle, then commit public/fonts/.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
