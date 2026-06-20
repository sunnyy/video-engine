import express from "express";
import {
  supabaseAdmin, requireAuth, deductCredits, addCredits, uuidv4,
  uploadMemory,
} from "../middleware/shared.js";
import { guardContent } from "../../services/ai/shared/moderation.js";
import { BLANK_IMAGE } from "../../services/ai/shared/aiImage.js";

export const router = express.Router();

const BLANK_URLS = {
  square_11:   BLANK_IMAGE["1:1"],
  portrait_45: BLANK_IMAGE["4:5"],
  story_916:   BLANK_IMAGE["9:16"],
};

const NEGATIVE_PROMPT = "ugly, deformed, blurry, low quality, pixelated, watermark, random leaves, plants, fruits, vegetables unrelated to product, generic stock photo, flat lighting, clutter, busy background, cartoon, illustration, text errors, spelling mistakes";

router.post("/upload", requireAuth, uploadMemory.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const ext = req.file.mimetype.includes("png") ? "png" : "jpg";
    const key = `banners/${req.user.id}/upload-${Date.now()}.${ext}`;
    const { error } = await supabaseAdmin.storage.from("user-assets").upload(key, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    if (error) throw new Error(error.message);
    const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(key);
    res.json({ url: publicUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/generate", requireAuth, async (req, res) => {
  const userId = req.user.id;
  if (!(await guardContent(res, { text: [req.body.bizDesc], images: [req.body.productImageUrl], label: "banner" }))) return;
  let creditAmount = 0;
  try {
    const recordId  = uuidv4();
    const deduction = await deductCredits(userId, 15, "social_post", "Banner Design", recordId);
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    creditAmount = 15;

    const { productImageUrl, logoUrl, bizDesc, goal, style, brandColor, platform } = req.body;
    if (!goal) return res.status(400).json({ error: "goal required" });

    const FAL_KEY = process.env.FAL_API_KEY || process.env.FAL_KEY;
    const blankUrl = BLANK_URLS[platform] || BLANK_URLS.square_11;

    const orientationNote = platform === "story_916"
      ? "Design for tall vertical 9:16 portrait format."
      : platform === "portrait_45"
      ? "Design for vertical 4:5 portrait format."
      : "Design for square 1:1 format.";

    const userPrompt = `Use the uploaded images to create this banner. The last image is a blank canvas showing the exact required output dimensions — your output must match its size and aspect ratio precisely.

Create a premium, agency-quality social media banner advertisement.

Business: ${bizDesc}
Goal: ${goal}
Style: ${style === "auto" ? "Choose the most fitting style based on the visual inputs" : style}
${brandColor ? `Brand Colors: ${brandColor}` : ""}

You are a world-class art director. Design a complete social media banner that looks like it was made by a top creative agency. The composition, layout, hierarchy, and visual storytelling are entirely your creative decision.

IMPORTANT RULES FOR PROVIDED IMAGES:
- If a logo is provided, use it ONLY as a brand mark — place it at the top or corner of the banner as a logo. Do NOT interpret the logo as a product or generate products based on it.
- If a product image is provided, feature that exact product as the hero. Do not invent or generate additional products.
- If only a logo is provided with no product image, create a brand/lifestyle banner with abstract atmospheric visuals — do not hallucinate any products.

WHAT MUST BE INCLUDED:
- If a logo is provided, feature it prominently and accurately
- If a product image is provided, feature the product as the hero element
- Bold campaign headline typography that fits the goal and brand personality
- Supporting subheadline or tagline
- A clear CTA element
- Feature callouts or benefit badges relevant to the product/brand
- Atmospheric background that elevates the brand story
- Decorative design elements that serve the composition
- Bottom strip with 2-3 short benefit labels

QUALITY STANDARD:
- Think Nike, Apple, Coca-Cola campaign level
- Rich texture, depth, and atmosphere
- Typography must feel designed into the composition
- All text fully within frame with generous padding from edges
- Props derived ONLY from what is visible in the provided images or directly associated with the brand/product

${orientationNote}
`;

    console.log("[banner/generate] platform:", platform, "goal:", goal, "prompt:\n", userPrompt);

    const imageUrls = [];
    if (productImageUrl) imageUrls.push(productImageUrl);
    if (logoUrl)         imageUrls.push(logoUrl);
    imageUrls.push(blankUrl);

    const falRes = await fetch("https://fal.run/fal-ai/nano-banana/edit", {
      method:  "POST",
      headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ image_urls: imageUrls, prompt: userPrompt, negative_prompt: NEGATIVE_PROMPT }),
    });
    if (!falRes.ok) throw new Error(`fal.ai failed: ${(await falRes.text()).slice(0, 200)}`);

    const falData = await falRes.json();
    const falUrl  = falData.images?.[0]?.url;
    if (!falUrl) throw new Error("No image returned from fal.ai");

    const imgRes = await fetch(falUrl);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const ct     = imgRes.headers.get("content-type") || "image/jpeg";
    const ext    = ct.includes("png") ? "png" : "jpg";
    const key    = `banners/${req.user.id}/banner-${Date.now()}.${ext}`;
    const { error: upErr } = await supabaseAdmin.storage.from("user-assets").upload(key, buffer, { contentType: ct, upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(key);

    await supabaseAdmin.from("social_posts").insert({
      id: recordId, user_id: req.user.id, post_url: publicUrl, storage_key: key, aspect_ratio: platform,
    }).then(({ error }) => { if (error) console.error("[banner/generate] db:", error.message); });

    res.json({ bannerUrl: publicUrl });
  } catch (e) {
    if (creditAmount > 0) addCredits(userId, creditAmount, "refund", "ai_failure_refund", "Refund: banner generation failed").catch(() => {});
    console.error("[banner/generate]", e.message);
    res.status(500).json({ error: "Generation failed. Your credits have been refunded.", code: "AI_FAILURE" });
  }
});

router.get("/list", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.storage.from("user-assets").list(`banners/${req.user.id}`, { limit: 50, sortBy: { column: "created_at", order: "desc" } });
    if (error) throw new Error(error.message);
    const files = (data || [])
      .filter(f => f.name.startsWith("banner-"))
      .map(f => {
        const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(`banners/${req.user.id}/${f.name}`);
        return { url: publicUrl, storageKey: `banners/${req.user.id}/${f.name}`, name: f.name };
      });
    res.json({ banners: files });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/delete", requireAuth, async (req, res) => {
  try {
    const { storageKey } = req.body;
    if (!storageKey?.startsWith(`banners/${req.user.id}`)) return res.status(403).json({ error: "Forbidden" });
    await supabaseAdmin.storage.from("user-assets").remove([storageKey]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
