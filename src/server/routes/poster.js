import express from "express";
import {
  supabaseAdmin, requireAuth, deductCredits, addCredits, uuidv4,
  uploadMemory,
} from "../middleware/shared.js";
import { guardContent } from "../../services/ai/shared/moderation.js";
import { blankForKey } from "../../services/ai/shared/aiImage.js";

export const router = express.Router();

const NEGATIVE_PROMPT = "blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, signature, text errors, cropped elements, cut off text, out of frame, overexposed, underexposed";

const ORIENTATION_NOTE = {
  "1:1":  "This poster must be designed for a square format (1:1 ratio). Compose the layout for a square canvas.",
  "4:5":  "This poster must be designed for a tall vertical portrait format (4:5 ratio). Compose the layout for a tall vertical canvas — headline at top, product in center, features below, bottom strip at the very bottom. Do not compose for square format.",
  "9:16": "This poster must be designed for a tall vertical portrait format (9:16 ratio). Compose the layout for a tall vertical canvas — headline at top, product in center, features below, bottom strip at the very bottom. Do not compose for square format.",
  "16:9": "This poster must be designed for a wide landscape format (16:9 ratio). Compose the layout for a wide horizontal canvas.",
};


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
  const userId = req.user.id;
  if (!(await guardContent(res, { images: [req.body.productImageUrl], label: "poster" }))) return;
  let creditAmount = 0;
  try {
    const recordId  = uuidv4();
    const deduction = await deductCredits(userId, 10, "poster_generate", "Poster Studio — poster generation", recordId);
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    creditAmount = 10;

    const { productImageUrl, goal, style, brandColor, platform } = req.body;
    if (!productImageUrl) return res.status(400).json({ error: "productImageUrl required" });

    const FAL_KEY    = process.env.FAL_API_KEY || process.env.FAL_KEY;
    const blankUrl   = blankForKey(platform);
    const orientationNote = ORIENTATION_NOTE[platform] || "";

    console.log("[poster/generate] platform:", platform, "→ blank:", blankUrl);

    const blankLabel = { "1:1": "1024x1024px (square)", "4:5": "864x1080px (portrait 4:5)", "9:16": "680x1080px (portrait 9:16)", "16:9": "1920x1080px (landscape)" };
    const dimLabel   = blankLabel[platform] || blankLabel["1:1"];

    const userPrompt = `Use the first uploaded image as the product to feature in this poster. The second image is a blank canvas showing the exact required output dimensions (${dimLabel}) — your output must match its size and aspect ratio precisely.

Create a premium, magazine-quality commercial advertising poster for this product.

Goal: ${goal || "Auto"}
Style: ${style === "auto" ? "Choose the most fitting style based on the product" : style}
Platform: ${platform || "Auto"}
${brandColor ? `Brand Colors: ${brandColor}` : ""}

You are a world-class art director. Design a complete advertising poster that looks like it was made by a top creative agency. The composition, layout, hierarchy, and visual storytelling are entirely your creative decision — do not follow a fixed template.

WHAT MUST BE INCLUDED:
- The exact product from the image as the hero — preserve its colors, shape, materials, and details faithfully
- A rich atmospheric environment or background scene that elevates the product story
- Cinematic lighting with depth, shadows, highlights, and color grading
- Bold campaign headline typography that matches the product's brand voice and typographic style
- Supporting copy and feature callouts relevant to the product
- Decorative design elements that serve the composition
- Props derived ONLY from what is visible on the product or directly associated with how it is used — never add random plants, leaves, fruits, or unrelated organic elements
- Feature callout list: 2-4 product benefits with circular outline icons, placed naturally within the composition
- At least one badge or stamp element (circle, ribbon, or seal shape) with a short tagline
- A bottom section with 3 short benefit labels separated by dividers
- Campaign headline: bold, large, matches the product's typographic personality
- Supporting subheadline or tagline below the main headline

QUALITY STANDARD:
- Think Nike, Apple, Coca-Cola campaign level
- Rich texture, depth, and atmosphere — not flat or generic
- Typography must feel designed into the composition, not placed on top
- Every element must serve the product story
- Professional retouching quality, 8K sharpness
- All text and elements must be fully within the frame with generous padding from edges

${orientationNote}
`;

    console.log("[poster/generate] prompt:\n", userPrompt);

    const falRes = await fetch("https://fal.run/fal-ai/nano-banana/edit", {
      method:  "POST",
      headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": "application/json" },
      body:    JSON.stringify({
        image_urls:      [productImageUrl, blankUrl],
        prompt:          userPrompt,
        negative_prompt: NEGATIVE_PROMPT,
      }),
    });
    if (!falRes.ok) throw new Error(`fal.ai failed: ${(await falRes.text()).slice(0, 200)}`);

    const falData = await falRes.json();
    const falUrl  = falData.images?.[0]?.url;
    if (!falUrl) throw new Error("No image returned from fal.ai");

    const imgRes = await fetch(falUrl);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const ct     = imgRes.headers.get("content-type") || "image/jpeg";
    const ext    = ct.includes("png") ? "png" : "jpg";
    const key    = `posters/${req.user.id}/poster-${Date.now()}.${ext}`;
    const { error: upErr } = await supabaseAdmin.storage.from("user-assets").upload(key, buffer, { contentType: ct, upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(key);

    await supabaseAdmin.from("posters").insert({
      id: recordId, user_id: req.user.id, product_image_url: productImageUrl,
      poster_url: publicUrl, storage_key: key,
    }).then(({ error }) => { if (error) console.error("[poster/generate] db:", error.message); });

    res.json({ posterUrl: publicUrl });
  } catch (e) {
    if (creditAmount > 0) addCredits(userId, creditAmount, "refund", "ai_failure_refund", "Refund: poster generation failed").catch(() => {});
    console.error("[poster/generate]", e.message);
    res.status(500).json({ error: "Generation failed. Your credits have been refunded.", code: "AI_FAILURE" });
  }
});
