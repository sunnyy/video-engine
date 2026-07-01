/**
 * pullTimelines.mjs — dev/validation helper. Pulls the most recent REAL project timeline for each
 * video service (by `source`) from the projects table and writes each to an output dir, so the
 * shadow-diff harness can validate @vidquence/render against Remotion on genuine per-service output.
 *
 * Usage: node --env-file=.env scripts/pullTimelines.mjs [--out DIR] [--sources a,b,c]
 * Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env. Nothing is written to the DB.
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const getArg = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const outDir = path.resolve(getArg("out", "./.shadow-out/timelines"));
const SOURCES = (getArg("sources", "promo_video,product_video,social_video,typography_video,talking_head,app_video,video_clip"))
  .split(",").map((s) => s.trim()).filter(Boolean);

const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
fs.mkdirSync(outDir, { recursive: true });

for (const source of SOURCES) {
  const { data, error } = await supa
    .from("projects")
    .select("id, name, source, safe_project_json, created_at")
    .eq("source", source)
    .not("safe_project_json", "is", null)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) { console.log(`[${source}] query error: ${error.message}`); continue; }
  // Pick the newest row whose timeline actually has layers (skip incomplete/placeholder saves).
  const row = (data || []).find((r) => Array.isArray(r.safe_project_json?.layers) && r.safe_project_json.layers.length > 0);
  if (!row) { console.log(`[${source}] no usable project found`); continue; }
  const tl = row.safe_project_json;
  const file = path.join(outDir, `${source}.json`);
  fs.writeFileSync(file, JSON.stringify(tl));
  console.log(`[${source}] ${row.id} "${row.name}" — ${tl.layers.length} layers, ${tl.format?.duration ?? "?"}s → ${file}`);
}
console.log("done.");
