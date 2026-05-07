import express from "express";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import https   from "node:https";
import http    from "node:http";
import multer from "multer";
import compressVideo from "../compressVideo.cjs";
import compressAudio from "../compressAudio.cjs";
import {
  supabaseAdmin, openai, requireAuth, deductCredits,
  upload, uploadMemory, TEMP_DIR, uuidv4,
} from "../middleware/shared.js";

export const router = express.Router();

/* ---------------- AI ROUTE ---------------- */
router.post("/generate", requireAuth, async (req, res) => {
  try {
    const { prompt, projectId, model: reqModel } = req.body;
    const deduction = await deductCredits(req.user.id, 10, "base_generation", "Video generation", projectId);
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    const completion = await openai.chat.completions.create({
      model: reqModel || "gpt-4o",
      messages: [
        { role: "system", content: "You are a strict JSON generator. Output only valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });
    const raw = completion.choices[0].message.content;
    const cleaned = raw
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    res.json(parsed);
  } catch (err) {
    console.error("[generate]", err.message);
    res.status(500).json({ error: "AI generation failed" });
  }
});

/* ---------------- TOPIC RESEARCH ---------------- */
router.post("/research-topic", requireAuth, async (req, res) => {
  try {
    const { topic, videoType, audience, language } = req.body;
    if (!topic) return res.status(400).json({ error: "topic required" });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 800,
      messages: [
        {
          role: "system",
          content: "You are a research assistant for a viral video scriptwriter. Your job is to find the most interesting, specific, counterintuitive, and current facts about a topic that will make a short-form video script compelling. Return ONLY a JSON object, no markdown.",
        },
        {
          role: "user",
          content: `Research this topic for a viral short-form video script:

TOPIC: ${topic}
VIDEO TYPE: ${videoType || "viral"}
AUDIENCE: ${audience || "general"}
LANGUAGE: ${language || "english"}

Return a JSON object with:
{
  "key_facts": ["3-5 specific facts with real numbers, names, dates"],
  "counterintuitive_angle": "one surprising or contrarian take on this topic",
  "hook_ideas": ["2-3 possible opening lines that would stop someone scrolling"],
  "specific_entities": ["real people, brands, products, events related to this topic"],
  "current_context": "what is happening RIGHT NOW related to this topic in 2025-2026",
  "emotional_angle": "what emotion does this topic tap into — fear, awe, anger, curiosity, inspiration"
}

Be specific. Use real numbers. No vague generalities. If you don't know exact current stats, use the best known figures.`,
        },
      ],
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/```json\n?/gi, "").replace(/```\n?/gi, "").trim());
    } catch {
      return res.status(500).json({ error: "Research returned invalid JSON" });
    }
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- IMAGE SEARCH (Bing scrape — no API key) ---------------- */
async function bingScrapeImages(query) {
  const url = `https://www.bing.com/images/async?q=${encodeURIComponent(query)}&first=1&count=10&adlt=Moderate&mmasync=1`;
  const r   = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: {
      "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer":         "https://www.bing.com/images/search",
    },
  });
  if (!r.ok) {
    const err = new Error(`Bing scrape HTTP ${r.status}`);
    err.httpStatus = r.status;
    throw err;
  }
  const html = await r.text();

  // Bing embeds image URLs in multiple formats depending on region/version:
  // 1. HTML-encoded:  murl&quot;:&quot;URL&quot;
  // 2. Raw JSON:      "murl":"URL"
  // Try both and deduplicate.
  const murlsEncoded = [...html.matchAll(/murl&quot;:&quot;(https?:[^&"]+)&quot;/g)].map(m => m[1]);
  const murlsRaw     = [...html.matchAll(/"murl"\s*:\s*"(https?:[^"]+)"/g)].map(m => m[1]);
  const turlsEncoded = [...html.matchAll(/turl&quot;:&quot;(https?:[^&"]+)&quot;/g)].map(m => m[1]);
  const turlsRaw     = [...html.matchAll(/"turl"\s*:\s*"(https?:[^"]+)"/g)].map(m => m[1]);

  // Merge and deduplicate while preserving order
  const dedupe = (...arrs) => [...new Set(arrs.flat().filter(Boolean))];
  const murls = dedupe(murlsEncoded, murlsRaw);
  const turls = dedupe(turlsEncoded, turlsRaw);

  const results = [];
  for (let i = 0; i < Math.max(murls.length, turls.length); i++) {
    results.push({ murl: murls[i] || null, turl: turls[i] || null });
  }

  console.log(`[search] Bing found ${results.length} results for "${query}" (encoded:${murlsEncoded.length} raw:${murlsRaw.length})`);
  if (results.length === 0) console.warn(`[search] Zero results — Bing HTML may have changed format. Check /api/test-search?q=${encodeURIComponent(query)}`);
  return results;
}

/* Download image to a temp file, return { localUrl, filePath } */
async function cacheImageStrict(url) {
  if (!url) return null;
  if (/\.(svg|gif|ico)/i.test(url.split("?")[0])) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 5000) return null;
    const ext      = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
    const fname    = `search-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = path.join(TEMP_DIR, fname);
    fs.writeFileSync(filePath, buffer);
    return { localUrl: `http://localhost:5000/renders/${fname}`, filePath, buffer, contentType: ct, ext, fname };
  } catch {
    return null;
  }
}

router.post("/search-image", requireAuth, async (req, res) => {
  const { query } = req.body;
  if (!query?.trim()) return res.status(400).json({ error: "No query" });

  try {
    const results = await bingScrapeImages(query);
    if (!results.length) return res.status(404).json({ error: "No results", query });

    const isLogoQuery = /logo|poster|icon/i.test(query);
    const urls = results.map(r => r.murl).filter(Boolean);
    const sorted = isLogoQuery
      ? [...urls.filter(u => /\.png(\?|$)/i.test(u)), ...urls.filter(u => !/\.png(\?|$)/i.test(u))]
      : urls;

    for (const imgUrl of sorted) {
      const cached = await cacheImageStrict(imgUrl);
      if (cached) {
        // Upload directly to Supabase storage so the URL is permanent and accessible
        // from any environment (no localhost round-trip through the browser).
        try {
          const storageKey = `search/${req.user.id}/${cached.fname}`;
          const { error: uploadErr } = await supabaseAdmin.storage
            .from("user-assets")
            .upload(storageKey, cached.buffer, { contentType: cached.contentType, upsert: false });
          if (!uploadErr) {
            const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(storageKey);
            try { fs.unlinkSync(cached.filePath); } catch {}
            console.log(`[search] Uploaded to Supabase for "${query}": ${publicUrl}`);
            res.json({ url: publicUrl, source: "bing_scrape", query });
            return;
          }
          console.warn(`[search] Supabase upload failed, falling back to temp URL`);
        } catch (e) {
          console.warn(`[search] Supabase upload error: ${e.message}`);
        }
        // Fallback: temp local URL (only works in local dev)
        res.json({ url: cached.localUrl, source: "bing_scrape", query });
        setTimeout(() => { try { fs.unlinkSync(cached.filePath); } catch {} }, 30_000);
        return;
      }
    }

    res.status(404).json({ error: "No usable image found", query });
  } catch (e) {
    // Bing blocks cloud-hosting IPs (403/429) or the scrape timed out.
    // Return 503 (upstream dependency unavailable) — not a server bug.
    // The generation pipeline checks res.ok and falls through to AI image gen.
    console.warn(`[search] Bing unavailable for "${query}": ${e.message}`);
    res.status(503).json({ error: "Image search unavailable", detail: e.message });
  }
});

/* Quick test endpoint — GET /api/test-search?q=ChatGPT+logo */
router.get("/test-search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Pass ?q=query" });
  try {
    const results = await bingScrapeImages(query);
    res.json({ query, count: results.length, results: results.slice(0, 5) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ---------------- FAL.AI IMAGE GENERATION ---------------- */
router.post("/generate-image", requireAuth, async (req, res) => {
  try {
    const { prompt, orientation, projectId } = req.body;
    const deduction = await deductCredits(req.user.id, 2, "ai_image", "AI image generation", projectId);
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    if (!process.env.FAL_API_KEY) return res.status(500).json({ error: "FAL_API_KEY not set" });

    const imageSize = orientation === "9:16" ? "portrait_16_9" : "landscape_16_9";

    // Retry up to 2 times for 500 errors only.
    // 502/503/429 = fal.ai is overloaded — fail immediately so caller falls back to Bing.
    const NO_RETRY_CODES = new Set([429, 502, 503]);
    let url = null;
    let lastErr = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 1000));
      try {
        const falRes = await fetch("https://fal.run/fal-ai/flux/schnell", {
          method:  "POST",
          headers: { "Authorization": `Key ${process.env.FAL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, image_size: imageSize, num_images: 1, num_inference_steps: 4, enable_safety_checker: false }),
        });

        if (!falRes.ok) {
          lastErr = await falRes.text();
          console.warn(`[fal.ai] Attempt ${attempt + 1} failed (${falRes.status}):`, lastErr.slice(0, 80));
          if (NO_RETRY_CODES.has(falRes.status)) break; // no point retrying
          continue;
        }

        const data = await falRes.json();
        url = data?.images?.[0]?.url || null;
        if (url) break;
        lastErr = "No image URL in response";
      } catch (e) {
        lastErr = e.message;
        console.warn(`[fal.ai] Attempt ${attempt + 1} threw:`, lastErr);
      }
    }

    if (!url) {
      console.error("[fal.ai] Failed:", lastErr);
      return res.status(500).json({ error: "Fal.ai request failed" });
    }

    res.json({ url });
  } catch (err) {
    console.error("[fal.ai]", err);
    res.status(500).json({ error: "Image generation failed" });
  }
});

/* Proxy-download a fal.media URL server-side (avoids browser QUIC/HTTP3 issues) */
router.post("/proxy-image", requireAuth, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "url required" });

    const imgRes = await fetch(url);
    if (!imgRes.ok) return res.status(502).json({ error: "Failed to fetch image" });

    const buffer      = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", buffer.byteLength);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("[proxy-image]", err);
    res.status(500).json({ error: "Proxy failed" });
  }
});

/* Proxy-stream a remote video URL server-side (avoids CORS/referrer restrictions on CDNs like Pixabay).
   No auth required — this only proxies publicly accessible CDN URLs. */
router.get("/proxy-video", (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url required" });

  let parsedUrl;
  try { parsedUrl = new URL(url); } catch {
    return res.status(400).json({ error: "invalid url" });
  }

  const lib     = parsedUrl.protocol === "https:" ? https : http;
  const options = {
    hostname: parsedUrl.hostname,
    port:     parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
    path:     parsedUrl.pathname + parsedUrl.search,
    method:   "GET",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Referer":    "https://pixabay.com/",
      ...(req.headers.range ? { "Range": req.headers.range } : {}),
    },
  };

  const upstream = lib.request(options, (upRes) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", upRes.headers["content-type"] || "video/mp4");
    if (upRes.headers["content-length"]) res.setHeader("Content-Length",  upRes.headers["content-length"]);
    if (upRes.headers["content-range"])  res.setHeader("Content-Range",   upRes.headers["content-range"]);
    if (upRes.headers["accept-ranges"])  res.setHeader("Accept-Ranges",   upRes.headers["accept-ranges"]);
    res.writeHead(upRes.statusCode || 200);
    upRes.pipe(res);
  });

  upstream.on("error", (err) => {
    console.error("[proxy-video]", err.message);
    if (!res.headersSent) res.status(500).json({ error: "Proxy failed" });
  });

  req.on("close", () => upstream.destroy());
  upstream.end();
});

/* ── Upload + compress avatar video → Supabase (bypasses client bucket size limit) ── */
router.post("/upload-avatar", requireAuth, upload.single("video"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const inputPath  = req.file.path;
    const outputPath = path.join(TEMP_DIR, `avatar-${Date.now()}.mp4`);

    await compressVideo(inputPath, outputPath);
    fs.unlinkSync(inputPath);

    const buffer      = fs.readFileSync(outputPath);
    fs.unlinkSync(outputPath);

    const filePath = `${req.user.id}/avatar-${Date.now()}.mp4`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("user-assets")
      .upload(filePath, buffer, { contentType: "video/mp4", upsert: true });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("user-assets")
      .getPublicUrl(filePath);

    res.json({ url: publicUrl, filePath });
  } catch (err) {
    console.error("[upload-avatar]", err.message);
    res.status(500).json({ error: err.message || "Avatar upload failed" });
  }
});

router.post("/compress", requireAuth, upload.single("video"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const inputPath  = req.file.path;
    const outputPath = path.join(TEMP_DIR, `compressed-${Date.now()}.mp4`);
    await compressVideo(inputPath, outputPath);
    const buffer = fs.readFileSync(outputPath);
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
    res.setHeader("Content-Type", "video/mp4");
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Compression failed" });
  }
});

/* ---------------- COMPRESSION AUDIO ---------------- */
router.post("/compress-audio", requireAuth, upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const inputPath  = req.file.path;
    const outputPath = path.join(TEMP_DIR, `compressed-audio-${Date.now()}.m4a`);
    await compressAudio(inputPath, outputPath);
    const buffer = fs.readFileSync(outputPath);
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
    res.setHeader("Content-Type", "audio/mp4");
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Audio compression failed" });
  }
});

/* ── Talking Head: Transcription via Fal.ai Whisper ── */
router.post("/transcribe", requireAuth, upload.single("video"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No video file uploaded" });

    const deduction = await deductCredits(req.user.id, 3, "transcription", "Video transcription (Whisper)", null);
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });

    // Extract audio only — Whisper only needs audio, not the full video.
    // A 65 MB video becomes ~3–5 MB mp3, well within OpenAI Whisper's 25 MB limit.
    const audioPath = req.file.path + ".mp3";
    await new Promise((resolve, reject) => {
      ffmpeg(req.file.path)
        .noVideo()
        .audioCodec("libmp3lame")
        .audioBitrate("64k")
        .audioChannels(1)
        .on("end", resolve)
        .on("error", reject)
        .save(audioPath);
    });
    fs.unlinkSync(req.file.path); // original video no longer needed

    // Transcribe via OpenAI Whisper — reads directly from disk, no external storage needed
    let transcription;
    try {
      transcription = await openai.audio.transcriptions.create({
        file:             fs.createReadStream(audioPath),
        model:            "whisper-1",
        response_format:  "verbose_json",
        timestamp_granularities: ["segment"],
      });
    } finally {
      fs.unlink(audioPath, () => {}); // clean up regardless of success/failure
    }

    const transcript = transcription.text || "";
    const segments   = (transcription.segments || []).map(s => ({
      text:  s.text?.trim() || "",
      start: s.start ?? 0,
      end:   s.end   ?? 0,
    })).filter(s => s.text);

    res.json({ transcript, segments });
  } catch (err) {
    console.error("[transcribe]", err.message);
    res.status(500).json({ error: err.message || "Transcription failed" });
  }
});

/* ── Transcription Service ─────────────────────────────────────────── */

const uploadTranscription = multer({
  dest: TEMP_DIR,
  limits: { fileSize: 500 * 1024 * 1024 },
});

function getFileDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata?.format?.duration || 0);
    });
  });
}

router.post("/transcription/transcribe", requireAuth, uploadTranscription.single("file"), async (req, res) => {
  const tempFiles = [];
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    tempFiles.push(req.file.path);

    let durationSeconds = 0;
    try {
      durationSeconds = await getFileDuration(req.file.path);
    } catch (e) {
      console.warn("[transcription] ffprobe failed, defaulting to 60s:", e.message);
      durationSeconds = 60;
    }

    const creditsUsed = Math.max(2, Math.ceil(durationSeconds / 60) * 2);
    const deduction = await deductCredits(req.user.id, creditsUsed, "transcription_service", "Transcription service", null);
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });

    // Extract audio — Whisper works on audio only, keeps file small
    const audioPath = req.file.path + ".mp3";
    tempFiles.push(audioPath);
    await new Promise((resolve, reject) => {
      ffmpeg(req.file.path)
        .noVideo()
        .audioCodec("libmp3lame")
        .audioBitrate("64k")
        .audioChannels(1)
        .on("end", resolve)
        .on("error", reject)
        .save(audioPath);
    });

    const transcription = await openai.audio.transcriptions.create({
      file:            fs.createReadStream(audioPath),
      model:           "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    const transcript = transcription.text || "";
    const segments   = (transcription.segments || []).map(s => ({
      start: s.start ?? 0,
      end:   s.end   ?? 0,
      text:  s.text?.trim() || "",
    })).filter(s => s.text);
    const language   = transcription.language || "en";

    const { data: record, error: insertErr } = await supabaseAdmin
      .from("transcriptions")
      .insert({
        user_id:          req.user.id,
        file_name:        req.file.originalname || req.file.filename,
        duration_seconds: Math.round(durationSeconds),
        credits_used:     creditsUsed,
        transcript,
        segments,
        language,
      })
      .select()
      .single();
    if (insertErr) console.error("[transcription] DB insert:", insertErr.message);

    res.json({
      id:               record?.id,
      transcript,
      segments,
      language,
      duration_seconds: Math.round(durationSeconds),
      credits_used:     creditsUsed,
    });
  } catch (err) {
    console.error("[transcription]", err.message);
    res.status(500).json({ error: err.message || "Transcription failed" });
  } finally {
    tempFiles.forEach(f => { try { fs.unlinkSync(f); } catch {} });
  }
});

router.get("/transcription/history", requireAuth, async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 50, 100);
    const offset = Math.max(parseInt(req.query.offset) || 0,  0);
    const { data, error } = await supabaseAdmin
      .from("transcriptions")
      .select("id, file_name, duration_seconds, credits_used, transcript, segments, language, created_at")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    res.json({ transcriptions: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/transcription/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error: fetchErr } = await supabaseAdmin
      .from("transcriptions").select("user_id").eq("id", id).single();
    if (fetchErr || !data) return res.status(404).json({ error: "Not found" });
    if (data.user_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });
    await supabaseAdmin.from("transcriptions").delete().eq("id", id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Caption Studio: permanent video upload ── */
router.post("/caption/upload-video", requireAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const ext    = req.file.originalname.split(".").pop() || "mp4";
    const key    = `captions/${req.user.id}/video-${Date.now()}.${ext}`;
    const buffer = fs.readFileSync(req.file.path);
    const { error } = await supabaseAdmin.storage
      .from("user-assets")
      .upload(key, buffer, { contentType: req.file.mimetype, upsert: false });
    try { fs.unlinkSync(req.file.path); } catch {}
    if (error) throw new Error(error.message);
    const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(key);
    console.log("[caption/upload-video] publicUrl:", publicUrl);
    res.json({ url: publicUrl, key });
  } catch (e) {
    console.error("[caption/upload-video]", e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/proxy-video-upload — Fetch a video URL server-side and upload to Supabase
router.post("/proxy-video-upload", requireAuth, async (req, res) => {
  try {
    const { url, projectId } = req.body;
    if (!url) return res.status(400).json({ error: "url required" });
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const buffer     = Buffer.from(await response.arrayBuffer());
    const fileName   = `clip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.mp4`;
    const storageKey = `product-ads/${req.user.id}/${fileName}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("user-assets").upload(storageKey, buffer, { contentType: "video/mp4", upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(storageKey);
    try {
      await supabaseAdmin.from("user_assets").insert({
        user_id:    req.user.id,
        url:        publicUrl,
        file_path:  storageKey,
        type:       "video",
        name:       fileName,
        size:       buffer.byteLength,
        scope:      "project",
        project_id: projectId || null,
        source:     "product_ad",
      });
    } catch (_) {}
    res.json({ url: publicUrl });
  } catch (e) {
    console.error("[proxy-video-upload]", e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/proxy-image-upload — Fetch an image URL server-side and upload to Supabase
router.post("/proxy-image-upload", requireAuth, async (req, res) => {
  try {
    const { url, projectId } = req.body;
    if (!url) return res.status(400).json({ error: "url required" });
    const response    = await fetch(url);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const buffer      = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const ext         = contentType.includes("png") ? "png" : "jpg";
    const fileName    = `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const storageKey  = `product-ads/${req.user.id}/${fileName}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("user-assets").upload(storageKey, buffer, { contentType, upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(storageKey);
    try {
      await supabaseAdmin.from("user_assets").insert({
        user_id:    req.user.id,
        url:        publicUrl,
        file_path:  storageKey,
        type:       "image",
        name:       fileName,
        size:       buffer.byteLength,
        scope:      "project",
        project_id: projectId || null,
        source:     "product_ad",
      });
    } catch (_) {}
    res.json({ url: publicUrl });
  } catch (e) {
    console.error("[proxy-image-upload]", e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/image-generation/enhance-prompt
router.post("/image-generation/enhance-prompt", requireAuth, async (req, res) => {
  try {
    const { prompt, type } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: "prompt required" });
    if (!["poster", "thumbnail"].includes(type)) return res.status(400).json({ error: "type must be poster or thumbnail" });

    const instructions = {
      poster:    "Transform this into a detailed vertical 9:16 marketing poster image generation prompt. Include: bold typography zone, subject/person or product, background style, color palette, decorative elements, CTA area. Professional Canva-style. No UI chrome.",
      thumbnail: "Transform this into a detailed horizontal 16:9 YouTube thumbnail image generation prompt. Include: expressive human face or reaction, bold text overlay area, high contrast colors, dramatic lighting, click-worthy composition. No UI chrome.",
    };

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 300,
      messages: [
        { role: "system", content: `You are an expert image generation prompt engineer. ${instructions[type]}` },
        { role: "user",   content: `Original idea: ${prompt.trim()}\n\nWrite an enhanced detailed image generation prompt. Return only the prompt, no explanation.` },
      ],
    });

    res.json({ enhanced: response.choices[0].message.content.trim() });
  } catch (err) {
    console.error("[enhance-prompt]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/image-generation/generate
// Body: { prompt, style, aspect_ratio, quality, count }
// Generates images via Fal.ai, uploads to Supabase, saves to generated_images table
router.post("/image-generation/generate", requireAuth, async (req, res) => {
  try {
    const { prompt, aspect_ratio = "1:1", count = 1, type = "image" } = req.body;
    const quality = "standard";
    if (!prompt?.trim()) return res.status(400).json({ error: "prompt required" });
    if (!process.env.FAL_API_KEY) return res.status(500).json({ error: "FAL_API_KEY not set" });

    const numImages = Math.min(Math.max(parseInt(count) || 1, 1), 4);

    const creditsPerImage = 2;
    const totalCredits = numImages * creditsPerImage;

    const creditResult = await deductCredits(
      req.user.id,
      totalCredits,
      "image_generation",
      `Image generation: "${prompt.slice(0, 60)}" × ${numImages}`,
      null
    );
    if (!creditResult.success) return res.status(402).json({ error: creditResult.error, code: "NO_CREDITS" });

    // Build fal.ai size from aspect_ratio
    const SIZES = {
      "1:1":  { width: 1024, height: 1024 },
      "16:9": { width: 1280, height: 720  },
      "9:16": { width: 720,  height: 1280 },
    };
    const imageSize = SIZES[aspect_ratio] || SIZES["1:1"];


    // Auto-enhance short prompts (<200 chars) — transparent to the user
    const ENHANCE_THRESHOLD = 200;
    const ENHANCE_INSTRUCTIONS = {
      image:     "Transform this into a detailed, vivid image generation prompt. Describe lighting, composition, mood, colors, and style. Keep it natural and photographic.",
      poster:    "Transform this into a detailed vertical 9:16 marketing poster image generation prompt. Include bold typography area, subject, background style, color palette, decorative elements, CTA zone. Professional Canva-style. No text overlays, no UI chrome.",
      thumbnail: "Transform this into a detailed horizontal 16:9 YouTube thumbnail image generation prompt. Include expressive face or reaction, high contrast colors, dramatic lighting, click-worthy composition. No UI chrome.",
    };

    let finalPrompt = prompt.trim();
    if (finalPrompt.length < ENHANCE_THRESHOLD) {
      try {
        const enhanced = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          max_tokens: 200,
          messages: [
            { role: "system", content: ENHANCE_INSTRUCTIONS[type] || ENHANCE_INSTRUCTIONS.image },
            { role: "user",   content: finalPrompt },
          ],
        });
        finalPrompt = enhanced.choices[0].message.content.trim();
        console.log(`[image-gen] prompt auto-enhanced (${prompt.length} → ${finalPrompt.length} chars)`);
      } catch (e) {
        console.warn("[image-gen] prompt enhancement failed, using original:", e.message);
      }
    }

    const fullPrompt = finalPrompt;

    const isHighQuality = quality === "high";
    const model = isHighQuality ? "fal-ai/flux/dev" : "fal-ai/flux/schnell";
    // schnell: max 12 steps, no guidance_scale; dev: up to 50 steps, guidance_scale supported
    const falBody = isHighQuality
      ? { prompt: fullPrompt, image_size: imageSize, num_inference_steps: 28, guidance_scale: 3.5, num_images: numImages, enable_safety_checker: true }
      : { prompt: fullPrompt, image_size: imageSize, num_inference_steps: 4,  num_images: numImages, enable_safety_checker: true };

    console.log(`[image-gen] user=${req.user.id} model=${model} count=${numImages} size=${imageSize.width}x${imageSize.height}`);

    // Call fal.ai
    const falRes = await fetch(`https://fal.run/${model}`, {
      method: "POST",
      headers: { "Authorization": `Key ${process.env.FAL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(falBody),
    });

    if (!falRes.ok) {
      const errText = await falRes.text();
      console.error("[image-gen] fal.ai error:", errText.slice(0, 200));
      return res.status(500).json({ error: "Image generation failed", detail: errText.slice(0, 120) });
    }

    const falData = await falRes.json();
    const falImages = falData?.images || [];
    if (!falImages.length) return res.status(500).json({ error: "No images returned from fal.ai" });

    // Upload each image to Supabase storage and save record
    const results = [];
    for (const img of falImages) {
      let storedUrl = img.url;
      try {
        const imgRes = await fetch(img.url);
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          const fname = `generated/${req.user.id}/${uuidv4()}.jpg`;
          const { error: uploadErr } = await supabaseAdmin.storage
            .from("user-assets")
            .upload(fname, buffer, { contentType: "image/jpeg", upsert: false });
          if (!uploadErr) {
            const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(fname);
            storedUrl = publicUrl;
          } else {
            console.warn("[image-gen] Upload error:", uploadErr.message);
          }
        }
      } catch (uploadEx) {
        console.warn("[image-gen] Upload failed:", uploadEx.message);
      }

      // Save to generated_images table — try full schema first, fall back to minimal
      let record = null;
      const { data: dbRecord, error: insertErr } = await supabaseAdmin
        .from("generated_images")
        .insert({
          user_id:      req.user.id,
          prompt:       prompt.trim(),
          aspect_ratio,
          quality,
          url:          storedUrl,
          fal_url:      img.url,
          width:        img.width  || imageSize.width,
          height:       img.height || imageSize.height,
          credits_used: creditsPerImage,
        })
        .select()
        .single();
      if (insertErr) console.error("[image-gen] DB insert error:", insertErr.message);
      else console.log("[image-gen] Saved record id:", dbRecord?.id);

      results.push({ url: storedUrl, id: dbRecord?.id, width: img.width || imageSize.width, height: img.height || imageSize.height });
    }

    res.json({ images: results, creditsUsed: totalCredits, balance: creditResult.balance });
  } catch (err) {
    console.error("[image-generation/generate]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/image-generation/:id — Delete a generated image record
router.delete("/image-generation/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    // Verify ownership before deleting
    const { data, error: fetchErr } = await supabaseAdmin
      .from("generated_images")
      .select("id, url, user_id")
      .eq("id", id)
      .single();
    if (fetchErr || !data) return res.status(404).json({ error: "Not found" });
    if (data.user_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });

    // Delete DB record
    await supabaseAdmin.from("generated_images").delete().eq("id", id);

    // Best-effort: delete from storage if it's a Supabase URL
    try {
      const match = data.url?.match(/\/user-assets\/(.+)$/);
      if (match) {
        await supabaseAdmin.storage.from("user-assets").remove([decodeURIComponent(match[1])]);
      }
    } catch { /* ignore storage errors */ }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/image-generation/library — Fetch user's previously generated images
router.get("/image-generation/library", requireAuth, async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const [listRes, countRes] = await Promise.all([
      supabaseAdmin
        .from("generated_images")
        .select("*")
        .eq("user_id", req.user.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1),
      supabaseAdmin
        .from("generated_images")
        .select("id", { count: "exact", head: true })
        .eq("user_id", req.user.id),
    ]);
    if (listRes.error) throw listRes.error;
    res.json({ images: listRes.data || [], total: countRes.count || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── AI Image Library: save a generated image (service role bypasses RLS) ── */
router.post("/ai-image-library/save", requireAuth, async (req, res) => {
  try {
    const record = req.body;
    if (!record?.src) return res.status(400).json({ error: "src required" });
    const { error } = await supabaseAdmin.from("ai_image_library").insert(record);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("[ai_image_library/save]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── AI Image Library: increment reuse count ── */
router.post("/ai-image-library/increment-reuse", requireAuth, async (req, res) => {
  try {
    const { id, reuse_count } = req.body;
    if (!id) return res.status(400).json({ error: "id required" });
    await supabaseAdmin.from("ai_image_library").update({ reuse_count: (reuse_count || 0) + 1 }).eq("id", id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Feedback ─────────────────────────────────────────────────────────────── */
router.post("/feedback", requireAuth, async (req, res) => {
  try {
    const { rating, message, context } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: "rating 1-5 required" });
    const { error } = await supabaseAdmin.from("feedback").insert({
      user_id: req.user.id,
      rating,
      message: message || null,
      context: context || null,
    });
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error("[feedback]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/feedback/mine", requireAuth, async (req, res) => {
  try {
    const { count, error } = await supabaseAdmin
      .from("feedback")
      .select("id", { count: "exact", head: true })
      .eq("user_id", req.user.id);
    if (error) throw error;
    res.json({ count: count || 0 });
  } catch (err) {
    console.error("[feedback/mine]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/feedback/my-history", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("feedback")
      .select("id, rating, message, context, created_at")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ feedback: data || [] });
  } catch (err) {
    console.error("[feedback/my-history]", err.message);
    res.status(500).json({ error: err.message });
  }
});
