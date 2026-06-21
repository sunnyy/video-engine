/**
 * social/crypto.js — token encryption at rest (AES-256-GCM) + signed OAuth state.
 *
 * Key comes from TOKEN_ENCRYPTION_KEY (64-char hex = raw 32 bytes, or any string which
 * is hashed to 32 bytes). The key is read lazily so the app boots without it; it's only
 * required when a user actually connects an account.
 */
import crypto from "crypto";

function getKey() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("TOKEN_ENCRYPTION_KEY is required to store/read social tokens");
  return (raw.length === 64 && /^[0-9a-f]+$/i.test(raw))
    ? Buffer.from(raw, "hex")
    : crypto.createHash("sha256").update(raw).digest();
}

export function encrypt(plain) {
  if (plain == null) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  return `${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${enc.toString("base64")}`;
}

export function decrypt(blob) {
  if (!blob) return null;
  const [ivB, tagB, dataB] = String(blob).split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB, "base64")), decipher.final()]).toString("utf8");
}

/* ── Signed OAuth state — CSRF protection + carries userId/platform across the redirect
   (the callback has no auth header, so identity must travel in the state). ── */
export function signState(payload) {
  const body = Buffer.from(JSON.stringify({ ...payload, ts: Date.now() })).toString("base64url");
  const sig  = crypto.createHmac("sha256", getKey()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyState(state, maxAgeMs = 10 * 60 * 1000) {
  if (!state || !state.includes(".")) return null;
  const [body, sig] = state.split(".");
  const expect = crypto.createHmac("sha256", getKey()).update(body).digest("base64url");
  if (sig !== expect) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return (Date.now() - (data.ts || 0) > maxAgeMs) ? null : data;
  } catch { return null; }
}
