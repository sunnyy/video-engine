/**
 * motionPass.js
 * Step 6 — add keyframes, decoratives, transitions, SFX to layers.
 */
import { serverFetch } from "../../serverApi";

export async function motionPass({ layers, direction, productAnalysis }) {
  const res = await serverFetch("/api/product-video/motion", {
    method: "POST",
    body: JSON.stringify({ layers, direction, productAnalysis }),
  });
  if (!res.ok) throw new Error(`motionPass failed (${res.status})`);
  return res.json();
}
