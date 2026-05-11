/**
 * upload-stickers.js
 *
 * One-time script to upload sticker PNGs to Supabase and tag them with GPT-4o Vision.
 *
 * SETUP:
 *   1. The stickers table should already exist (SQL below for reference):
 *        CREATE TABLE IF NOT EXISTS stickers (
 *          id uuid primary key default gen_random_uuid(),
 *          name text,
 *          storage_path text not null,
 *          public_url text not null,
 *          tags text[],
 *          category text,
 *          created_at timestamptz default now()
 *        );
 *
 *   2. Set STICKERS_FOLDER below to the folder containing your PNG/JPG files.
 *
 *   3. Run: node scripts/upload-stickers.js
 */

import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../.env") });

import fs   from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// ── CONFIG ────────────────────────────────────────────────────────────────────
const STICKERS_FOLDER = "C:/Users/Sunny/Desktop/EDITING MATERIAL/pngs"; // ← change this
const BUCKET          = "system-assets";
const STORAGE_PREFIX  = "stickers";
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function mimeType(filename) {
  return filename.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
}

function sanitizeName(name, originalFilename) {
  const ext = path.extname(originalFilename).toLowerCase() || ".png";
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")   // remove special chars
    .trim()
    .replace(/\s+/g, "_");          // spaces → underscores
  return { base, ext };
}

function uniqueStorageName(base, ext, usedNames) {
  let candidate = `${base}${ext}`;
  if (!usedNames.has(candidate)) {
    usedNames.add(candidate);
    return candidate;
  }
  let counter = 2;
  while (usedNames.has(`${base}_${counter}${ext}`)) counter++;
  const result = `${base}_${counter}${ext}`;
  usedNames.add(result);
  return result;
}

async function analyzeWithVision(filePath) {
  const base64 = fs.readFileSync(filePath).toString("base64");
  const mime   = mimeType(path.basename(filePath));

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mime};base64,${base64}`, detail: "low" },
          },
          {
            type: "text",
            text: `This is a sticker/PNG cutout image. Return ONLY JSON:
{
  "name": "short descriptive name",
  "category": "one of: character | object | money | food | animal | emoji | arrow | business | tech | other",
  "tags": ["tag1", "tag2", "tag3"]
}`,
          },
        ],
      },
    ],
  });

  const raw = response.choices[0]?.message?.content?.trim() || "{}";
  // Strip markdown fences if present
  const clean = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(clean);
}

async function processFile(filePath, filename, index, total, usedNames) {
  console.log(`Uploading ${index + 1}/${total}: ${filename}`);

  const fileBuffer = fs.readFileSync(filePath);

  // Step 1: Analyze with GPT-4o Vision first — we need the name for the storage path
  const meta = await analyzeWithVision(filePath);

  const name     = meta.name     || path.parse(filename).name;
  const category = meta.category || "other";
  const tags     = Array.isArray(meta.tags) ? meta.tags : [];

  // Step 2: Build a clean, AI-readable storage filename
  const { base, ext } = sanitizeName(name, filename);
  const storageFilename = uniqueStorageName(base, ext, usedNames);
  const storagePath     = `${STORAGE_PREFIX}/${storageFilename}`;

  // Step 3: Upload to Supabase Storage under the sanitized name
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType(filename),
      upsert: true,
    });

  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

  // Step 4: Get public URL
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const publicUrl = urlData.publicUrl;

  // Step 5: Insert into DB
  const { error: dbError } = await supabase.from("stickers").insert({
    name,
    storage_path: storagePath,
    public_url:   publicUrl,
    tags,
    category,
  });

  if (dbError) throw new Error(`DB insert failed: ${dbError.message}`);

  console.log(`  ✓ ${storageFilename} — ${name} [${category}] tags: ${tags.join(", ")}`);
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY in .env");
    process.exit(1);
  }
  if (!fs.existsSync(STICKERS_FOLDER)) {
    console.error(`Folder not found: ${STICKERS_FOLDER}`);
    process.exit(1);
  }

  const allFiles = fs.readdirSync(STICKERS_FOLDER).filter(f =>
    /\.(png|jpg|jpeg)$/i.test(f)
  );

  if (allFiles.length === 0) {
    console.log("No PNG/JPG files found in folder.");
    return;
  }

  console.log(`Found ${allFiles.length} image(s) in ${STICKERS_FOLDER}\n`);

  let succeeded = 0;
  let failed    = 0;
  const usedNames = new Set(); // tracks sanitized filenames to avoid collisions

  for (let i = 0; i < allFiles.length; i++) {
    const filename = allFiles[i];
    const filePath = path.join(STICKERS_FOLDER, filename);
    try {
      await processFile(filePath, filename, i, allFiles.length, usedNames);
      succeeded++;
    } catch (err) {
      console.error(`  ✗ ${filename}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. ${succeeded} uploaded, ${failed} failed.`);
}

main();
