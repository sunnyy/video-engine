#!/usr/bin/env node
/**
 * One-time script: fetch tracks from Freesound API,
 * upload MP3s to Supabase storage, insert metadata into music_tracks table.
 *
 * Run: npm run fetch-music
 *
 * music_tracks table SQL (run in Supabase SQL editor first):
 *   create table music_tracks (
 *     id uuid primary key default gen_random_uuid(),
 *     title text not null,
 *     artist text,
 *     duration int,
 *     mood text not null,
 *     genre text,
 *     bpm int,
 *     freesound_id int unique,
 *     file_path text,
 *     public_url text not null,
 *     preview_url text,
 *     tags text[],
 *     is_active boolean default true,
 *     created_at timestamptz default now()
 *   );
 *   create index on music_tracks(mood, is_active);
 *   -- Data API grants (required for tables created from Oct 30, 2026 onward):
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
const TRACKS_PER_MOOD = 8;

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

const MOOD_QUERIES = {
  energetic: "upbeat energetic background music",
  calm:      "calm relaxing ambient background",
  luxury:    ["cinematic elegant background", "sophisticated orchestral", "ambient luxury"],
  playful:   "playful happy cheerful music",
  dramatic:  "dramatic cinematic epic",
};

async function searchFreesound(query, page = 1) {
  const params = new URLSearchParams({
    query,
    filter:   "type:mp3 duration:[30 TO 180]",
    fields:   "id,name,username,duration,previews,tags",
    page_size: String(TRACKS_PER_MOOD),
    page:      String(page),
    token:     FREESOUND_KEY,
  });
  const url = `https://freesound.org/apiv2/search/text/?${params}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Freesound HTTP ${res.status}`);
  const data = await res.json();
  if (data.detail) throw new Error(`Freesound: ${data.detail}`);
  return data.results || [];
}

async function downloadFile(url, dest) {
  const res = await fetch(url, {
    headers: { Authorization: `Token ${FREESOUND_KEY}` },
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Download HTTP ${res.status}`);
  const ws = fs.createWriteStream(dest);
  await finished(Readable.fromWeb(res.body).pipe(ws));
}

async function uploadToSupabase(localPath, storageKey) {
  const buf = fs.readFileSync(localPath);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storageKey, buf, { contentType: "audio/mpeg", upsert: true });
  if (error) throw new Error(`Storage: ${error.message}`);
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storageKey);
  return publicUrl;
}

async function insertTrack(record) {
  const { error } = await supabase
    .from("music_tracks")
    .upsert(record, { onConflict: "freesound_id" });
  if (error) throw new Error(`DB: ${error.message}`);
}

async function processTrack(hit, mood, index) {
  const audioUrl = hit.previews?.["preview-hq-mp3"];
  if (!audioUrl) {
    console.log(`  [skip] no preview URL — "${hit.name}"`);
    return false;
  }

  const filename   = `${mood}_${index}.mp3`;
  const localPath  = path.join(TEMP_DIR, filename);
  const storageKey = `${STORAGE_PREFIX}/${filename}`;

  try {
    process.stdout.write(`  ↓ ${hit.name} … `);
    await downloadFile(audioUrl, localPath);

    const { size } = fs.statSync(localPath);
    if (size < 10000) throw new Error("file too small");

    process.stdout.write("uploading … ");
    const publicUrl = await uploadToSupabase(localPath, storageKey);

    await insertTrack({
      title:       hit.name,
      artist:      hit.username || null,
      duration:    hit.duration ? Math.round(hit.duration) : null,
      mood,
      genre:       null,
      bpm:         null,
      freesound_id: hit.id,
      file_path:   storageKey,
      public_url:  publicUrl,
      preview_url: audioUrl,
      tags:        Array.isArray(hit.tags) ? hit.tags.slice(0, 10) : [],
      is_active:   true,
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
  const entries = Object.entries(MOOD_QUERIES).filter(([m]) => !moodArg || m === moodArg);

  if (moodArg && !entries.length) {
    console.error(`Unknown mood "${moodArg}". Valid: ${Object.keys(MOOD_QUERIES).join(", ")}`);
    process.exit(1);
  }

  console.log(`Freesound Music Fetch${moodArg ? ` (mood: ${moodArg})` : ""}\n`);

  let total = 0;
  let ok    = 0;

  for (const [mood, queryOrList] of entries) {
    console.log(`\n── ${mood.toUpperCase()} ──`);
    const queries = Array.isArray(queryOrList) ? queryOrList : [queryOrList];

    const seen = new Set();
    const hits = [];

    for (const query of queries) {
      if (hits.length >= TRACKS_PER_MOOD) break;
      try {
        const results = await searchFreesound(query);
        for (const h of results) {
          if (!seen.has(h.id) && hits.length < TRACKS_PER_MOOD) {
            seen.add(h.id);
            hits.push(h);
          }
        }
      } catch (err) {
        console.warn(`  "${query}" failed: ${err.message}`);
      }
      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`  ${hits.length} tracks found`);

    let idx = 0;
    for (const hit of hits) {
      total++;
      const success = await processTrack(hit, mood, ++idx);
      if (success) ok++;
      await new Promise(r => setTimeout(r, 300));
    }
  }

  try { fs.rmdirSync(TEMP_DIR); } catch (_) {}
  console.log(`\nDone: ${ok}/${total} tracks stored.`);
}

main().catch(err => { console.error("\nFatal:", err.message); process.exit(1); });
