/**
 * assetPlanner.js
 * Step 4 — decide which scenes use product image vs need AI generation.
 */
import { serverFetch } from "../../serverApi";

export async function assetPlanner({ scenes, productAnalysis, direction }) {
  const res = await serverFetch("/api/product-video/assets", {
    method: "POST",
    body: JSON.stringify({ scenes, productAnalysis, direction }),
  });
  if (!res.ok) throw new Error(`assetPlanner failed (${res.status})`);
  return res.json();
}
