import express from "express";

const BLANK_URLS = {
  "1:1":  "https://dfwacscjpdesuvwamxfs.supabase.co/storage/v1/object/public/system-assets/blank-images/1024x1024.png",
  "4:5":  "https://dfwacscjpdesuvwamxfs.supabase.co/storage/v1/object/public/system-assets/blank-images/864x1080.png",
  "9:16": "https://dfwacscjpdesuvwamxfs.supabase.co/storage/v1/object/public/system-assets/blank-images/680x1080.png",
};

import {
  supabaseAdmin, requireAuth, deductCredits, addCredits, uuidv4,
  uploadMemory,
} from "../middleware/shared.js";


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
  const userId = req.user.id;
  let creditAmount = 0;
  try {
    const recordId = uuidv4();
    const deduction = await deductCredits(userId, 15, "social_post", "Social Media Post Generator", recordId);
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    creditAmount = 15;

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
      // Reference image → GPT-4o only (for style/layout analysis)
      if (referenceImageUrl) {
        const imgFetch  = await fetch(referenceImageUrl);
        const imgBuffer = Buffer.from(await imgFetch.arrayBuffer());
        const base64    = imgBuffer.toString("base64");
        const mimeType  = imgFetch.headers.get("content-type") || "image/jpeg";
        messages[0].content.push({ type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } });
      }
      // Logo → never sent to GPT-4o; goes to nano-banana/edit instead
      const promptText = getSocialPostPrompt({ headline, subtext, brandName, niche, style, aspectRatio, hasReferenceImage: !!referenceImageUrl, hasLogo: !!logoUrl, brandColor });
      messages[0].content.push({ type: "text", text: promptText });
      const gptRes = await openai.chat.completions.create({ model: "gpt-4o", max_tokens: 500, messages });
      optimizedPrompt = gptRes.choices[0].message.content?.trim().slice(0, 1000);
    } catch (e) {
      const ratioLabel = aspectRatio === "4:5" ? "Portrait 4:5 format" : aspectRatio === "9:16" ? "Story 9:16 format" : "Square 1:1 format";
      optimizedPrompt = `Professional social media post for ${niche} niche. ${headline ? `Headline: "${headline}".` : ""} ${subtext ? `Subtext: "${subtext}".` : ""} ${brandName ? `Brand: "${brandName}".` : ""} Modern clean design, bold typography, high contrast. ${ratioLabel}. High resolution, no watermarks.`.slice(0, 1000);
    }

    // Always nano-banana/edit: blank PNG + explicit image_size both anchor aspect ratio
    const NANO_SIZE  = { "1:1": "square_hd", "4:5": { width: 864, height: 1080 }, "9:16": { width: 680, height: 1080 } };
    const NANO_DIMS  = { "1:1": "1024x1024px (square)", "4:5": "864x1080px (portrait 4:5)", "9:16": "680x1080px (story 9:16)" };
    const blankUrl   = BLANK_URLS[aspectRatio] || BLANK_URLS["1:1"];
    const imageUrls  = logoUrl ? [logoUrl, blankUrl] : [blankUrl];
    const endpoint   = "https://fal.run/fal-ai/nano-banana/edit";
    const dimLabel   = NANO_DIMS[aspectRatio] || NANO_DIMS["1:1"];
    const sizeNote   = logoUrl
      ? `[CRITICAL: Output must be exactly ${dimLabel}. The first image is the brand logo — incorporate it prominently. The last image is a blank canvas showing the exact required output dimensions — match its size precisely.] `
      : `[CRITICAL: Output must be exactly ${dimLabel}. The last image is a blank canvas showing the exact required output dimensions — match its size precisely.] `;
    const finalBody  = { image_urls: imageUrls, prompt: sizeNote + optimizedPrompt, image_size: NANO_SIZE[aspectRatio] || "square_hd" };

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
    if (!falRes.ok) throw new Error(`Fal.ai failed: ${(await falRes.text()).slice(0, 200)}`);
    const data   = await falRes.json();
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
      id: recordId, user_id: req.user.id, post_url: publicUrl, storage_key: key,
      headline: headline || null, subtext: subtext || null,
      brand_name: brandName || null, niche, aspect_ratio: aspectRatio || "1:1",
    });
    if (dbErr) console.error("[social-post/generate] db insert:", dbErr.message);

    res.json({ postUrl: publicUrl });
  } catch (e) {
    if (creditAmount > 0) addCredits(userId, creditAmount, "refund", "ai_failure_refund", "Refund: social post generation failed").catch(() => {});
    console.error("[social-post/generate]", e.message);
    res.status(500).json({ error: "Generation failed. Your credits have been refunded.", code: "AI_FAILURE" });
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
