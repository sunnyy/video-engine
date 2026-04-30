import express from "express";
import { deflateSync } from "zlib";
import {
  supabaseAdmin, requireAuth, deductCredits,
  uploadMemory,
} from "../middleware/shared.js";

/* ── Generate a solid-black PNG of exact dimensions (no external deps) ── */
function createBlankPNG(width, height) {
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    crcTable[i] = c >>> 0;
  }
  const crc32 = (buf) => {
    let c = 0xFFFFFFFF;
    for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  };
  const chunk = (type, data) => {
    const t = Buffer.from(type, "ascii");
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  const scanline = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3)]); // filter=None, RGB=0,0,0
  const raw = Buffer.concat(Array.from({ length: height }, () => scanline));
  const idat = deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

/* ── Cache blank PNG URLs — uploaded once at startup, reused for every request ── */
const BLANK_SIZES = { "1:1": [1024, 1024], "4:5": [864, 1080], "9:16": [608, 1080] };
const blankUrlCache = {};

async function getBlankUrl(aspectRatio, falKey) {
  if (blankUrlCache[aspectRatio]) return blankUrlCache[aspectRatio];
  const [bw, bh] = BLANK_SIZES[aspectRatio] || BLANK_SIZES["1:1"];
  try {
    const falUp = await fetch("https://fal.run/storage", {
      method:  "POST",
      headers: { "Authorization": `Key ${falKey}`, "Content-Type": "image/png", "X-File-Name": "blank.png" },
      body:    createBlankPNG(bw, bh),
    });
    if (falUp.ok) {
      const { url } = await falUp.json();
      blankUrlCache[aspectRatio] = url;
      console.log(`[social-post] cached blank PNG ${bw}x${bh} for ${aspectRatio}:`, url);
      return url;
    } else {
      console.warn("[social-post] blank PNG upload failed:", falUp.status, await falUp.text());
    }
  } catch (e) { console.warn("[social-post] blank PNG upload error:", e.message); }
  return null;
}

export const router = express.Router();

router.post("/upload", requireAuth, uploadMemory.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const ext = req.file.mimetype.includes("png") ? "png" : "jpg";
    const key = `social-posts/${req.user.id}/ref-${Date.now()}.${ext}`;
    const { error } = await supabaseAdmin.storage.from("user-assets").upload(key, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    if (error) throw new Error(error.message);
    const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(key);
    res.json({ url: publicUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/generate", requireAuth, async (req, res) => {
  try {
    const deduction = await deductCredits(req.user.id, 10, "social_post", "Social Media Post Generator");
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });

    const { referenceImageUrl, logoUrl, brandColor, headline, subtext, brandName, niche, style, aspectRatio } = req.body;
    if (!niche) return res.status(400).json({ error: "niche required" });

    const FAL_KEY = process.env.FAL_API_KEY || process.env.FAL_KEY;
    const { getSocialPostPrompt } = await import("../prompts/socialPostAnalysis.js");

    // Step 1 — GPT-4o generates optimised image prompt
    let optimizedPrompt;
    try {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const messages = [{ role: "user", content: [] }];
      if (referenceImageUrl) {
        const imgFetch  = await fetch(referenceImageUrl);
        const imgBuffer = Buffer.from(await imgFetch.arrayBuffer());
        const base64    = imgBuffer.toString("base64");
        const mimeType  = imgFetch.headers.get("content-type") || "image/jpeg";
        messages[0].content.push({ type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } });
      }
      if (logoUrl) {
        const logoFetch  = await fetch(logoUrl);
        const logoBuffer = Buffer.from(await logoFetch.arrayBuffer());
        const logoBase64 = logoBuffer.toString("base64");
        const logoMime   = logoFetch.headers.get("content-type") || "image/png";
        messages[0].content.push({ type: "image_url", image_url: { url: `data:${logoMime};base64,${logoBase64}` } });
      }
      const promptText = getSocialPostPrompt({ headline, subtext, brandName, niche, style, aspectRatio, hasReferenceImage: !!referenceImageUrl, hasLogo: !!logoUrl, brandColor });
      messages[0].content.push({ type: "text", text: promptText });
      const gptRes = await openai.chat.completions.create({ model: "gpt-4o", max_tokens: 500, messages });
      optimizedPrompt = gptRes.choices[0].message.content?.trim().slice(0, 1000);
    } catch (e) {
      console.warn("[social-post/generate] GPT-4o failed, using fallback:", e.message);
      const ratioLabel = aspectRatio === "4:5" ? "Portrait 4:5 format" : aspectRatio === "9:16" ? "Story 9:16 format" : "Square 1:1 format";
      optimizedPrompt = `Professional social media post for ${niche} niche. ${headline ? `Headline: "${headline}".` : ""} ${subtext ? `Subtext: "${subtext}".` : ""} ${brandName ? `Brand: "${brandName}".` : ""} Modern clean design, bold typography, high contrast. ${ratioLabel}. High resolution, no watermarks.`.slice(0, 1000);
    }

    console.log("[social-post/generate] prompt:", optimizedPrompt?.slice(0, 150));

    // Step 3 — flux-pro/v2/edit when image provided, flux-pro/v2 for text-only
    // Always nano-banana/edit with a cached blank PNG sized to the target aspect ratio.
    const blankUrl = await getBlankUrl(aspectRatio, FAL_KEY);

    const endpoint  = blankUrl ? "https://fal.run/fal-ai/nano-banana/edit" : "https://fal.run/fal-ai/nano-banana";
    const finalBody = blankUrl
      ? { image_urls: [blankUrl], prompt: optimizedPrompt }
      : { prompt: optimizedPrompt };

    console.log("[social-post/generate] calling fal:", endpoint, "aspectRatio:", aspectRatio, "blankUrl:", !!blankUrl);
    const falAbort = new AbortController();
    const falTimeout = setTimeout(() => falAbort.abort(), 90_000);
    let falRes;
    try {
      falRes = await fetch(endpoint, {
        method:  "POST",
        headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": "application/json" },
        body:    JSON.stringify(finalBody),
        signal:  falAbort.signal,
      });
    } finally {
      clearTimeout(falTimeout);
    }
    console.log("[social-post/generate] fal status:", falRes.status);
    if (!falRes.ok) throw new Error(`Fal.ai failed: ${(await falRes.text()).slice(0, 200)}`);
    const data   = await falRes.json();
    console.log("[social-post/generate] fal response keys:", Object.keys(data));
    const falUrl = data.images?.[0]?.url || data.image?.url;
    if (!falUrl) throw new Error(`No image returned. Response: ${JSON.stringify(data).slice(0, 200)}`);

    // Proxy to Supabase
    const imgRes = await fetch(falUrl);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const ct     = imgRes.headers.get("content-type") || "image/jpeg";
    const ext    = ct.includes("png") ? "png" : "jpg";
    const key    = `social-posts/${req.user.id}/post-${Date.now()}.${ext}`;
    const { error: upErr } = await supabaseAdmin.storage.from("user-assets").upload(key, buffer, { contentType: ct, upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(key);

    const { error: dbErr } = await supabaseAdmin.from("social_posts").insert({
      user_id: req.user.id, post_url: publicUrl, storage_key: key,
      headline: headline || null, subtext: subtext || null,
      brand_name: brandName || null, niche, aspect_ratio: aspectRatio || "1:1",
    });
    if (dbErr) console.error("[social-post/generate] db insert:", dbErr.message);

    res.json({ postUrl: publicUrl });
  } catch (e) {
    console.error("[social-post/generate]", e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get("/list", requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin.from("social_posts").select("id, post_url, storage_key, headline, niche, aspect_ratio, created_at").eq("user_id", req.user.id).order("created_at", { ascending: false }).limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ posts: data || [] });
});

router.post("/delete", requireAuth, async (req, res) => {
  try {
    const { id, storageKey } = req.body;
    if (storageKey?.startsWith(`social-posts/${req.user.id}`)) await supabaseAdmin.storage.from("user-assets").remove([storageKey]);
    if (id) await supabaseAdmin.from("social_posts").delete().eq("id", id).eq("user_id", req.user.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
