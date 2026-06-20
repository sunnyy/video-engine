import express from "express";

const ANALYZE_PROMPT = `You are a world-class Art Director, Brand Designer, and Digital Advertising Creative Director.

Analyze the uploaded image (if provided) and create a premium social media banner / digital ad campaign concept.

OBJECTIVE:
Transform the input into a visually exceptional social media banner or digital advertisement.

AUTO DETECT:
- brand / product category
- niche and target audience
- positioning and emotional appeal
- strongest visual cues and opportunities

ANALYZE:

1. BRAND / CONTENT UNDERSTANDING
Determine: what is being promoted, key visual strengths, missed opportunities.

2. MARKET POSITIONING
Choose: luxury / premium / modern / minimal / playful / bold / futuristic / editorial / artistic. Explain why.

3. CREATIVE DIRECTION
Define: campaign concept, visual story, emotional angle, artistic direction.

4. COMPOSITION
Design: subject placement, negative space, visual hierarchy, eye movement.

5. BACKGROUND SYSTEM
Define: environment, textures, depth, atmosphere.

6. LIGHTING & COLOR
Define: lighting mood, dominant palette, supporting colors.

7. TYPOGRAPHY
Generate: campaign headline, supporting copy, CTA, typography style, placement.

8. PREMIUM ELEMENTS
Choose: shadows, glow, overlays, textures, luxury accents.

OUTPUT STRICTLY in this structure:

[Campaign Name]
[Brand Positioning]
[Creative Direction]
[Layout Blueprint]
[Copy System]
[Color Palette]
[Lighting]
[Effects]
[Final Generation Prompt]`;

const RENDER_PROMPT_PREFIX = `Create a premium social media banner / digital advertisement. Produce an agency-quality campaign visual.

STYLE: Premium. Editorial. Commercial. Intentional.

VISUAL RULES: clean composition, strong visual hierarchy, premium spacing, sophisticated typography, realistic lighting, refined textures, cinematic atmosphere, elegant negative space.

QUALITY: Luxury campaign quality. High-end digital advertisement quality.

AVOID: clutter, floating decorations, random effects, excessive text, stock look, generic AI aesthetics.

FINAL FEEL: The result should look like a professional campaign created by a top creative agency.

APPLY THIS CREATIVE DIRECTION EXACTLY:\n`;

import { blankForKey } from "../../services/ai/shared/aiImage.js";
import { CREDIT_COSTS } from "../../core/utils/creditCosts.js";

import {
  supabaseAdmin, requireAuth, deductCredits, addCredits, uuidv4,
  uploadMemory,
} from "../middleware/shared.js";
import { moderateInput } from "../middleware/moderateInput.js";
import { guardContent } from "../../services/ai/shared/moderation.js";


export const router = express.Router();

router.post("/analyze", requireAuth, async (req, res) => {
  try {
    const { referenceImageUrl, brandName, niche, aspectRatio } = req.body;
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const contextLines = [brandName && `Brand: ${brandName}`, niche && `Niche: ${niche}`, aspectRatio && `Format: ${aspectRatio}`].filter(Boolean).join("\n");
    const content = [];
    if (referenceImageUrl) {
      const imgFetch  = await fetch(referenceImageUrl);
      const imgBuffer = Buffer.from(await imgFetch.arrayBuffer());
      const base64    = imgBuffer.toString("base64");
      const mimeType  = imgFetch.headers.get("content-type") || "image/jpeg";
      content.push({ type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } });
    }
    content.push({ type: "text", text: ANALYZE_PROMPT + (contextLines ? `\n\nAdditional context:\n${contextLines}` : "") });
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2000,
      messages: [{ role: "user", content }],
    });
    res.json({ brief: response.choices[0].message.content?.trim() });
  } catch (e) {
    console.error("[social-post/analyze]", e.message);
    res.status(500).json({ error: e.message });
  }
});

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
  if (!(await guardContent(res, { text: [req.body.headline, req.body.cta], images: [req.body.referenceImageUrl], label: "social-post" }))) return;
  let creditAmount = 0;
  try {
    const recordId  = uuidv4();
    const deduction = await deductCredits(userId, CREDIT_COSTS.social_post, "social_post", "Social Media Post Generator", recordId);
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    creditAmount = CREDIT_COSTS.social_post;

    const { referenceImageUrl, logoUrl, brandColor, headline, niche, goal, style, aspectRatio = "1:1", textDensity, cta } = req.body;

    // Stage 1: GPT-4o art direction
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const contextParts = [
      niche       && `Niche: ${niche}`,
      headline    && `Headline: ${headline}`,
      goal        && `Goal: ${goal}`,
      style       && `Style: ${style}`,
      textDensity && `Text density: ${textDensity}`,
      cta         && `CTA: ${cta}`,
      brandColor  && `Brand color: ${brandColor}`,
      aspectRatio && `Format: ${aspectRatio}`,
    ].filter(Boolean).join("\n");
    const content = [];
    if (referenceImageUrl) {
      const imgFetch  = await fetch(referenceImageUrl);
      const imgBuffer = Buffer.from(await imgFetch.arrayBuffer());
      const base64    = imgBuffer.toString("base64");
      const mimeType  = imgFetch.headers.get("content-type") || "image/jpeg";
      content.push({ type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } });
    }
    content.push({ type: "text", text: ANALYZE_PROMPT + (contextParts ? `\n\nAdditional context:\n${contextParts}` : "") });
    const analyzeRes = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1500,
      messages: [{ role: "user", content }],
    });
    const creativeBrief = analyzeRes.choices[0].message.content?.trim() || "";

    const { flagged } = await moderateInput(creativeBrief.slice(0, 1000));
    if (flagged) return res.status(400).json({ error: "Your prompt was flagged as inappropriate.", code: "CONTENT_FLAGGED" });

    // Stage 2: fal.ai render
    const FAL_KEY = process.env.FAL_API_KEY || process.env.FAL_KEY;

    const NANO_SIZE = { "1:1": "square_hd", "4:5": { width: 864, height: 1080 }, "9:16": { width: 680, height: 1080 } };
    const NANO_DIMS = { "1:1": "1024x1024px (square)", "4:5": "864x1080px (portrait 4:5)", "9:16": "680x1080px (story 9:16)" };
    const blankUrl  = blankForKey(aspectRatio);
    const dimLabel  = NANO_DIMS[aspectRatio] || NANO_DIMS["1:1"];

    const imageUrls = [];
    if (referenceImageUrl) imageUrls.push(referenceImageUrl);
    if (logoUrl)            imageUrls.push(logoUrl);
    imageUrls.push(blankUrl);

    const sizeNote = `[CRITICAL: Output must be exactly ${dimLabel}. The last image is a blank canvas showing the exact required output dimensions — match its size precisely.${logoUrl ? " One of the images is the brand logo — incorporate it prominently." : ""}] `;
    const prompt   = sizeNote + RENDER_PROMPT_PREFIX + creativeBrief;

    const falAbort   = new AbortController();
    const falTimeout = setTimeout(() => falAbort.abort(), 90_000);
    let falRes;
    try {
      falRes = await fetch("https://fal.run/fal-ai/nano-banana/edit", {
        method:  "POST",
        headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ image_urls: imageUrls, prompt, image_size: NANO_SIZE[aspectRatio] || "square_hd" }),
        signal:  falAbort.signal,
      });
    } finally {
      clearTimeout(falTimeout);
    }
    if (!falRes.ok) throw new Error(`Fal.ai failed: ${(await falRes.text()).slice(0, 200)}`);
    const data   = await falRes.json();
    const falUrl = data.images?.[0]?.url || data.image?.url;
    if (!falUrl) throw new Error("No image returned");

    const imgRes = await fetch(falUrl);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const ct     = imgRes.headers.get("content-type") || "image/jpeg";
    const ext    = ct.includes("png") ? "png" : "jpg";
    const key    = `social-posts/${req.user.id}/post-${Date.now()}.${ext}`;
    const { error: upErr } = await supabaseAdmin.storage.from("user-assets").upload(key, buffer, { contentType: ct, upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(key);

    await supabaseAdmin.from("social_posts").insert({
      id: recordId, user_id: req.user.id, post_url: publicUrl, storage_key: key, aspect_ratio: aspectRatio,
    }).then(({ error }) => { if (error) console.error("[social-post/generate] db:", error.message); });

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
