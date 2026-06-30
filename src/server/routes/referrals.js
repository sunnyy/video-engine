/**
 * referrals.js — invite-a-friend referral program.
 *
 * Flow: a visitor lands with ?ref=CODE (stored client-side), signs up via Google, then the client
 * calls POST /referrals/claim. We attribute the referral and grant the referee a signup bonus
 * immediately. The referrer's reward is granted later, on the referee's FIRST purchase (anti-abuse),
 * via rewardReferrerOnFirstPurchase() — called from the payments verify route.
 *
 * Codes live on profiles.referral_code (generated lazily). All writes use the service role.
 */
import express from "express";
import { supabaseAdmin, requireAuth, requireAdmin, addCredits } from "../middleware/shared.js";
import { notifyUser } from "../services/notificationService.js";

export const router = express.Router();

const REFEREE_BONUS    = 0;    // no signup credits — paid-only model; referee perk would reopen
                               // throwaway-account abuse (self-refer for free credits).
const REFERRER_REWARD  = 100;  // credits the referrer gets when the referee first purchases (gated
                               // on a real purchase → not abusable)
const CLAIM_WINDOW_DAYS = 30;  // a referral can only be claimed within N days of the account's creation

/* ── Code generation ── */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I
function randomCode(len = 8) {
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

/** Return the user's referral code, generating + persisting one on profiles if missing. */
async function ensureReferralCode(userId) {
  const { data: prof } = await supabaseAdmin.from("profiles").select("referral_code").eq("id", userId).maybeSingle();
  if (prof?.referral_code) return prof.referral_code;

  // Generate a unique code (retry on the rare collision against the partial unique index).
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = randomCode();
    const { error } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, referral_code: code, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (!error) return code;
  }
  throw new Error("Could not generate a referral code");
}

/* ── User: my referral code + stats + list ── */
router.get("/referrals/me", requireAuth, async (req, res) => {
  try {
    const code = await ensureReferralCode(req.user.id);
    const { data: rows } = await supabaseAdmin
      .from("referrals")
      .select("status, referrer_rewarded, created_at, qualified_at")
      .eq("referrer_id", req.user.id)
      .order("created_at", { ascending: false });

    const list = rows || [];
    const invited      = list.length;
    const qualified    = list.filter(r => r.status === "qualified").length;
    const creditsEarned = list.filter(r => r.referrer_rewarded).length * REFERRER_REWARD;

    res.json({
      code,
      refereeBonus: REFEREE_BONUS,
      referrerReward: REFERRER_REWARD,
      stats: { invited, qualified, creditsEarned },
      referrals: list,
    });
  } catch (err) {
    console.error("[referrals/me]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── User: claim a referral code (called once, right after first sign-in) ── */
router.post("/referrals/claim", requireAuth, async (req, res) => {
  try {
    const code = (req.body?.code || "").trim().toUpperCase();
    if (!code) return res.status(400).json({ error: "Missing code" });

    const refereeId = req.user.id;

    // Only newly-created accounts may claim — blocks old users farming codes.
    const createdAt = req.user.created_at ? new Date(req.user.created_at).getTime() : 0;
    if (!createdAt || Date.now() - createdAt > CLAIM_WINDOW_DAYS * 24 * 3600_000) {
      return res.json({ claimed: false, reason: "window" });
    }

    // Already referred? (one referral per signup)
    const { data: existing } = await supabaseAdmin
      .from("referrals").select("id").eq("referee_id", refereeId).maybeSingle();
    if (existing) return res.json({ claimed: false, reason: "already" });

    // Resolve the code to a referrer.
    const { data: referrer } = await supabaseAdmin
      .from("profiles").select("id").eq("referral_code", code).maybeSingle();
    if (!referrer) return res.json({ claimed: false, reason: "invalid" });
    if (referrer.id === refereeId) return res.json({ claimed: false, reason: "self" });

    // Record the referral + grant the referee's signup bonus.
    const { error: insErr } = await supabaseAdmin.from("referrals").insert({
      referrer_id: referrer.id, referee_id: refereeId, code, status: "pending", referee_rewarded: true,
    });
    // Unique violation = a concurrent claim already landed; treat as already-claimed.
    if (insErr) return res.json({ claimed: false, reason: "already" });

    if (REFEREE_BONUS > 0) {
      try {
        await addCredits(refereeId, REFEREE_BONUS, "bonus", "referral_signup", "Referral bonus — joined via a friend's invite");
      } catch (e) {
        console.error("[referrals/claim] referee bonus failed:", e.message);
      }
      notifyUser(refereeId, {
        type: "referral_bonus", icon: "🎁", severity: "success", link: "/credits",
        title: `You earned ${REFEREE_BONUS} bonus credits`, body: "Welcome bonus for joining through a friend's invite.",
      });
    }
    notifyUser(referrer.id, {
      type: "referral_joined", icon: "👋", severity: "info", link: "/invite",
      title: "Someone joined with your invite", body: `You'll earn ${REFERRER_REWARD} credits when they make their first purchase.`,
    });

    res.json({ claimed: true, bonus: REFEREE_BONUS });
  } catch (err) {
    console.error("[referrals/claim]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Grant the referrer's reward when a referee makes their first purchase. Idempotent — only pays
 * if a pending referral exists for this referee and hasn't been rewarded yet. Best-effort: never
 * throws into the payment flow.
 */
export async function rewardReferrerOnFirstPurchase(refereeId) {
  try {
    const { data: ref } = await supabaseAdmin
      .from("referrals")
      .select("id, referrer_id, referrer_rewarded")
      .eq("referee_id", refereeId)
      .maybeSingle();
    if (!ref || ref.referrer_rewarded) return;

    await supabaseAdmin
      .from("referrals")
      .update({ referrer_rewarded: true, status: "qualified", qualified_at: new Date().toISOString() })
      .eq("id", ref.id);

    await addCredits(ref.referrer_id, REFERRER_REWARD, "bonus", "referral_reward", "Referral reward — a friend you invited made their first purchase");

    notifyUser(ref.referrer_id, {
      type: "referral_reward", icon: "💰", severity: "success", link: "/credits",
      title: `You earned ${REFERRER_REWARD} referral credits`, body: "A friend you invited just made their first purchase. Thanks for sharing!",
    });
  } catch (err) {
    console.error("[referrals] rewardReferrerOnFirstPurchase failed:", err.message);
  }
}

/* ── Admin: all referrals + totals ── */
router.get("/admin/referrals", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const { data: rows } = await supabaseAdmin
      .from("referrals")
      .select("id, referrer_id, referee_id, code, status, referee_rewarded, referrer_rewarded, created_at, qualified_at")
      .order("created_at", { ascending: false });
    const list = rows || [];

    // Resolve emails for both sides.
    const ids = [...new Set(list.flatMap(r => [r.referrer_id, r.referee_id]).filter(Boolean))];
    const emailById = {};
    await Promise.all(ids.map(async (id) => {
      try { const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(id); emailById[id] = user?.email || id; }
      catch { emailById[id] = id; }
    }));

    const enriched = list.map(r => ({
      ...r,
      referrer_email: emailById[r.referrer_id] || r.referrer_id,
      referee_email:  emailById[r.referee_id]  || r.referee_id,
    }));

    const totals = {
      total:     list.length,
      qualified: list.filter(r => r.status === "qualified").length,
      creditsPaid: (list.filter(r => r.referee_rewarded).length * REFEREE_BONUS) +
                   (list.filter(r => r.referrer_rewarded).length * REFERRER_REWARD),
    };

    res.json({ referrals: enriched, totals, refereeBonus: REFEREE_BONUS, referrerReward: REFERRER_REWARD });
  } catch (err) {
    console.error("[admin/referrals]", err.message);
    res.status(500).json({ error: err.message });
  }
});
