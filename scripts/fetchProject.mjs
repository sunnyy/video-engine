/**
 * scripts/fetchProject.mjs
 * Pull a project's timeline JSON straight from Supabase into a local file so we
 * can audit it without manual copy-paste.
 *
 * Usage:
 *   node --env-file=.env scripts/fetchProject.mjs <projectId> [outFile]
 *   node --env-file=.env scripts/fetchProject.mjs            # latest promo project
 *
 * Default outFile is temp.json.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Run with: node --env-file=.env scripts/fetchProject.mjs <id>");
  process.exit(1);
}

const sb  = createClient(url, key);
const id  = process.argv[2] && !process.argv[2].endsWith(".json") ? process.argv[2] : null;
const out = process.argv.find(a => a.endsWith(".json")) || "temp.json";

const cols = "id,name,source,safe_project_json,raw_ai_json,created_at";
let row, error;
if (id) {
  ({ data: row, error } = await sb.from("projects").select(cols).eq("id", id).single());
} else {
  ({ data: row, error } = await sb.from("projects").select(cols)
    .eq("source", "promo_video").order("created_at", { ascending: false }).limit(1).maybeSingle());
}

if (error)            { console.error("Query failed:", error.message); process.exit(1); }
if (!row)             { console.error("No matching project found."); process.exit(1); }
if (!row.safe_project_json) { console.error(`Project ${row.id} has no safe_project_json.`); process.exit(1); }

fs.writeFileSync(out, JSON.stringify(row.safe_project_json, null, 2));
if (row.raw_ai_json) fs.writeFileSync("html.json", JSON.stringify(row.raw_ai_json, null, 2));

const layers = row.safe_project_json.layers || [];
console.log(`Wrote ${out} (+ html.json) — project ${row.id} "${row.name}" — ${layers.length} layers, created ${row.created_at}`);
