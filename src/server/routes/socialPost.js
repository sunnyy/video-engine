import express from "express";
import {
  supabaseAdmin, requireAuth, deductCredits,
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
  try {
    const deduction = await deductCredits(req.user.id, 10, "social_post", "Social Media Post Generator");
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });

    const { referenceImageUrl, headline, subtext, brandName, niche, style, aspectRatio } = req.body;
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
      const promptText = getSocialPostPrompt({ headline, subtext, brandName, niche, style, aspectRatio, hasReferenceImage: !!referenceImageUrl });
      messages[0].content.push({ type: "text", text: promptText });
      const gptRes = await openai.chat.completions.create({ model: "gpt-4o", max_tokens: 500, messages });
      optimizedPrompt = gptRes.choices[0].message.content?.trim();
    } catch (e) {
      console.warn("[social-post/generate] GPT-4o failed, using fallback:", e.message);
      const ratioLabel = aspectRatio === "4:5" ? "Portrait 4:5 format" : aspectRatio === "9:16" ? "Story 9:16 format" : "Square 1:1 format";
      optimizedPrompt = `Professional social media post for ${niche} niche. ${headline ? `Headline: "${headline}".` : ""} ${subtext ? `Subtext: "${subtext}".` : ""} ${brandName ? `Brand: "${brandName}".` : ""} Modern clean design, bold typography, high contrast. ${ratioLabel}. High resolution, no watermarks.`;
    }

    console.log("[social-post/generate] prompt:", optimizedPrompt?.slice(0, 150));

    // Step 2 — Upload reference to Fal.ai storage if provided
    let falRefUrl = referenceImageUrl;
    if (referenceImageUrl) {
      try {
        const imgFetch  = await fetch(referenceImageUrl);
        const imgBuffer = Buffer.from(await imgFetch.arrayBuffer());
        const imgCt     = imgFetch.headers.get("content-type") || "image/jpeg";
        const falUp     = await fetch("https://fal.run/storage", {
          method:  "POST",
          headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": imgCt, "X-File-Name": "ref.jpg" },
          body:    imgBuffer,
        });
        if (falUp.ok) { const d = await falUp.json(); falRefUrl = d.url; }
      } catch {}
    }

    // Step 3 — Generate with nano-banana
    const endpoint  = referenceImageUrl ? "https://fal.run/fal-ai/nano-banana/edit" : "https://fal.run/fal-ai/nano-banana";
    const finalBody = referenceImageUrl ? { image_urls: [falRefUrl], prompt: optimizedPrompt } : { prompt: optimizedPrompt };

    const falRes = await fetch(endpoint, {
      method:  "POST",
      headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": "application/json" },
      body:    JSON.stringify(finalBody),
    });
    if (!falRes.ok) throw new Error(`Fal.ai failed: ${(await falRes.text()).slice(0, 200)}`);
    const data   = await falRes.json();
    const falUrl = data.images?.[0]?.url;
    if (!falUrl) throw new Error("No image returned");

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
