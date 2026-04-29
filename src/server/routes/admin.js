import express from "express";
import fs from "fs";
import path from "path";
import {
  supabaseAdmin, requireAuth, requireAdmin, deductCredits, addCredits,
  upload, uploadMemory, uuidv4,
  sendAdminAlert,
  adminUserDeletedEmail, adminCreditsTopupEmail,
  adminNewSaleEmail, adminPlanRenewalEmail, adminPlanUpgradeEmail,
  userAccountDeletedEmail, userPlanUpgradeEmail, userPlanRenewalEmail,
  userPlanExpiringEmail, userPlanExpiredEmail,
  openai, TEMP_DIR,
} from "../middleware/shared.js";

export const router = express.Router();

/* ── Admin: list all users with credit balances ── */
router.get("/users", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw error;
    const ids = users.map(u => u.id);
    const { data: creditRows } = await supabaseAdmin.from("user_credits").select("user_id, balance, lifetime_credits").in("user_id", ids);
    const creditsMap = {};
    for (const r of creditRows || []) creditsMap[r.user_id] = r;
    const result = users.map(u => ({
      id:               u.id,
      email:            u.email,
      created_at:       u.created_at,
      last_sign_in_at:  u.last_sign_in_at,
      role:             u.app_metadata?.role ?? null,
      balance:          creditsMap[u.id]?.balance          ?? null,
      lifetime_credits: creditsMap[u.id]?.lifetime_credits ?? null,
    }));
    res.json(result);
  } catch (err) {
    console.error("[admin/users]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: add credits to any user ── */
router.post("/add-credits", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;
    if (!userId || !amount || amount <= 0) return res.status(400).json({ error: "userId and positive amount required" });
    const result = await addCredits(userId, amount, "bonus", "admin_grant", reason || "Admin grant");
    res.json(result);
  } catch (err) {
    console.error("[admin/add-credits]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: update user role / email ── */
router.post("/update-user", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, role, email } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    const updates = {};
    if (email) updates.email = email;
    if (role !== undefined) updates.app_metadata = { role };
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updates);
    if (error) throw error;
    res.json({ success: true, user: data.user });
  } catch (err) {
    console.error("[admin/update-user]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: set a user's credit balance directly ── */
router.post("/set-balance", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, balance, reason } = req.body;
    if (!userId || balance === undefined || balance < 0) return res.status(400).json({ error: "userId and non-negative balance required" });
    const { data: current } = await supabaseAdmin.from("user_credits").select("balance, lifetime_credits").eq("user_id", userId).single();
    const oldBalance  = current?.balance          ?? 0;
    const lifetime    = current?.lifetime_credits ?? 0;
    const diff        = balance - oldBalance;
    const newLifetime = diff > 0 ? lifetime + diff : lifetime;
    await supabaseAdmin.from("user_credits").upsert({ user_id: userId, balance, lifetime_credits: newLifetime, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    await supabaseAdmin.from("credit_transactions").insert({
      user_id: userId, amount: diff, type: diff >= 0 ? "admin_set" : "admin_set",
      action: "admin_set_balance", description: reason || `Admin set balance to ${balance}`, balance_after: balance,
    });
    res.json({ success: true, balance, lifetime_credits: newLifetime });
  } catch (err) {
    console.error("[admin/set-balance]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: get transaction history for a user ── */
router.get("/user-transactions/:userId", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabaseAdmin.from("credit_transactions").select("id, amount, type, action, description, balance_after, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("[admin/user-transactions]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: delete user ── */
router.post("/delete-user", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    const { data: { user: deletedUser } } = await supabaseAdmin.auth.admin.getUserById(userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);
    await supabaseAdmin.from("user_credits").delete().eq("user_id", userId);
    await supabaseAdmin.from("credit_transactions").delete().eq("user_id", userId);
    await supabaseAdmin.from("projects").delete().eq("user_id", userId);
    await supabaseAdmin.from("generated_images").delete().eq("user_id", userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
    const adminEmail = adminUserDeletedEmail({ id: userId, email: deletedUser?.email || "unknown" });
    sendAdminAlert(adminEmail.subject, adminEmail.html);
    if (deletedUser?.email) {
      const name = deletedUser.user_metadata?.full_name || deletedUser.user_metadata?.name || "";
      const { sendUserEmail } = await import("../services/emailService.js");
      const farewellEmail = userAccountDeletedEmail(name);
      sendUserEmail(deletedUser.email, farewellEmail.subject, farewellEmail.html);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("[admin/delete-user]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: suspend / unsuspend user ── */
router.post("/suspend-user", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, suspend } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: suspend ? "87600h" : "none" });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("[admin/suspend-user]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: credits overview ── */
router.get("/credits-overview", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [{ data: allCredits }, { data: recentTxns }, { data: typeCounts }] = await Promise.all([
      supabaseAdmin.from("user_credits").select("user_id, balance, lifetime_credits"),
      supabaseAdmin.from("credit_transactions").select("user_id, amount, type, action, description, balance_after, created_at").order("created_at", { ascending: false }).limit(100),
      supabaseAdmin.from("credit_transactions").select("type"),
    ]);
    const totalBalance  = (allCredits || []).reduce((s, r) => s + (r.balance || 0), 0);
    const totalLifetime = (allCredits || []).reduce((s, r) => s + (r.lifetime_credits || 0), 0);
    const totalUsers    = (allCredits || []).length;
    const lowBalance    = (allCredits || []).filter(r => r.balance < 10).length;
    const topConsumers  = [...(allCredits || [])].sort((a, b) => (b.lifetime_credits || 0) - (a.lifetime_credits || 0)).slice(0, 10);
    const typeBreakdown = {};
    (typeCounts || []).forEach(r => { typeBreakdown[r.type] = (typeBreakdown[r.type] || 0) + 1; });
    res.json({ stats: { totalBalance, totalLifetime, totalUsers, lowBalance }, topConsumers, recentTransactions: recentTxns || [], typeBreakdown });
  } catch (err) {
    console.error("[admin/credits-overview]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Plans CRUD ── */
router.get("/plans", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("plans").select("*").order("sort_order", { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("[admin/plans GET]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/plans", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, slug, description, credits, price_monthly, price_annual, discount_percent, is_active, is_popular, sort_order, features } = req.body;
    if (!name || !slug || !credits || !price_monthly) return res.status(400).json({ error: "name, slug, credits, price_monthly required" });
    const { data, error } = await supabaseAdmin.from("plans").insert({
      name, slug, description: description || null,
      credits: Number(credits), price_monthly: Number(price_monthly),
      price_annual: price_annual ? Number(price_annual) : null,
      discount_percent: Number(discount_percent) || 0,
      is_active: is_active !== false, is_popular: !!is_popular,
      sort_order: Number(sort_order) || 0, features: features || [],
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("[admin/plans POST]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put("/plans/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, credits, price_monthly, price_annual, discount_percent, is_active, is_popular, sort_order, features } = req.body;
    const patch = {};
    if (name             !== undefined) patch.name             = name;
    if (slug             !== undefined) patch.slug             = slug;
    if (description      !== undefined) patch.description      = description;
    if (credits          !== undefined) patch.credits          = Number(credits);
    if (price_monthly    !== undefined) patch.price_monthly    = Number(price_monthly);
    if (price_annual     !== undefined) patch.price_annual     = price_annual ? Number(price_annual) : null;
    if (discount_percent !== undefined) patch.discount_percent = Number(discount_percent) || 0;
    if (is_active        !== undefined) patch.is_active        = !!is_active;
    if (is_popular       !== undefined) patch.is_popular       = !!is_popular;
    if (sort_order       !== undefined) patch.sort_order       = Number(sort_order) || 0;
    if (features         !== undefined) patch.features         = features;
    const { data, error } = await supabaseAdmin.from("plans").update(patch).eq("id", id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("[admin/plans PUT]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/plans/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from("plans").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error("[admin/plans DELETE]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/plans/:id/grant", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, billing_cycle } = req.body;
    if (!email) return res.status(400).json({ error: "email required" });
    const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) throw listErr;
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) return res.status(404).json({ error: `No user found with email: ${email}` });
    const { data: plan, error: planErr } = await supabaseAdmin.from("plans").select("*").eq("id", id).single();
    if (planErr || !plan) return res.status(404).json({ error: "Plan not found" });
    await addCredits(user.id, plan.credits, "plan_assign", "plan_assign", `Plan assigned: ${plan.name} (${plan.credits} credits, $${plan.price_monthly}/mo)`);
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + (billing_cycle === "annual" ? 12 : 1));
    await supabaseAdmin.from("subscriptions").upsert({
      user_id: user.id, plan_id: id, plan_name: plan.name,
      status: "active", billing_cycle: billing_cycle || "monthly",
      price_paid: billing_cycle === "annual" ? plan.price_annual : plan.price_monthly,
      period_start: now.toISOString(), period_end: end.toISOString(),
    }, { onConflict: "user_id" });
    res.json({ ok: true, credits: plan.credits, user_id: user.id });
  } catch (err) {
    console.error("[admin/plans/grant]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/assign-plan", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, planId, planLabel, credits, price } = req.body;
    if (!userId || !planId || !credits || credits <= 0) return res.status(400).json({ error: "userId, planId, and credits required" });
    const result = await addCredits(userId, credits, "plan_assign", "plan_assign", `Plan assigned: ${planLabel || planId} (${credits} credits, $${price ?? "?"})`);
    res.json({ success: true, planId, credits, balance: result.balance });
  } catch (err) {
    console.error("[admin/assign-plan]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/plan-assignments", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("credit_transactions").select("user_id, amount, description, created_at").eq("action", "plan_assign").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("[admin/plan-assignments]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/deduct-credits", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;
    if (!userId || !amount || amount <= 0) return res.status(400).json({ error: "userId and positive amount required" });
    const result = await deductCredits(userId, amount, "admin_deduct", reason || "Admin deduction");
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (err) {
    console.error("[admin/deduct-credits]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Layout CRUD ── */
router.get("/layouts", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("layouts").select("*").eq("is_active", true).order("created_at", { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("[admin/layouts GET]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/layouts", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, label, intent, energy, niche, orientation, visibility, show_caption, default_transition, zones, tags, asset_count, text_count, thumbnail_url, generation_meta, type, beat_type } = req.body;
    if (!name || !label || !Array.isArray(zones)) return res.status(400).json({ error: "name, label, zones[] required" });
    const { data, error } = await supabaseAdmin.from("layouts").insert({
      name, label,
      intent:       intent       ?? "hook",
      energy:       energy       ?? ["high", "medium", "low"],
      niche:        niche        ?? [],
      orientation:  orientation  ?? "9:16",
      visibility:   visibility   ?? "active",
      type:         type         ?? "template",
      beat_type:    beat_type    ?? null,
      show_caption:       show_caption ?? true,
      default_transition: default_transition ?? null,
      zones, tags: tags ?? [],
      asset_count: asset_count ?? zones.filter(z => z.type === "asset").length,
      text_count:  text_count  ?? zones.filter(z => z.type === "text").length,
      is_active: true, thumbnail_url: thumbnail_url ?? null, generation_meta: generation_meta ?? null,
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("[admin/layouts POST]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put("/layouts/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    if (Array.isArray(updates.zones)) {
      updates.asset_count = updates.asset_count ?? updates.zones.filter(z => z.type === "asset").length;
      updates.text_count  = updates.text_count  ?? updates.zones.filter(z => z.type === "text").length;
    }
    const { data, error } = await supabaseAdmin.from("layouts").update(updates).eq("id", id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("[admin/layouts PUT]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/layouts/upload-thumbnail", requireAuth, requireAdmin, uploadMemory.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const ext = req.file.mimetype.includes("png") ? "png" : "jpg";
    const key = `layouts/thumbnails/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error: upErr } = await supabaseAdmin.storage.from("user-assets").upload(key, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(key);
    res.json({ url: publicUrl });
  } catch (e) {
    console.error("[admin/layouts/upload-thumbnail]", e.message);
    res.status(500).json({ error: e.message });
  }
});

router.delete("/layouts/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from("layouts").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("[admin/layouts DELETE]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/layouts/bulk-update", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: "ids[] required" });
    if (!updates || typeof updates !== "object") return res.status(400).json({ error: "updates object required" });
    const { error } = await supabaseAdmin.from("layouts").update({ ...updates, updated_at: new Date().toISOString() }).in("id", ids);
    if (error) throw error;
    res.json({ success: true, updated: ids.length });
  } catch (err) {
    console.error("[admin/layouts bulk-update]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/layouts/bulk-delete", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: "ids[] required" });
    const { error } = await supabaseAdmin.from("layouts").delete().in("id", ids);
    if (error) throw error;
    res.json({ success: true, deleted: ids.length });
  } catch (err) {
    console.error("[admin/layouts bulk-delete]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/layouts/:id/duplicate", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: src, error: fetchErr } = await supabaseAdmin.from("layouts").select("*").eq("id", id).single();
    if (fetchErr) throw fetchErr;
    const { id: _id, created_at, updated_at, ...rest } = src;
    const { data, error } = await supabaseAdmin.from("layouts").insert({ ...rest, name: `${rest.name}_copy`, label: `${rest.label} (copy)`, is_active: true }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("[admin/layouts duplicate]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: user assets + AI image library ── */
router.get("/user-assets", requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page || "0", 10);
    const type = req.query.type || "all";
    const pageSize = 48;
    let query = supabaseAdmin.from("user_assets").select("id, url, type, name, size, created_at, user_id", { count: "exact" }).not("name", "ilike", "ai-gen-%").order("created_at", { ascending: false }).range(page * pageSize, (page + 1) * pageSize - 1);
    if (type !== "all") query = query.eq("type", type);
    const { data, count, error } = await query;
    if (error) throw error;
    res.json({ assets: data || [], total: count ?? 0, page, pageSize });
  } catch (err) {
    console.error("[admin/user-assets]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/user-assets/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from("user_assets").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/ai-images", requireAuth, requireAdmin, async (req, res) => {
  try {
    const page        = parseInt(req.query.page || "0", 10);
    const niche       = req.query.niche       || "all";
    const visualType  = req.query.visual_type || "all";
    const orientation = req.query.orientation || "all";
    const pageSize    = 48;
    let query = supabaseAdmin.from("ai_image_library").select("id, src, prompt, subject, niche, visual_type, mood, energy, orientation, reuse_count, tags, width, height, generator, created_at", { count: "exact" }).order("created_at", { ascending: false }).range(page * pageSize, (page + 1) * pageSize - 1);
    if (niche       !== "all") query = query.eq("niche", niche);
    if (visualType  !== "all") query = query.eq("visual_type", visualType);
    if (orientation !== "all") query = query.eq("orientation", orientation);
    const { data, count, error } = await query;
    if (error) throw error;
    res.json({ images: data || [], total: count ?? 0, page, pageSize });
  } catch (err) {
    console.error("[admin/ai-images]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/ai-images/filters", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("ai_image_library").select("niche, visual_type, orientation");
    if (error) throw error;
    const niches       = [...new Set((data || []).map(r => r.niche).filter(Boolean))].sort();
    const visualTypes  = [...new Set((data || []).map(r => r.visual_type).filter(Boolean))].sort();
    const orientations = [...new Set((data || []).map(r => r.orientation).filter(Boolean))].sort();
    res.json({ niches, visualTypes, orientations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/ai-images/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from("ai_image_library").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("[admin/ai-images/delete]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: system health ── */
router.get("/system-health", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const startTime = process.hrtime.bigint();
    let tempFiles = 0, tempBytes = 0;
    if (fs.existsSync(TEMP_DIR)) {
      const entries = fs.readdirSync(TEMP_DIR);
      tempFiles = entries.length;
      for (const f of entries) {
        try { const stat = fs.statSync(path.join(TEMP_DIR, f)); if (stat.isFile()) tempBytes += stat.size; } catch {}
      }
    }
    const dbStart = Date.now();
    let dbOk = false, dbMs = null;
    try { const { error } = await supabaseAdmin.from("projects").select("id").limit(1); dbOk = !error; dbMs = Date.now() - dbStart; } catch {}
    const apiKeys = { openai: !!process.env.OPENAI_API_KEY, supabase: !!process.env.SUPABASE_SERVICE_ROLE_KEY, fal: !!process.env.FAL_KEY || !!process.env.FAL_API_KEY };
    const mem = process.memoryUsage();
    const pingNs = process.hrtime.bigint() - startTime;
    res.json({
      uptime: Math.floor(process.uptime()), node: process.version, platform: process.platform,
      memMb: { rss: (mem.rss / 1024 / 1024).toFixed(1), heap: (mem.heapUsed / 1024 / 1024).toFixed(1), heapTotal: (mem.heapTotal / 1024 / 1024).toFixed(1) },
      temp: { files: tempFiles, sizeMb: (tempBytes / 1024 / 1024).toFixed(2) },
      db: { ok: dbOk, latencyMs: dbMs }, apiKeys, serverPingMs: Number(pingNs / 1_000_000n),
    });
  } catch (err) {
    console.error("[admin/system-health]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: AI Layout Generation ── */
router.post("/generate-concepts", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { niche = "entertainment", intent = "hook", energy = "high", count = 4, description = "" } = req.body;
    const systemPrompt = `You are an expert short-form vertical video layout designer. Generate creative layout concepts for a 9:16 mobile video canvas (1080x1920 pixels). Zones are positioned with percentage-based coordinates (x, y, width, height each 0–100). Return only valid JSON.`;
    const userPrompt = `Generate ${count} distinct layout concepts for short-form video.\nNiche: ${niche}\nIntent: ${intent}\nEnergy: ${energy}\n${description ? `Extra requirements: ${description}` : ""}\n\nReturn a JSON object: { "concepts": [ ...array of ${count} objects... ] }\n\nEach concept object must have exactly these fields:\n{\n  "id": "c1",\n  "title": "Bold Stat Hero",\n  "description": "Short 1-2 sentence description of the layout design.",\n  "pattern": "stat-hero | text-heavy | split-screen | full-bleed | overlay-minimal | caption-focused | icon-stat",\n  "zones_sketch": [\n    { "type": "text|asset|decorative", "role": "headline|subtext|label|stat|metric|cta|background|accent", "x": 0, "y": 0, "w": 100, "h": 100, "zIndex": 1, "notes": "brief note" }\n  ],\n  "visual_style": "short description of look and feel"\n}\n\nCritical rules:\n- Make ALL ${count} concepts distinctly different from each other\n- At least 1 text zone per layout\n- Asset or decorative zone for visual interest\n- x + w ≤ 100, y + h ≤ 100 for every zone\n- Background asset zIndex=1, overlaid text zIndex=2-4\n- Vary structure, zone count, and composition significantly\n- Return ONLY the JSON object, no markdown fences`;
    const completion = await openai.chat.completions.create({ model: "gpt-4o", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], temperature: 0.95, response_format: { type: "json_object" } });
    const raw = completion.choices[0].message.content;
    const parsed = JSON.parse(raw);
    const concepts = Array.isArray(parsed) ? parsed : parsed.concepts || parsed.layouts || Object.values(parsed)[0] || [];
    const withIds = concepts.map((c, i) => ({ ...c, id: c.id || `c${i + 1}` }));
    res.json({ concepts: withIds });
  } catch (err) {
    console.error("[admin/generate-concepts]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/generate-layout-preview", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { prompt, niche = "entertainment", intent = "hook" } = req.body;
    if (!prompt) return res.status(400).json({ error: "prompt required" });
    if (!process.env.FAL_API_KEY) return res.status(500).json({ error: "FAL_API_KEY not set" });
    console.log(`[layout-preview] Generating mockup for: ${prompt.substring(0, 80)}`);
    let falUrl = null, lastErr = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 3000));
      try {
        const falRes = await fetch("https://fal.run/fal-ai/flux/dev", { method: "POST", headers: { "Authorization": `Key ${process.env.FAL_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ prompt, image_size: { width: 608, height: 1080 }, num_inference_steps: 28, guidance_scale: 3.5, num_images: 1, enable_safety_checker: true }) });
        if (!falRes.ok) { lastErr = await falRes.text(); continue; }
        const data = await falRes.json();
        falUrl = data?.images?.[0]?.url || null;
        if (falUrl) break;
        lastErr = "No image URL in response";
      } catch (e) { lastErr = e.message; }
    }
    if (!falUrl) return res.status(500).json({ error: `Image generation failed: ${lastErr.slice(0, 120)}` });
    let imageUrl = falUrl;
    try {
      const imgRes = await fetch(falUrl);
      if (imgRes.ok) {
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        const safeNiche = (niche || "general").replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
        const fname = `previews/${safeNiche}/${uuidv4()}.jpg`;
        const { error: uploadErr } = await supabaseAdmin.storage.from("layout-previews").upload(fname, buffer, { contentType: "image/jpeg", upsert: false });
        if (!uploadErr) {
          const { data: { publicUrl } } = supabaseAdmin.storage.from("layout-previews").getPublicUrl(fname);
          imageUrl = publicUrl;
          console.log("[layout-preview] Mockup saved:", imageUrl);
        } else { console.warn("[layout-preview] Upload error:", uploadErr.message); }
      }
    } catch (uploadEx) { console.warn("[layout-preview] Upload failed:", uploadEx.message); }
    res.json({ imageUrl, falUrl });
  } catch (err) {
    console.error("[admin/generate-layout-preview]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Model Avatars ── */
router.post("/upload-system-asset", requireAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const { prefix = "models/uploads" } = req.body;
    const ext = (req.file.originalname || "").split(".").pop() || "jpg";
    const key = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const fileBuffer = fs.readFileSync(req.file.path);
    const { error } = await supabaseAdmin.storage.from("system-assets").upload(key, fileBuffer, { contentType: req.file.mimetype, upsert: false });
    fs.unlinkSync(req.file.path);
    if (error) throw new Error(error.message);
    const { data: { publicUrl } } = supabaseAdmin.storage.from("system-assets").getPublicUrl(key);
    res.json({ url: publicUrl });
  } catch (e) {
    console.error("[upload-system-asset]", e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get("/model-avatars", requireAuth, async (_req, res) => {
  const { data, error } = await supabaseAdmin.from("model_avatars").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ avatars: data || [] });
});

router.post("/model-avatars/generate", requireAuth, async (req, res) => {
  try {
    const { imageUrl, prompt } = req.body;
    if (!imageUrl || !prompt) return res.status(400).json({ error: "imageUrl and prompt required" });
    const FAL_KEY = process.env.FAL_API_KEY || process.env.FAL_KEY;
    const falRes = await fetch("https://fal.run/fal-ai/nano-banana/edit", { method: "POST", headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ image_urls: [imageUrl], prompt }) });
    if (!falRes.ok) throw new Error(await falRes.text());
    const data = await falRes.json();
    const generatedUrl = data.images?.[0]?.url || data.image?.url;
    if (!generatedUrl) throw new Error("No image URL returned");
    const imgRes = await fetch(generatedUrl);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const ct = imgRes.headers.get("content-type") || "image/jpeg";
    const ext = ct.includes("png") ? "png" : "jpg";
    const key = `models/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const { error: upErr } = await supabaseAdmin.storage.from("system-assets").upload(key, buffer, { contentType: ct, upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { data: { publicUrl } } = supabaseAdmin.storage.from("system-assets").getPublicUrl(key);
    res.json({ imageUrl: publicUrl });
  } catch (e) {
    console.error("[model-avatars/generate]", e.message);
    res.status(500).json({ error: e.message });
  }
});

router.post("/model-avatars/upload", requireAuth, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: "imageUrl required" });
    const imgRes = await fetch(imageUrl);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const ct = imgRes.headers.get("content-type") || "image/jpeg";
    const ext = ct.includes("png") ? "png" : "jpg";
    const key = `models/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const { error: upErr } = await supabaseAdmin.storage.from("system-assets").upload(key, buffer, { contentType: ct, upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { data: { publicUrl } } = supabaseAdmin.storage.from("system-assets").getPublicUrl(key);
    res.json({ imageUrl: publicUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/model-avatars/approve", requireAuth, async (req, res) => {
  try {
    const { imageUrl, gender, skin_tone, age_group, style_notes } = req.body;
    if (!imageUrl || !gender || !skin_tone || !age_group) return res.status(400).json({ error: "Missing required fields" });
    const { data, error } = await supabaseAdmin.from("model_avatars").insert([{ url: imageUrl, gender, skin_tone, age_group, style_notes: style_notes || null }]).select().single();
    if (error) throw new Error(error.message);
    res.json({ avatar: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/model-avatars/:id", requireAuth, async (req, res) => {
  const { is_active } = req.body;
  const { error } = await supabaseAdmin.from("model_avatars").update({ is_active }).eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

router.delete("/model-avatars/:id", requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin.from("model_avatars").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

/* ── Background removal ── */
router.post("/remove-background", requireAuth, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: "imageUrl required" });
    if (!process.env.FAL_API_KEY) return res.status(500).json({ error: "FAL_API_KEY not set" });
    console.log("[rembg] Removing background from:", imageUrl.substring(0, 80));
    const falRes = await fetch("https://fal.run/fal-ai/birefnet", { method: "POST", headers: { "Authorization": `Key ${process.env.FAL_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ image_url: imageUrl, model: "General Use (Light)", operating_resolution: "1024x1024", output_format: "png" }) });
    if (!falRes.ok) { const errText = await falRes.text(); throw new Error(`Fal.ai birefnet HTTP ${falRes.status}: ${errText.slice(0, 120)}`); }
    const falData = await falRes.json();
    const transparentFalUrl = falData?.image?.url;
    if (!transparentFalUrl) throw new Error("No result URL from birefnet");
    let transparentUrl = transparentFalUrl;
    try {
      const pngRes = await fetch(transparentFalUrl);
      if (pngRes.ok) {
        const buffer = Buffer.from(await pngRes.arrayBuffer());
        const fileName = `layouts/transparent/${Date.now()}_${uuidv4().slice(0, 8)}.png`;
        const { error: upErr } = await supabaseAdmin.storage.from("user-assets").upload(fileName, buffer, { contentType: "image/png", upsert: true });
        if (!upErr) { const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(fileName); transparentUrl = publicUrl; console.log("[rembg] Transparent PNG saved:", transparentUrl); }
        else { console.warn("[rembg] Upload failed:", upErr.message); }
      }
    } catch (upEx) { console.warn("[rembg] Upload exception:", upEx.message); }
    res.json({ transparentUrl });
  } catch (err) {
    console.error("[rembg]", err.message);
    res.status(500).json({ error: "Background removal failed", details: err.message });
  }
});

/* ── Admin: generate zone assets ── */
router.post("/generate-zone-assets", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { zones = [], visual_direction = "", prompt: originalPrompt = "", niche = "entertainment", intent = "hook", energy = "high", background_type = "solid_gradient", background_colors = [] } = req.body;
    if (!process.env.FAL_API_KEY) return res.status(500).json({ error: "FAL_API_KEY not set" });
    const assetZones = zones.filter(z => z.type === "asset");
    if (assetZones.length === 0) return res.json({ results: [] });
    const ctxShort  = (originalPrompt || visual_direction).slice(0, 150);
    const ctxMedium = (originalPrompt || visual_direction).slice(0, 300);
    const results = [];
    for (const zone of assetZones) {
      let falPrompt;
      if (zone.role === "background_asset" || background_type === "image_based") {
        const bgColorHint = background_colors.length ? `Dominant colors: ${background_colors.join(", ")}.` : "";
        const energyMood  = energy === "high" ? "dramatic, high contrast" : energy === "low" ? "calm, soft, minimal" : "balanced, professional";
        falPrompt = `${niche} atmospheric background scene. ${visual_direction}. ${bgColorHint} ${energyMood} mood. ${ctxShort}. No people. No text. No logos. No UI elements. Pure environment: lighting, atmosphere, textures, depth, color. Cinematic. Full bleed. Vertical 9:16 portrait.`;
      } else if (zone.role === "primary_asset") {
        falPrompt = `${niche} ${intent} product or subject. ${ctxMedium}. Isolated subject on pure white or transparent background. Professional studio photography. Clean lighting. No background clutter. Subject fills 70% of frame. Sharp. High quality. Vertical 9:16.`;
      } else if (zone.role === "secondary_asset") {
        falPrompt = `${niche} ${intent} supporting visual. Different angle or variation. ${ctxShort}. Professional quality. Clean background. No text. Vertical 9:16.`;
      } else {
        falPrompt = `${niche} ${intent} visual element. ${visual_direction}. Professional. No text. Vertical 9:16.`;
      }
      console.log(`[generate-zone-assets] Zone ${zone.id} (${zone.role}): ${falPrompt.slice(0, 80)}`);
      try {
        const falRes = await fetch("https://fal.run/fal-ai/flux/schnell", { method: "POST", headers: { "Authorization": `Key ${process.env.FAL_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ prompt: falPrompt, image_size: { width: 608, height: 1080 }, num_images: 1, num_inference_steps: 4, enable_safety_checker: false }) });
        if (!falRes.ok) { results.push({ zoneId: zone.id, role: zone.role, imageUrl: null, error: `Fal HTTP ${falRes.status}` }); continue; }
        const falData = await falRes.json();
        const falUrl = falData?.images?.[0]?.url;
        if (!falUrl) { results.push({ zoneId: zone.id, role: zone.role, imageUrl: null, error: "No image from Fal.ai" }); continue; }
        let imageUrl = falUrl;
        try {
          const imgRes = await fetch(falUrl);
          if (imgRes.ok) {
            const buf = Buffer.from(await imgRes.arrayBuffer());
            const safeNiche = niche.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
            const filePath = `zone-assets/${safeNiche}/${uuidv4()}.jpg`;
            const { error: upErr } = await supabaseAdmin.storage.from("layout-previews").upload(filePath, buf, { contentType: "image/jpeg", upsert: false });
            if (!upErr) { const { data: { publicUrl } } = supabaseAdmin.storage.from("layout-previews").getPublicUrl(filePath); imageUrl = publicUrl; }
          }
        } catch (_) {}
        results.push({ zoneId: zone.id, role: zone.role, imageUrl });
      } catch (e) { results.push({ zoneId: zone.id, role: zone.role, imageUrl: null, error: e.message }); }
    }
    res.json({ results });
  } catch (err) {
    console.error("[generate-zone-assets]", err.message);
    res.status(500).json({ error: "Zone asset generation failed", details: err.message });
  }
});

/* ── Admin: convert layout image (GPT-4o Vision → zone JSON) ── */
router.post("/convert-layout-image", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { imageUrl, niche, intent, energy } = req.body;
    if (!imageUrl) return res.status(400).json({ error: "imageUrl required" });

    const decorativeShapeKeys = ['circle','square','triangle','hexagon','star','diamond','cross','pill','arc','ring','dot','line','chevron','arrow','wave','spiral','grid','mesh','bars','blob'];
    const iconKeys = ['arrow','arrowCircle','star','starOutline','check','checkCircle','close','heart','fire','lightning','crown','diamond','shield','trophy','rocket','flag','bell','eye','play','pause','plus','bolt','thumbsup','smile','medal','chart','briefcase','globe','leaf','sun','moon','lock','key','percent','dollar','target'];

    const visionPrompt = `You are a precision layout extraction engine for short-form video design. Your job is to analyze a marketing image and output accurate zone coordinates + metadata.

⚠️ CRITICAL — TEXT IN THIS IMAGE IS AI-GENERATED GIBBERISH:
The image was produced by a Fal.ai diffusion model which cannot render real text. Every word you see is garbled nonsense — "AKRAQAIMED", "UNPARALAJELED", "EXCLUME", "Eleleate2" etc. DO NOT attempt to read or OCR any text from the image.
Instead, for every text zone you detect, you MUST write real, meaningful placeholder content based on the zone's ROLE + the context below (niche=${niche}, intent=${intent}).
Use these role-specific rules to generate content — the image text is irrelevant:
  • headline zone  → a real curiosity-style hook phrase for this niche/intent, 6-10 words, e.g. "WHY MILLIONS ARE SWITCHING TO THIS NOW"
  • label zone     → the niche name in ALL CAPS, e.g. "${(niche||'LIFESTYLE').toUpperCase()}"
  • subtext zone   → a real supporting sentence relevant to the niche, e.g. "Join 50,000 people already transforming their results."
  • tagline zone   → a short memorable brand-style phrase, e.g. "Built for the bold."
  • cta zone       → a real action directive, e.g. "FOLLOW NOW" or "GET STARTED →"
  • stat zone      → a realistic metric for this niche, e.g. "10,000+" or "94%" or "$3.5M"
  • quote zone     → a quotable pull-quote sentence relevant to the beat
Generate content that would actually appear in a real ${niche} ${intent} video — not generic fillers.

CANVAS: 1080 wide × 1920 tall (9:16 vertical). All output coordinates are PERCENTAGES of canvas dimensions (0–100).

══════════════════════════════════════
PHASE 1 — LAYOUT ANALYSIS (think first)
══════════════════════════════════════
Before writing any JSON, mentally do this:

A) Divide the image into horizontal bands:
   - Band T (top 0-20%): headers, labels, badges
   - Band U (upper 20-45%): titles, hero elements
   - Band M (mid 45-65%): main image/character
   - Band L (lower 65-80%): supporting text, stats
   - Band B (bottom 80-100%): CTA, footer

B) List every visible element and which band it's in.

C) For each element, estimate its LEFT EDGE, TOP EDGE, WIDTH, HEIGHT as % of canvas.
   Use this formula to self-check:
   - Element covers pixels X1 to X2 horizontally on a 1080px canvas → x = X1/1080*100, width = (X2-X1)/1080*100
   - Element covers pixels Y1 to Y2 vertically on a 1920px canvas → y = Y1/1920*100, height = (Y2-Y1)/1920*100
   - CENTERED element of width W%: x = (100-W)/2
   - VERIFY: x+width ≤ 100, y+height ≤ 100

══════════════════════════════════════
PHASE 2 — BACKGROUND
══════════════════════════════════════
Classify the canvas background (ignoring all text, icons, and assets):
- "solid" — flat color or simple 2-stop gradient, no repeating textures
- "pattern" — repeating geometric shapes, grid, dots, lines, subtle texture
- "abstract" — photo, illustration, complex scene, organic gradient mesh

Output fields:
  background_category: "solid"|"pattern"|"abstract"
  background_colors: [primary_hex, secondary_hex_or_same]   — dominant background colors
  background_gradient_direction: "to bottom"|"to right"|"135deg"|null
  color_family: "blue"|"green"|"red"|"yellow"|"purple"|"orange"|"teal"|"pink"|"dark"|"light"|"neutral"
  background_needs_image: true ONLY if abstract
  background_image_prompt: detailed Fal.ai prompt for background generation (abstract only, else null)

══════════════════════════════════════
PHASE 3 — ZONE EXTRACTION
══════════════════════════════════════
Extract EVERY visible element as a zone. Use sequential IDs: z1, z2…

ZONE SCHEMA (all fields required):
{
  "id": "z1",
  "type": "text"|"asset"|"decorative"|"icon",
  "role": [see roles],
  "x": [left edge %],
  "y": [top edge %],
  "width": [%],
  "height": [%],
  "content": "exact text" (text zones) | null (all others),
  "assetDescription": "subject description for AI image gen" (asset zones ONLY — omit for all other types),
  "style": { ... see style rules ... },
  "animation": "fadeIn"|"slideUpIn"|"popIn"|"scaleIn"|"none",
  "animationDelay": 0.1–0.9
}

ROLES:
  text:       headline | subtext | label | tagline | stat | metric | quote | cta
  asset:      primary_asset | secondary_asset
  decorative: decorative
  icon:       icon

STYLE RULES by type:
  TEXT zones:
    fontSize:   pixels on 1920px canvas — be bold: headline 130–220, subtext 50–80, label 30–50, cta 48–70, stat 100–170
    fontWeight: "400"|"600"|"700"|"800"|"900"
    fontFamily: "Bebas Neue"|"Anton"|"Unbounded"|"Oswald"|"Montserrat"|"Outfit"|"Barlow Condensed"|"Poppins"|"Inter"|"Raleway"|"Lato"|"Playfair Display"|"Dancing Script"|"Syne"|"JetBrains Mono"|"Nunito"|"Roboto"
    color:      "#hex"
    textAlign:  "center" if element appears centered on canvas, "left" if left-aligned, "right" if right-aligned
    backgroundColor: "#hex" (only if text has a visible pill/badge background, else null)
    borderRadius: number (only if rounded pill/badge background, else null)
    rotation:   number in degrees — ONLY if text is visually rotated (e.g. -90 for vertical text running upward along left edge, 90 for downward). Omit if not rotated.

  DECORATIVE zones:
    shapeKey:  one of [${decorativeShapeKeys.join(',')}]
    fillColor: "#hex"
    opacity:   0.0–1.0

  ICON zones:
    iconKey:   one of [${iconKeys.join(',')}]
    fillColor: "#hex"
    iconSize:  70–100 (fill percentage of zone)
    Minimum zone size: width ≥ 8, height ≥ 8

  ASSET zones:
    assetDescription: "one-sentence visual description of the subject for AI image generation — e.g. 'fit woman jogging in athletic wear, energetic pose' or 'sleek laptop with stock charts on screen'. Describe the SUBJECT ONLY, not the background or layout."
    content: null (always)
    No other style fields needed

EXTRACTION RULES:
1. CATEGORY LABEL (e.g. "HEALTH", "COMEDY", "EDUCATION") → text, role:label
   Width must fit the FULL word on ONE line without wrapping. Min width = 12%.
2. HEADLINE — if visually split across lines with different styles (color/size/font):
   create ONE zone per line. Each gets its own x/y/width/height/fontSize/color.
   Do NOT merge lines into one zone.
   CRITICAL: headline lines must NOT overlap. If line 1 is at y=10, height=10, then line 2 must start at y ≥ 21.
3. SUPPORTING TEXT → text, role:subtext
4. CTA / BUTTON TEXT → text, role:cta
5. PRICE / STAT / BADGE numbers → text, role:stat
6. PRIMARY IMAGE → asset, role:primary_asset, content:null, REQUIRED: assetDescription
7. SECONDARY IMAGE → asset, role:secondary_asset, content:null, REQUIRED: assetDescription
8. DECORATIVE SHAPES → decorative
9. SIMPLE ICONS → icon
10. DIVIDER LINE → decorative, shapeKey:line
11. ALL text in this image is AI-generated gibberish — NEVER attempt to read it. Generate real meaningful content based on role + context.
12. Do NOT create a background zone — background is handled separately
13. TEXT ZONE HEIGHT: use fontSize to estimate: height = (fontSize/1920)*100*1.5
14. ASSET ZONE: draw a generous bounding box. Primary asset should typically be width 50–85%, height 30–50% of canvas.

ANIMATION TIMING (reading order, top→bottom):
  First element: 0.1s | Each next: +0.1s | Split headline parts: +0.08s each | CTA: 0.7–0.9s

══════════════════════════════════════
OUTPUT FORMAT — VALID JSON ONLY, NO MARKDOWN, NO EXTRA TEXT
══════════════════════════════════════
{
  "background_category": "solid"|"pattern"|"abstract",
  "background_colors": ["#hex"],
  "background_gradient_direction": null,
  "color_family": "string",
  "background_needs_image": false,
  "background_image_prompt": null,
  "zones": []
}

Context: niche=${niche}, intent=${intent}, energy=${energy}

${intent === 'visual_rest' ? `══════════════════════════════════════
SPECIAL OVERRIDE — visual_rest INTENT
══════════════════════════════════════
This image is a full-bleed atmospheric photo. The entire image IS an asset zone.
You MUST return EXACTLY 3 zones — no more, no fewer:
  z1: type=asset, role=primary_asset, x=0, y=0, width=100, height=100
      assetDescription: one-sentence description of the scene/subject in the image
  z2: type=text, role=label, small category label text at top (y=3–7%)
      content: the niche category name in uppercase (e.g. "${(niche||'TRAVEL').toUpperCase()}")
      style: small fontSize (28–40), light fontWeight "300" or "400", white or soft color
  z3: type=text, role=subtext, short atmospheric caption at bottom (y=82–88%)
      content: 3–6 word poetic caption (e.g. "The world is waiting." or "Find your calm.")
      style: italic-style, light fontWeight, white or soft color, textAlign:center
Return ONLY these 3 zones. Do NOT add headline, CTA, decorative, or icon zones.` : ''}
${intent === 'escalate' ? `══════════════════════════════════════
SPECIAL OVERRIDE — escalate INTENT
══════════════════════════════════════
This layout uses stacked escalating text. Return a MAXIMUM of 4 zones total.
  z1: type=text, role=label — urgency pill at top
  z2: type=text, role=headline — upper text line (larger, bold)
  z3: type=text, role=headline — the big payoff line (the largest/boldest text on canvas)
  z4 (optional): type=asset or decorative — only if a strong visual element exists
Max 4 zones total. No CTA zone.` : ''}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', max_tokens: 4000,
      messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: imageUrl, detail: 'high' } }, { type: 'text', text: visionPrompt }] }]
    });

    let raw = response.choices[0].message.content.trim();
    raw = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(raw);

    console.log('\n[convert-layout-image] ── RAW VISION OUTPUT ─────────────────────');
    console.log('bg_category:', parsed.background_category, '| colors:', parsed.background_colors, '| color_family:', parsed.color_family);
    console.log('zones count:', (parsed.zones || []).length);
    (parsed.zones || []).forEach((z, i) => {
      const s = z.style || {};
      console.log(`  z${i+1} [${z.type}/${z.role}] x:${z.x} y:${z.y} w:${z.width} h:${z.height} | content:"${z.content || ''}" | fontSize:${s.fontSize} iconKey:${s.iconKey||z.iconKey||'-'} shapeKey:${s.shapeKey||'-'}${z.assetDescription ? ` | asset:"${z.assetDescription}"` : ''}`);
    });
    console.log('──────────────────────────────────────────────────────────────────\n');

    const bgCategory  = parsed.background_category || 'solid';
    const bgColors    = parsed.background_colors || ['#1a1a2e'];
    const bgDirection = parsed.background_gradient_direction || null;
    const bgNeedsImg  = !!parsed.background_needs_image;
    const bgImgPrompt = parsed.background_image_prompt || null;
    const colorFamily = parsed.color_family || 'dark';

    function toInternalZone(z, i) {
      const type = z.type || 'text';
      const role = z.role || 'subtext';
      const raw  = z.style || {};
      let zIndex = 4;
      if (role === 'background_asset') zIndex = 1;
      else if (type === 'asset')       zIndex = 2;
      else if (type === 'decorative')  zIndex = 3;
      else if (type === 'icon')        zIndex = 5;
      const style = {};
      if (raw.color)       style.color       = raw.color;
      if (raw.fontSize)    style.fontSize    = Math.max(18, Number(raw.fontSize));
      if (raw.fontWeight)  style.fontWeight  = String(raw.fontWeight);
      if (raw.fontFamily)  style.fontFamily  = raw.fontFamily;
      if (raw.textAlign)   style.textAlign   = raw.textAlign;
      if (raw.borderRadius != null) style.borderRadius = raw.borderRadius;
      if (raw.opacity      != null) style.opacity      = raw.opacity;
      if (raw.rotation && raw.rotation !== 0) style.transform = `rotate(${raw.rotation}deg)`;
      if (raw.backgroundColor) style.background = raw.backgroundColor;
      if (raw.whiteSpace) style.whiteSpace = raw.whiteSpace;
      const ICON_KEY_TO_PH = {
        star: 'star-fill', star_outline: 'star', sparkle: 'sparkle', heart: 'heart-fill', heart_outline: 'heart',
        thumbsup: 'thumbs-up-fill', thumbsdown: 'thumbs-down-fill', handshake: 'handshake-fill', crown: 'crown-fill', trophy: 'trophy-fill',
        arrow: 'arrow-right-bold', arrow_right: 'arrow-right-bold', arrow_left: 'arrow-left-bold', arrow_up: 'arrow-up-bold', arrow_down: 'arrow-down-bold',
        chevron: 'caret-right-fill', chevron_right: 'caret-right-fill', bolt: 'lightning-fill', lightning: 'lightning-fill', fire: 'fire-fill',
        check: 'check-bold', check_circle: 'check-circle-fill', close: 'x-bold', plus: 'plus-bold',
        clock: 'clock-fill', alarm: 'bell-fill', bell: 'bell-fill', play: 'play-fill', pause: 'pause-fill', camera: 'camera-fill', music: 'music-note-fill',
        phone: 'phone-fill', location: 'map-pin-fill', pin: 'map-pin-fill', info: 'info-fill', warning: 'warning-fill', wifi: 'wifi-high-fill',
        dollar: 'currency-dollar-bold', percent: 'percent-bold', rocket: 'rocket-fill', globe: 'globe-fill',
        smile: 'smiley-fill', wink: 'smiley-wink-fill', laugh: 'smiley-wink-fill', diamond: 'diamond-four-corners-fill', confetti: 'confetti-fill',
        briefcase: 'briefcase-fill', chart: 'chart-bar-fill', medal: 'medal-fill', target: 'target-fill', flag: 'flag-fill', gem: 'diamond-fill',
        shield: 'shield-check-fill', lock: 'lock-fill', key: 'key-fill', leaf: 'leaf-fill', sun: 'sun-fill', moon: 'moon-fill', cloud: 'cloud-fill',
        snowflake: 'snowflake-fill', wave: 'waves', eye: 'eye-fill',
        arrowCircle: 'arrow-circle-right-fill', arrowRight: 'arrow-right-bold', arrowLeft: 'arrow-left-bold', arrowUp: 'arrow-up-bold', arrowDown: 'arrow-down-bold',
        starOutline: 'star', checkCircle: 'check-circle-fill', thumbsUp: 'thumbs-up-fill', thumbsDown: 'thumbs-down-fill',
        mapPin: 'map-pin-fill', chartBar: 'chart-bar-fill', shieldCheck: 'shield-check-fill', currencyDollar: 'currency-dollar-bold',
        musicNote: 'music-note-fill', smiley: 'smiley-fill',
      };
      const SHAPE_TO_DEC = {
        star_burst: 'star_burst_6pt', star_4pt: 'star_burst_4pt', star_8pt: 'star_burst_8pt', star_12pt: 'star_burst_12pt',
        sparkle_sm: 'sparkle_4pt_sm', sparkle_lg: 'sparkle_4pt_lg', sparkle_6pt: 'sparkle_6pt', sparkle_cluster: 'sparkle_cluster',
        flower: 'flower_simple', daisy: 'flower_daisy', blob: 'blob_organic_a', blob_soft: 'blob_circle_soft',
        blob_long: 'blob_elongated', blob_corner: 'blob_corner_fill', speech_bubble: 'speech_bubble_round', speech_bubble_sharp: 'speech_bubble_sharp',
        badge: 'badge_circle', badge_pill: 'badge_pill', badge_burst: 'badge_burst', badge_shield: 'badge_shield', badge_tag: 'badge_tag', badge_ribbon: 'badge_ribbon',
        square: 'shape_square', rectangle: 'shape_rectangle', arrow_curved: 'arrow_curved_right', arrow_swoosh: 'arrow_swoosh',
        arrow_bounce: 'arrow_bounce', arrow_double: 'arrow_double_right',
      };
      const CSS_SHAPES = new Set(['circle', 'ring', 'dot', 'pill', 'rounded', 'oval']);
      const sk = raw.shapeKey;
      const ik = raw.iconKey;
      const fillColor = raw.fillColor || raw.color || '#ffffff';
      let iconifyOut = undefined, decorativeId = undefined, typeOut = type;
      if (type === 'icon') {
        const phName = ik && ICON_KEY_TO_PH[ik];
        if (phName) { iconifyOut = { set: 'ph', icon: phName }; style.color = fillColor; }
        else {
          const decId = ik && SHAPE_TO_DEC[ik];
          if (decId) { decorativeId = decId; typeOut = 'decorative'; style.color = fillColor; }
          else {
            const contentStr = (z.content || '').trim();
            const inferredKey = (contentStr === '+' || contentStr.toLowerCase() === 'plus') ? 'plus' : (contentStr === '★' || contentStr === '*') ? 'star' : (contentStr === '✓' || contentStr === '✔') ? 'check' : (contentStr === '→' || contentStr === '▶' || contentStr === '>') ? 'arrow' : (contentStr === '♥' || contentStr === '❤') ? 'heart' : (contentStr === '⚡' || contentStr === '⚡️') ? 'bolt' : (contentStr === '🔥') ? 'fire' : (contentStr === '👑') ? 'crown' : (role === 'cta' ? 'arrow' : 'star');
            const infPh = ICON_KEY_TO_PH[inferredKey];
            if (infPh) { iconifyOut = { set: 'ph', icon: infPh }; }
            style.color = fillColor;
          }
        }
      } else if (type === 'decorative') {
        if (sk && !CSS_SHAPES.has(sk)) {
          const decId = SHAPE_TO_DEC[sk];
          if (decId) { decorativeId = decId; style.color = fillColor; }
          else { if (!style.background) style.background = fillColor; }
        } else {
          if (!style.background) style.background = fillColor;
          if (sk === 'circle' || sk === 'ring' || sk === 'dot') style.borderRadius = '50%';
          else if (sk === 'pill') style.borderRadius = 999;
        }
      }
      if (type === 'icon') style.iconSize = raw.iconSize ?? 80;
      if (type === 'asset') style.objectFit = 'cover';
      if (raw.padding) { style.paddingTop = raw.padding; style.paddingBottom = raw.padding; style.paddingLeft = raw.padding * 2; style.paddingRight = raw.padding * 2; }
      let content;
      if (type === 'text') {
        const rawText = (z.content || '').trim();
        const stripped = rawText.replace(/\s+/g, '');
        const COMMON_CONSONANT_STARTS = /^(str|spr|scr|shr|spl|squ|thr|chr|sch|wh|kn|gn|ps|ph)/i;
        const isWordGarbled = (word) => {
          if (word.length < 4) return false;
          const vowels = (word.match(/[aeiou]/gi) || []).length;
          const conRatio = (word.length - vowels) / word.length;
          if (word.length >= 5 && conRatio >= 0.8) return true;
          if (/[aeiouAEIOU]{3,}/.test(word)) return true;
          const startCluster = word.match(/^[bcdfghjklmnpqrstvwxyz]{3,}/i);
          if (startCluster && !COMMON_CONSONANT_STARTS.test(word)) return true;
          return false;
        };
        const shortGarble = rawText.length > 0 && rawText.length < 28 && ((!/[aeiouAEIOU]/.test(stripped) && /[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]{4,}/.test(stripped)) || /[aeiouAEIOU]{3,}/.test(stripped) || (rawText === rawText.toUpperCase() && !rawText.includes(' ') && stripped.length > 6 && /[BCDFGHJKLMNPQRSTVWXYZ]{5,}/.test(stripped)));
        const alphaWords = rawText.split(/\s+/).filter(w => /^[a-zA-Z]{4,}$/.test(w));
        const garbledWordCount = alphaWords.filter(isWordGarbled).length;
        const longGarble = rawText.length >= 20 && alphaWords.length >= 3 && garbledWordCount / alphaWords.length >= 0.33;
        const isGarbled = shortGarble || longGarble;
        const rolePlaceholders = { headline: 'YOUR HEADLINE HERE', subtext: 'Supporting detail goes here', label: niche ? niche.toUpperCase() : 'CATEGORY', stat: '30% OFF', cta: 'GET STARTED', tagline: 'Your tagline', metric: '10K+', quote: '"Quote goes here"' };
        const cleanText = isGarbled ? (rolePlaceholders[role] || rawText) : (rawText || rolePlaceholders[role] || '');
        content = { kind: 'text', text: cleanText };
      } else if (type === 'asset') {
        content = { kind: 'asset', asset: { src: null, type: 'image', objectFit: 'cover', motion: 'none', enterTransition: 'none', exitTransition: 'none' } };
      } else if (decorativeId) {
        content = { decorativeId };
      } else if (type === 'icon' && ik && !iconifyOut) {
        content = { iconId: ik };
      }
      const ROLE_MAX_CHARS = { headline: 40, subtext: 100, tagline: 80, cta: 40, stat: 20, metric: 20, label: 30, quote: 150 };
      const contentText = type === 'text' ? (z.content || '') : '';
      const maxChars = type === 'text' ? Math.max(contentText.length + 20, ROLE_MAX_CHARS[role] || 60) : undefined;
      const MIN_WIDTHS_BY_ROLE = { headline: 80, subtext: 75, tagline: 70, cta: 60, stat: 28, metric: 28, label: 22, quote: 70 };
      const rawW = typeof z.width === 'number' ? z.width : 90;
      const rawX = typeof z.x     === 'number' ? z.x     : 5;
      const minW = type === 'text' ? (MIN_WIDTHS_BY_ROLE[role] ?? 50) : rawW;
      let finalW = Math.min(Math.max(rawW, minW), 99);
      let finalX = Math.max(0, Math.min(rawX, 99 - finalW));
      if (type === 'text' && (role === 'stat' || role === 'metric' || role === 'label') && style.fontSize && z.content) {
        const statText = (z.content || '').trim();
        const neededW = Math.min(Math.ceil((statText.length * style.fontSize * 0.62 / 1080) * 100) + 8, 95);
        if (neededW > finalW) { finalW = neededW; finalX = Math.max(0, Math.min(rawX, 99 - finalW)); }
      }
      if (type === 'text' && style.textAlign === 'center' && ['headline', 'subtext', 'tagline', 'cta', 'quote'].includes(role)) {
        finalX = Math.round((100 - finalW) / 2 * 10) / 10;
      }
      if (type === 'text' && role === 'cta' && style.fontSize && z.content) {
        const ctaText = (z.content || '').trim();
        const maxPxForW = (finalW / 100) * 1080 * 0.82;
        const neededPx  = ctaText.length * style.fontSize * 0.55;
        if (neededPx > maxPxForW) style.fontSize = Math.max(24, Math.round(maxPxForW / (ctaText.length * 0.55)));
      }
      const rawH = typeof z.height === 'number' ? z.height : 10;
      const minFontH = type === 'text' && style.fontSize ? (style.fontSize / 1920) * 100 * 1.25 : 0;
      const computedH = type === 'text' ? Math.max(rawH, minFontH) : rawH;
      return {
        id: z.id || `z${i + 1}`, type: typeOut, role,
        x: finalX, y: typeof z.y === 'number' ? z.y : 5,
        width: finalW, height: computedH, zIndex,
        start: z.animationDelay ?? (i * 0.1), end: null,
        enterAnimation: z.animation || (type === 'asset' ? 'fadeIn' : type === 'icon' ? 'popIn' : 'fadeIn'),
        exitAnimation: 'none', style,
        ...(iconifyOut  !== undefined ? { iconify: iconifyOut }                   : {}),
        ...(content     !== undefined ? { content }                               : {}),
        ...(maxChars    !== undefined ? { maxChars }                              : {}),
        ...(z.assetDescription        ? { assetDescription: z.assetDescription } : {}),
      };
    }

    let zones = (parsed.zones || []).map(toInternalZone);

    // Post-process 1: stack multi-line headlines
    {
      const hlZones = zones.filter(z => z.role === 'headline' && z.type === 'text').sort((a, b) => (a.y || 0) - (b.y || 0));
      if (hlZones.length > 1) {
        let cursor = hlZones[0].y || 0;
        const newYMap = new Map();
        for (const hl of hlZones) { newYMap.set(hl.id, Math.round(cursor * 10) / 10); cursor = Math.round(cursor * 10) / 10 + (hl.height || 0) + 0.8; }
        zones = zones.map(z => newYMap.has(z.id) ? { ...z, y: newYMap.get(z.id) } : z);
      }
    }

    // Post-process 2: push non-headline text zones below headline block
    {
      const hlBottomEdge = zones.filter(z => z.role === 'headline' && z.type === 'text').reduce((max, z) => Math.max(max, (z.y || 0) + (z.height || 0)), 0);
      if (hlBottomEdge > 0) {
        const toPlace = zones.filter(z => z.type === 'text' && z.role !== 'headline' && (z.y || 0) < hlBottomEdge).sort((a, b) => (a.y || 0) - (b.y || 0));
        if (toPlace.length > 0) {
          const rows = [];
          for (const z of toPlace) {
            const lastRow = rows[rows.length - 1];
            if (lastRow && Math.abs((z.y || 0) - lastRow.y) <= 1.5) { lastRow.zones.push(z); lastRow.rowH = Math.max(lastRow.rowH, z.height || 0); }
            else { rows.push({ y: z.y || 0, rowH: z.height || 0, zones: [z] }); }
          }
          const pushMap = new Map();
          let cursor = hlBottomEdge + 1.5;
          for (const row of rows) { const rowY = Math.round(cursor * 10) / 10; for (const z of row.zones) pushMap.set(z.id, rowY); cursor = rowY + row.rowH + 1; }
          zones = zones.map(z => pushMap.has(z.id) ? { ...z, y: pushMap.get(z.id) } : z);
        }
      }
    }

    // Post-process 3: inject circle decoration behind circular stat/label badges
    {
      const injections = [];
      zones.forEach((z, idx) => {
        const br = z.style?.borderRadius;
        const hasBg = z.style?.background || z.style?.backgroundColor;
        const isCircle = br === '50%' || Number(br) >= 50;
        if (z.type === 'text' && hasBg && isCircle && ['stat', 'metric', 'label'].includes(z.role)) {
          const bgColor = z.style.background || z.style.backgroundColor;
          const sz = Math.max(z.width || 10, typeof z.height === 'number' ? z.height : 10);
          const cx = (z.x || 0) + ((z.width || sz) - sz) / 2;
          injections.push({ before: idx, zone: { id: `${z.id}_circle`, type: 'decorative', role: 'decorative', x: cx, y: z.y || 0, width: sz, height: sz, zIndex: Math.max((z.zIndex || 4) - 1, 1), start: z.start, end: null, enterAnimation: 'fadeIn', exitAnimation: 'none', style: { background: bgColor, borderRadius: '50%' } } });
          const newStyle = { ...z.style }; delete newStyle.background; delete newStyle.backgroundColor; delete newStyle.borderRadius;
          zones[idx] = { ...z, style: newStyle };
        }
      });
      for (let i = injections.length - 1; i >= 0; i--) zones.splice(injections[i].before, 0, injections[i].zone);
    }

    // visual_rest: ensure exactly asset + label + caption
    if (intent === 'visual_rest') {
      const hasFullAsset = zones.some(z => z.type === 'asset' && (z.width || 0) >= 80 && (z.height || 0) >= 80);
      if (!hasFullAsset) {
        const anyAsset = zones.find(z => z.type === 'asset');
        const assetDesc = anyAsset?.assetDescription || `atmospheric ${niche || 'lifestyle'} scene, cinematic photography, full bleed`;
        zones = zones.filter(z => z.type !== 'asset');
        zones.unshift({ id: 'vr_asset', type: 'asset', role: 'primary_asset', x: 0, y: 0, width: 100, height: 100, zIndex: 1, start: 0.1, end: null, enterAnimation: 'fadeIn', exitAnimation: 'none', style: { objectFit: 'cover' }, content: { kind: 'asset', asset: { src: '', type: 'image', motion: 'none', objectFit: 'cover', enterTransition: 'none', exitTransition: 'none' } }, assetDescription: assetDesc, background: {} });
      }
      const hasLabel = zones.some(z => z.type === 'text' && (z.role === 'label' || (z.y || 0) < 12));
      if (!hasLabel) zones.push({ id: 'vr_label', type: 'text', role: 'label', x: 35, y: 4, width: 30, height: 3, zIndex: 5, start: 0.2, end: null, enterAnimation: 'fadeIn', exitAnimation: 'none', style: { color: '#ffffff', fontSize: 32, fontWeight: '400', fontFamily: 'Montserrat', textAlign: 'center', letterSpacing: '0.15em' }, content: { kind: 'text', text: (niche || 'LIFESTYLE').toUpperCase() }, maxChars: 12, background: {} });
      const hasCaption = zones.some(z => z.type === 'text' && (z.y || 0) > 70);
      if (!hasCaption) zones.push({ id: 'vr_caption', type: 'text', role: 'subtext', x: 10, y: 84, width: 80, height: 4, zIndex: 5, start: 0.4, end: null, enterAnimation: 'fadeIn', exitAnimation: 'none', style: { color: '#ffffff', fontSize: 44, fontWeight: '300', fontFamily: 'Playfair Display', textAlign: 'center', fontStyle: 'italic' }, content: { kind: 'text', text: 'Find your still.' }, maxChars: 22, background: {} });
      zones = zones.filter(z => (z.type === 'asset' && (z.width || 0) >= 80) || z.id === 'vr_label' || z.id === 'vr_caption' || (z.type === 'text' && ((z.role === 'label' && (z.y || 0) < 12) || (z.y || 0) > 70)));
    }

    zones = zones.map((z, i) => ({ ...z, id: `z${i + 1}` }));

    console.log('[convert-layout-image] ── PROCESSED ZONES ──────────────────────');
    zones.forEach(z => { console.log(`  ${z.id} [${z.type}/${z.role}] x:${z.x} y:${z.y} w:${z.width} h:${z.height} | maxChars:${z.maxChars ?? '-'} iconify:${z.iconify ? z.iconify.icon : '-'}${z.assetDescription ? ` | asset:"${z.assetDescription}"` : ''}`); });
    console.log('──────────────────────────────────────────────────────────────────\n');

    let defaultBackground = null;
    if (bgCategory === 'solid' || bgCategory === 'pattern') {
      const css = bgColors.length >= 2 ? `linear-gradient(${bgDirection || 'to bottom'}, ${bgColors.join(', ')})` : (bgColors[0] || '#0a0a0a');
      defaultBackground = { type: bgColors.length >= 2 ? 'gradient' : 'color', value: css };
    } else if (bgCategory === 'abstract') {
      defaultBackground = { type: 'image', value: null };
    }

    return res.json({ zones, background_category: bgCategory, background_colors: bgColors, background_gradient_direction: bgDirection, color_family: colorFamily, background_needs_image: bgNeedsImg, background_image_prompt: bgImgPrompt, default_background: defaultBackground });
  } catch (err) {
    console.error('[admin/convert-layout-image]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: generate layout prompts ── */
router.post("/generate-layout-prompts", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { niche = "entertainment", intent = "hook", energy = "high", count = 4 } = req.body;
    const INTENT_LAYOUTS = {
      hook: { description: 'Stop the scroll. Bold visual, dominant headline, immediate impact.', elements: `1. BACKGROUND — bold gradient or high-contrast solid.\n2. CATEGORY LABEL — small pill/tag at very top (top 12%).\n3. HEADLINE — massive ultra-bold text, 6-10 words (12-42%).\n4. SUBTEXT — 5-8 word supporting line.\n5. SUBJECT — striking visual filling center (40-75%).\n6. DECORATIVE ACCENTS — min 2.\n7. CTA — full-width bottom bar (88-100%).`, example: `Bold fitness hook on burnt orange to crimson gradient. TOP: white pill badge "FITNESS". Upper third: ultra-bold condensed headline. CENTER: product shot. BOTTOM: full-width CTA bar.` },
      proof: { description: 'Show evidence. Asset-led. NO CTA.', elements: `1. BACKGROUND — clean professional.\n2. CATEGORY LABEL — trust indicator.\n3. PROOF VISUAL — DOMINANT (12-65%).\n4. RESULT STAT — prominent number.\n5. CLAIM TEXT — credibility statement.\n6. TRUST BADGES.\n7. NO CTA.`, example: `Dark navy proof layout for finance. Dominant proof visual, giant result stat, trust badges. No CTA.` },
      stat: { description: 'One big number owns the screen. NO CTA.', elements: `1. BACKGROUND — minimal clean.\n2. CATEGORY LABEL — tiny.\n3. STAT CONTEXT LABEL — what the number measures.\n4. GIANT STAT NUMBER — ultra-bold, 20-50% canvas height.\n5. CONTEXT VISUAL — small supporting graphic.\n6. SUPPORTING CLAIM.\n7. NO CTA.`, example: `Minimal dark stat layout. Enormous white bold number filling 35% canvas. No CTA.` },
      contrast: { description: 'Before vs After. Two states shown side by side or stacked.', elements: `1. BACKGROUND — split design.\n2. CATEGORY LABEL.\n3. BEFORE LABEL.\n4. AFTER LABEL.\n5. SPLIT VISUAL.\n6. DIVIDER.\n7. CONTRAST HEADLINE.\n8. CTA at bottom (88-100%).`, example: `Split contrast layout for skincare. Left/right halves with before/after. Full-width CTA bar.` },
      escalate: { description: 'Building energy. Stacked text, MAXIMUM 4 ZONES TOTAL. NO CTA.', elements: `IMPORTANT: MAX 4 ZONES TOTAL.\n1. BACKGROUND — dark intense.\n2. URGENCY LABEL — small pill.\n3. ESCALATING HEADLINE — upper (20-45%).\n4. ESCALATING PAYOFF — bigger/bolder (50-72%).\nNO MORE ZONES.`, example: `Intense dark escalate layout. Near-black gradient. Fiery pill. Large headline. Massive payoff. 4 zones only.` },
      explanation: { description: 'Calm and clear. NO CTA.', elements: `1. BACKGROUND — light clean.\n2. CATEGORY LABEL.\n3. EXPLANATION HEADLINE (10-25%).\n4. ASSET/VISUAL — MANDATORY, sharp well-lit (25-55%).\n5. STEP/POINT BLOCKS (55-82%).\n6. SUPPORTING SUBTEXT.\n7. NO CTA.`, example: `Clean white explanation layout. Sharp photo, numbered step cards below. No CTA.` },
      reveal: { description: 'Dramatic payoff. NO CTA.', elements: `1. BACKGROUND — dramatic.\n2. CATEGORY LABEL — minimal.\n3. MYSTERY TEXT — sparse (10-30%).\n4. REVEAL VISUAL — DOMINANT (35-78%).\n5. SPOTLIGHT/GLOW EFFECT.\n6. RESULT TEXT (78-90%).\n7. NO CTA.`, example: `Dark-to-gold reveal layout. Dramatic product emerging from shadow. Bold payoff text. No CTA.` },
      testimonial: { description: 'Human voice. Quote-led. NO CTA.', elements: `1. BACKGROUND — warm approachable.\n2. CATEGORY LABEL — trust indicator.\n3. PERSON PHOTO — DOMINANT (10-52%).\n4. RESULT BADGE.\n5. STAR RATING.\n6. QUOTE TEXT — HERO (58-84%).\n7. NO CTA.`, example: `Warm cream testimonial. Large person photo, result badge, stars, big italic quote. No CTA.` },
      visual_rest: { description: 'Full bleed atmospheric asset. EXACTLY 3 ZONES.', elements: `IMPORTANT: EXACTLY 3 ZONES.\n1. FULL BLEED ASSET ZONE (x=0, y=0, width=100, height=100).\n2. CATEGORY LABEL TEXT ZONE (y=3-7%).\n3. CAPTION TEXT ZONE (y=82-88%).\nNO MORE ZONES.`, example: `Full bleed travel landscape photo. Tiny label at top. Elegant caption at bottom. 3 zones only.` },
      cta: { description: 'Action-oriented. CTA button is the hero.', elements: `1. BACKGROUND — high contrast.\n2. CATEGORY LABEL.\n3. BENEFIT HEADLINE (10-30%).\n4. THE CTA BUTTON — MASSIVE (40-65%).\n5. SUPPORTING REASON.\n6. URGENCY LINE.\n7. TRUST MICRO-ELEMENT.`, example: `High-impact purple CTA layout. Massive gold CTA button center. Supporting copy below. Trust signals.` },
    };
    const intentKey = intent.toLowerCase().replace(/[^a-z_]/g, '');
    const layoutSpec = INTENT_LAYOUTS[intentKey] || INTENT_LAYOUTS.hook;
    const systemPrompt = `You are a creative director generating image-generation prompts for 9:16 vertical social media layout mockups. Each prompt describes a COMPLETE, DENSE layout scene to be rendered by an AI image generator (Flux). NICHE aesthetic guide: finance: dark professional gold, skincare: light cream minimal, food: warm vibrant, fitness: dark energetic bold, tech: dark cool blue, lifestyle: light airy, education: light bright, entertainment: vibrant bold, motivational: dark powerful, spiritual: warm golden, travel: vibrant scenic, business: professional clean. LAYOUT DESIGN CONSTRAINTS: Text must always be a SEPARATE typographic layer. Subject sits cleanly ON the background. Maximum 3 asset zones, maximum 5 text zones. NOT allowed: gradient text, metallic text, 3D extruded text. Headline zones must contain 6+ words. THIS IS A "${intent.toUpperCase()}" LAYOUT. Intent: ${layoutSpec.description}. MANDATORY ELEMENTS: ${layoutSpec.elements}. EXAMPLE: '${layoutSpec.example} Vertical 9:16 social media template. Professional. Sharp. No UI chrome. No device frames.'`;
    const userPrompt = `Generate ${count} unique image-generation prompts for:\nNiche: ${niche}\nIntent: ${intent}\nEnergy: ${energy}\n\nCRITICAL: These are "${intent.toUpperCase()}" layouts — follow the intent-specific structure defined above.\nDo NOT default to a generic headline+subject+CTA hook layout unless intent is "hook".\n\nReturn as JSON: { "prompts": [{ "id": "p1", "title": "short title", "visual_direction": "one sentence", "prompt": "Full detailed image-generation prompt. End with: Vertical 9:16 social media template. Professional. Sharp. No UI chrome. No device frames." }] }\nReturn only valid JSON, no explanation.`;
    const completion = await openai.chat.completions.create({ model: "gpt-4o", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], temperature: 0.9, response_format: { type: "json_object" } });
    const raw = completion.choices[0].message.content;
    const parsed = JSON.parse(raw);
    const rawPrompts = Array.isArray(parsed) ? parsed : (parsed.prompts || Object.values(parsed)[0] || []);
    const prompts = rawPrompts.map((p, i) => ({ ...p, id: p.id ?? `p${i + 1}` }));
    res.json({ prompts });
  } catch (err) {
    console.error("[admin/generate-layout-prompts]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: generate layout assets ── */
router.post("/generate-layout-assets", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { promptId, zones, niche, intent, background_needs_image, background_image_prompt, color_family } = req.body;
    if (!zones || !Array.isArray(zones)) return res.status(400).json({ error: "zones required" });
    const assetZones = zones.filter(z => z.type === 'asset' && ['primary_asset','secondary_asset'].includes(z.role));
    const results = [];
    for (const zone of assetZones) {
      try {
        const INTENT_OVERRIDES = {
          motivate:  { health: 'athletic person in dynamic running or workout pose', lifestyle: 'motivated person in action, bright energetic scene', fitness: 'athlete in powerful workout pose' },
          inspire:   { health: 'athletic person running or jumping, full energy', fitness: 'athlete at peak performance, dynamic action shot' },
          challenge: { health: 'person pushing physical limits', fitness: 'competitive athlete in action' },
          educate:   { health: 'healthcare professional or wellness expert', finance: 'financial advisor at desk', business: 'professional presenting or teaching' },
          entertain: { comedy: 'funny expressive emoji face or cartoon character', entertainment: 'vibrant performer in colorful costume' },
        };
        const NICHE_ASSET_PROMPTS = {
          comedy: 'funny expressive emoji face or cartoon character, bright cheerful colors', entertainment: 'vibrant performer or character, dynamic energetic pose', gaming: 'gaming character or person with headset and controller, dramatic neon lighting',
          education: 'student or teacher with books or laptop, bright professional background', finance: 'confident financial professional in business attire, clean minimal background',
          business: 'confident professional in smart business attire, clean minimal background', fitness: 'athletic person in dynamic workout pose, gym or studio, energetic',
          health: 'fit healthy person in athletic wear, vibrant clean background', food: 'appetizing food dish or drink, professional food photography, clean background',
          fashion: 'stylish person wearing on-trend outfit, editorial studio background', travel: 'person at scenic travel location or with travel gear',
          technology: 'sleek modern tech device or person using tech, minimal clean background', lifestyle: 'person enjoying an aspirational lifestyle moment, bright airy background',
        };
        const nicheKey = niche?.toLowerCase().replace(/[^a-z]/g, '') || 'business';
        const intentKey = intent?.toLowerCase() || '';
        const intentOverride = INTENT_OVERRIDES[intentKey]?.[nicheKey];
        const nicheDesc = intentOverride || NICHE_ASSET_PROMPTS[nicheKey] || `${niche} subject, professional photo, clean background`;
        const zoneDesc = zone.assetDescription || zone._assetDescription;
        const baseDesc = zoneDesc ? zoneDesc : (zone.role === 'primary_asset' ? `${nicheDesc}, main hero subject, sharp focus, isolated foreground, full body or portrait` : `${nicheDesc}, supporting element, secondary composition`);
        const subjectPrompt = `${baseDesc}, photorealistic, no text overlays, no logos, no UI elements, no layout mockup, no social media frame, ultra high quality`;
        const falRes = await fetch("https://fal.run/fal-ai/flux/dev", { method: "POST", headers: { "Authorization": `Key ${process.env.FAL_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ prompt: subjectPrompt, image_size: "portrait_4_3", num_inference_steps: 28, guidance_scale: 3.5, num_images: 1, enable_safety_checker: true }) });
        if (!falRes.ok) throw new Error(`Fal.ai HTTP ${falRes.status}`);
        const falData = await falRes.json();
        const imageUrl = falData?.images?.[0]?.url;
        if (!imageUrl) continue;
        const imageResp = await fetch(imageUrl);
        const imageBuffer = Buffer.from(await imageResp.arrayBuffer());
        const fileName = `zone-assets/${niche}/${promptId}-${zone.id}-${Date.now()}.jpg`;
        const { error: uploadError } = await supabaseAdmin.storage.from('layout-previews').upload(fileName, imageBuffer, { contentType: 'image/jpeg', upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabaseAdmin.storage.from('layout-previews').getPublicUrl(fileName);
        results.push({ zoneId: zone.id, role: zone.role, imageUrl: publicUrl });
      } catch (zoneErr) { console.error(`[generate-layout-assets] Zone ${zone.id} failed:`, zoneErr.message); }
    }
    let backgroundImageUrl = null;
    if (background_needs_image && background_image_prompt) {
      try {
        const bgPrompt = `${background_image_prompt}, no text, no people, no UI elements, seamless background, ultra high quality, ${niche} aesthetic`;
        const falRes = await fetch("https://fal.run/fal-ai/flux/dev", { method: "POST", headers: { "Authorization": `Key ${process.env.FAL_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ prompt: bgPrompt, image_size: "portrait_4_3", num_inference_steps: 28, guidance_scale: 3.5, num_images: 1, enable_safety_checker: true }) });
        if (!falRes.ok) throw new Error(`Fal.ai bg HTTP ${falRes.status}`);
        const falData = await falRes.json();
        const imageUrl = falData?.images?.[0]?.url;
        if (imageUrl) {
          const imageResp = await fetch(imageUrl);
          const imageBuffer = Buffer.from(await imageResp.arrayBuffer());
          const fileName = `background-presets/${niche}/${promptId}-bg-${Date.now()}.jpg`;
          const { error: uploadError } = await supabaseAdmin.storage.from('layout-previews').upload(fileName, imageBuffer, { contentType: 'image/jpeg', upsert: true });
          if (!uploadError) {
            const { data: { publicUrl } } = supabaseAdmin.storage.from('layout-previews').getPublicUrl(fileName);
            backgroundImageUrl = publicUrl;
            supabaseAdmin.from('background_presets').insert({ url: publicUrl, niche, color_family: color_family || 'dark', tags: [intent], prompt: background_image_prompt, created_at: new Date().toISOString() }).then(() => {}).catch(() => {});
          }
        }
      } catch (bgErr) { console.error('[generate-layout-assets] Background image gen failed:', bgErr.message); }
    }
    return res.json({ results, backgroundImageUrl });
  } catch (err) {
    console.error('[generate-layout-assets] error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: feedback ── */
router.get("/feedback", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("feedback").select("id, user_id, rating, message, context, created_at").order("created_at", { ascending: false });
    if (error) throw error;
    const rows = data || [];
    const avgRating = rows.length ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / rows.length) * 10) / 10 : 0;
    const uniqueIds = [...new Set(rows.map(r => r.user_id))];
    const emailMap = {};
    await Promise.all(uniqueIds.map(async uid => {
      try { const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(uid); emailMap[uid] = user?.email || uid; } catch { emailMap[uid] = uid; }
    }));
    const feedback = rows.map(r => ({ ...r, email: emailMap[r.user_id] || r.user_id }));
    res.json({ feedback, averageRating: avgRating });
  } catch (err) {
    console.error("[admin/feedback]", err.message);
    res.status(500).json({ error: err.message });
  }
});
