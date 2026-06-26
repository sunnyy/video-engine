import express from "express";
import {
  supabaseAdmin, requireAuth, addCredits,
  sendAdminAlert, sendUserEmail,
  adminNewUserEmail, adminUserDeletedEmail,
  userWelcomeEmail, userAccountDeletedEmail,
} from "../middleware/shared.js";
import { notifyUser } from "../services/notificationService.js";

export const router = express.Router();

/* ── User: get own profile ── */
router.get("/user/profile", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", req.user.id)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    res.json(data || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── User: update own profile ── */
router.post("/user/profile", requireAuth, async (req, res) => {
  try {
    const allowed = ["niche", "goal", "default_duration", "default_language"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    updates.updated_at = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", req.user.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── User: own credit transactions ── */
router.get("/user/transactions", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("credit_transactions")
      .select("id, amount, type, action, description, balance_after, created_at")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── User: own credit balance + lifetime ── */
router.get("/user/credits", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("user_credits")
      .select("balance, lifetime_credits")
      .eq("user_id", req.user.id)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    res.json(data || { balance: 0, lifetime_credits: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Self-service: delete own account ── */
router.post("/account/delete", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { reason = "", reasonDetail = "" } = req.body || {};
    const { data: { user: deletedUser } } = await supabaseAdmin.auth.admin.getUserById(userId);

    const name = deletedUser?.user_metadata?.full_name || deletedUser?.user_metadata?.name || "";

    // Capture data before deleting rows
    const [{ data: creditsData }, { count: projectCount }] = await Promise.all([
      supabaseAdmin.from("user_credits").select("balance").eq("user_id", userId).single(),
      supabaseAdmin.from("projects").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);

    // Record churn before wiping data so the email is blockable on re-signup
    await supabaseAdmin.from("deleted_users").insert({
      user_id:            userId,
      email:              deletedUser?.email || null,
      name:               name || null,
      reason:             reason || null,
      reason_detail:      reasonDetail || null,
      credits_at_deletion: creditsData?.balance ?? null,
      project_count:      projectCount ?? 0,
      deleted_at:         new Date().toISOString(),
    });

    await supabaseAdmin.from("profiles").delete().eq("id", userId);
    await supabaseAdmin.from("user_credits").delete().eq("user_id", userId);
    await supabaseAdmin.from("subscriptions").delete().eq("user_id", userId);
    await supabaseAdmin.from("projects").delete().eq("user_id", userId);
    await supabaseAdmin.from("generated_images").delete().eq("user_id", userId);
    // Social connections: stored OAuth tokens + the user's own BYO Google credentials.
    await supabaseAdmin.from("social_accounts").delete().eq("user_id", userId);
    await supabaseAdmin.from("social_app_credentials").delete().eq("user_id", userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;

    const adminEmail = adminUserDeletedEmail({ id: userId, email: deletedUser?.email || "unknown", reason, reasonDetail });
    sendAdminAlert(adminEmail.subject, adminEmail.html);

    if (deletedUser?.email) {
      const farewellEmail = userAccountDeletedEmail(name);
      sendUserEmail(deletedUser.email, farewellEmail.subject, farewellEmail.html);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("[account/delete]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Webhook: Supabase new user signup ──────────────────────────────────────
   Configure in Supabase Dashboard → Database → Webhooks:
     Table: auth.users  |  Event: INSERT  |  URL: <your-domain>/api/webhooks/user-created
   During local dev this won't fire — that's fine, wire it up after deployment.
────────────────────────────────────────────────────────────────────────────── */
router.post("/webhooks/user-created", async (req, res) => {
  try {
    const { record } = req.body;
    if (!record) return res.status(400).json({ error: "no record" });

    const { id, email, raw_user_meta_data } = record;
    const name = raw_user_meta_data?.full_name || raw_user_meta_data?.name || "";

    // Block signup bonus for previously deleted accounts
    const { data: wasDeleted } = await supabaseAdmin
      .from("deleted_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    try {
      if (!wasDeleted) {
        await addCredits(id, 150, "bonus", "signup_bonus", "Welcome bonus — free credits");
      }
    } catch (creditsErr) {
      console.error("[webhook/user-created] Failed to grant credits:", creditsErr.message);
      // Admin alert still fires below so the signup can be manually topped up
    }

    // Admin alert (fire-and-forget)
    const adminEmail = adminNewUserEmail({ id, email, name });
    sendAdminAlert(adminEmail.subject, adminEmail.html);

    // Welcome email to user
    const welcome = userWelcomeEmail(name);
    sendUserEmail(email, welcome.subject, welcome.html);
    notifyUser(id, { type: "welcome", icon: "🎬", severity: "success", link: "/dashboard",
      title: "Welcome to Vidquence", body: wasDeleted ? "Your account is ready." : "Your account is ready — 150 free credits to get started." });

    res.json({ success: true });
  } catch (err) {
    console.error("[webhook/user-created]", err.message);
    res.status(500).json({ error: err.message });
  }
});
