/**
 * planGate.js — server-side feature gating by subscription plan.
 *
 * Starter is the entry tier; the costlier / power features (Automation, Video Clipping) are
 * reserved for Pro and Agency. This is the HARD enforcement — the landing copy is just marketing.
 * Admins bypass (for testing). Users with no active sub are treated as below Pro.
 */
import { supabaseAdmin } from "./shared.js";

const PRO_PLUS = new Set(["pro", "agency"]);

/** The slug of the user's active plan ("starter" | "pro" | "agency"), or null if none. */
export async function getUserPlanSlug(userId) {
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("plans(slug)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.plans?.slug || null;
}

/** Express middleware: allow only Pro/Agency (or admins). `feature` is used in the 403 message. */
export function requireProPlus(feature = "This feature") {
  return async (req, res, next) => {
    try {
      if (req.user?.app_metadata?.role === "admin") return next();
      const slug = await getUserPlanSlug(req.user.id);
      if (PRO_PLUS.has(slug)) return next();
      return res.status(403).json({
        error: `${feature} is available on the Pro and Agency plans. Upgrade to unlock it.`,
        code: "PLAN_UPGRADE_REQUIRED",
      });
    } catch (e) {
      console.error("[planGate]", e.message);
      return res.status(500).json({ error: "Could not verify your plan. Please try again." });
    }
  };
}
