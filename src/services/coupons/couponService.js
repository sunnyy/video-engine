/**
 * couponService.js — client wrappers for the promo-code API (serverFetch handles auth).
 * Used by Checkout (validate) and the admin Coupons page (CRUD).
 */
import { serverFetch } from "../serverApi";

async function json(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

/* ── User ── */
export async function validateCouponCode({ code, planSlug, billingCycle }) {
  return json(await serverFetch("/api/coupons/validate", {
    method: "POST", body: JSON.stringify({ code, planSlug, billingCycle }),
  }));
}

/* ── Admin ── */
export async function adminListCoupons() {
  return json(await serverFetch("/api/admin/coupons"));
}
export async function adminCreateCoupon(payload) {
  return json(await serverFetch("/api/admin/coupons", { method: "POST", body: JSON.stringify(payload) }));
}
export async function adminUpdateCoupon(id, payload) {
  return json(await serverFetch(`/api/admin/coupons/${id}`, { method: "PATCH", body: JSON.stringify(payload) }));
}
export async function adminDeleteCoupon(id) {
  return json(await serverFetch(`/api/admin/coupons/${id}`, { method: "DELETE" }));
}
