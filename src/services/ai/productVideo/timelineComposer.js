/**
 * timelineComposer.js
 * Step 5 — compose full layers[] timeline JSON from script + asset plan.
 */
import { serverFetch } from "../../serverApi";

export async function timelineComposer({ scenes, assetPlan, direction, productAnalysis }) {
  const res = await serverFetch("/api/product-video/compose", {
    method: "POST",
    body: JSON.stringify({ scenes, assetPlan, direction, productAnalysis }),
  });
  if (!res.ok) throw new Error(`timelineComposer failed (${res.status})`);
  return res.json();
}
