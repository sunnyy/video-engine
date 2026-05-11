import express from "express";
import {
  supabaseAdmin, requireAuth, deductCredits, addCredits, uuidv4,
  uploadMemory,
} from "../middleware/shared.js";

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

router.post("/generate", requireAuth, async (req, res) => {
  const userId = req.user.id;
  let creditAmount = 0;
  try {
    const recordId = uuidv4();
    const deduction = await deductCredits(userId, 15, "outfit_tryon", "Outfit Studio — virtual try-on", recordId);
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    creditAmount = 15;

    const { garmentUrl, modelUrl, hasMannequin, useMyPhoto } = req.body;
    if (!garmentUrl || !modelUrl) return res.status(400).json({ error: "garmentUrl and modelUrl required" });

    const FAL_KEY = process.env.FAL_API_KEY || process.env.FAL_KEY;

    const prompt = hasMannequin
      ? `The person in image 1 should wear the exact same outfit as the mannequin in image 2. Keep the person from image 1's face, skin tone, hair, and identity completely unchanged. Reproduce every detail of the outfit exactly — same colors, fabric, embroidery, neckline, sleeves, silhouette, borders, and embellishments. Full body visible, natural confident pose, clean studio background, soft professional lighting. Photorealistic, 9:16 vertical portrait.`
      : useMyPhoto
      ? `Use the first uploaded image as the garment reference and the second uploaded image as the person reference. Dress the person in the exact garment from the first image and transfer it naturally onto their body while preserving the original garment design exactly as shown. Do not redesign, reinterpret, restyle, or simplify the clothing. Keep the same fabric, color, embroidery, print, stitching, sleeve style, neckline, fit, proportions, hemline, garment length, and silhouette exactly unchanged. The garment must look like the same real piece of clothing, only worn by the person. Preserve all embroidery placement, motifs, borders, textures, folds, and fabric behavior accurately. Fit the garment naturally to the person's body and pose without altering its actual cut or dimensions. Do not crop, shorten, tighten, lengthen, reshape, or modernize the garment. Do not change the garment category. If the garment is topwear only (shirt, blouse, kurti, top), keep the original upper garment unchanged and add a clean, realistic, matching bottom (such as plain trousers, palazzo, skirt, or jeans depending on style) that complements the garment without distracting from it. If the bottom is not visible in the garment reference, generate a simple matching bottom in a neutral coordinated style. Keep the person's face, hairstyle, pose, body shape, expression, jewelry, and environment unchanged unless required for realistic garment fitting. Maintain realistic draping, natural lighting, correct body proportions, and photorealistic textile detail. Final output should look like a real fashion photo of the same person wearing the exact same garment from the reference image.`
      : `Dress the person from image 1 with the exact garment shown in image 2. Image 2 is a garment product reference. Transfer only the outfit onto the person: preserve exact garment design, fabric, embroidery, colors, neckline, sleeves, silhouette, fit proportions, and all embellishment details. Do not redesign or reinterpret the outfit. Preserve the person's face, identity, skin tone, body shape, pose, and hair. Only replace their clothing with the exact garment from image 2. Photorealistic clothing transfer, 9:16 vertical portrait.`;

    const falRes = await fetch("https://fal.run/fal-ai/nano-banana/edit", {
      method:  "POST",
      headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ image_urls: useMyPhoto ? [garmentUrl, modelUrl] : [modelUrl, garmentUrl], prompt }),
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
