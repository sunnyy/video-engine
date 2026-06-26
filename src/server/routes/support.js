/**
 * support.js — user support tickets + threaded conversation. Mounted at /api.
 * Users open tickets and reply; admins (via /admin/support) reply and manage status.
 * Notifications + emails fire both ways (admin alerted on user activity; user on admin replies).
 */
import express from "express";
import { supabaseAdmin, requireAuth, requireAdmin, sendAdminAlert, sendUserEmail } from "../middleware/shared.js";
import { notifyUser } from "../services/notificationService.js";
import { adminSupportEmail, userSupportReplyEmail } from "../services/emailService.js";

export const router = express.Router();

const CATEGORIES = ["billing", "technical", "quality", "account", "other"];
const STATUSES   = ["open", "in_progress", "waiting_on_user", "resolved", "closed"];
const PRIORITIES = ["low", "normal", "high"];
const MAX_OPEN_PER_USER = 20;

const nowIso = () => new Date().toISOString();
const clip   = (s, n = 5000) => (s || "").toString().trim().slice(0, n);

async function userInfo(userId) {
  try {
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
    return { email: user?.email || null, name: user?.user_metadata?.full_name || user?.user_metadata?.name || "" };
  } catch { return { email: null, name: "" }; }
}

/* ═══════════════════════ USER ═══════════════════════ */

/* POST /api/support/tickets — open a new ticket (subject + category + first message) */
router.post("/support/tickets", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const subject = clip(req.body?.subject, 160);
    const body    = clip(req.body?.message);
    const category = CATEGORIES.includes(req.body?.category) ? req.body.category : "other";
    const attachment_url = req.body?.attachmentUrl || null;
    const project_id = req.body?.projectId || null;
    if (!subject || !body) return res.status(400).json({ error: "Subject and message are required." });

    const { count } = await supabaseAdmin.from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId).not("status", "in", "(resolved,closed)");
    if ((count ?? 0) >= MAX_OPEN_PER_USER) return res.status(400).json({ error: "You have too many open tickets. Please wait for a reply." });

    const { data: ticket, error } = await supabaseAdmin.from("support_tickets")
      .insert({ user_id: userId, subject, category, project_id, status: "open", last_message_at: nowIso() })
      .select().single();
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("support_ticket_messages")
      .insert({ ticket_id: ticket.id, author_id: userId, sender: "user", body, attachment_url });

    const { email } = await userInfo(userId);
    const mail = adminSupportEmail({ kind: "new", ticketId: ticket.id, subject, category, userEmail: email, message: body });
    sendAdminAlert(mail.subject, mail.html);

    res.status(201).json({ ticket });
  } catch (e) {
    console.error("[support/create]", e.message);
    res.status(500).json({ error: e.message });
  }
});

/* GET /api/support/tickets — my tickets, newest activity first */
router.get("/support/tickets", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("support_tickets")
      .select("*").eq("user_id", req.user.id).order("last_message_at", { ascending: false });
    if (error) throw new Error(error.message);
    res.json({ tickets: data || [] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* GET /api/support/tickets/:id — my ticket + thread */
router.get("/support/tickets/:id", requireAuth, async (req, res) => {
  try {
    const { data: ticket } = await supabaseAdmin.from("support_tickets")
      .select("*").eq("id", req.params.id).eq("user_id", req.user.id).maybeSingle();
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    const { data: messages } = await supabaseAdmin.from("support_ticket_messages")
      .select("*").eq("ticket_id", ticket.id).order("created_at", { ascending: true });
    res.json({ ticket, messages: messages || [] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* POST /api/support/tickets/:id/messages — user replies */
router.post("/support/tickets/:id/messages", requireAuth, async (req, res) => {
  try {
    const body = clip(req.body?.body);
    const attachment_url = req.body?.attachmentUrl || null;
    if (!body) return res.status(400).json({ error: "Message is required." });

    const { data: ticket } = await supabaseAdmin.from("support_tickets")
      .select("*").eq("id", req.params.id).eq("user_id", req.user.id).maybeSingle();
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (ticket.status === "closed") return res.status(400).json({ error: "This ticket is closed. Open a new one." });

    await supabaseAdmin.from("support_ticket_messages")
      .insert({ ticket_id: ticket.id, author_id: req.user.id, sender: "user", body, attachment_url });
    // A user reply re-opens a resolved/waiting ticket so it re-enters the admin queue.
    // Reset sla_reminded_at so the SLA clock + overdue digest re-arm for this turn.
    await supabaseAdmin.from("support_tickets")
      .update({ status: "open", last_message_at: nowIso(), sla_reminded_at: null, updated_at: nowIso() }).eq("id", ticket.id);

    const { email } = await userInfo(req.user.id);
    const mail = adminSupportEmail({ kind: "reply", ticketId: ticket.id, subject: ticket.subject, userEmail: email, message: body });
    sendAdminAlert(mail.subject, mail.html);

    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* POST /api/support/tickets/:id/close — user closes own ticket */
router.post("/support/tickets/:id/close", requireAuth, async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from("support_tickets")
      .update({ status: "closed", updated_at: nowIso() }).eq("id", req.params.id).eq("user_id", req.user.id);
    if (error) throw new Error(error.message);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* POST /api/support/tickets/:id/csat — user rates support (1..5) after resolve/close */
router.post("/support/tickets/:id/csat", requireAuth, async (req, res) => {
  try {
    const rating = parseInt(req.body?.rating, 10);
    if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ error: "Rating must be 1–5." });
    const { data: ticket } = await supabaseAdmin.from("support_tickets")
      .select("status").eq("id", req.params.id).eq("user_id", req.user.id).maybeSingle();
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (!["resolved", "closed"].includes(ticket.status)) return res.status(400).json({ error: "You can rate once the ticket is resolved." });
    const { error } = await supabaseAdmin.from("support_tickets")
      .update({ csat_rating: rating, csat_comment: clip(req.body?.comment, 500) || null, csat_at: nowIso() })
      .eq("id", req.params.id).eq("user_id", req.user.id);
    if (error) throw new Error(error.message);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ═══════════════════════ ADMIN ═══════════════════════ */

/* GET /api/admin/support/tickets?status= — all tickets (+ status counts + user emails) */
router.get("/admin/support/tickets", requireAuth, requireAdmin, async (req, res) => {
  try {
    let q = supabaseAdmin.from("support_tickets").select("*").order("last_message_at", { ascending: false }).limit(300);
    if (req.query.status && STATUSES.includes(req.query.status)) q = q.eq("status", req.query.status);
    const { data: tickets, error } = await q;
    if (error) throw new Error(error.message);

    // attach user emails (single listUsers page, mapped — mirrors admin/users)
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const emailById = {}; for (const u of users || []) emailById[u.id] = u.email;
    const withEmail = (tickets || []).map(t => ({ ...t, user_email: emailById[t.user_id] || null }));

    const { data: all } = await supabaseAdmin.from("support_tickets").select("status");
    const counts = {}; for (const r of all || []) counts[r.status] = (counts[r.status] || 0) + 1;

    res.json({ tickets: withEmail, counts });
  } catch (e) {
    console.error("[admin/support/list]", e.message);
    res.status(500).json({ error: e.message });
  }
});

/* GET /api/admin/support/tickets/:id — full thread + user email */
router.get("/admin/support/tickets/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data: ticket } = await supabaseAdmin.from("support_tickets").select("*").eq("id", req.params.id).maybeSingle();
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    const { data: messages } = await supabaseAdmin.from("support_ticket_messages")
      .select("*").eq("ticket_id", ticket.id).order("created_at", { ascending: true });
    const { email } = await userInfo(ticket.user_id);
    res.json({ ticket: { ...ticket, user_email: email }, messages: messages || [] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* POST /api/admin/support/tickets/:id/messages — admin replies (notifies + emails the user) */
router.post("/admin/support/tickets/:id/messages", requireAuth, requireAdmin, async (req, res) => {
  try {
    const body = clip(req.body?.body);
    const attachment_url = req.body?.attachmentUrl || null;
    if (!body) return res.status(400).json({ error: "Message is required." });

    const { data: ticket } = await supabaseAdmin.from("support_tickets").select("*").eq("id", req.params.id).maybeSingle();
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    await supabaseAdmin.from("support_ticket_messages")
      .insert({ ticket_id: ticket.id, author_id: req.user.id, sender: "admin", body, attachment_url });
    // Admin replied → ball is in the user's court; clear the SLA throttle for the next turn.
    await supabaseAdmin.from("support_tickets")
      .update({ status: "waiting_on_user", last_message_at: nowIso(), sla_reminded_at: null, updated_at: nowIso() }).eq("id", ticket.id);

    notifyUser(ticket.user_id, { type: "support_reply", icon: "💬", severity: "info", link: `/support?t=${ticket.id}`,
      title: "Support replied to your ticket", body: ticket.subject });
    const { email, name } = await userInfo(ticket.user_id);
    if (email) { const m = userSupportReplyEmail(name, ticket.subject, body); sendUserEmail(email, m.subject, m.html); }

    res.json({ ok: true });
  } catch (e) {
    console.error("[admin/support/reply]", e.message);
    res.status(500).json({ error: e.message });
  }
});

/* POST /api/admin/support/tickets/:id/status — set status and/or priority */
router.post("/admin/support/tickets/:id/status", requireAuth, requireAdmin, async (req, res) => {
  try {
    const updates = { updated_at: nowIso() };
    if (STATUSES.includes(req.body?.status))   updates.status = req.body.status;
    if (PRIORITIES.includes(req.body?.priority)) updates.priority = req.body.priority;
    if (Object.keys(updates).length === 1) return res.status(400).json({ error: "Nothing to update." });

    const { data: ticket, error } = await supabaseAdmin.from("support_tickets")
      .update(updates).eq("id", req.params.id).select().single();
    if (error) throw new Error(error.message);

    if (updates.status === "resolved" || updates.status === "closed") {
      notifyUser(ticket.user_id, { type: "support_status", icon: "✅", severity: "success", link: `/support?t=${ticket.id}`,
        title: `Your ticket was ${updates.status}`, body: ticket.subject });
    }
    res.json({ ticket });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ── Canned replies (admin-managed) ── */
router.get("/admin/support/canned", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("support_canned_replies").select("*").order("title", { ascending: true });
    if (error) throw new Error(error.message);
    res.json({ canned: data || [] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/admin/support/canned", requireAuth, requireAdmin, async (req, res) => {
  try {
    const title = clip(req.body?.title, 80);
    const body  = clip(req.body?.body, 4000);
    if (!title || !body) return res.status(400).json({ error: "Title and body are required." });
    const { data, error } = await supabaseAdmin.from("support_canned_replies").insert({ title, body }).select().single();
    if (error) throw new Error(error.message);
    res.status(201).json({ canned: data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/admin/support/canned/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from("support_canned_replies").delete().eq("id", req.params.id);
    if (error) throw new Error(error.message);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
