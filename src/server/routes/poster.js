import express from "express";
import {
  supabaseAdmin, requireAuth, deductCredits,
  uploadMemory,
} from "../middleware/shared.js";

export const router = express.Router();

router.get("/list", requireAuth, async (req, res) => {
  try {
    const folder = `posters/${req.user.id}`;
    const { data, error } = await supabaseAdmin.storage
      .from("user-assets")
      .list(folder, { sortBy: { column: "created_at", order: "desc" } });
    if (error) throw new Error(error.message);
    const posters = (data || [])
      .filter(f => f.name && f.name.startsWith("poster-"))
      .map(f => ({
        id:  f.name,
        url: supabaseAdmin.storage.from("user-assets").getPublicUrl(`${folder}/${f.name}`).data.publicUrl,
        storageKey: `${folder}/${f.name}`,
      }));
    res.json({ posters });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/delete", requireAuth, async (req, res) => {
  try {
    const { storageKey } = req.body;
    if (!storageKey || !storageKey.startsWith(`posters/${req.user.id}/`)) return res.status(403).json({ error: "Forbidden" });
    await supabaseAdmin.storage.from("user-assets").remove([storageKey]);
    await supabaseAdmin.from("posters").delete().eq("storage_key", storageKey);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/upload", requireAuth, uploadMemory.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const key = `poster-uploads/${req.user.id}/${Date.now()}.${req.file.mimetype.includes("png") ? "png" : "jpg"}`;
    const { error } = await supabaseAdmin.storage.from("user-assets").upload(key, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    if (error) throw new Error(error.message);
    const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(key);
    res.json({ url: publicUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/generate", requireAuth, async (req, res) => {
  try {
    const deduction = await deductCredits(req.user.id, 10, "poster_generate", "Poster Studio — poster generation");
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    const { productImageUrl, brandName, headline, tagline, colorMood, language = "English" } = req.body;
    if (!productImageUrl) return res.status(400).json({ error: "productImageUrl required" });

    const FAL_KEY = process.env.FAL_API_KEY || process.env.FAL_KEY;

    const moodMap = {
      dark:    "dark dramatic background, deep shadows, moody cinematic atmosphere, rich contrast",
      light:   "bright airy background, soft natural light, clean minimal aesthetic, pastel tones",
      vibrant: "vibrant bold colors, energetic composition, high saturation, striking color contrast",
      luxury:  "premium gold and black palette, elegant dark background, sophisticated luxury aesthetic",
    };
    const moodDesc  = colorMood === "auto" ? null : (moodMap[colorMood] || moodMap.luxury);
    const brandLine = brandName ? `Brand name: "${brandName}".` : "";
    const headLine  = headline  ? `Main headline: "${headline}".` : "";
    const tagLine   = tagline   ? `Tagline or supporting copy: "${tagline}".` : "";

    const prompt = `Create a premium commercial poster advertisement using the attached product image as the hero subject. Design a high-end modern poster ad with the product placed prominently as the main focus, styled like a luxury brand campaign. Build a visually striking composition around the product using elegant lighting, premium shadows, refined depth, and a polished advertising layout. Add premium supporting visual elements that match the product category, such as natural props, abstract shapes, ingredients, soft textures, or atmospheric accents to make the composition feel rich and intentional. Include stylish headline typography, short supporting copy, and clean negative space for branding and CTA placement. ${brandLine} ${headLine} ${tagLine} The design should feel like a complete standalone poster ad, not just a product mockup — premium, artistic, scroll-stopping, brand-worthy, and visually polished like a professional luxury campaign poster. Use cinematic composition, modern ad styling, premium color harmony, elegant hierarchy, and high-end commercial design aesthetics.${moodDesc ? ` Style: ${moodDesc}.` : ""} All text in the poster must be written in ${language}.`;

    console.log("[poster/generate] productImageUrl:", productImageUrl);
    const falRes = await fetch("https://fal.run/fal-ai/nano-banana/edit", {
      method:  "POST",
      headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ prompt, image_urls: [productImageUrl] }),
    });

    const rawText = await falRes.text();
    console.log("[poster/generate] fal status:", falRes.status, "body:", rawText.slice(0, 300));
    if (!falRes.ok) throw new Error(`Fal.ai failed: ${rawText.slice(0, 200)}`);

    const data   = JSON.parse(rawText);
    const falUrl = data.images?.[0]?.url;
    if (!falUrl) throw new Error("No image URL returned");

    const imgRes   = await fetch(falUrl);
    const buffer   = Buffer.from(await imgRes.arrayBuffer());
    const ct       = imgRes.headers.get("content-type") || "image/jpeg";
    const ext      = ct.includes("png") ? "png" : "jpg";
    const fileName = `poster-${Date.now()}.${ext}`;
    const key      = `posters/${req.user.id}/${fileName}`;
    const { error: upErr } = await supabaseAdmin.storage.from("user-assets").upload(key, buffer, { contentType: ct, upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(key);

    const { error: dbErr } = await supabaseAdmin.from("posters").insert({
      user_id:           req.user.id,
      product_image_url: productImageUrl,
      poster_url:        publicUrl,
      storage_key:       key,
      brand_name:        brandName || null,
      headline:          headline  || null,
      tagline:           tagline   || null,
      color_mood:        colorMood || null,
      language:          language,
    });
    if (dbErr) console.error("[poster/generate] db insert error:", dbErr.message);
    else console.log("[poster/generate] db insert ok");

    console.log("[poster/generate] done:", publicUrl?.slice(0, 80));
    res.json({ posterUrl: publicUrl });
  } catch (e) {
    console.error("[poster/generate]", e.message);
    res.status(500).json({ error: e.message });
  }
});
