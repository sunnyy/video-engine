/**
 * announcements.js — admin broadcast campaigns. Mounted at /api/admin (all admin-gated).
 * Create persists a campaign row and enqueues a broadcast_announcement job (deferred when
 * scheduled). The job (jobs/handlers.js) fans the campaign out into per-user notifications.
 */
import express from "express";
import { supabaseAdmin, requireAuth, requireAdmin } from "../middleware/shared.js";
import { enqueue } from "../jobs/queue.js";
import { resolveAudienceIds, CATEGORY_META } from "../services/announcements/audience.js";
import { notifyUser } from "../services/notificationService.js";
import { sendUserEmail, userAnnouncementEmail } from "../services/emailService.js";

export const router = express.Router();

const CATEGORIES = ["news", "promo", "maintenance", "warning", "tip"];

function metaFor(category) {
  return CATEGORY_META[category] || CATEGORY_META.news;
}

/* ── POST /api/admin/announcements — create + send (or schedule) ── */
router.post("/announcements", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, body = null, link = null, category = "news", audience, scheduledAt = null, email = false } = req.body || {};
    if (!title?.trim()) return res.status(400).json({ error: "title is required" });
    if (!audience?.type) return res.status(400).json({ error: "audience is required" });
    const cat = CATEGORIES.includes(category) ? category : "news";
    const { icon, severity } = metaFor(cat);

    const future = scheduledAt && new Date(scheduledAt).getTime() > Date.now();

    const { data: ann, error } = await supabaseAdmin
      .from("announcements")
      .insert({
        title: title.trim(), body, link, category: cat, icon, severity,
        audience, email: !!email, status: future ? "scheduled" : "queued",
        scheduled_at: future ? new Date(scheduledAt).toISOString() : null,
        created_by: req.user.id,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await enqueue("broadcast_announcement", { announcementId: ann.id },
      { userId: req.user.id, runAt: future ? scheduledAt : null });

    res.status(201).json({ announcement: ann });
  } catch (e) {
    console.error("[admin/announcements/create]", e.message);
    res.status(500).json({ error: e.message });
  }
});

/* ── GET /api/admin/announcements — recent campaigns ── */
router.get("/announcements", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    res.json({ announcements: data || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── POST /api/admin/announcements/preview-count — how many users an audience reaches ── */
router.post("/announcements/preview-count", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { audience } = req.body || {};
    if (!audience?.type) return res.status(400).json({ error: "audience is required" });
    const ids = await resolveAudienceIds(audience);
    res.json({ count: ids.length });
  } catch (e) {
    console.error("[admin/announcements/preview-count]", e.message);
    res.status(500).json({ error: e.message });
  }
});

/* ── POST /api/admin/announcements/test — send only to the requesting admin ── */
router.post("/announcements/test", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, body = null, link = null, category = "news", email = false } = req.body || {};
    if (!title?.trim()) return res.status(400).json({ error: "title is required" });
    const { icon, severity } = metaFor(CATEGORIES.includes(category) ? category : "news");
    await notifyUser(req.user.id, { type: "announcement", title: `[Test] ${title.trim()}`, body, link, icon, severity });
    if (email && req.user.email) {
      const tpl = userAnnouncementEmail({ title: `[Test] ${title.trim()}`, body, link });
      await sendUserEmail(req.user.email, tpl.subject, tpl.html);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
