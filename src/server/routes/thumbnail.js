import express from "express";
import {
  supabaseAdmin, requireAuth, deductCredits, addCredits, uuidv4,
  uploadMemory,
} from "../middleware/shared.js";

export const router = express.Router();

const BLANK_URLS = {
  square:       "https://dfwacscjpdesuvwamxfs.supabase.co/storage/v1/object/public/system-assets/blank-images/1024x1024.png",
  portrait_45:  "https://dfwacscjpdesuvwamxfs.supabase.co/storage/v1/object/public/system-assets/blank-images/864x1080.png",
  portrait_916: "https://dfwacscjpdesuvwamxfs.supabase.co/storage/v1/object/public/system-assets/blank-images/680x1080.png",
};

const NEGATIVE_PROMPT = "ugly, deformed, blurry, low quality, watermark, border, frame, low contrast, small text, unreadable text, cluttered, busy, amateur";

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
    const recordId  = uuidv4();
    const deduction = await deductCredits(userId, 10, "thumbnail_generate", "Thumbnail Generator", recordId);
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    creditAmount = 10;

    const { imageUrl, logoUrl, subText, style, brandColor, platform } = req.body;
    const title = req.body.title || req.body.headline;
    if (!title) return res.status(400).json({ error: "title required" });

    const FAL_KEY = process.env.FAL_API_KEY || process.env.FAL_KEY;
    const blankUrl = BLANK_URLS[platform] || BLANK_URLS.square;

    const userPrompt = `Use the uploaded images to create this thumbnail. The last image is a blank canvas showing the exact required output dimensions — your output must match its size and aspect ratio precisely.

Create a viral, ultra click-worthy thumbnail that stops the scroll instantly.

Title: "${title}"
${subText ? `Sub Text: "${subText}"` : ""}
Style: ${style === "auto" ? "Bold, high energy, maximum impact" : style}
${brandColor ? `Brand Colors: ${brandColor}` : ""}

Study the best performing YouTube thumbnails from MrBeast, PewDiePie, Marques Brownlee, Veritasium. Match that level of visual impact.

MANDATORY ELEMENTS:
- Title text: massive, bold, high contrast, readable at small size — occupies top 40% of frame
- If face/person image provided: large, expressive, emotional face taking up significant portion of frame
- If logo provided: small brand mark top corner only
- Strong graphic elements: bold arrows, highlight boxes, starbursts, outlined shapes that direct eye to key info
- Background: dramatic gradient, solid color, or atmospheric scene — never plain white or gray
- Color contrast: extreme — white text on dark, or dark text on bright. Never low contrast
- Energy lines, speed lines, or geometric shapes to create dynamism if no face provided

CONTEXT-AWARE VISUALS:
- If the title or business description suggests a software, app, or digital tool: include a realistic mockup or screenshot of the interface as a key visual element — laptop, phone, or screen showing the product UI
- If the title suggests finance/money: include cash, coins, charts, or wealth visuals
- If the title suggests fitness/health: include relevant body, equipment, or transformation visuals
- If the title suggests food: include the food prominently styled
- Match the visual props to what the title is actually about — be specific and literal

THUMBNAIL PSYCHOLOGY:
- Create curiosity gap — viewer must click to find out
- Use numbers, shock words, or power words from the title
- Maximum 6 words visible — prioritize the most impactful words from the title
- Every pixel must serve the goal of getting the click

TECHNICAL:
- All text fully readable at 320px wide (mobile size)
- No watermarks, no borders, no thin fonts
- Professional retouching quality
`;

    console.log("[thumbnail/generate] platform:", platform, "title:", title, "prompt:\n", userPrompt);

    const imageUrls = [];
    if (imageUrl) imageUrls.push(imageUrl);
    if (logoUrl)  imageUrls.push(logoUrl);
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
    const key    = `thumbnails/${req.user.id}/thumb-${Date.now()}.${ext}`;
    const { error: upErr } = await supabaseAdmin.storage.from("user-assets").upload(key, buffer, { contentType: ct, upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(key);

    try {
      await supabaseAdmin.from("thumbnails").insert({ id: recordId, user_id: req.user.id, thumbnail_url: publicUrl, storage_key: key });
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
