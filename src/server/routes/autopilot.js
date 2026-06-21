/**
 * autopilot.js — HTTP boundary for AutoPilot settings + the topic queue. The topic-queue
 * service itself stays pure (no knowledge of rendering/publishing/jobs); this just exposes
 * it for the settings UI and manual testing. The scheduler (next phase) calls the service
 * directly, not these routes.
 */
import express from "express";
import { requireAuth } from "../middleware/shared.js";
import { getSettings, saveSettings } from "../services/autopilot/settings.js";
import { ensureTopics, getQueuedCount } from "../services/autopilot/topics.js";
import { supabaseAdmin } from "../middleware/shared.js";

export const router = express.Router();

router.get("/settings", requireAuth, async (req, res) => {
  try { res.json({ settings: await getSettings(req.user.id) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/settings", requireAuth, async (req, res) => {
  try { res.json({ settings: await saveSettings(req.user.id, req.body || {}) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/topics", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("autopilot_topics")
      .select("id, title, niche, angle, keywords, status, created_at")
      .eq("user_id", req.user.id).order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    res.json({ topics: data || [], queued: await getQueuedCount(req.user.id) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/topics/refill", requireAuth, async (req, res) => {
  try { res.json(await ensureTopics(req.user.id)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
