/**
 * StatusPage.jsx — PUBLIC system status page (/status). Shows a sanitized operational state per
 * component from /api/status. No auth, no internal detail (provider names, errors, counts).
 */
import { useEffect, useState } from "react";
import { serverFetch } from "../services/serverApi";

const C = { bg: "#090b11", surface: "#0e1018", border: "rgba(255,255,255,0.08)", text: "#e8eaf0", muted: "#8896a8", faint: "#55667a" };

export default function StatusPage() {
  const [data, setData] = useState(null);
  const [err, setErr]   = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () => serverFetch("/api/status").then((r) => r.json()).then((d) => { if (alive) { setData(d); setErr(false); } }).catch(() => { if (alive) setErr(true); });
    load();
    const t = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const allOk = data && data.status === "operational";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Outfit',sans-serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "64px 24px 80px" }}>
        <a href="/" style={{ color: C.faint, fontSize: 13, textDecoration: "none" }}>← Vidquence</a>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: "18px 0 6px" }}>System status</h1>

        {/* Overall banner */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderRadius: 14, marginTop: 18, marginBottom: 26,
          background: allOk ? "rgba(34,197,94,0.10)" : "rgba(248,113,113,0.10)",
          border: `1px solid ${allOk ? "rgba(34,197,94,0.35)" : "rgba(248,113,113,0.35)"}` }}>
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: allOk ? "#22c55e" : "#f87171", flexShrink: 0 }} />
          <span style={{ fontSize: 17, fontWeight: 700, color: allOk ? "#22c55e" : "#f87171" }}>
            {!data ? (err ? "Status unavailable" : "Checking…") : allOk ? "All systems operational" : "Some services are degraded"}
          </span>
        </div>

        {/* Components */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", background: C.surface }}>
          {(data?.components ?? []).map((c, i) => {
            const down = c.status === "down";
            return (
              <div key={c.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderTop: i ? `1px solid ${C.border}` : "none" }}>
                <span style={{ fontSize: 14.5, color: C.text }}>{c.name}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: down ? "#f87171" : "#22c55e" }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: down ? "#f87171" : "#22c55e" }} />
                  {down ? "Down" : "Operational"}
                </span>
              </div>
            );
          })}
          {data && (data.components?.length ?? 0) === 0 && (
            <div style={{ padding: "16px 18px", color: C.faint, fontSize: 14 }}>All systems operational.</div>
          )}
        </div>

        {data?.updatedAt && (
          <div style={{ marginTop: 16, fontSize: 12, color: C.faint }}>Updated {new Date(data.updatedAt).toLocaleString()}</div>
        )}
      </div>
    </div>
  );
}
