import express from "express";
import OpenAI from "openai";
import {
  supabaseAdmin, requireAuth, deductCredits, addCredits, uuidv4,
  uploadMemory,
} from "../middleware/shared.js";
import { guardContent } from "../../services/ai/shared/moderation.js";
import { blankForKey } from "../../services/ai/shared/aiImage.js";
import { CREDIT_COSTS } from "../../core/utils/creditCosts.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const router = express.Router();

router.post("/upload", requireAuth, uploadMemory.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const ext = req.file.mimetype.includes("png") ? "png" : "jpg";
    const key = `outfit-studio/${req.user.id}/upload-${Date.now()}.${ext}`;
    const { error } = await supabaseAdmin.storage.from("user-assets").upload(key, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    if (error) throw new Error(error.message);
    const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(key);
    res.json({ url: publicUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/models", requireAuth, async (_req, res) => {
  const { data, error } = await supabaseAdmin.from("model_avatars").select("id, url, gender, skin_tone, age_group").eq("is_active", true).order("created_at");
  if (error) return res.status(500).json({ error: error.message });
  res.json({ models: data || [] });
});

router.post("/analyze", requireAuth, async (req, res) => {
  try {
    const { garmentUrl } = req.body;
    if (!garmentUrl) return res.status(400).json({ error: "garmentUrl required" });
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 150,
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: garmentUrl } },
          { type: "text", text: `Analyze this product image. Return JSON only, no explanation:\n{"isWearable":true/false,"gender":"female"|"male"|"unisex","category":"short label e.g. kurti, t-shirt, saree","environment":"studio"|"outdoor"|"urban","hasMannequin":true/false,"isNSFW":true/false}` },
        ],
      }],
    });
    const raw = response.choices?.[0]?.message?.content?.trim() ?? "{}";
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    if (parsed.isNSFW) return res.status(400).json({ error: "This image contains inappropriate content and cannot be used.", code: "NSFW" });
    res.json(parsed);
  } catch (e) {
    console.error("[outfit/analyze]", e.message);
    res.status(500).json({ error: e.message });
  }
});

router.post("/generate", requireAuth, async (req, res) => {
  const userId = req.user.id;
  if (!(await guardContent(res, { images: [req.body.garmentUrl], label: "outfit" }))) return;
  let creditAmount = 0;
  try {
    const recordId = uuidv4();
    const deduction = await deductCredits(userId, CREDIT_COSTS.outfit_tryon, "outfit_tryon", "Outfit Studio — virtual try-on", recordId);
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    creditAmount = CREDIT_COSTS.outfit_tryon;

    const { garmentUrl, modelUrl, hasMannequin, aspect = "9:16" } = req.body;
    if (!garmentUrl || !modelUrl) return res.status(400).json({ error: "garmentUrl and modelUrl required" });
    const blank = blankForKey(aspect); // Nano Banana takes output size from the LAST image

    const FAL_KEY = process.env.FAL_API_KEY || process.env.FAL_KEY;

    const basePrompt = `Use Image 1 as the PERSON IDENTITY reference.\nUse Image 2 as the STYLE + CLOTHING reference.\n\nGenerate a professional fashion portrait.\n\nPERSON RULES\n- Preserve facial identity, skin tone, body proportions, hairstyle, and recognizable appearance from Image 1.\n- Keep the same person; do not redesign facial features.\n\nOUTFIT EXTRACTION RULES\n- Automatically identify only the wearable clothing items from Image 2.\n- Ignore background, props, bags, shoes, sunglasses, decorations, text, hangers, flat-lay styling, mannequins, and non-wearable objects unless explicitly visible as intended outfit pieces.\n- Reconstruct the outfit as if worn naturally on the person.\n\nCLOTHING TRANSFER\n- Preserve colors, garment categories, cuts, silhouette, neckline, sleeve style, textures, patterns, seams, buttons, folds, and fabric behavior.\n- Adapt fit naturally to the person's body while keeping the original design intent.\n- Maintain realistic draping and proportions.\n\nSTYLING\n- Convert the clothing into a premium editorial fashion look.\n- Add natural styling adjustments only where necessary for realism.\n- Keep the outfit wearable and commercially photographed.\n\nPOSE\n- Natural fashion pose, relaxed confidence.\n- Avoid mannequin pose or passport pose.\n\nENVIRONMENT\n- Premium indoor studio or lifestyle setting that matches the outfit mood.\n\nCAMERA\n- Match the aspect ratio and framing of the blank canvas image provided.\n- Full body visible (or at least knees visible).\n- Fashion photography composition.\n\nLIGHTING\n- Soft studio lighting.\n- Clean skin rendering.\n- Luxury campaign quality.\n\nQUALITY RULES\n- No body distortion.\n- No clothing deformation.\n- No identity drift.\n- No extra limbs.\n- High-end fashion campaign realism.`;

    const prompt = hasMannequin
      ? `The outfit in Image 2 is displayed on a mannequin. Extract only the clothing — ignore the mannequin entirely. ${basePrompt}`
      : basePrompt;

    const falRes = await fetch("https://fal.run/fal-ai/nano-banana/edit", {
      method:  "POST",
      headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ image_urls: blank ? [modelUrl, garmentUrl, blank] : [modelUrl, garmentUrl], prompt }),
    });
    if (!falRes.ok) throw new Error(`Fal.ai failed: ${(await falRes.text()).slice(0, 200)}`);
    const data   = await falRes.json();
    const falUrl = data.images?.[0]?.url;
    if (!falUrl) throw new Error("No image URL returned");

    const imgRes = await fetch(falUrl);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const ct     = imgRes.headers.get("content-type") || "image/jpeg";
    const ext    = ct.includes("png") ? "png" : "jpg";
    const key    = `outfit-studio/${req.user.id}/result-${Date.now()}.${ext}`;
    const { error: upErr } = await supabaseAdmin.storage.from("user-assets").upload(key, buffer, { contentType: ct, upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(key);

    const { error: dbErr } = await supabaseAdmin.from("outfit_tryons").insert({
      id: recordId, user_id: req.user.id, result_url: publicUrl, storage_key: key,
      garment_url: garmentUrl, model_url: modelUrl,
    });
    if (dbErr) console.error("[outfit/generate] db insert:", dbErr.message);

    res.json({ resultUrl: publicUrl });
  } catch (e) {
    if (creditAmount > 0) addCredits(userId, creditAmount, "refund", "ai_failure_refund", "Refund: virtual try-on failed").catch(() => {});
    console.error("[outfit/generate]", e.message);
    res.status(500).json({ error: "Generation failed. Your credits have been refunded.", code: "AI_FAILURE" });
  }
});

router.get("/list", requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin.from("outfit_tryons").select("id, result_url, storage_key, created_at").eq("user_id", req.user.id).order("created_at", { ascending: false }).limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ tryons: data || [] });
});

router.post("/delete", requireAuth, async (req, res) => {
  try {
    const { id, storageKey } = req.body;
    if (storageKey?.startsWith(`outfit-studio/${req.user.id}`)) await supabaseAdmin.storage.from("user-assets").remove([storageKey]);
    if (id) await supabaseAdmin.from("outfit_tryons").delete().eq("id", id).eq("user_id", req.user.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
