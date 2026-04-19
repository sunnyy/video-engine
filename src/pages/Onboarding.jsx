import { useState } from "react";
import { completeOnboarding } from "../services/profile/profileService";

const NICHES = [
  { emoji: "🎬", label: "Entertainment" }, { emoji: "🎮", label: "Gaming" },
  { emoji: "💹", label: "Finance" }, { emoji: "🕉️", label: "Spiritual" },
  { emoji: "🍜", label: "Food" }, { emoji: "⚡", label: "Sports" },
  { emoji: "🤖", label: "Tech" }, { emoji: "✨", label: "Lifestyle" },
  { emoji: "📚", label: "Education" }, { emoji: "🌍", label: "Travel" },
  { emoji: "💪", label: "Health" }, { emoji: "😂", label: "Comedy" },
  { emoji: "📊", label: "Business" }, { emoji: "🔥", label: "Motivational" },
  { emoji: "📰", label: "News" }, { emoji: "🎵", label: "Music" },
  { emoji: "✦", label: "Skincare" },
];

const GOALS = [
  { emoji: "🚀", label: "Grow My Audience",          desc: "I want more followers and views" },
  { emoji: "💰", label: "Sell Products or Services",  desc: "I want to drive sales and leads" },
  { emoji: "🎓", label: "Educate and Inform",         desc: "I want to share knowledge and value" },
  { emoji: "🎭", label: "Entertain People",           desc: "I want to make content people enjoy" },
];

export default function Onboarding({ userId, onComplete }) {
  const [step,   setStep]   = useState(1);
  const [niches, setNiches] = useState([]);
  const [goal,   setGoal]   = useState(null);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  const handleSkip = async () => {
    // Best-effort save on skip — dismiss regardless
    try { await completeOnboarding(userId, { niche: niches.length ? niches : null, goal: goal || null }); } catch {}
    onComplete();
  };

  const handleNext = async () => {
    if (step === 1) { setStep(2); return; }
    setSaving(true);
    setError(null);
    try {
      await completeOnboarding(userId, { niche: niches.length ? niches : null, goal });
      onComplete();
    } catch {
      setError("Failed to save — please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(11,11,16,0.97)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, width: "100%", maxWidth: 600, padding: "48px 40px" }}>

        {/* Progress bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 36 }}>
          {[1, 2].map(s => (
            <div key={s} style={{ height: 3, flex: 1, borderRadius: 2, background: s <= step ? "#f5c518" : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />
          ))}
        </div>

        {step === 1 && (
          <>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#f5c518", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Step 1 of 2</div>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, color: "#e8e8f0", marginBottom: 8, letterSpacing: -0.5 }}>What will you create?</h2>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, color: "#8888a8", marginBottom: 28 }}>Pick all niches that apply. You can always change this later.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 36 }}>
              {NICHES.map(n => {
                const selected = niches.includes(n.label);
                const toggle = () => setNiches(prev => selected ? prev.filter(x => x !== n.label) : [...prev, n.label]);
                return (
                <div key={n.label} onClick={toggle}
                  style={{
                    background: selected ? "rgba(245,197,24,0.1)" : "#0b0b10",
                    border: `1px solid ${selected ? "#f5c518" : "rgba(255,255,255,0.07)"}`,
                    borderRadius: 10, padding: "14px 8px", cursor: "pointer", textAlign: "center", transition: "all 0.2s",
                  }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{n.emoji}</div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, color: selected ? "#f5c518" : "#8888a8", fontWeight: 600 }}>{n.label}</div>
                </div>
                );
              })}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#f5c518", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Step 2 of 2</div>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, color: "#e8e8f0", marginBottom: 8, letterSpacing: -0.5 }}>What's your goal?</h2>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, color: "#8888a8", marginBottom: 28 }}>This helps us personalize your experience.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
              {GOALS.map(g => (
                <div key={g.label} onClick={() => setGoal(g.label)}
                  style={{
                    background: goal === g.label ? "rgba(245,197,24,0.08)" : "#0b0b10",
                    border: `1px solid ${goal === g.label ? "#f5c518" : "rgba(255,255,255,0.07)"}`,
                    borderRadius: 12, padding: "18px 20px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 16, transition: "all 0.2s",
                  }}>
                  <span style={{ fontSize: 28, flexShrink: 0 }}>{g.emoji}</span>
                  <div>
                    <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700, color: goal === g.label ? "#f5c518" : "#e8e8f0", marginBottom: 3 }}>{g.label}</div>
                    <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: "#8888a8" }}>{g.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Actions */}
        {error && (
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: "#f87171", marginBottom: 16, textAlign: "center" }}>{error}</div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={handleSkip}
            style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: "#8888a8", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            Skip for now
          </button>
          <button onClick={handleNext} disabled={saving}
            style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 700, color: "#0b0b10", background: "#f5c518", border: "none", borderRadius: 8, padding: "12px 28px", cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : step === 1 ? "Next →" : error ? "Retry →" : "Finish →"}
          </button>
        </div>

      </div>
    </div>
  );
}
