import { useEffect, useState } from "react";
import AppLayout from "../ui/AppLayout";
import { showToast } from "../ui/Toast";
import { getMyReferrals } from "../services/referrals/referralService";

const T = { bg: "#090b11", surface: "#0e1018", surface2: "#14141e", border: "rgba(255,255,255,0.08)", text: "#e8eaf0", muted: "#8896a8", faint: "#55667a", accent: "#7c5cfc" };

function relDate(d) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Stat({ value, label }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px", flex: "1 1 150px" }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: T.text, fontFamily: "'JetBrains Mono',monospace" }}>{value}</div>
      <div style={{ fontSize: 12.5, color: T.muted, marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function Invite() {
  const [data, setData]   = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyReferrals().then(setData).catch(e => setError(e.message));
  }, []);

  const link = data ? `${window.location.origin}/?ref=${data.code}` : "";

  const copy = (text) => {
    navigator.clipboard?.writeText(text).then(
      () => showToast("Copied to clipboard", "success"),
      () => showToast("Couldn't copy — select and copy manually"),
    );
  };

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Vidquence", text: "Make videos with AI — join Vidquence.", url: link }); } catch { /* dismissed */ }
    } else {
      copy(link);
    }
  };

  return (
    <AppLayout>
      <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "40px 24px 64px" }}>

          <h1 style={{ fontSize: 26, fontWeight: 800, color: T.text, margin: 0 }}>Invite &amp; Earn</h1>
          <p style={{ fontSize: 14.5, color: T.muted, marginTop: 8, lineHeight: 1.6, maxWidth: 620 }}>
            Share your link. The first time a friend you invite subscribes to a plan, you earn{" "}
            <strong style={{ color: T.text }}>{data?.referrerReward ?? 100} credits</strong> — invite as many as you like.
          </p>

          {error && <div style={{ marginTop: 20, color: "#f87171", fontSize: 14 }}>{error}</div>}

          {data && (
            <>
              {/* Share link */}
              <div style={{ marginTop: 28, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: T.muted, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Your invite link</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <code style={{ flex: "1 1 260px", minWidth: 0, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13.5, padding: "12px 14px", overflowX: "auto", whiteSpace: "nowrap" }}>{link}</code>
                  <button onClick={() => copy(link)} style={{ padding: "12px 18px", borderRadius: 10, border: "none", background: T.accent, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Copy link</button>
                  <button onClick={share} style={{ padding: "12px 18px", borderRadius: 10, border: `1px solid ${T.border}`, background: "rgba(255,255,255,0.03)", color: T.text, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Share</button>
                </div>
                <div style={{ fontSize: 12.5, color: T.faint, marginTop: 12 }}>
                  Your code: <strong style={{ color: T.muted }}>{data.code}</strong>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
                <Stat value={data.stats.invited}    label="Friends joined" />
                <Stat value={data.stats.qualified}  label="Made a purchase" />
                <Stat value={data.stats.creditsEarned} label="Credits earned" />
              </div>

              {/* Referral list */}
              <div style={{ marginTop: 28 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 12 }}>Your referrals</div>
                {data.referrals.length === 0 ? (
                  <div style={{ background: T.surface, border: `1px dashed ${T.border}`, borderRadius: 14, padding: "32px 20px", textAlign: "center", color: T.faint, fontSize: 14 }}>
                    No one's joined yet. Share your link to start earning.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {data.referrals.map((r, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
                        <div style={{ fontSize: 13.5, color: T.text }}>
                          Friend joined <span style={{ color: T.faint }}>· {relDate(r.created_at)}</span>
                        </div>
                        {r.referrer_rewarded ? (
                          <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 11px", borderRadius: 99, background: "rgba(52,211,153,0.14)", color: "#34d399" }}>+{data.referrerReward} earned</span>
                        ) : (
                          <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 11px", borderRadius: 99, background: "rgba(245,197,24,0.12)", color: "#f5c518" }}>Pending purchase</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
