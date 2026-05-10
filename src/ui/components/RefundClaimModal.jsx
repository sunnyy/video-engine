import { useState, useEffect } from "react";
import { serverFetch } from "../../services/serverApi";

const INP = {
  background: "#0b0b10",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 13,
  color: "#e8e8f0",
  outline: "none",
  fontFamily: "'Outfit', sans-serif",
  width: "100%",
  boxSizing: "border-box",
};

export default function RefundClaimModal({ isOpen, onClose, service, projectId, creditsUsed }) {
  const [reason,        setReason]        = useState("");
  const [credits,       setCredits]       = useState(creditsUsed ?? 0);
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [limit,         setLimit]         = useState(null); // { count, limit, remaining, can_claim }
  const [state,         setState]         = useState("idle"); // idle | submitting | success | error
  const [errorMsg,      setErrorMsg]      = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setReason(""); setCredits(creditsUsed ?? 0); setScreenshotUrl("");
    setState("idle"); setErrorMsg("");
    serverFetch("/api/refund-claims/my/limit")
      .then(r => r.json())
      .then(d => setLimit(d))
      .catch(() => {});
  }, [isOpen, creditsUsed]);

  if (!isOpen) return null;

  const limitHit = limit && !limit.can_claim;
  const canSubmit = !limitHit && reason.trim() && credits > 0 && state === "idle";

  async function handleSubmit() {
    if (!canSubmit) return;
    setState("submitting"); setErrorMsg("");
    try {
      const res = await serverFetch("/api/refund-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service,
          project_id:        projectId || undefined,
          credits_requested: credits,
          reason:            reason.trim(),
          screenshot_url:    screenshotUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "LIMIT_REACHED") {
          setErrorMsg("You've used both refund claims for this month.");
        } else {
          setErrorMsg(data.error || "Something went wrong.");
        }
        setState("idle");
        return;
      }
      setState("success");
      setTimeout(() => onClose(), 3000);
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setState("idle");
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#0f0f18", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "28px 26px", width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 18, fontFamily: "'Outfit', sans-serif" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#e8e8f0", marginBottom: 4 }}>Report an Issue</div>
            <div style={{ fontSize: 12, color: "#9494a8", lineHeight: 1.5, maxWidth: 340 }}>
              If this result has a clear AI error, you can request a credit refund. Our team reviews every claim.
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#55556a", fontSize: 18, padding: 4, lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>

        {state === "success" ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e8e8f0", marginBottom: 6 }}>Claim submitted</div>
            <div style={{ fontSize: 13, color: "#9494a8" }}>We'll review it within 48 hours.</div>
          </div>
        ) : (
          <>
            {/* Monthly limit indicator */}
            {limit && (
              <div style={{ fontSize: 12, color: limitHit ? "#f87171" : "#9494a8", background: limitHit ? "rgba(248,113,113,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${limitHit ? "rgba(248,113,113,0.2)" : "rgba(255,255,255,0.06)"}`, borderRadius: 8, padding: "8px 12px" }}>
                {limitHit
                  ? "You've used both refund claims for this month. Claims reset on the 1st."
                  : limit.remaining === 1
                    ? "1 claim remaining this month."
                    : `${limit.remaining} of ${limit.limit} claims available this month.`
                }
              </div>
            )}

            {limitHit ? (
              <div style={{ textAlign: "center", padding: "8px 0 4px", fontSize: 13, color: "#9494a8" }}>
                Come back next month to submit a new claim.
              </div>
            ) : (
              <>
                {/* Reason */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#9494a8", letterSpacing: "0.04em" }}>Describe the issue</label>
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="e.g. distorted faces, wrong product, broken layout…"
                    rows={3}
                    style={{ ...INP, resize: "none" }}
                  />
                </div>

                {/* Credits */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#9494a8", letterSpacing: "0.04em" }}>Credits to refund</label>
                  <input
                    type="number"
                    min={1}
                    max={creditsUsed ?? undefined}
                    value={credits}
                    onChange={e => {
                      const v = parseInt(e.target.value) || 0;
                      setCredits(creditsUsed != null ? Math.min(v, creditsUsed) : v);
                    }}
                    style={INP}
                  />
                  {creditsUsed != null && (
                    <div style={{ fontSize: 11, color: "#55556a" }}>Max {creditsUsed} credits (what was charged for this generation)</div>
                  )}
                </div>

                {/* Screenshot URL */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#9494a8", letterSpacing: "0.04em" }}>Screenshot link <span style={{ fontWeight: 400, color: "#55556a" }}>(optional)</span></label>
                  <input
                    type="text"
                    value={screenshotUrl}
                    onChange={e => setScreenshotUrl(e.target.value)}
                    placeholder="Paste a screenshot link (optional)"
                    style={INP}
                  />
                </div>

                {/* Error */}
                {errorMsg && (
                  <div style={{ fontSize: 12, color: "#f87171" }}>{errorMsg}</div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  style={{
                    padding: "11px 20px",
                    background: canSubmit ? "#7c5cfc" : "rgba(124,92,252,0.2)",
                    color: canSubmit ? "#fff" : "#7c5cfc",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: canSubmit ? "pointer" : "not-allowed",
                    fontFamily: "'Outfit', sans-serif",
                    transition: "background 0.15s",
                  }}
                >
                  {state === "submitting" ? "Submitting…" : "Submit Claim"}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
