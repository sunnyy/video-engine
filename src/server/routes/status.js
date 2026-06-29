/**
 * status.js — PUBLIC system status endpoint (no auth). Returns only sanitized operational state
 * (Operational / Down per component) — NEVER provider names, error text, or counts. Powers the
 * public /status page. Internal detail lives behind the admin Monitoring dashboard instead.
 */
import express from "express";
import { getPublicStatus } from "../services/apiHealth.js";

export const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    res.json(await getPublicStatus());
  } catch {
    // Never fail the status page — default to operational if the read errors.
    res.json({ status: "operational", components: [], updatedAt: new Date().toISOString() });
  }
});
