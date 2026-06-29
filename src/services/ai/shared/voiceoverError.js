/**
 * voiceoverError.js
 * src/services/ai/shared/voiceoverError.js
 *
 * A typed, CLASSIFIED failure for the voiceover (TTS) stage. Our videos are voiceover-first, so a
 * TTS failure must NEVER silently produce an audioless video — it has to surface. This error lets
 * each caller react correctly:
 *   • manual single video  → if retryable, save as "incomplete / needs voiceover" (Finish later);
 *                            otherwise hard-fail + refund.
 *   • automation campaign  → pause the campaign(s); if `internal`, mask the real cause from the user
 *                            (show a generic "temporary internal issue", log the truth for admins).
 *
 * Axes:
 *   retryable — could a later attempt plausibly succeed (transient: quota/outage/network)?
 *   internal  — is the cause on OUR side (our API key / quota / credits / outage) rather than the
 *               user's input? Drives user-facing masking + pausing ALL of a user's campaigns.
 */
export class VoiceoverError extends Error {
  constructor(message, { cause = "unknown", retryable = true, internal = true, status = null } = {}) {
    super(message);
    this.name = "VoiceoverError";
    this.isVoiceoverError = true;
    this.cause = cause;          // quota | payment | auth | server | network | config | bad_request | unknown
    this.retryable = retryable;
    this.internal = internal;
    this.status = status;        // upstream HTTP status, if any
  }

  // Normalize any thrown value into a VoiceoverError (pass-through if already one). Unknown failures
  // at the TTS stage are treated as internal + retryable — the safe default (hold/pause, don't ship).
  static from(err) {
    if (err && err.isVoiceoverError) return err;
    return new VoiceoverError(err?.message || String(err), { cause: "unknown", retryable: true, internal: true });
  }
}

// Classify a non-2xx ElevenLabs HTTP response into a VoiceoverError. Quota exhaustion shows up as
// 429, and on some plans as 401 with a quota/credit detail in the body — treat both as retryable.
export function classifyTtsHttp(status, bodyText = "") {
  const body = (bodyText || "").toLowerCase();
  const quotaish = /quota|credit|insufficient|limit|exceeded/.test(body);
  if (status === 429 || (status === 401 && quotaish)) return new VoiceoverError(`TTS quota / rate limit (${status})`, { cause: "quota",       retryable: true,  internal: true,  status });
  if (status === 402)                                 return new VoiceoverError(`TTS payment required (${status})`,   { cause: "payment",     retryable: true,  internal: true,  status });
  if (status === 401 || status === 403)               return new VoiceoverError(`TTS auth failed (${status})`,       { cause: "auth",        retryable: false, internal: true,  status });
  if (status >= 500)                                  return new VoiceoverError(`TTS server error (${status})`,      { cause: "server",      retryable: true,  internal: true,  status });
  if (status === 400)                                 return new VoiceoverError(`TTS bad request (${status})`,       { cause: "bad_request", retryable: false, internal: false, status });
  return new VoiceoverError(`TTS error (${status})`, { cause: "unknown", retryable: true, internal: true, status });
}
