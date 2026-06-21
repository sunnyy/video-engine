/**
 * brandKit.js — per-user brand kit CRUD + logo upload.
 * Phase 1 fields: logo_url, channel_name, cta_text, website, primary_color, secondary_color.
 * Consumed by the video pipeline (logo in hook, Follow-CTA in close, palette from colors)
 * and later by AutoPilot. One kit per user (upsert on user_id).
 */
import express from "express";
import { supabaseAdmin, requireAuth, uploadMemory } from "../middleware/shared.js";

export const router = express.Router();

const FIELDS = ["logo_url", "channel_name", "cta_text", "website", "primary_color", "secondary_color"];

/** Load the current user's brand kit (null if none yet). */
export async function getBrandKit(userId) {
  const { data, error } = await supabaseAdmin.from("brand_kits").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data || null;
}

router.get("/", requireAuth, async (req, res) => {
  try { res.json({ brandKit: await getBrandKit(req.user.id) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/", requireAuth, async (req, res) => {
  try {
    const row = { user_id: req.user.id, updated_at: new Date().toISOString() };
    for (const f of FIELDS) row[f] = typeof req.body[f] === "string" && req.body[f].trim() ? req.body[f].trim() : null;
    const { data, error } = await supabaseAdmin.from("brand_kits").upsert(row, { onConflict: "user_id" }).select().single();
    if (error) throw new Error(error.message);
    res.json({ brandKit: data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/logo", requireAuth, uploadMemory.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const mime = req.file.mimetype || "";
    const ext  = mime.includes("png") ? "png" : mime.includes("svg") ? "svg" : mime.includes("webp") ? "webp" : "jpg";
    const key  = `brand-kits/${req.user.id}/logo-${Date.now()}.${ext}`;
    const { error } = await supabaseAdmin.storage.from("user-assets").upload(key, req.file.buffer, { contentType: mime, upsert: true });
    if (error) throw new Error(error.message);
    const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(key);
    res.json({ url: publicUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
