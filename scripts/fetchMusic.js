#!/usr/bin/env node
/**
 * fetch tracks from Freesound API → upload MP3s to Supabase storage → insert into music_tracks.
 *
 * Run:  npm run fetch-music                 (all moods)
 *       npm run fetch-music -- --mood=tense (one mood)
 *       npm run fetch-music -- --per=30     (override tracks per mood)
 *
 * Idempotent on freesound_id (upsert) — safe to re-run to grow the library; already-stored
 * tracks are skipped, new hits are added. Curate afterwards in Admin → Music Library
 * (listen / re-tag mood / activate / delete).
 *
 * Moods are the CANONICAL set the services request via injectMusic (shared/music.js).
 * Keeping this list in sync with that vocabulary is what stops wrong-mood music.
 *
 * music_tracks table SQL (run in Supabase SQL editor first):
 *   create table music_tracks (
 *     id uuid primary key default gen_random_uuid(),
 *     key text, title text not null, artist text, duration int,
 *     mood text not null, energy text, genre text, bpm int,
 *     freesound_id int unique, file_path text, storage_path text,
 *     public_url text not null, preview_url text, tags text[],
 *     is_active boolean default true, created_at timestamptz default now()
 *   );
 *   create index on music_tracks(mood, is_active);
 *   grant select on music_tracks to anon, authenticated;
 *   grant all    on music_tracks to service_role;
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
const STORAGE_PREFIX = "music";

const DEFAULT_PER_MOOD = 20;

if (!FREESOUND_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing required env vars:");
  if (!FREESOUND_KEY) console.error("  FREESOUND_API_KEY");
  if (!SUPABASE_URL)  console.error("  VITE_SUPABASE_URL");
  if (!SUPABASE_KEY)  console.error("  SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const TEMP_DIR = path.join(__dirname, "..", ".temp-music");
fs.mkdirSync(TEMP_DIR, { recursive: true });

// Canonical moods → varied query phrasings (more phrasings = more variety per mood).
const MOOD_QUERIES = {
  energetic: ["upbeat energetic background music", "driving electronic energetic", "high energy sport rock background"],
  upbeat:    ["happy upbeat corporate background", "positive uplifting pop background", "feel good upbeat acoustic"],
  calm:      ["calm relaxing ambient background", "soft piano calm background", "gentle meditation ambient"],
  chill:     ["chill lofi background music", "downtempo chill beat", "relaxed chillhop background"],
  dramatic:  ["dramatic cinematic epic", "epic trailer orchestral", "powerful dramatic build"],
  cinematic: ["cinematic emotional score", "inspiring cinematic orchestral", "atmospheric cinematic underscore"],
  playful:   ["playful happy cheerful music", "quirky fun ukulele background", "whimsical playful background"],
  inspiring: ["inspiring motivational corporate", "uplifting inspirational piano", "hopeful inspiring background"],
  tense:     ["tense suspense background", "suspenseful dark tension", "ominous tension underscore"],
  luxury:    ["elegant sophisticated background", "smooth jazz lounge luxury", "ambient luxury fashion"],
};

const ENERGY_BY_MOOD = {
  energetic: "high", upbeat: "high", playful: "high", dramatic: "high", tense: "high",
  cinematic: "medium", inspiring: "medium",
  luxury: "low", calm: "low", chill: "low",
};

async function searchFreesound(query, pageSize) {
  const params = new URLSearchParams({
    query,
    // CC0 only — free for commercial use, no attribution required (safe for a paid product).
    filter:    'type:mp3 duration:[30 TO 180] license:"Creative Commons 0"',
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

async function insertTrack(record) {
  const { error } = await supabase.from("music_tracks").upsert(record, { onConflict: "freesound_id" });
  if (error) throw new Error(`DB: ${error.message}`);
}

async function processTrack(hit, mood) {
  const audioUrl = hit.previews?.["preview-hq-mp3"];
  if (!audioUrl) { console.log(`  [skip] no preview — "${hit.name}"`); return false; }

  const slug       = `${mood}_${hit.id}`;
  const localPath  = path.join(TEMP_DIR, `${slug}.mp3`);
  const storageKey = `${STORAGE_PREFIX}/${slug}.mp3`;

  try {
    process.stdout.write(`  ↓ ${hit.name} … `);
    await downloadFile(audioUrl, localPath);
    const { size } = fs.statSync(localPath);
    if (size < 10000) throw new Error("file too small");

    process.stdout.write("uploading … ");
    const publicUrl = await uploadToSupabase(localPath, storageKey);

    await insertTrack({
      key:          slug,
      title:        hit.name,
      artist:       hit.username || null,
      duration:     hit.duration ? Math.round(hit.duration) : null,
      mood,
      energy:       ENERGY_BY_MOOD[mood] || "medium",
      genre:        null,
      bpm:          null,
      freesound_id: hit.id,
      file_path:    storageKey,
      storage_path: storageKey,   // so Admin delete can also remove the storage file
      public_url:   publicUrl,
      preview_url:  audioUrl,
      tags:         Array.isArray(hit.tags) ? hit.tags.slice(0, 10) : [],
      is_active:    true,
    });

    fs.unlinkSync(localPath);
    console.log("✓");
    return true;
  } catch (err) {
    console.log(`✗ (${err.message})`);
    try { fs.unlinkSync(localPath); } catch (_) {}
    return false;
  }
}

async function main() {
  const moodArg = process.argv.find(a => a.startsWith("--mood="))?.slice(7);
  const perArg  = parseInt(process.argv.find(a => a.startsWith("--per="))?.slice(6), 10);
  const perMood = Number.isInteger(perArg) && perArg > 0 ? perArg : DEFAULT_PER_MOOD;

  const entries = Object.entries(MOOD_QUERIES).filter(([m]) => !moodArg || m === moodArg);
  if (moodArg && !entries.length) {
    console.error(`Unknown mood "${moodArg}". Valid: ${Object.keys(MOOD_QUERIES).join(", ")}`);
    process.exit(1);
  }

  console.log(`Freesound Music Fetch${moodArg ? ` (mood: ${moodArg})` : ""} — up to ${perMood}/mood\n`);
  let total = 0, ok = 0;

  for (const [mood, queries] of entries) {
    console.log(`\n── ${mood.toUpperCase()} ──`);
    const seen = new Set();
    const hits = [];

    for (const query of queries) {
      if (hits.length >= perMood) break;
      try {
        const results = await searchFreesound(query, perMood);
        for (const h of results) {
          if (!seen.has(h.id) && hits.length < perMood) { seen.add(h.id); hits.push(h); }
        }
      } catch (err) {
        console.warn(`  "${query}" failed: ${err.message}`);
      }
      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`  ${hits.length} candidates`);
    for (const hit of hits) {
      total++;
      if (await processTrack(hit, mood)) ok++;
      await new Promise(r => setTimeout(r, 300));
    }
  }

  try { fs.rmdirSync(TEMP_DIR); } catch (_) {}
  console.log(`\nDone: ${ok}/${total} tracks stored.`);
}

main().catch(err => { console.error("\nFatal:", err.message); process.exit(1); });
