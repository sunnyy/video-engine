/**
 * Feedback.jsx
 */
import { useState, useEffect } from "react";
import { serverFetch } from "../services/serverApi";
import { useCreditsStore } from "../store/useCreditsStore";
import AppLayout from "../ui/AppLayout";

function StarRow({ rating, interactive, hovered, onSetRating, onHover }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={interactive ? () => onSetRating(n) : undefined}
          onMouseEnter={interactive ? () => onHover(n) : undefined}
          onMouseLeave={interactive ? () => onHover(0) : undefined}
          style={{
            background: "none", border: "none",
            padding: interactive ? "2px 3px" : 0,
            cursor: interactive ? "pointer" : "default",
            fontSize: interactive ? 28 : 18,
            color: n <= (hovered || rating) ? "#f5c518" : "#2a2a38",
            lineHeight: 1,
            transition: "color 0.1s",
          }}
        >★</button>
      ))}
    </div>
  );
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Feedback() {
  const { fetchCredits } = useCreditsStore();

  const [rating,      setRating]      = useState(0);
  const [hovered,     setHovered]     = useState(0);
  const [message,     setMessage]     = useState("");
  const [submitState, setSubmitState] = useState("idle");
  const [history,     setHistory]     = useState([]);
  const [histLoading, setHistLoading] = useState(true);

  useEffect(() => {
    fetchCredits();
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setHistLoading(true);
    try {
      const res  = await serverFetch("/api/feedback/my-history");
      const data = await res.json();
      setHistory(data.feedback || []);
    } catch {
      setHistory([]);
    } finally {
      setHistLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitState("submitting");
    try {
      const res = await serverFetch("/api/feedback", {
        method: "POST",
        body: JSON.stringify({ rating, message: message.trim(), context: "feedback_page" }),
      });
      if (!res.ok) throw new Error("Failed");
      setSubmitState("success");
      setRating(0);
      setMessage("");
      setTimeout(() => { setSubmitState("idle"); loadHistory(); }, 2000);
    } catch {
      setSubmitState("error");
    }
  };

  const avgRating = history.length
    ? (history.reduce((s, r) => s + r.rating, 0) / history.length).toFixed(1)
    : null;

  return (
    <AppLayout>
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto" style={{ fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px", width: "100%" }}>

          {/* Header */}
          <div style={{ marginBottom: 40 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: "#e8e8f0", margin: 0, marginBottom: 8 }}>Feedback</h1>
            <p style={{ fontSize: 16, color: "#9494a8", margin: 0 }}>
              Share your experience — it helps us build a better product.
            </p>
          </div>

          {/* Stats bar */}
          {history.length > 0 && (
            <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
              <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 20px", flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 12, color: "#55556a", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono',monospace" }}>Submissions</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#7c5cfc" }}>{history.length}</div>
              </div>
              <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 20px", flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 12, color: "#55556a", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono',monospace" }}>Avg Rating</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: "#f5c518" }}>{avgRating}</span>
                  <span style={{ fontSize: 18, color: "#f5c518" }}>★</span>
                </div>
              </div>
            </div>
          )}

          {/* Submit form */}
          <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "28px 24px", marginBottom: 32 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e8e8f0", marginBottom: 20 }}>
              {submitState === "success" ? "Thanks for your feedback! 🎉" : "Submit Feedback"}
            </div>

            {submitState === "success" ? (
              <div style={{ fontSize: 14, color: "#9494a8" }}>Your feedback has been recorded.</div>
            ) : (
              <>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 13, color: "#9494a8", marginBottom: 10 }}>How would you rate your experience?</div>
                  <StarRow rating={rating} hovered={hovered} interactive onSetRating={setRating} onHover={setHovered} />
                  {(rating > 0 || hovered > 0) && (
                    <div style={{ fontSize: 13, color: "#f5c518", marginTop: 6 }}>
                      {["", "Poor", "Fair", "Good", "Great", "Excellent!"][(hovered || rating)]}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 20, marginBottom: 20 }}>
                  <div style={{ fontSize: 13, color: "#9494a8", marginBottom: 8 }}>Tell us more (optional)</div>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="What's working well? What could be better?"
                    rows={4}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: "#0b0b10", border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10, padding: "10px 14px",
                      fontSize: 14, color: "#e8e8f0", resize: "vertical",
                      outline: "none", fontFamily: "'Outfit', sans-serif",
                    }}
                  />
                </div>

                {submitState === "error" && (
                  <div style={{ fontSize: 13, color: "#f87171", marginBottom: 12 }}>Something went wrong — please try again.</div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={!rating || submitState === "submitting"}
                  style={{
                    background: rating ? "#f5c518" : "rgba(245,197,24,0.1)",
                    border: "none", borderRadius: 10, padding: "11px 28px",
                    fontSize: 15, fontWeight: 700,
                    color: rating ? "#0b0b10" : "#5a5010",
                    cursor: rating ? "pointer" : "default",
                    fontFamily: "'Outfit', sans-serif", transition: "all 0.15s",
                  }}
                >
                  {submitState === "submitting" ? "Submitting…" : "Submit Feedback"}
                </button>
              </>
            )}
          </div>

          {/* History */}
          {histLoading ? (
            <div style={{ fontSize: 14, color: "#55556a" }}>Loading…</div>
          ) : history.length > 0 && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#9494a8", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'JetBrains Mono',monospace" }}>
                Your Past Feedback
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {history.map(item => (
                  <div key={item.id} style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: item.message ? 10 : 0 }}>
                      <StarRow rating={item.rating} interactive={false} hovered={0} />
                      <span style={{ fontSize: 12, color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>
                        {fmtDate(item.created_at)}
                      </span>
                    </div>
                    {item.message && (
                      <p style={{ margin: 0, fontSize: 14, color: "#c8c8d8", lineHeight: 1.6 }}>{item.message}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
