#!/usr/bin/env node
/**
 * fetch short sound effects from Freesound API → upload to Supabase storage → insert into sfx_tracks.
 *
 * Run:  npm run fetch-sfx                       (all categories)
 *       npm run fetch-sfx -- --cat=whoosh       (one category)
 *       npm run fetch-sfx -- --per=5            (override candidates per category)
 *
 * Categories mirror the sound palettes in src/services/ai/shared/sfx.js. Each stored row is
 * keyed "<category>_<n>" so the library can hold several variants per category; sfx.js groups
 * by category (strips the _<n> suffix) and picks one at random per cut, so more rows = more
 * variety. Existing hand-uploaded exact keys (e.g. "whoosh") keep working — they're just a
 * category of one. Curate afterwards in Admin → SFX Library (listen / activate / delete).
 *
 * Grows the library on re-run (numbers continue after existing rows). Best-effort dedupe by title.
 *
 * sfx_tracks columns used: key, title, mood, energy, duration, storage_path, public_url, is_active.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Readable } from "stream";
import { finished } from "stream/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FREESOUND_KEY = process.env.FREESOUND_API_KEY;
const SUPABASE_URL  = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET         = "user-assets";
const STORAGE_PREFIX = "sfx";
const DEFAULT_PER_CAT = 3;

if (!FREESOUND_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing required env vars: FREESOUND_API_KEY, VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const TEMP_DIR = path.join(__dirname, "..", ".temp-sfx");
fs.mkdirSync(TEMP_DIR, { recursive: true });

// category (palette key in sfx.js) → Freesound query. Kept in sync with PALETTES.
const SFX_QUERIES = {
  cinematic_boom:    "cinematic boom impact",
  cinematic_impact:  "cinematic impact hit",
  ground_impact:     "heavy ground impact thud",
  impact:            "impact hit short",
  soft_hit:          "soft hit ui",
  impact_soft:       "soft impact",
  swoosh_cinematic:  "cinematic swoosh transition",
  whoosh_soft:       "soft whoosh transition",
  whoosh:            "whoosh transition",
  whoosh_hard:       "hard whoosh transition",
  pop_soft:          "soft pop ui",
  pop_hard:          "pop ui",
  classic_ding:      "ding notification bell",
  click:             "ui click button",
  notification_ding: "notification ding alert",
  great_success:     "success chime reward",
  crowd_cheer_short: "crowd cheer short",
  "cash-register":   "cash register cha ching",
  tick_clock:        "clock tick",
  countdown_beep:    "countdown beep",
  tick_digital:      "digital tick beep",
  glitch_short:      "glitch short digital",
  glitch_long:       "glitch digital noise",
};

const ENERGY_BY_CAT = (cat) =>
  /boom|impact|glitch|success|cheer/.test(cat) ? "high" :
  /whoosh|swoosh|tick|countdown/.test(cat)     ? "medium" : "low";

async function searchFreesound(query, pageSize) {
  const params = new URLSearchParams({
    query,
    // CC0 only — free for commercial use, no attribution required (safe for a paid product).
    filter:    'type:mp3 duration:[0.2 TO 6] license:"Creative Commons 0"',
    fields:    "id,name,username,duration,previews,tags",
    page_size: String(pageSize),
    page:      "1",
    token:     FREESOUND_KEY,
  });
  const res = await fetch(`https://freesound.org/apiv2/search/text/?${params}`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Freesound HTTP ${res.status}`);
  const data = await res.json();
  if (data.detail) throw new Error(`Freesound: ${data.detail}`);
  return data.results || [];
}

async function downloadFile(url, dest) {
  const res = await fetch(url, { headers: { Authorization: `Token ${FREESOUND_KEY}` }, signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`Download HTTP ${res.status}`);
  const ws = fs.createWriteStream(dest);
  await finished(Readable.fromWeb(res.body).pipe(ws));
}

async function uploadToSupabase(localPath, storageKey) {
  const buf = fs.readFileSync(localPath);
  const { error } = await supabase.storage.from(BUCKET).upload(storageKey, buf, { contentType: "audio/mpeg", upsert: true });
  if (error) throw new Error(`Storage: ${error.message}`);
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storageKey);
  return publicUrl;
}

async function insertRow(record) {
  const { error } = await supabase.from("sfx_tracks").insert([record]);
  if (error) throw new Error(`DB: ${error.message}`);
}

async function main() {
  const catArg = process.argv.find(a => a.startsWith("--cat="))?.slice(6);
  const perArg = parseInt(process.argv.find(a => a.startsWith("--per="))?.slice(6), 10);
  const perCat = Number.isInteger(perArg) && perArg > 0 ? perArg : DEFAULT_PER_CAT;

  const entries = Object.entries(SFX_QUERIES).filter(([c]) => !catArg || c === catArg);
  if (catArg && !entries.length) {
    console.error(`Unknown category "${catArg}". Valid: ${Object.keys(SFX_QUERIES).join(", ")}`);
    process.exit(1);
  }

  // Existing keys/titles → continue numbering + skip dupes.
  const { data: existing } = await supabase.from("sfx_tracks").select("key, title");
  const existingKeys   = new Set((existing || []).map(r => r.key));
  const existingTitles = new Set((existing || []).map(r => (r.title || "").toLowerCase()));

  console.log(`Freesound SFX Fetch${catArg ? ` (category: ${catArg})` : ""} — up to ${perCat}/category\n`);
  let total = 0, ok = 0;

  for (const [cat, query] of entries) {
    console.log(`\n── ${cat} ──`);
    let hits = [];
    try { hits = await searchFreesound(query, perCat * 3); }
    catch (err) { console.warn(`  query failed: ${err.message}`); continue; }

    // next index after any existing "<cat>" / "<cat>_<n>" rows
    let idx = 0;
    for (const k of existingKeys) {
      if (k === cat) idx = Math.max(idx, 1);
      const m = k.match(new RegExp(`^${cat.replace(/[-]/g, "\\$&")}_(\\d+)$`));
      if (m) idx = Math.max(idx, parseInt(m[1], 10));
    }

    let added = 0;
    for (const hit of hits) {
      if (added >= perCat) break;
      const audioUrl = hit.previews?.["preview-hq-mp3"];
      if (!audioUrl) continue;
      if (existingTitles.has((hit.name || "").toLowerCase())) continue; // best-effort dedupe

      const key        = `${cat}_${++idx}`;
      const localPath  = path.join(TEMP_DIR, `${key}.mp3`);
      const storageKey = `${STORAGE_PREFIX}/${key}.mp3`;
      total++;

      try {
        process.stdout.write(`  ↓ ${hit.name} … `);
        await downloadFile(audioUrl, localPath);
        const { size } = fs.statSync(localPath);
        if (size < 2000) throw new Error("file too small");

        process.stdout.write("uploading … ");
        const publicUrl = await uploadToSupabase(localPath, storageKey);

        await insertRow({
          key,
          title:        hit.name,
          mood:         null,
          energy:       ENERGY_BY_CAT(cat),
          duration:     hit.duration ? Math.round(hit.duration * 10) / 10 : null,
          storage_path: storageKey,
          public_url:   publicUrl,
          is_active:    true,
        });

        existingKeys.add(key);
        existingTitles.add((hit.name || "").toLowerCase());
        fs.unlinkSync(localPath);
        console.log("✓");
        ok++; added++;
      } catch (err) {
        console.log(`✗ (${err.message})`);
        try { fs.unlinkSync(localPath); } catch (_) {}
        idx--; // reuse the number for the next candidate
      }
      await new Promise(r => setTimeout(r, 300));
    }
    console.log(`  +${added}`);
  }

  try { fs.rmdirSync(TEMP_DIR); } catch (_) {}
  console.log(`\nDone: ${ok}/${total} sound effects stored.`);
}

main().catch(err => { console.error("\nFatal:", err.message); process.exit(1); });
