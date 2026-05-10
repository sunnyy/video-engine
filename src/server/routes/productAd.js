import express from "express";
import fs from "fs";
import {
  supabaseAdmin, requireAuth, deductCredits,
  upload, uuidv4,
} from "../middleware/shared.js";

export const router = express.Router();

// POST /upload — Upload product image to Supabase, return public URL
router.post("/upload", requireAuth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const userId  = req.user.id;
    const ext     = req.file.originalname.split(".").pop().toLowerCase() || "jpg";
    const key     = `product-ads/${userId}/${Date.now()}_${uuidv4().slice(0, 8)}.${ext}`;
    const buffer  = fs.readFileSync(req.file.path);
    const mime    = req.file.mimetype || "image/jpeg";
    const { error: upErr } = await supabaseAdmin.storage.from("user-assets").upload(key, buffer, { contentType: mime, upsert: false });
    fs.unlinkSync(req.file.path);
    if (upErr) throw new Error(upErr.message);
    const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(key);
    res.json({ url: publicUrl });
  } catch (e) {
    console.error("[product-ad/upload]", e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /analyze — GPT-4o Vision analyses product image, returns shot strategy
router.post("/analyze", requireAuth, async (req, res) => {
  try {
    const { data: sub } = await supabaseAdmin.from("subscriptions").select("id").eq("user_id", req.user.id).eq("status", "active").maybeSingle();
    if (!sub) return res.status(403).json({ error: "Product Ad Studio requires an active plan.", code: "SUBSCRIPTION_REQUIRED" });
    const deduction = await deductCredits(req.user.id, 5, "product_ad_analyze", "Product Ad — strategy analysis");
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    const { imageUrl, targetMarket } = req.body;
    if (!imageUrl) return res.status(400).json({ error: "imageUrl required" });

    const { getProductAnalysisPrompt } = await import("../prompts/productAdAnalysis.js");

    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error("Failed to fetch product image");
    const buffer   = await imgRes.arrayBuffer();
    const base64   = Buffer.from(buffer).toString("base64");
    const mimeType = imgRes.headers.get("content-type") || "image/jpeg";

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
          { type: "text", text: getProductAnalysisPrompt({ targetMarket }) },
        ],
      }],
    });

    const raw     = response.choices[0].message.content;
    const cleaned = raw.replace(/```json\n?/gi, "").replace(/```\n?/gi, "").trim();
    const parsed  = JSON.parse(cleaned);

    if (!parsed.validation?.is_suitable) {
      return res.status(422).json({
        error: parsed.validation?.rejection_reason || "This image is not suitable for product ad generation.",
        rejected: true,
      });
    }

    res.json(parsed);
  } catch (e) {
    console.error("[product-ad/analyze]", e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /generate-base-image — Generate one reference image before scene shots
// Clothing: nano-banana try-on [model + product] → model wearing the product
// Wearable + non_worn: nano-banana [product only] → cleaned studio product photo
router.post("/generate-base-image", requireAuth, async (req, res) => {
  try {
    const { data: sub } = await supabaseAdmin.from("subscriptions").select("id").eq("user_id", req.user.id).eq("status", "active").maybeSingle();
    if (!sub) return res.status(403).json({ error: "Product Ad Studio requires an active plan.", code: "SUBSCRIPTION_REQUIRED" });
    const deduction = await deductCredits(req.user.id, 8, "product_ad_base_image", "Product Ad — base model image");
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    const { productImageUrl, modelImageUrl, category, hasMannequin, hasWatermark } = req.body;
    if (!productImageUrl) return res.status(400).json({ error: "productImageUrl required" });
    const FAL_KEY = process.env.FAL_API_KEY || process.env.FAL_KEY;

    let falUrl;

    if (category === "clothing" && modelImageUrl) {
      const prompt = hasMannequin
        ? `Can you wear the exact same outfit as the mannequin is wearing in image 2? Keep your face, skin tone, hair, and identity from image 1 completely unchanged. Reproduce every detail of the outfit exactly — same colors, fabric, embroidery, neckline, sleeves, silhouette, borders, and embellishments. Full body visible, natural confident pose, clean studio background, soft professional lighting. Photorealistic, 9:16 vertical portrait.`
        : `Dress the person from image 1 with the exact garment shown in image 2. Image 2 is a garment-only product reference. Transfer only the outfit onto the person: preserve exact garment design, fabric, embroidery, colors, neckline, sleeves, silhouette, fit proportions, borders and trims, and all embellishment details. Do not redesign or reinterpret the outfit. Preserve the person's face, identity, skin tone, body shape, pose, and hair. Only replace their clothing with the exact garment from image 2. Photorealistic clothing transfer, 9:16 vertical portrait.`;
      const falRes = await fetch("https://fal.run/fal-ai/nano-banana/edit", {
        method:  "POST",
        headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ image_urls: [modelImageUrl, productImageUrl], prompt }),
      });
      const raw = await falRes.text();
      if (!falRes.ok) throw new Error(`nano-banana failed: ${raw.slice(0, 200)}`);
      const data = JSON.parse(raw);
      falUrl = data.images?.[0]?.url;
    } else {
      // Enhance/clean product photo via nano-banana
      const prompt = "Use the uploaded photo as the product reference. Keep the exact same product — same design, colors, materials, branding, labels, and shape — completely unchanged. Replace the background with a pure white seamless studio backdrop. Improve lighting to clean directional studio light with soft shadows. Remove any props, clutter, or distractions. No people, no text additions. Hyper-realistic, photorealistic, 9:16 vertical portrait.";
      const falRes = await fetch("https://fal.run/fal-ai/nano-banana/edit", {
        method:  "POST",
        headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ image_urls: [productImageUrl], prompt }),
      });
      const raw = await falRes.text();
      if (!falRes.ok) throw new Error(`nano-banana failed: ${raw.slice(0, 200)}`);
      const data = JSON.parse(raw);
      falUrl = data.images?.[0]?.url;
    }

    if (!falUrl) throw new Error("No image URL returned from Fal.ai");

    // Remove watermarks only when the analysis flagged the original product image as having one
    if (hasWatermark && category !== "clothing") {
      try {
        const cleanRes = await fetch("https://fal.run/fal-ai/nano-banana/edit", {
          method:  "POST",
          headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            image_urls: [falUrl],
            prompt:     "Use the uploaded photo as the product reference. Remove any watermarks, stock-photo text overlays, copyright notices, or semi-transparent text. Keep the product itself — including all branding, labels, colors, shape, and design — completely unchanged.",
          }),
        });
        if (cleanRes.ok) {
          const cleanData = await cleanRes.json();
          const cleanedUrl = cleanData.images?.[0]?.url;
          if (cleanedUrl) falUrl = cleanedUrl;
        }
      } catch (_) {}

    }

    // Proxy to permanent Supabase storage
    const imgRes   = await fetch(falUrl);
    const buffer   = Buffer.from(await imgRes.arrayBuffer());
    const ct       = imgRes.headers.get("content-type") || "image/jpeg";
    const ext      = ct.includes("png") ? "png" : "jpg";
    const fileName = `base-${Date.now()}.${ext}`;
    const key      = `product-ads/${req.user.id}/${fileName}`;
    const { error: upErr } = await supabaseAdmin.storage.from("user-assets").upload(key, buffer, { contentType: ct, upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(key);
    res.json({ imageUrl: publicUrl });
  } catch (e) {
    console.error("[product-ad/generate-base-image]", e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /generate-images — Generate scene shots using base image reference
// Routing:
//   clothing         → nano-banana with model anchor for ALL shots
//   wearable         → nano-banana with product reference for ALL shots (worn shots described in text prompt)
//   non_worn         → nano-banana with product reference for ALL shots
router.post("/generate-images", requireAuth, async (req, res) => {
  try {
    const { data: sub } = await supabaseAdmin.from("subscriptions").select("id").eq("user_id", req.user.id).eq("status", "active").maybeSingle();
    if (!sub) return res.status(403).json({ error: "Product Ad Studio requires an active plan.", code: "SUBSCRIPTION_REQUIRED" });
    const deduction = await deductCredits(req.user.id, 40, "product_ad_scenes", "Product Ad — scene images");
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    const { shots, referenceImageUrl, category, modelImageUrl } = req.body;
    if (!shots?.length || !referenceImageUrl) return res.status(400).json({ error: "shots and referenceImageUrl required" });

    const FAL_KEY = process.env.FAL_API_KEY || process.env.FAL_KEY;

    // Sequential with delay — avoids Fal.ai 429 rate limits under concurrent user load
    const results = [];
    for (const [index, shot] of shots.entries()) {
      if (!referenceImageUrl) {
        results.push({ shotId: shot.id, error: "No reference image available", ok: false });
        continue;
      }

      // Determine routing: clothing uses model anchor; everything else uses product reference only
      const isClothing    = category === "clothing";
      const hasModelRef   = !!modelImageUrl;
      const useNanoBanana = isClothing && hasModelRef;

      let lastErr = null;
      let succeeded = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, 1500 * attempt));
        try {
          let endpoint, reqBody;

          if (useNanoBanana) {
            // Clothing (all shots) or wearable worn shots: nano-banana with model reference
            const anchoredPrompt = isClothing
              ? `Use the uploaded photo as the complete reference. Keep the person's face, identity, skin tone, hair, and exact outfit completely unchanged — do not alter the clothing in any way. Only change the scene environment, background, and lighting as described: ${shot.image_generation_prompt}`
              : `Use the uploaded photo as the identity reference. Keep the person's face, skin tone, hair, and identity completely unchanged. ${shot.image_generation_prompt}`;
            endpoint = "https://fal.run/fal-ai/nano-banana/edit";
            reqBody  = { prompt: anchoredPrompt, image_urls: [modelImageUrl] };
          } else {
            // Non-worn all shots + wearable product-only shots: nano-banana with product reference
            endpoint = "https://fal.run/fal-ai/nano-banana/edit";
            reqBody  = {
              image_urls: [referenceImageUrl],
              prompt:     `Use the uploaded photo as the product reference. Keep the exact same product — same design, colors, materials, branding, and shape — completely unchanged. Only change the scene, environment, surface, and lighting as described: ${shot.image_generation_prompt}`,
            };
          }

          const falRes = await fetch(endpoint, {
            method:  "POST",
            headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": "application/json" },
            body:    JSON.stringify(reqBody),
          });
          if (!falRes.ok) { lastErr = await falRes.text(); continue; }
          const data = await falRes.json();
          let falUrl = data.images?.[0]?.url;
          if (!falUrl) throw new Error("No image URL from Fal.ai");
          results.push({ shotId: shot.id, imageUrl: falUrl, ok: true });
          succeeded = true;
          break;
        } catch (e) { lastErr = e.message; }
      }
      if (!succeeded) results.push({ shotId: shot.id, error: lastErr, ok: false });
    }

    res.json({ results });
  } catch (e) {
    console.error("[product-ad/generate-images]", e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /generate-clip — Image-to-video via Fal.ai LTX-Video 13B Distilled
router.post("/generate-clip", requireAuth, async (req, res) => {
  try {
    const { data: sub } = await supabaseAdmin.from("subscriptions").select("id").eq("user_id", req.user.id).eq("status", "active").maybeSingle();
    if (!sub) return res.status(403).json({ error: "Product Ad Studio requires an active plan.", code: "SUBSCRIPTION_REQUIRED" });
    const deduction = await deductCredits(req.user.id, 50, "product_ad_clip", "Product Ad — video clip");
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    const { imageUrl, motionPrompt, durationSeconds = 3 } = req.body;
    if (!imageUrl || !motionPrompt) return res.status(400).json({ error: "imageUrl and motionPrompt required" });

    const FAL_KEY = process.env.FAL_API_KEY || process.env.FAL_KEY;
    const falRes  = await fetch("https://fal.run/fal-ai/pixverse/v4/image-to-video", {
      method:  "POST",
      headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ image_url: imageUrl, prompt: motionPrompt, duration: durationSeconds <= 5 ? 5 : 8 }),
    });

    const rawText = await falRes.text();
    if (!falRes.ok) throw new Error(`Pixverse ${falRes.status}: ${rawText.slice(0, 200)}`);

    let data;
    try { data = JSON.parse(rawText); }
    catch (_) { throw new Error(`Pixverse returned non-JSON: ${rawText.slice(0, 200)}`); }

    const videoUrl = data.video?.url || data.url;
    if (!videoUrl) throw new Error(`No video URL in response: ${rawText.slice(0, 200)}`);
    res.json({ videoUrl });
  } catch (e) {
    console.error("[product-ad/generate-clip]", e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /models
router.get("/models", requireAuth, async (req, res) => {
  const { gender } = req.query;
  let query = supabaseAdmin.from("model_avatars").select("*").eq("is_active", true);
  if (gender) query = query.eq("gender", gender);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ models: data || [] });
});
