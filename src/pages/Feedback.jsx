/**
 * Feedback.jsx
 * src/pages/Feedback.jsx
 */
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { serverFetch } from "../services/serverApi";
import { signOut } from "../services/auth/authService";
import { useCreditsStore } from "../store/useCreditsStore";

/* ── Sidebar icons ── */
const Icons = {
  folder:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>,
  gallery:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="9" height="9" rx="1.5"/><rect x="13" y="2" width="9" height="9" rx="1.5"/><rect x="2" y="13" width="9" height="9" rx="1.5"/><rect x="13" y="13" width="9" height="9" rx="1.5"/></svg>,
  box:         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  credits:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  settings:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  mic:         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0014 0"/><line x1="12" y1="21" x2="12" y2="17"/><line x1="9" y1="21" x2="15" y2="21"/></svg>,
  message:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
};

function NavItem({ icon, label, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className="w-full flex items-center gap-[10px] px-3 py-[7px] rounded-[8px] text-left border-0 transition-all cursor-pointer"
      style={{
        background: active ? "rgba(124,92,252,0.15)" : hov ? "rgba(255,255,255,0.04)" : "transparent",
        color:      active ? "#a78bfa" : hov ? "#d8d8ea" : "#9494a8",
      }}>
      <span style={{ width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span>
      <span className="text-[15px] font-medium flex-1" style={{ fontFamily: "'Syne',sans-serif" }}>{label}</span>
    </button>
  );
}

function NavSection({ title, children }) {
  return (
    <div className="mb-5">
      <div className="px-3 mb-1 text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>{title}</div>
      <div className="flex flex-col gap-[2px]">{children}</div>
    </div>
  );
}

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
  const navigate = useNavigate();
  const location = useLocation();
  const { balance, fetchCredits } = useCreditsStore();

  const [rating,     setRating]     = useState(0);
  const [hovered,    setHovered]    = useState(0);
  const [message,    setMessage]    = useState("");
  const [submitState, setSubmitState] = useState("idle"); // idle | submitting | success | error

  const [history,    setHistory]    = useState([]);
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
    <div className="flex min-h-screen text-[#e8e8f0]" style={{ background: "#0b0b10", fontFamily: "'Outfit', sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside className="flex flex-col shrink-0 border-r" style={{ width: 220, borderColor: "rgba(255,255,255,0.06)", background: "#0d0d14" }}>
        <div className="px-4 py-5 flex items-center gap-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <img src="/assets/images/logo.png" alt="Vidquence" style={{ height: 62, width: "auto" }} />
        </div>
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="flex flex-col gap-[2px] mb-5">
            <NavItem icon={Icons.folder}  label="Videos"     active={false}                                   onClick={() => navigate("/dashboard")} />
            <NavItem icon={Icons.gallery} label="Images"     active={false}                                   onClick={() => navigate("/image-generation")} />
            <NavItem icon={Icons.mic}     label="Transcribe" active={false}                                   onClick={() => navigate("/transcription")} />
            <NavItem icon={Icons.box}     label="Assets"     active={false}                                   onClick={() => navigate("/assets")} />
            <NavItem icon={Icons.credits} label="Credits"    active={false}                                   onClick={() => navigate("/credits")} />
          </div>
          <NavSection title="Account">
            <NavItem icon={Icons.settings} label="Settings" active={false}                                    onClick={() => navigate("/settings")} />
            <NavItem icon={Icons.message}  label="Feedback" active={location.pathname === "/feedback"}        onClick={() => {}} />
          </NavSection>
        </nav>
        <div className="px-3 py-4 border-t flex flex-col gap-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between px-3 py-[7px] rounded-[8px] text-[14px] font-mono"
            style={{ background: "rgba(255,255,255,0.04)", color: balance !== null && balance < 10 ? "#f97316" : "#7c5cfc" }}>
            <span>⚡ Credits</span>
            <span className="font-bold">{balance ?? "—"}</span>
          </div>
          <button
            onClick={async () => { await signOut(); navigate("/"); }}
            className="w-full flex items-center gap-2 px-3 py-[7px] rounded-[8px] text-[15px] border-0 cursor-pointer transition-all text-left"
            style={{ background: "transparent", color: "#f87171" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.08)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <span>↩</span> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
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
            <div style={{
              display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap",
            }}>
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
                {/* Stars */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 13, color: "#9494a8", marginBottom: 10 }}>How would you rate your experience?</div>
                  <StarRow
                    rating={rating} hovered={hovered} interactive
                    onSetRating={setRating} onHover={setHovered}
                  />
                  {(rating > 0 || hovered > 0) && (
                    <div style={{ fontSize: 13, color: "#f5c518", marginTop: 6 }}>
                      {["", "Poor", "Fair", "Good", "Great", "Excellent!"][(hovered || rating)]}
                    </div>
                  )}
                </div>

                {/* Textarea */}
                <div style={{ marginTop: 20, marginBottom: 20 }}>
                  <div style={{ fontSize: 13, color: "#9494a8", marginBottom: 8 }}>Tell us more (optional)</div>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="What's working well? What could be better?"
                    rows={4}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: "#0b0b10",
                      border: "1px solid rgba(255,255,255,0.08)",
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
                    border: "none", borderRadius: 10,
                    padding: "11px 28px",
                    fontSize: 15, fontWeight: 700,
                    color: rating ? "#0b0b10" : "#5a5010",
                    cursor: rating ? "pointer" : "default",
                    fontFamily: "'Outfit', sans-serif",
                    transition: "all 0.15s",
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
                  <div key={item.id} style={{
                    background: "#111118",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 12, padding: "16px 18px",
                  }}>
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
    </div>
  );
}
