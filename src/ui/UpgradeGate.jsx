import { useNavigate } from "react-router-dom";
import AppLayout from "./AppLayout";

/**
 * UpgradeGate — full-page "this feature needs Pro" panel, shown to Starter/no-plan users on
 * Pro/Agency-only pages (Automation, Video Clipping). Pairs with the server-side planGate so the
 * user sees a clear upgrade path instead of a 403.
 */
export default function UpgradeGate({ feature = "This feature", blurb }) {
  const navigate = useNavigate();
  return (
    <AppLayout>
      <div style={{ flex: 1, overflowY: "auto", background: "#0b0b10", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 460, textAlign: "center", background: "#13131e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "40px 32px" }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🔒</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#a78bfa", marginBottom: 8 }}>Pro &amp; Agency</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#e8eaf0", margin: "0 0 10px", fontFamily: "'Outfit',sans-serif" }}>{feature} is a Pro feature</h1>
          <p style={{ fontSize: 14, color: "#8896a8", lineHeight: 1.6, margin: "0 0 24px" }}>
            {blurb || `${feature} is available on the Pro and Agency plans. Upgrade to unlock it.`}
          </p>
          <button
            onClick={() => navigate("/credits")}
            style={{ background: "#7c5cfc", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}
          >
            See plans &amp; upgrade
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
