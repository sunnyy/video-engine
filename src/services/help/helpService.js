/**
 * helpService.js — client wrappers for the Help Center API.
 * Public reads use plain fetch (no auth needed); admin CRUD uses serverFetch.
 */
import { SERVER, serverFetch } from "../serverApi";

async function json(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

/* ── Public ── */
export async function listHelpArticles() {
  return json(await fetch(`${SERVER}/api/help/articles`));
}
export async function getHelpArticle(slug) {
  return json(await fetch(`${SERVER}/api/help/articles/${encodeURIComponent(slug)}`));
}

/* ── Admin ── */
export async function adminListHelpArticles() {
  return json(await serverFetch("/api/admin/help/articles"));
}
export async function adminCreateHelpArticle(payload) {
  return json(await serverFetch("/api/admin/help/articles", { method: "POST", body: JSON.stringify(payload) }));
}
export async function adminUpdateHelpArticle(id, payload) {
  return json(await serverFetch(`/api/admin/help/articles/${id}`, { method: "PATCH", body: JSON.stringify(payload) }));
}
export async function adminDeleteHelpArticle(id) {
  return json(await serverFetch(`/api/admin/help/articles/${id}`, { method: "DELETE" }));
}
