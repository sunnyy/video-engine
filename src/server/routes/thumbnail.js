import express from "express";
import {
  supabaseAdmin, requireAuth, deductCredits, addCredits, uuidv4,
  uploadMemory,
} from "../middleware/shared.js";
import { moderateInput } from "../middleware/moderateInput.js";

export const router = express.Router();

router.post("/upload", requireAuth, uploadMemory.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const ext = req.file.mimetype.includes("png") ? "png" : "jpg";
    const key = `thumbnails/${req.user.id}/upload-${Date.now()}.${ext}`;
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
    const deduction = await deductCredits(userId, 10, "thumbnail_generate", "Thumbnail Generator", recordId);
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    creditAmount = 10;

    const { imageUrl, headline, subtext, style, niche } = req.body;
    if (!headline || !niche) return res.status(400).json({ error: "headline and niche required" });
    const { flagged } = await moderateInput([headline, subtext].filter(Boolean).join(" "));
    if (flagged) return res.status(400).json({ error: "Your prompt was flagged as inappropriate. Please try a different topic.", code: "CONTENT_FLAGGED" });

    const FAL_KEY = process.env.FAL_API_KEY || process.env.FAL_KEY;

    // Step 1 — GPT-4o generates an optimized nano-banana prompt
    const { getThumbnailAnalysisPrompt } = await import("../prompts/thumbnailAnalysis.js");
    const analysisPrompt = getThumbnailAnalysisPrompt({ headline, subtext, niche, style, hasImage: !!imageUrl });

    let optimizedPrompt;
    try {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const messages = [{ role: "user", content: [] }];
      if (imageUrl) {
        const imgFetch  = await fetch(imageUrl);
        const imgBuffer = Buffer.from(await imgFetch.arrayBuffer());
        const base64    = imgBuffer.toString("base64");
        const mimeType  = imgFetch.headers.get("content-type") || "image/jpeg";
        messages[0].content.push({ type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } });
      }
      messages[0].content.push({ type: "text", text: analysisPrompt });

      const gptRes = await openai.chat.completions.create({ model: "gpt-4o", max_tokens: 400, messages });
      optimizedPrompt = gptRes.choices[0].message.content?.trim();
    } catch (e) {
      const STYLE_MAP = { bold: "bold dramatic high-contrast", minimal: "clean minimal elegant", vibrant: "vibrant energetic saturated", dark: "dark moody cinematic" };
      optimizedPrompt = `${STYLE_MAP[style] || "bold dramatic"} YouTube thumbnail for ${niche} niche. Headline text: "${headline}". ${subtext ? `Subtext: "${subtext}".` : ""} 16:9 horizontal landscape, high contrast, ultra-sharp, professional thumbnail quality, no watermarks.`;
    }

    // Step 2 — Upload image to Fal.ai storage (best effort — fallback to direct URL)
    let falImageUrl = imageUrl || null;
    if (imageUrl) {
      try {
        const imgFetch       = await fetch(imageUrl);
        const imgBuffer      = Buffer.from(await imgFetch.arrayBuffer());
        const imgContentType = imgFetch.headers.get("content-type") || "image/jpeg";
        const ext            = imgContentType.includes("png") ? "png" : "jpg";
        const falUploadRes   = await fetch("https://fal.run/storage", {
          method:  "POST",
          headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": imgContentType, "X-File-Name": `thumb.${ext}` },
          body:    imgBuffer,
        });
        if (falUploadRes.ok) {
          const uploaded = await falUploadRes.json();
          falImageUrl = uploaded.url;
        }
      } catch (_) {}

    }

    // Step 3 — Generate via nano-banana
    const endpoint = falImageUrl
      ? "https://fal.run/fal-ai/nano-banana/edit"
      : "https://fal.run/fal-ai/nano-banana";
    const falBody = falImageUrl
      ? { image_urls: [falImageUrl], prompt: optimizedPrompt }
      : { prompt: optimizedPrompt };

    const falRes = await fetch(endpoint, {
      method:  "POST",
      headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": "application/json" },
      body:    JSON.stringify(falBody),
    });
    if (!falRes.ok) throw new Error(`Fal.ai failed: ${(await falRes.text()).slice(0, 200)}`);

    const data   = await falRes.json();
    const falUrl = data.images?.[0]?.url;
    if (!falUrl) throw new Error("No image URL returned");

    // Step 4 — Proxy to Supabase permanent storage
    const imgRes = await fetch(falUrl);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const ct     = imgRes.headers.get("content-type") || "image/jpeg";
    const ext2   = ct.includes("png") ? "png" : "jpg";
    const key    = `thumbnails/${req.user.id}/thumb-${Date.now()}.${ext2}`;
    const { error: upErr } = await supabaseAdmin.storage.from("user-assets").upload(key, buffer, { contentType: ct, upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(key);

    // Step 5 — Save metadata (silently skipped if table doesn't exist)
    try {
      await supabaseAdmin.from("thumbnails").insert({
        id: recordId, user_id: req.user.id, thumbnail_url: publicUrl, storage_key: key,
        headline: headline || null, subtext: subtext || null, niche: niche || null, style: style || null,
      });
    } catch (_) {}

    res.json({ thumbnailUrl: publicUrl });
  } catch (e) {
    if (creditAmount > 0) addCredits(userId, creditAmount, "refund", "ai_failure_refund", "Refund: thumbnail generation failed").catch(() => {});
    console.error("[thumbnail/generate]", e.message);
    res.status(500).json({ error: "Generation failed. Your credits have been refunded.", code: "AI_FAILURE" });
  }
});

router.get("/list", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.storage.from("user-assets").list(`thumbnails/${req.user.id}`, { limit: 50, sortBy: { column: "created_at", order: "desc" } });
    if (error) throw new Error(error.message);
    const files = (data || [])
      .filter(f => !f.name.startsWith("upload-"))
      .map(f => {
        const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(`thumbnails/${req.user.id}/${f.name}`);
        return { url: publicUrl, storageKey: `thumbnails/${req.user.id}/${f.name}`, name: f.name };
      });
    res.json({ thumbnails: files });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/delete", requireAuth, async (req, res) => {
  try {
    const { storageKey } = req.body;
    if (!storageKey?.startsWith(`thumbnails/${req.user.id}`)) return res.status(403).json({ error: "Forbidden" });
    await supabaseAdmin.storage.from("user-assets").remove([storageKey]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
