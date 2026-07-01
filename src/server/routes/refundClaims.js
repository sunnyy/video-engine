import express from "express";
import { supabaseAdmin, requireAuth, requireAdmin, addCredits } from "../middleware/shared.js";
import { notifyUser } from "../services/notificationService.js";

export const router = express.Router();

const MONTHLY_LIMIT = 2;

function monthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  return { start, end };
}

/* ── POST /api/refund-claims — submit a claim ── */
router.post("/refund-claims", requireAuth, async (req, res) => {
  try {
    const { project_id, service, credits_requested, reason, screenshot_url } = req.body;

    if (!service || !credits_requested || !reason) {
      return res.status(400).json({ error: "service, credits_requested, and reason are required" });
    }

    const ALLOWED_SERVICES = ["ai_video", "typography_video", "product_ad", "ai_image", "product_poster"];
    if (!ALLOWED_SERVICES.includes(service)) {
      return res.status(400).json({ error: "Invalid service" });
    }

    if (!Number.isInteger(credits_requested) || credits_requested <= 0) {
      return res.status(400).json({ error: "credits_requested must be a positive integer" });
    }

    // Cap the claim at what was actually charged for this project — a refund can return at most
    // the credits the user paid (blocks claiming 500 credits against a 30-credit charge).
    if (project_id) {
      const { data: charge } = await supabaseAdmin
        .from("credit_transactions")
        .select("amount")
        .eq("user_id", req.user.id)
        .eq("project_id", project_id)
        .eq("type", "deduction")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const charged = charge ? Math.abs(charge.amount) : 0;
      if (charged > 0 && credits_requested > charged) {
        return res.status(400).json({ error: `Refund cannot exceed the ${charged} credits charged for this project`, code: "EXCEEDS_CHARGE" });
      }
    }

    // Monthly limit check
    const { start, end } = monthRange();
    const { count } = await supabaseAdmin
      .from("credit_refund_claims")
      .select("id", { count: "exact", head: true })
      .eq("user_id", req.user.id)
      .gte("created_at", start)
      .lt("created_at", end);

    if ((count ?? 0) >= MONTHLY_LIMIT) {
      return res.status(400).json({ error: "Monthly claim limit reached", code: "LIMIT_REACHED" });
    }

    // Duplicate pending claim for same project
    if (project_id) {
      const { data: existing } = await supabaseAdmin
        .from("credit_refund_claims")
        .select("id")
        .eq("user_id", req.user.id)
        .eq("project_id", project_id)
        .eq("status", "pending")
        .maybeSingle();

      if (existing) {
        return res.status(400).json({ error: "A pending claim already exists for this project", code: "DUPLICATE_CLAIM" });
      }
    }

    const { data, error } = await supabaseAdmin
      .from("credit_refund_claims")
      .insert({
        user_id:           req.user.id,
        project_id:        project_id || null,
        service,
        credits_requested,
        reason,
        screenshot_url:    screenshot_url || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.status(201).json({ claim: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── GET /api/refund-claims/my — user's own claims ── */
router.get("/refund-claims/my", requireAuth, async (req, res) => {
  try {
    const { data: claims, error } = await supabaseAdmin
      .from("credit_refund_claims")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const { start, end } = monthRange();
    const { count: monthly_count } = await supabaseAdmin
      .from("credit_refund_claims")
      .select("id", { count: "exact", head: true })
      .eq("user_id", req.user.id)
      .gte("created_at", start)
      .lt("created_at", end);

    res.json({ claims: claims || [], monthly_count: monthly_count ?? 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── GET /api/refund-claims/my/limit — check monthly limit ── */
router.get("/refund-claims/my/limit", requireAuth, async (req, res) => {
  try {
    const { start, end } = monthRange();
    const { count } = await supabaseAdmin
      .from("credit_refund_claims")
      .select("id", { count: "exact", head: true })
      .eq("user_id", req.user.id)
      .gte("created_at", start)
      .lt("created_at", end);

    const used = count ?? 0;
    res.json({
      count:      used,
      limit:      MONTHLY_LIMIT,
      remaining:  Math.max(0, MONTHLY_LIMIT - used),
      can_claim:  used < MONTHLY_LIMIT,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── GET /api/admin/refund-claims — admin: list all claims ── */
router.get("/admin/refund-claims", requireAuth, requireAdmin, async (req, res) => {
  try {
    const status = req.query.status;
    const limit  = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    let query = supabaseAdmin
      .from("credit_refund_claims")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    res.json({ claims: data || [], total: count ?? 0, limit, offset });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── POST /api/admin/refund-claims/:id/approve ── */
router.post("/admin/refund-claims/:id/approve", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data: claim, error: fetchErr } = await supabaseAdmin
      .from("credit_refund_claims")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!claim) return res.status(404).json({ error: "Claim not found" });
    if (claim.status !== "pending") return res.status(400).json({ error: `Claim is already ${claim.status}` });

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("credit_refund_claims")
      .update({ status: "approved", reviewed_by: req.user.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", claim.id)
      .select()
      .single();

    if (updateErr) throw new Error(updateErr.message);

    await addCredits(claim.user_id, claim.credits_requested, "refund", "claim_approved", "Credit refund approved");

    notifyUser(claim.user_id, { type: "refund_approved", icon: "✅", severity: "success", link: "/credits",
      title: "Your credit refund was approved", body: `${claim.credits_requested} credits have been added to your account.` });

    res.json({ claim: updated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── POST /api/admin/refund-claims/:id/reject ── */
router.post("/admin/refund-claims/:id/reject", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rejection_reason } = req.body;
    if (!rejection_reason) return res.status(400).json({ error: "rejection_reason is required" });

    const { data: claim, error: fetchErr } = await supabaseAdmin
      .from("credit_refund_claims")
      .select("id, status")
      .eq("id", req.params.id)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!claim) return res.status(404).json({ error: "Claim not found" });
    if (claim.status !== "pending") return res.status(400).json({ error: `Claim is already ${claim.status}` });

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("credit_refund_claims")
      .update({ status: "rejected", rejection_reason, reviewed_by: req.user.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", claim.id)
      .select()
      .single();

    if (updateErr) throw new Error(updateErr.message);

    notifyUser(updated.user_id, { type: "refund_rejected", icon: "🚫", severity: "warning", link: "/credits",
      title: "Your refund claim was reviewed", body: rejection_reason });

    res.json({ claim: updated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
