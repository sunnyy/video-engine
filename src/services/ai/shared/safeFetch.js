/**
 * safeFetch.js — SSRF-safe fetch for user-supplied URLs (product/page scraping, image harvest).
 *
 * Without this, a user URL could target internal/cloud-metadata addresses (169.254.169.254,
 * localhost, RFC-1918 / link-local / ULA ranges). We require http(s), DNS-resolve the host, and
 * reject any private/loopback/link-local address — re-validating on EVERY redirect hop so a public
 * URL can't 302 into the internal network. Shared by all services that fetch external URLs.
 */
import dns from "node:dns/promises";
import net from "node:net";

const DEFAULT_TIMEOUT_MS = 12000;

export function isPrivateIP(ip) {
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number);
    if (p[0] === 10 || p[0] === 127 || p[0] === 0) return true;
    if (p[0] === 169 && p[1] === 254) return true;                 // link-local + cloud metadata
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true;    // CGNAT
    return false;
  }
  if (net.isIPv6(ip)) {
    const x = ip.toLowerCase();
    if (x === "::1" || x === "::") return true;
    if (x.startsWith("fe80") || x.startsWith("fc") || x.startsWith("fd")) return true; // link-local / ULA
    const m = x.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);             // IPv4-mapped
    if (m) return isPrivateIP(m[1]);
    return false;
  }
  return true; // unparseable → unsafe
}

// Add a scheme to a bare host the user typed (e.g. "arcade.dev" → "https://arcade.dev"). Without
// this, `new URL("arcade.dev")` throws → safeFetch + assertPublicUrl + page.goto all fail → the
// scrape comes back EMPTY and the script generator hallucinates a "false" product/video. Returns ""
// for empty input. Leaves an existing http(s):// scheme untouched.
export function normalizeUrl(raw) {
  const s = (raw ?? "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s.replace(/^\/+/, "")}`;
}

export async function assertPublicUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { throw new Error("invalid URL"); }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("only http(s) URLs allowed");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.local|.*\.internal|metadata\.google\.internal)$/i.test(host)) throw new Error("blocked host");
  if (net.isIP(host)) { if (isPrivateIP(host)) throw new Error("blocked private address"); return; }
  let addrs;
  try { addrs = await dns.lookup(host, { all: true }); } catch { throw new Error("DNS resolution failed"); }
  if (!addrs.length || addrs.some((a) => isPrivateIP(a.address))) throw new Error("blocked private address");
}

/**
 * Fetch that validates the target (and every redirect hop) is a public host before connecting.
 * Same signature surface as fetch() for the bits callers use: returns the final Response.
 */
export async function safeFetch(url, { headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS, maxRedirects = 4, method = "GET" } = {}) {
  let current = url;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicUrl(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res;
    try { res = await fetch(current, { method, headers, signal: controller.signal, redirect: "manual" }); }
    finally { clearTimeout(timer); }
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location");
      if (!loc) return res;
      current = new URL(loc, current).toString();
      continue;
    }
    return res;
  }
  throw new Error("too many redirects");
}
