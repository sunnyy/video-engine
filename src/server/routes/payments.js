import express from "express";
import crypto  from "node:crypto";
import Razorpay from "razorpay";
import {
  supabaseAdmin, requireAuth, requireAdmin, addCredits, uuidv4,
  sendAdminAlert, sendUserEmail,
  adminNewSaleEmail, adminPlanRenewalEmail, adminPlanUpgradeEmail,
  adminCreditsTopupEmail,
  userCreditsPurchasedEmail, userPlanUpgradeEmail, userPlanRenewalEmail,
} from "../middleware/shared.js";
import { notifyUser } from "../services/notificationService.js";
import { rewardReferrerOnFirstPurchase } from "./referrals.js";
import { validateCoupon, recordRedemption } from "./coupons.js";

export const router = express.Router();

/* ── Exchange rate cache ─────────────────────────────────────────────────── */
const FALLBACK_RATE   = 92.60;
const RATE_CACHE_TTL  = 60 * 60 * 1000; // 1 hour
let   _cachedRate     = null;
let   _cacheTimestamp = 0;

async function getUSDtoINR() {
  const now = Date.now();
  if (_cachedRate && (now - _cacheTimestamp) < RATE_CACHE_TTL) return _cachedRate;
  try {
    const r = await fetch("https://api.exchangerate-api.com/v4/latest/USD", { signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error("non-ok response");
    const data = await r.json();
    const rate = data?.rates?.INR;
    if (!rate || typeof rate !== "number") throw new Error("no INR rate");
    _cachedRate     = rate;
    _cacheTimestamp = now;
    return rate;
  } catch {
    console.warn("[exchange-rate] fetch failed, using fallback", FALLBACK_RATE);
    return FALLBACK_RATE;
  }
}

/* ── Payments: Razorpay ──────────────────────────────────────────────────── */
function getRazorpay() {
  return new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

/* ── Public: active plans ── */
router.get("/plans", async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("plans")
      .select("id, name, slug, description, credits, price_monthly, price_annual, discount_percent, is_popular, sort_order, features")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("[plans]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/exchange-rate — live USD→INR rate, cached 1 hour */
router.get("/exchange-rate", async (_req, res) => {
  try {
    const rate = await getUSDtoINR();
    res.json({ rate, timestamp: Date.now() });
  } catch (err) {
    res.json({ rate: FALLBACK_RATE, timestamp: Date.now() });
  }
});

/** POST /api/payments/create-order — create a Razorpay order for a plan */
router.post("/payments/create-order", requireAuth, async (req, res) => {
  try {
    const { planSlug, billingCycle, exchangeRate: clientRate, couponCode } = req.body;
    if (!planSlug || !billingCycle) return res.status(400).json({ error: "planSlug and billingCycle required" });

    const { data: plan, error } = await supabaseAdmin
      .from("plans")
      .select("id, name, slug, price_monthly, price_annual, discount_percent, credits")
      .eq("slug", planSlug)
      .eq("is_active", true)
      .single();
    if (error || !plan) return res.status(404).json({ error: "Plan not found" });

    // Use client-provided rate only if it looks sane (50–150); otherwise fetch server-side
    const rate = (typeof clientRate === "number" && clientRate >= 50 && clientRate <= 150)
      ? clientRate
      : await getUSDtoINR();

    const baseUSD    = billingCycle === "annual" && plan.price_annual ? plan.price_annual : plan.price_monthly;
    // price_annual already includes the annual discount, so charge it directly. discount_percent
    // is display-only ("Save X%") — re-applying it here double-discounted annual buyers.
    let discounted   = baseUSD;
    let appliedCode  = null;

    // Promo code (server-authoritative — the client preview never sets the price).
    if (couponCode) {
      const cv = await validateCoupon({ code: couponCode, userId: req.user.id, baseUSD });
      if (!cv.valid) return res.status(400).json({ error: "This promo code can't be applied.", code: "COUPON_INVALID" });
      discounted  = cv.finalUSD;
      appliedCode = cv.coupon.code;
    }

    const amountPaise = Math.round(discounted * rate) * 100;

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount:   amountPaise,
      currency: "INR",
      receipt:  `order_${uuidv4().slice(0, 8)}`,
      notes: {
        user_id:       req.user.id,
        plan_slug:     planSlug,
        billing_cycle: billingCycle,
        coupon_code:   appliedCode || "",
      },
    });

    res.json({
      orderId:      order.id,
      amount:       amountPaise,
      currency:     "INR",
      keyId:        process.env.RAZORPAY_KEY_ID,
      planName:     plan.name,
      planSlug,
      billingCycle,
    });
  } catch (err) {
    console.error("[payments/create-order]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/payments/verify — verify signature, provision credits, insert subscription */
router.post("/payments/verify", requireAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planSlug, billingCycle, couponCode } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !planSlug) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Verify Razorpay signature
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: "Payment verification failed" });
    }

    // Idempotency: skip if this payment was already processed
    const { data: existingTx, error: idempotencyErr } = await supabaseAdmin
      .from("credit_transactions")
      .select("id")
      .eq("payment_id", razorpay_payment_id)
      .maybeSingle();
    if (idempotencyErr) throw new Error(`Idempotency check failed: ${idempotencyErr.message}`);
    if (existingTx) return res.json({ success: true, duplicate: true });

    // Fetch plan
    const { data: plan, error } = await supabaseAdmin
      .from("plans")
      .select("id, name, price_monthly, price_annual, discount_percent, credits")
      .eq("slug", planSlug)
      .eq("is_active", true)
      .single();
    if (error || !plan) return res.status(404).json({ error: "Plan not found" });

    const baseUSD    = billingCycle === "annual" && plan.price_annual ? plan.price_annual : plan.price_monthly;
    // price_annual already includes the annual discount, so charge it directly. discount_percent
    // is display-only ("Save X%") — re-applying it here double-discounted annual buyers.
    let discounted     = baseUSD;
    let appliedCoupon  = null;

    // Re-validate the promo code (server-authoritative) so price_paid + redemption match the charge.
    if (couponCode) {
      const cv = await validateCoupon({ code: couponCode, userId: req.user.id, baseUSD });
      if (cv.valid) {
        discounted    = cv.finalUSD;
        appliedCoupon = { id: cv.coupon.id, discountUSD: cv.discountUSD };
      }
    }

    const rate       = await getUSDtoINR();
    const amountINR  = +(discounted * rate).toFixed(2);

    const now = new Date();
    const periodDays = billingCycle === "annual" ? 365 : 30;
    const periodEnd  = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);
    // Annual = 12 months of credits granted up front (credits never expire). Monthly = one month.
    const creditsToGrant = billingCycle === "annual" ? plan.credits * 12 : plan.credits;

    // Detect upgrade vs renewal: check for existing active subscription
    const { data: existingSub } = await supabaseAdmin
      .from("subscriptions")
      .select("id, plan_id, plans(name, slug)")
      .eq("user_id", req.user.id)
      .eq("status", "active")
      .order("current_period_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    const isRenewal = existingSub?.plans?.slug === planSlug;
    const isUpgrade = existingSub && !isRenewal;
    const prevPlanName = existingSub?.plans?.name || null;

    // Supersede any existing active subscriptions before inserting new one
    await supabaseAdmin
      .from("subscriptions")
      .update({ status: "superseded" })
      .eq("user_id", req.user.id)
      .eq("status", "active");

    // Insert subscription record
    await supabaseAdmin.from("subscriptions").insert({
      user_id:                req.user.id,
      plan_id:                plan.id,
      status:                 "active",
      billing_cycle:          billingCycle,
      price_paid:             amountINR,
      credits_granted:        creditsToGrant,
      current_period_start:   now.toISOString(),
      current_period_end:     periodEnd.toISOString(),
      razorpay_payment_id,
      razorpay_subscription_id: razorpay_order_id,
    });

    // Add credits
    const { balance: newBalance } = await addCredits(
      req.user.id, creditsToGrant, "purchase", "plan_subscription",
      `${plan.name} plan – ${billingCycle}`, razorpay_payment_id,
    );

    // Referral: a referee's first purchase rewards their referrer (idempotent, best-effort).
    rewardReferrerOnFirstPurchase(req.user.id);

    // Record the promo redemption (idempotent on payment_id; bumps the coupon's counter).
    if (appliedCoupon) {
      recordRedemption({
        couponId: appliedCoupon.id, userId: req.user.id, paymentId: razorpay_payment_id,
        planSlug, billingCycle, discountUSD: appliedCoupon.discountUSD,
      });
    }

    // Emails (fire-and-forget)
    supabaseAdmin.auth.admin.getUserById(req.user.id).then(({ data: { user } }) => {
      if (!user) return;
      const name = user.user_metadata?.full_name || user.user_metadata?.name || "";
      const nextRenewal = periodEnd.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

      if (isRenewal) {
        const adminEmail = adminPlanRenewalEmail({ userEmail: user.email, plan: plan.name, amount: amountINR.toFixed(2) });
        sendAdminAlert(adminEmail.subject, adminEmail.html);
        const userEmail = userPlanRenewalEmail(name, plan.name, creditsToGrant, nextRenewal);
        sendUserEmail(user.email, userEmail.subject, userEmail.html);
        notifyUser(user.id, { type: "plan_renewed", icon: "🔁", severity: "success", link: "/credits",
          title: `Your ${plan.name} plan was renewed`, body: `${creditsToGrant} credits added · next renewal ${nextRenewal}` });
      } else if (isUpgrade) {
        const adminEmail = adminPlanUpgradeEmail({ userEmail: user.email, fromPlan: prevPlanName, toPlan: plan.name, amount: amountINR.toFixed(2) });
        sendAdminAlert(adminEmail.subject, adminEmail.html);
        const userEmail = userPlanUpgradeEmail(name, prevPlanName, plan.name, creditsToGrant);
        sendUserEmail(user.email, userEmail.subject, userEmail.html);
        notifyUser(user.id, { type: "plan_upgraded", icon: "⬆️", severity: "success", link: "/credits",
          title: `Upgraded to ${plan.name}`, body: `From ${prevPlanName} · ${creditsToGrant} credits added` });
      } else {
        // New subscription
        const adminEmail = adminNewSaleEmail({ userEmail: user.email, plan: plan.name, amount: amountINR.toFixed(2), credits: creditsToGrant });
        sendAdminAlert(adminEmail.subject, adminEmail.html);
        const userEmail = userCreditsPurchasedEmail(name, creditsToGrant, newBalance);
        sendUserEmail(user.email, userEmail.subject, userEmail.html);
        notifyUser(user.id, { type: "plan_purchased", icon: "🎉", severity: "success", link: "/credits",
          title: `Welcome to ${plan.name}`, body: `${creditsToGrant} credits added · balance ${newBalance}` });
      }
    }).catch(() => {});

    res.json({ success: true, credits: creditsToGrant, balance: newBalance });
  } catch (err) {
    console.error("[payments/verify]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/payments/subscription — active subscription for this user */
router.get("/payments/subscription", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .select("id, status, billing_cycle, price_paid, credits_granted, current_period_start, current_period_end, razorpay_payment_id, plans(name, slug, credits)")
      .eq("user_id", req.user.id)
      .eq("status", "active")
      .order("current_period_start", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    res.json({ subscription: data || null });
  } catch (err) {
    console.error("[payments/subscription]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Credit top-up packages ── */
// Credit packs — priced ≥ the $49/1,500 plan's per-credit rate so packs never undercut subscribing.
// Available to everyone (no subscription required) — if someone wants to buy credits, take the sale.
const CREDIT_PACKAGES = [
  { id: "topup_500",  credits: 500,  priceUSD: 19, label: "500 Credits"   },
  { id: "topup_1500", credits: 1500, priceUSD: 49, label: "1,500 Credits" },
  { id: "topup_3000", credits: 3000, priceUSD: 99, label: "3,000 Credits" },
];

router.get("/credits/packages", async (_req, res) => {
  res.json({ packages: CREDIT_PACKAGES });
});

router.post("/credits/topup/create-order", requireAuth, async (req, res) => {
  try {
    const { packageId, exchangeRate: clientRate } = req.body;
    if (!packageId) return res.status(400).json({ error: "packageId required" });

    const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
    if (!pkg) return res.status(404).json({ error: "Package not found" });

    // Credit packs are for paid subscribers only — otherwise free accounts could farm cheap credits.
    const { data: sub } = await supabaseAdmin
      .from("subscriptions").select("id").eq("user_id", req.user.id).eq("status", "active").maybeSingle();
    if (!sub) return res.status(403).json({ error: "Active plan required to purchase credits", code: "SUBSCRIPTION_REQUIRED" });

    if (pkg.priceUSD > 100) return res.status(400).json({ error: "Maximum top-up is $100" });

    const rate = (typeof clientRate === "number" && clientRate >= 50 && clientRate <= 150)
      ? clientRate : await getUSDtoINR();

    const amountPaise = Math.round(pkg.priceUSD * rate) * 100;

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount:   amountPaise,
      currency: "INR",
      receipt:  `topup_${uuidv4().slice(0, 8)}`,
      notes: { user_id: req.user.id, package_id: packageId, type: "credit_topup" },
    });

    res.json({
      orderId:   order.id,
      amount:    amountPaise,
      currency:  "INR",
      keyId:     process.env.RAZORPAY_KEY_ID,
      packageId,
      credits:   pkg.credits,
      label:     pkg.label,
    });
  } catch (err) {
    console.error("[credits/topup/create-order]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/credits/topup/verify", requireAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, packageId } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !packageId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    if (expected !== razorpay_signature) return res.status(400).json({ error: "Payment verification failed" });

    // Idempotency: skip if this payment was already processed
    const { data: existingTopupTx, error: topupIdempotencyErr } = await supabaseAdmin
      .from("credit_transactions")
      .select("id")
      .eq("payment_id", razorpay_payment_id)
      .maybeSingle();
    if (topupIdempotencyErr) throw new Error(`Idempotency check failed: ${topupIdempotencyErr.message}`);
    if (existingTopupTx) return res.json({ success: true, duplicate: true });

    const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
    if (!pkg) return res.status(404).json({ error: "Package not found" });

    const { balance: newBalance } = await addCredits(
      req.user.id, pkg.credits, "purchase", "credit_topup",
      `Credit Top-up — ${pkg.label}`, razorpay_payment_id,
    );

    supabaseAdmin.auth.admin.getUserById(req.user.id).then(({ data: { user } }) => {
      if (!user?.email) return;
      const name = user.user_metadata?.full_name || user.user_metadata?.name || "";
      const adminEmail = adminCreditsTopupEmail({ userEmail: user.email, amount: pkg.credits, balance: newBalance });
      sendAdminAlert(adminEmail.subject, adminEmail.html);
      const userEmail = userCreditsPurchasedEmail(name, pkg.credits, newBalance);
      sendUserEmail(user.email, userEmail.subject, userEmail.html);
      notifyUser(user.id, { type: "credits_topup", icon: "⚡", severity: "success", link: "/credits",
        title: `${pkg.credits} credits added`, body: `New balance: ${newBalance} credits` });
    }).catch(() => {});

    res.json({ success: true, credits: pkg.credits, balance: newBalance });
  } catch (err) {
    console.error("[credits/topup/verify]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── All subscriptions (admin) ── */
router.get("/subscriptions/all", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = data || [];
    // Enrich with user emails
    const uniqueIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))];
    const emailMap = {};
    await Promise.all(uniqueIds.map(async uid => {
      try {
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(uid);
        emailMap[uid] = user?.email || uid;
      } catch { emailMap[uid] = uid; }
    }));
    res.json({ subscriptions: rows.map(r => ({ ...r, email: emailMap[r.user_id] || r.user_id })) });
  } catch (err) {
    console.error("[subscriptions/all]", err.message);
    res.status(500).json({ error: err.message });
  }
});
