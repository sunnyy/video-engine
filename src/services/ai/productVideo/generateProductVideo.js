import { serverFetch } from "../../serverApi";

/**
 * scrapeProductUrl(url) — pull product image + brand/description from a product page.
 */
export async function scrapeProductUrl(url) {
  const res  = await serverFetch("/api/product-video/scrape-url", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not read that product URL");
  return data; // { productImageUrl, brandName, productDescription, ... }
}

/** Phase 1 (free): vision plan → returns the spoken script for review + the plan to reuse. */
export async function planProductVideo(payload) {
  const res  = await serverFetch("/api/product-video/plan", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || "Couldn't build that script"); if (data.code) e.code = data.code; throw e; }
  return data; // { plan, full_script }
}

/**
 * generateProductVideo(payload, onProgress) — image-first product pipeline, streamed
 * over SSE (real progress: onProgress({ step }) fires at each pipeline boundary).
 * Returns { projectId } (the editor project). The image is resolved by the caller.
 */
export async function generateProductVideo(payload, onProgress) {
  const res = await serverFetch("/api/product-video/generate", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok && res.status !== 200) {
    const err = await res.json().catch(() => ({}));
    const e = new Error(err.error || `Pipeline failed (${res.status})`);
    if (err.code) e.code = err.code;
    throw e;
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer    = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      let event;
      try { event = JSON.parse(line.slice(6)); } catch { continue; }
      if (event.error) {
        const e = new Error(event.error);
        if (event.code) e.code = event.code;
        throw e;
      }
      if (event.step != null && onProgress) onProgress({ step: event.step });
      if (event.done) {
        if (!event.editor_project_id) throw new Error("No editor project returned from the pipeline");
        return { projectId: event.editor_project_id };
      }
    }
  }
  throw new Error("Stream ended without a result");
}
