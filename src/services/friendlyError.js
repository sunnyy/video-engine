/**
 * friendlyError.js — turn an error into a message that's safe to show a user.
 *
 * Our own intentional, human messages (e.g. "Prompt is required") pass through unchanged.
 * Anything that looks like a raw internal/library error (PostgREST/Postgres, a vendor name,
 * a network/system code, a file path, or a stack trace) is replaced with a generic line so we
 * never leak the database, schema, vendors, or server paths to the browser.
 */

const INTERNAL_PATTERNS = [
  /coerce the result/i,                 // PostgREST .single() with no row
  /\bPGRST\d+/i,                        // PostgREST error codes
  /violates .* constraint|duplicate key|permission denied|relation .* does not exist|column .* does not exist|null value in column/i, // Postgres
  /\b(openai|anthropic|elevenlabs|razorpay|supabase|postgrest|puppeteer|ffmpeg|fal\.ai|pixabay|pexels|whisper|nano banana|pixverse)\b/i, // vendors
  /\b(ENOENT|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ECONNRESET|getaddrinfo|socket hang up)\b/i, // node/network
  /\n\s+at\s/,                          // stack trace
  /([A-Za-z]:\\|\/(app|home|usr|src|var|node_modules)\/)/, // file paths
];

export function friendlyError(err, fallback = "Something went wrong. Please try again.") {
  const msg = typeof err === "string" ? err : (err?.message || "");
  if (!msg) return fallback;
  if (msg.length > 200) return fallback;                 // long blob = almost certainly a dump
  if (INTERNAL_PATTERNS.some((re) => re.test(msg))) return fallback;
  return msg;                                            // clean, human message — safe to show
}
