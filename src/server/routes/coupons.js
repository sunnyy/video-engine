/**
 * coupons.js — promo/discount codes for plan checkout.
 *
 * Validation is server-authoritative: the client may preview a discount via POST /coupons/validate,
 * but the real discount is recomputed in payments.js (create-order + verify) using validateCoupon(),
 * and recorded with recordRedemption() only after the payment signature is verified.
 *
 * Discounts apply to PLAN subscriptions only (not credit top-ups). Two types: percent | fixed (USD off).
 */
import express from "express";
import { supabaseAdmin, requireAuth, requireAdmin } from "../middleware/shared.js";

export const router = express.Router();

const round2 = (n) => Math.round(n * 100) / 100;
const normalize = (code) => (code || "").trim().toUpperCase();

/**
 * Validate a coupon for a user against a base USD price. Returns a result object — never throws.
 * { valid, reason?, coupon?, discountUSD, finalUSD }. `reason` is a short machine code for the UI.
 */
export async function validateCoupon({ code, userId, baseUSD }) {
  const norm = normalize(code);
  if (!norm) return { valid: false, reason: "missing" };

  const { data: coupon } = await supabaseAdmin
    .from("coupons").select("*").eq("code", norm).maybeSingle();
  if (!coupon)        return { valid: false, reason: "invalid" };
  if (!coupon.active) return { valid: false, reason: "inactive" };
  if (coupon.expires_at && Date.now() > new Date(coupon.expires_at).getTime())
    return { valid: false, reason: "expired" };
  if (coupon.max_redemptions != null && coupon.redeemed_count >= coupon.max_redemptions)
    return { valid: false, reason: "exhausted" };

  if (coupon.per_user_once && userId) {
    const { count } = await supabaseAdmin
      .from("coupon_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", coupon.id).eq("user_id", userId);
    if ((count || 0) > 0) return { valid: false, reason: "already_used" };
  }

  // Compute discount; never let it exceed the price.
  const raw = coupon.discount_type === "fixed"
    ? Number(coupon.discount_value)
    : baseUSD * (Number(coupon.discount_value) / 100);
  const discountUSD = round2(Math.min(Math.max(raw, 0), baseUSD));
  const finalUSD    = round2(baseUSD - discountUSD);

  return { valid: true, coupon, discountUSD, finalUSD };
}

/**
 * Record a redemption + bump the coupon's counter. Idempotent via the unique payment_id index —
 * a duplicate insert is swallowed and the counter is not bumped again. Best-effort; never throws.
 */
export async function recordRedemption({ couponId, userId, paymentId, planSlug, billingCycle, discountUSD }) {
  try {
    const { error } = await supabaseAdmin.from("coupon_redemptions").insert({
      coupon_id: couponId, user_id: userId, payment_id: paymentId,
      plan_slug: planSlug, billing_cycle: billingCycle, amount_discounted_usd: discountUSD,
    });
    if (error) return; // unique violation = already recorded for this payment
    // Bump the usage counter (read-modify-write; redemptions are low-frequency).
    const { data: c } = await supabaseAdmin.from("coupons").select("redeemed_count").eq("id", couponId).maybeSingle();
    await supabaseAdmin.from("coupons")
      .update({ redeemed_count: (c?.redeemed_count || 0) + 1, updated_at: new Date().toISOString() })
      .eq("id", couponId);
  } catch (err) {
    console.error("[coupons] recordRedemption failed:", err.message);
  }
}

const REASON_MESSAGE = {
  missing:      "Enter a code.",
  invalid:      "That code isn't valid.",
  inactive:     "That code is no longer active.",
  expired:      "That code has expired.",
  exhausted:    "That code has reached its limit.",
  already_used: "You've already used this code.",
};

/* ── User: preview a coupon for a plan ── */
router.post("/coupons/validate", requireAuth, async (req, res) => {
  try {
    const { code, planSlug, billingCycle } = req.body || {};
    if (!planSlug) return res.status(400).json({ error: "planSlug required" });

    const { data: plan } = await supabaseAdmin
      .from("plans").select("price_monthly, price_annual").eq("slug", planSlug).eq("is_active", true).maybeSingle();
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    const baseUSD = billingCycle === "annual" && plan.price_annual ? plan.price_annual : plan.price_monthly;
    const result  = await validateCoupon({ code, userId: req.user.id, baseUSD });

    if (!result.valid) return res.json({ valid: false, message: REASON_MESSAGE[result.reason] || "That code isn't valid." });

    res.json({
      valid: true,
      code: result.coupon.code,
      discountType: result.coupon.discount_type,
      discountValue: result.coupon.discount_value,
      discountUSD: result.discountUSD,
      originalUSD: round2(baseUSD),
      finalUSD: result.finalUSD,
    });
  } catch (err) {
    console.error("[coupons/validate]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: list coupons ── */
router.get("/admin/coupons", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("coupons").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ coupons: data || [] });
  } catch (err) {
    console.error("[admin/coupons:list]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: create coupon ── */
router.post("/admin/coupons", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { code, discountType, discountValue, expiresAt, maxRedemptions, perUserOnce, description } = req.body || {};
    const norm = normalize(code);
    if (!norm) return res.status(400).json({ error: "Code required" });
    if (!["percent", "fixed"].includes(discountType)) return res.status(400).json({ error: "discountType must be percent or fixed" });
    const value = Number(discountValue);
    if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ error: "discountValue must be a positive number" });
    if (discountType === "percent" && value > 100) return res.status(400).json({ error: "Percent cannot exceed 100" });

    const { data, error } = await supabaseAdmin.from("coupons").insert({
      code: norm,
      discount_type: discountType,
      discount_value: value,
      expires_at: expiresAt || null,
      max_redemptions: maxRedemptions ? Number(maxRedemptions) : null,
      per_user_once: perUserOnce !== false,
      description: description || null,
    }).select().single();
    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: "A coupon with that code already exists" });
      throw error;
    }
    res.json({ coupon: data });
  } catch (err) {
    console.error("[admin/coupons:create]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: update coupon (toggle active, edit fields) ── */
router.patch("/admin/coupons/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const updates = { updated_at: new Date().toISOString() };
    const b = req.body || {};
    if (b.active !== undefined)         updates.active = !!b.active;
    if (b.expiresAt !== undefined)      updates.expires_at = b.expiresAt || null;
    if (b.maxRedemptions !== undefined) updates.max_redemptions = b.maxRedemptions ? Number(b.maxRedemptions) : null;
    if (b.perUserOnce !== undefined)    updates.per_user_once = !!b.perUserOnce;
    if (b.description !== undefined)     updates.description = b.description || null;
    if (b.discountValue !== undefined) {
      const v = Number(b.discountValue);
      if (!Number.isFinite(v) || v <= 0) return res.status(400).json({ error: "discountValue must be positive" });
      updates.discount_value = v;
    }

    const { data, error } = await supabaseAdmin.from("coupons").update(updates).eq("id", req.params.id).select().single();
    if (error) throw error;
    res.json({ coupon: data });
  } catch (err) {
    console.error("[admin/coupons:update]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: delete coupon ── */
router.delete("/admin/coupons/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from("coupons").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("[admin/coupons:delete]", err.message);
    res.status(500).json({ error: err.message });
  }
});
