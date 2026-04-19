/**
 * FeedbackModal.jsx
 * src/ui/components/FeedbackModal.jsx
 */
import { useState } from "react";
import { serverFetch } from "../../services/serverApi";

function Star({ filled, hovered, onClick, onEnter, onLeave }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        background: "none",
        border: "none",
        padding: "2px 4px",
        cursor: "pointer",
        fontSize: 32,
        color: filled || hovered ? "#f5c518" : "#2a2a38",
        transition: "color 0.1s",
        lineHeight: 1,
      }}
    >★</button>
  );
}

export default function FeedbackModal({ onClose, context = "general" }) {
  const [rating,  setRating]  = useState(0);
  const [hovered, setHovered] = useState(0);
  const [message, setMessage] = useState("");
  const [state,   setState]   = useState("idle"); // idle | submitting | success | error

  const handleSubmit = async () => {
    if (!rating) return;
    setState("submitting");
    try {
      const res = await serverFetch("/api/feedback", {
        method: "POST",
        body: JSON.stringify({ rating, message: message.trim(), context }),
      });
      if (!res.ok) throw new Error("Failed");
      setState("success");
      setTimeout(() => onClose(), 2000);
    } catch {
      setState("error");
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#0f0f18",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: "32px 28px",
        width: "100%",
        maxWidth: 400,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        fontFamily: "'Outfit', sans-serif",
      }}>
        {state === "success" ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#e8e8f0" }}>Thanks for your feedback!</div>
            <div style={{ fontSize: 14, color: "#9494a8", marginTop: 6 }}>Closing in a moment…</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#e8e8f0", marginBottom: 4 }}>
                  How's your experience?
                </div>
                <div style={{ fontSize: 13, color: "#9494a8" }}>
                  Your feedback helps us improve.
                </div>
              </div>
              <button
                onClick={onClose}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#55556a", fontSize: 18, padding: 4, lineHeight: 1 }}
              >✕</button>
            </div>

            {/* Stars */}
            <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <Star
                  key={n}
                  filled={n <= rating}
                  hovered={n <= hovered}
                  onClick={() => setRating(n)}
                  onEnter={() => setHovered(n)}
                  onLeave={() => setHovered(0)}
                />
              ))}
            </div>

            {/* Label */}
            {(rating > 0 || hovered > 0) && (
              <div style={{ textAlign: "center", fontSize: 13, color: "#f5c518", marginTop: -12 }}>
                {["", "Poor", "Fair", "Good", "Great", "Excellent!"][(hovered || rating)]}
              </div>
            )}

            {/* Textarea */}
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Tell us more (optional)"
              rows={3}
              style={{
                background: "#0b0b10",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 14,
                color: "#e8e8f0",
                resize: "none",
                outline: "none",
                fontFamily: "'Outfit', sans-serif",
                width: "100%",
                boxSizing: "border-box",
              }}
            />

            {state === "error" && (
              <div style={{ fontSize: 13, color: "#f87171", textAlign: "center" }}>
                Something went wrong. Please try again.
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!rating || state === "submitting"}
              style={{
                background: rating ? "#f5c518" : "rgba(245,197,24,0.15)",
                border: "none",
                borderRadius: 10,
                padding: "12px 0",
                fontSize: 15,
                fontWeight: 700,
                color: rating ? "#0b0b10" : "#7a7020",
                cursor: rating ? "pointer" : "default",
                fontFamily: "'Outfit', sans-serif",
                transition: "all 0.15s",
              }}
            >
              {state === "submitting" ? "Submitting…" : "Submit Feedback"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
