/**
 * notificationService.js
 * src/server/services/notificationService.js
 *
 * Single entry point for every user-facing event. notifyUser() drops an in-app
 * notification row (read live via Supabase Realtime) and, when the event has an
 * email template, sends that too — so a call site wires an event exactly once.
 *
 * Inserts use the service-role client (RLS blocks client inserts). Failures here
 * never throw into the caller: an event is a side effect, not part of the request.
 */

import { supabaseAdmin } from "../middleware/shared.js";
import { sendUserEmail } from "./emailService.js";
import { categoryForType, isCategoryLocked } from "../../config/notificationCategories.js";

/**
 * Resolve which channels are allowed for a user + notification category. Locked categories
 * (and unmapped types) always deliver on both channels. Otherwise read the user's prefs;
 * a missing row/category/channel defaults to ON (opt-out model). Best-effort — any failure
 * falls back to delivering, so a prefs hiccup never silently drops a notification.
 */
async function allowedChannels(userId, type) {
  const category = categoryForType(type);
  if (!category || isCategoryLocked(category)) return { inApp: true, email: true };
  try {
    const { data } = await supabaseAdmin.from("notification_prefs").select("prefs").eq("user_id", userId).maybeSingle();
    const c = data?.prefs?.[category] || {};
    return { inApp: c.in_app !== false, email: c.email !== false };
  } catch {
    return { inApp: true, email: true };
  }
}

/**
 * @param {string} userId
 * @param {object} opts
 * @param {string}  opts.type      event key, e.g. "render_complete"
 * @param {string}  opts.title     short headline shown in the panel
 * @param {string} [opts.body]     one-line detail
 * @param {string} [opts.link]     in-app path opened on click, e.g. "/credits"
 * @param {string} [opts.icon]     emoji/glyph for the row
 * @param {string} [opts.severity] info | success | warning | error  (default "info")
 * @param {object} [opts.email]    { to, subject, html } — also send this as an email
 */
export async function notifyUser(userId, { type, title, body = null, link = null, icon = null, severity = "info", email = null } = {}) {
  if (!userId || !type || !title) {
    console.warn("[notify] missing userId/type/title — skipped", { userId, type, title });
    return;
  }

  const allow = await allowedChannels(userId, type);

  if (allow.inApp) {
    try {
      const { error } = await supabaseAdmin.from("notifications").insert({
        user_id: userId, type, title, body, link, icon, severity,
      });
      if (error) console.error("[notify] insert failed:", error.message);
    } catch (err) {
      console.error("[notify] insert threw:", err.message);
    }
  }

  // Email is best-effort and already no-ops when Resend is unconfigured.
  if (allow.email && email?.to && email?.subject && email?.html) {
    sendUserEmail(email.to, email.subject, email.html);
  }
}

/**
 * Convenience for call sites that have a user record but not its email handy.
 * Looks the user up, derives a display name, runs `build(name)` to get an email
 * template, and fires both channels.
 *
 * @param {string} userId
 * @param {object} notif  same shape as notifyUser opts, minus `email`
 * @param {(name:string)=>{subject:string,html:string}} [buildEmail]
 */
export async function notifyUserById(userId, notif, buildEmail = null) {
  let email = null;
  if (buildEmail) {
    try {
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (user?.email) {
        const name = user.user_metadata?.full_name || user.user_metadata?.name || "";
        const tpl = buildEmail(name);
        email = { to: user.email, subject: tpl.subject, html: tpl.html };
      }
    } catch (err) {
      console.error("[notify] user lookup failed:", err.message);
    }
  }
  return notifyUser(userId, { ...notif, email });
}
