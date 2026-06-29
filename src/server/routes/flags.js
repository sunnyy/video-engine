/**
 * flags.js — admin-only runtime flag control. Currently the global worker kill switch:
 * flip it on to immediately stop all workers from claiming new jobs (in-flight jobs
 * finish gracefully). Toggleable without a redeploy.
 */
import express from "express";
import { requireAuth, requireAdmin } from "../middleware/shared.js";
import { getKillSwitch, setKillSwitch, setApiBreakerEnforce } from "../jobs/flags.js";

export const router = express.Router();

router.get("/kill-switch", requireAuth, requireAdmin, async (_req, res) => {
  try { res.json({ on: await getKillSwitch() }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/kill-switch", requireAuth, requireAdmin, async (req, res) => {
  try { await setKillSwitch(!!req.body.on); res.json({ on: !!req.body.on }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// API-breaker enforcement toggle — when OFF, outages still alert/show but never block generation.
router.post("/api-breaker", requireAuth, requireAdmin, async (req, res) => {
  try { await setApiBreakerEnforce(!!req.body.on); res.json({ on: !!req.body.on }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
