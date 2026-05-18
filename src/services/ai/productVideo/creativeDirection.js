/**
 * creativeDirection.js
 * Step 2 — given product analysis, output creative direction.
 */
import { serverFetch } from "../../serverApi";

export async function creativeDirection({ productAnalysis, userPrompt }) {
  const res = await serverFetch("/api/product-video/direction", {
    method: "POST",
    body: JSON.stringify({ productAnalysis, userPrompt }),
  });
  if (!res.ok) throw new Error(`creativeDirection failed (${res.status})`);
  return res.json();
}
