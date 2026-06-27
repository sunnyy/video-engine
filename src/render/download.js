/**
 * @vidquence/render — download.js
 *
 * ffmpeg-static can SIGSEGV when reading a remote https:// input on some containers (seen on the
 * Railway worker, while local renders are fine) — its network/TLS path is the fragile bit. We avoid
 * it entirely by downloading remote inputs to a local temp file first and pointing ffmpeg at that.
 * Local/data inputs are returned unchanged.
 */
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

export async function downloadToTemp(url, dir, name) {
  if (!url || !/^https?:\/\//i.test(url)) return url; // already local / data URI — use as-is
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, name);
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok || !res.body) throw new Error(`download HTTP ${res.status} for ${String(url).slice(0, 80)}`);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(dest));
  return dest;
}

// Best-effort extension from a URL (defaults provided per media kind), for the temp filename.
export function extFromUrl(url, fallback) {
  try { const e = path.extname(new URL(url).pathname); if (e && e.length <= 6) return e; } catch {}
  return fallback;
}
