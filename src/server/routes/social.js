/**
 * social.js — OAuth connect/callback + account management for publishing platforms.
 * Thin HTTP layer over services/social. Tokens never leave the server.
 */
import express from "express";
import { requireAuth } from "../middleware/shared.js";
import { connect, completeConnect, disconnect } from "../services/social/service.js";
import { listAccounts } from "../services/social/accounts.js";
import { supportedPlatforms } from "../services/social/adapters/index.js";
import { enqueue } from "../jobs/queue.js";

export const router = express.Router();

// Where to send the browser back to after the OAuth round-trip (frontend origin).
const APP_URL = process.env.APP_PUBLIC_URL || process.env.VITE_APP_URL || "";

/** List the user's connected accounts (no tokens) + which platforms are supported. */
router.get("/accounts", requireAuth, async (req, res) => {
  try { res.json({ accounts: await listAccounts(req.user.id), supported: supportedPlatforms() }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

/** Start OAuth — returns the consent URL for the client to navigate to. */
router.get("/:platform/connect", requireAuth, async (req, res) => {
  try { res.json({ url: connect(req.user.id, req.params.platform) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

/** OAuth redirect target (no auth header — identity travels in the signed `state`). */
router.get("/:platform/callback", async (req, res) => {
  const { code, state, error } = req.query;
  const back = (q) => res.redirect(`${APP_URL}/brand-kit?${q}`);
  if (error) return back(`social_error=${encodeURIComponent(String(error))}`);
  if (!code || !state) return back("social_error=missing_code");
  try {
    const { platform } = await completeConnect(String(state), String(code));
    back(`connected=${encodeURIComponent(platform)}`);
  } catch (e) {
    console.error("[social/callback]", e.message);
    back(`social_error=${encodeURIComponent(e.message)}`);
  }
});

/** Disconnect a platform. */
router.post("/:platform/disconnect", requireAuth, async (req, res) => {
  try { await disconnect(req.user.id, req.params.platform); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

/**
 * Queue a publish of an already-rendered MP4 (separate from rendering — consumes a URL +
 * metadata only). Returns a jobId; the worker performs the upload.
 * body: { videoUrl, metadata?: { title, description, tags[], privacyStatus, scheduledAt } }
 */
router.post("/:platform/publish", requireAuth, async (req, res) => {
  try {
    const { videoUrl, metadata } = req.body;
    if (!videoUrl) return res.status(400).json({ error: "videoUrl required" });
    const job = await enqueue(
      "publish_post",
      { userId: req.user.id, platform: req.params.platform, videoUrl, metadata: metadata || {} },
      { userId: req.user.id, maxAttempts: 5 },
    );
    res.json({ jobId: job.id });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
