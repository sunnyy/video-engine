import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotificationsStore } from "../store/useNotificationsStore";
import AppLayout from "../ui/AppLayout";

/**
 * Notifications — full history of in-app notifications for the user. The sidebar
 * bell shows the latest few; this is the complete list with mark-read controls.
 * Reads live from the same store (Supabase Realtime), so it stays in sync.
 */

const T = { bg: "#090b11", surface: "#0e1018", border: "rgba(255,255,255,0.08)", text: "#e8eaf0", muted: "#8896a8", faint: "#55667a" };
const SEV_COLOR = { info: "#7c5cfc", success: "#34d399", warning: "#f59e0b", error: "#ef4444" };

function relTime(dateStr) {
  const s = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (s < 60)     return "just now";
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function Notifications() {
  const navigate = useNavigate();
  const { items, loading, fetch, subscribe, unsubscribe, markOneRead, markEveryRead } = useNotificationsStore();
  const unread = items.filter(n => !n.read_at).length;

  useEffect(() => { fetch(); subscribe(); return () => unsubscribe(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onRowClick = (n) => {
    if (!n.read_at) markOneRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <AppLayout>
      <style>{`@keyframes pv-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
        <div style={{ padding: "40px 40px 80px", maxWidth: 760, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif", margin: 0 }}>Notifications</h1>
            {unread > 0 && (
              <button onClick={markEveryRead}
                style={{ padding: "7px 13px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${T.border}`, background: "rgba(124,92,252,0.14)", color: "#fff" }}>
                Mark all read
              </button>
            )}
          </div>

          {loading && items.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 0", color: T.faint }}>
              <div style={{ width: 16, height: 16, border: "2px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "pv-spin 0.8s linear infinite" }} />
              <span style={{ fontSize: 13 }}>Loading…</span>
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: T.faint, fontSize: 14 }}>You're all caught up — no notifications yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map(n => (
                <button key={n.id} onClick={() => onRowClick(n)} style={{
                  display: "flex", gap: 12, width: "100%", textAlign: "left", padding: "14px 16px", borderRadius: 12,
                  background: n.read_at ? T.surface : "rgba(124,92,252,0.08)",
                  border: `1px solid ${n.read_at ? T.border : "rgba(124,92,252,0.3)"}`,
                  cursor: n.link ? "pointer" : "default", fontFamily: "inherit",
                }}>
                  <span style={{ flexShrink: 0, fontSize: 20, lineHeight: 1.2 }}>{n.icon || "🔔"}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>{n.title}</span>
                    {n.body && <span style={{ display: "block", fontSize: 13, color: T.muted, marginTop: 3, lineHeight: 1.4 }}>{n.body}</span>}
                    <span style={{ display: "block", fontSize: 11.5, color: T.faint, marginTop: 6 }}>{relTime(n.created_at)}</span>
                  </span>
                  {!n.read_at && (
                    <span style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
                      <span role="button" title="Mark as read"
                        onClick={(e) => { e.stopPropagation(); markOneRead(n.id); }}
                        style={{ fontSize: 11.5, fontWeight: 700, color: "#7c5cfc", cursor: "pointer", whiteSpace: "nowrap" }}>
                        Mark read
                      </span>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: SEV_COLOR[n.severity] || "#7c5cfc" }} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
