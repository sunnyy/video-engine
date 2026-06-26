/**
 * help.js — public Help Center / Knowledge Base.
 *
 * Public endpoints serve PUBLISHED articles only (no auth, like /plans) so the KB is
 * SEO-indexable and deflects support tickets. Admin endpoints (requireAdmin) author them.
 * All writes use the service role; there are no public RLS policies on help_articles.
 */
import express from "express";
import { supabaseAdmin, requireAuth, requireAdmin } from "../middleware/shared.js";

export const router = express.Router();

const slugify = (s) => (s || "")
  .toLowerCase().trim()
  .replace(/[^a-z0-9\s-]/g, "")
  .replace(/\s+/g, "-")
  .replace(/-+/g, "-")
  .slice(0, 80);

/* ── Public: list published articles (no body — list/search view) ── */
router.get("/help/articles", async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("help_articles")
      .select("slug, title, category, excerpt, updated_at")
      .eq("status", "published")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) throw error;
    res.json({ articles: data || [] });
  } catch (err) {
    console.error("[help/articles]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Public: one published article (increments view count, best-effort) ── */
router.get("/help/articles/:slug", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("help_articles")
      .select("slug, title, category, excerpt, body, updated_at, views")
      .eq("slug", req.params.slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Not found" });
    supabaseAdmin.from("help_articles").update({ views: (data.views || 0) + 1 }).eq("slug", req.params.slug).then(() => {}, () => {});
    res.json({ article: data });
  } catch (err) {
    console.error("[help/articles/:slug]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: list all (any status) ── */
router.get("/admin/help/articles", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("help_articles")
      .select("*")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) throw error;
    res.json({ articles: data || [] });
  } catch (err) {
    console.error("[admin/help:list]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: create ── */
router.post("/admin/help/articles", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, category, excerpt, body, status, sortOrder } = req.body || {};
    if (!title?.trim()) return res.status(400).json({ error: "Title required" });

    let slug = slugify(req.body.slug || title);
    if (!slug) slug = `article-${Date.now()}`;
    // Ensure unique slug.
    const { data: clash } = await supabaseAdmin.from("help_articles").select("id").eq("slug", slug).maybeSingle();
    if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const { data, error } = await supabaseAdmin.from("help_articles").insert({
      slug, title: title.trim(),
      category: (category || "General").trim(),
      excerpt: excerpt?.trim() || null,
      body: body || "",
      status: status === "published" ? "published" : "draft",
      sort_order: Number(sortOrder) || 0,
    }).select().single();
    if (error) throw error;
    res.json({ article: data });
  } catch (err) {
    console.error("[admin/help:create]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: update ── */
router.patch("/admin/help/articles/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    const updates = { updated_at: new Date().toISOString() };
    if (b.title !== undefined)     updates.title = b.title.trim();
    if (b.category !== undefined)  updates.category = (b.category || "General").trim();
    if (b.excerpt !== undefined)   updates.excerpt = b.excerpt?.trim() || null;
    if (b.body !== undefined)      updates.body = b.body || "";
    if (b.status !== undefined)    updates.status = b.status === "published" ? "published" : "draft";
    if (b.sortOrder !== undefined) updates.sort_order = Number(b.sortOrder) || 0;
    if (b.slug !== undefined && b.slug.trim()) {
      let slug = slugify(b.slug);
      const { data: clash } = await supabaseAdmin.from("help_articles").select("id").eq("slug", slug).neq("id", req.params.id).maybeSingle();
      if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
      updates.slug = slug;
    }

    const { data, error } = await supabaseAdmin.from("help_articles").update(updates).eq("id", req.params.id).select().single();
    if (error) throw error;
    res.json({ article: data });
  } catch (err) {
    console.error("[admin/help:update]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Admin: delete ── */
router.delete("/admin/help/articles/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from("help_articles").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("[admin/help:delete]", err.message);
    res.status(500).json({ error: err.message });
  }
});
