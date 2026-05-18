/**
 * scriptPlanner.js
 * Step 3 — given direction, output scene-by-scene script plan.
 */
import { serverFetch } from "../../serverApi";

export async function scriptPlanner({ productAnalysis, direction }) {
  const res = await serverFetch("/api/product-video/script", {
    method: "POST",
    body: JSON.stringify({ productAnalysis, direction }),
  });
  if (!res.ok) throw new Error(`scriptPlanner failed (${res.status})`);
  return res.json();
}
