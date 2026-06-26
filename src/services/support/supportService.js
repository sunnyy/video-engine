/**
 * supportService.js — client wrappers for the support API (serverFetch handles auth).
 * Used by the user /support page and the admin support console.
 */
import { serverFetch } from "../serverApi";

async function json(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

/* ── User ── */
export async function createTicket({ subject, category, message, attachmentUrl = null, projectId = null }) {
  return json(await serverFetch("/api/support/tickets", { method: "POST", body: JSON.stringify({ subject, category, message, attachmentUrl, projectId }) }));
}
export async function listMyTickets() {
  return json(await serverFetch("/api/support/tickets"));
}
export async function getMyTicket(id) {
  return json(await serverFetch(`/api/support/tickets/${id}`));
}
export async function replyToTicket(id, { body, attachmentUrl = null }) {
  return json(await serverFetch(`/api/support/tickets/${id}/messages`, { method: "POST", body: JSON.stringify({ body, attachmentUrl }) }));
}
export async function closeTicket(id) {
  return json(await serverFetch(`/api/support/tickets/${id}/close`, { method: "POST" }));
}
export async function submitCsat(id, { rating, comment = "" }) {
  return json(await serverFetch(`/api/support/tickets/${id}/csat`, { method: "POST", body: JSON.stringify({ rating, comment }) }));
}

/* ── Admin ── */
export async function adminListTickets(status = "") {
  return json(await serverFetch(`/api/admin/support/tickets${status ? `?status=${status}` : ""}`));
}
export async function adminGetTicket(id) {
  return json(await serverFetch(`/api/admin/support/tickets/${id}`));
}
export async function adminReply(id, { body, attachmentUrl = null }) {
  return json(await serverFetch(`/api/admin/support/tickets/${id}/messages`, { method: "POST", body: JSON.stringify({ body, attachmentUrl }) }));
}
export async function adminSetStatus(id, { status, priority }) {
  return json(await serverFetch(`/api/admin/support/tickets/${id}/status`, { method: "POST", body: JSON.stringify({ status, priority }) }));
}

/* ── Canned replies (admin) ── */
export async function adminListCanned() {
  return json(await serverFetch("/api/admin/support/canned"));
}
export async function adminCreateCanned({ title, body }) {
  return json(await serverFetch("/api/admin/support/canned", { method: "POST", body: JSON.stringify({ title, body }) }));
}
export async function adminDeleteCanned(id) {
  return json(await serverFetch(`/api/admin/support/canned/${id}`, { method: "DELETE" }));
}
