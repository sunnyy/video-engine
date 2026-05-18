/**
 * analyzeProduct.js
 * Step 1 of product video pipeline.
 * Sends product image to GPT-4.1 vision → returns product understanding.
 */
import { serverFetch } from "../../serverApi";

export async function analyzeProduct({ imageBase64, imageUrl, userPrompt }) {
  const res = await serverFetch("/api/product-video/analyze", {
    method: "POST",
    body: JSON.stringify({ imageBase64, imageUrl, userPrompt }),
  });
  if (!res.ok) throw new Error(`analyzeProduct failed (${res.status})`);
  return res.json();
}
