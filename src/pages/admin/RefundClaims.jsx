import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { serverFetch } from "../../services/serverApi";

const SERVICE_LABELS = {
  ai_video:         "AI Video",
  typography_video: "Typography Video",
  product_ad:       "Product Ad",
  ai_image:         "AI Images",
  product_poster:   "Product Poster",
};

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }) {
  const map = {
    pending:  { bg: "rgba(245,197,24,0.12)",  color: "#f5c518",  label: "Pending"  },
    approved: { bg: "rgba(34,197,94,0.12)",   color: "#22c55e",  label: "Approved" },
    rejected: { bg: "rgba(248,113,113,0.12)", color: "#f87171",  label: "Rejected" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: s.bg, color: s.color, letterSpacing: "0.04em" }}>
      {s.label}
    </span>
  );
}

function ClaimRow({ claim, onUpdate }) {
  const [expanded,       setExpanded]       = useState(false);
  const [rejecting,      setRejecting]      = useState(false);
  const [rejectReason,   setRejectReason]   = useState("");
  const [acting,         setActing]         = useState(false);
  const [err,            setErr]            = useState("");

  async function approve() {
    setActing(true); setErr("");
    try {
      const res  = await serverFetch(`/api/admin/refund-claims/${claim.id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      onUpdate(data.claim);
    } catch (e) { setErr(e.message); }
    setActing(false);
  }

  async function reject() {
    if (!rejectReason.trim()) return;
    setActing(true); setErr("");
    try {
      const res  = await serverFetch(`/api/admin/refund-claims/${claim.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejection_reason: rejectReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      onUpdate(data.claim);
    } catch (e) { setErr(e.message); }
    setActing(false);
  }

  return (
    <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>

      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>

        {/* User + service */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
            <StatusBadge status={claim.status} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa" }}>
              {SERVICE_LABELS[claim.service] || claim.service}
            </span>
            <span style={{ fontSize: 12, color: "#f5c518", fontWeight: 700 }}>
              {claim.credits_requested} cr
            </span>
          </div>
          <div style={{ fontSize: 11, color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>
            {claim.user_id}
          </div>
        </div>

        {/* Date */}
        <div style={{ fontSize: 11, color: "#55556a", whiteSpace: "nowrap", flexShrink: 0 }}>
          {fmtDate(claim.created_at)}
        </div>
      </div>

      {/* Reason */}
      <div style={{ fontSize: 13, color: "#c8c8d8", lineHeight: 1.6 }}>
        <span style={!expanded ? { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } : {}}>
          {claim.reason}
        </span>
        {claim.reason.length > 120 && (
          <button onClick={() => setExpanded(e => !e)} style={{ background: "none", border: "none", color: "#7c5cfc", fontSize: 11, cursor: "pointer", padding: "0 0 0 6px" }}>
            {expanded ? "less" : "more"}
          </button>
        )}
      </div>

      {/* Screenshot link + project */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {claim.screenshot_url && (
          <a href={claim.screenshot_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#7c5cfc", textDecoration: "none" }}>
            🖼 View screenshot ↗
          </a>
        )}
        {claim.project_id && (
          <span style={{ fontSize: 11, color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>
            project: {claim.project_id.slice(0, 8)}…
          </span>
        )}
      </div>

      {/* Rejection reason (if rejected) */}
      {claim.status === "rejected" && claim.rejection_reason && (
        <div style={{ fontSize: 12, color: "#f87171", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: 8, padding: "8px 12px" }}>
          Rejection reason: {claim.rejection_reason}
        </div>
      )}

      {/* Actions — pending only */}
      {claim.status === "pending" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={approve}
              disabled={acting || rejecting}
              style={{ padding: "7px 18px", background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: acting ? 0.5 : 1 }}
            >
              {acting && !rejecting ? "Approving…" : "✓ Approve"}
            </button>
            <button
              onClick={() => { setRejecting(r => !r); setRejectReason(""); setErr(""); }}
              disabled={acting}
              style={{ padding: "7px 18px", background: rejecting ? "rgba(248,113,113,0.12)" : "transparent", color: "#f87171", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              ✕ Reject
            </button>
          </div>

          {rejecting && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <input
                autoFocus
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                onKeyDown={e => e.key === "Enter" && reject()}
                placeholder="Rejection reason (required)…"
                style={{ flex: 1, padding: "8px 12px", background: "#0b0b10", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e8e8f0", fontSize: 12, outline: "none", fontFamily: "inherit" }}
              />
              <button
                onClick={reject}
                disabled={acting || !rejectReason.trim()}
                style={{ padding: "8px 16px", background: "#f87171", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", opacity: !rejectReason.trim() ? 0.4 : 1 }}
              >
                {acting ? "…" : "Confirm"}
              </button>
            </div>
          )}

          {err && <div style={{ fontSize: 12, color: "#f87171" }}>✕ {err}</div>}
        </div>
      )}
    </div>
  );
}

export default function RefundClaims() {
  const [claims,  setClaims]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [tab,     setTab]     = useState("pending"); // pending | approved | rejected

  useEffect(() => {
    setLoading(true);
    serverFetch(`/api/admin/refund-claims?status=${tab}&limit=100`)
      .then(r => r.json())
      .then(d => setClaims(d.claims || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [tab]);

  function handleUpdate(updated) {
    setClaims(prev => prev.map(c => c.id === updated.id ? updated : c));
  }

  const tabs = [
    { id: "pending",  label: "Pending"  },
    { id: "approved", label: "Approved" },
    { id: "rejected", label: "Rejected" },
  ];

  return (
    <AdminLayout>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#e8e8f0", margin: 0 }}>Refund Claims</h1>
          <p style={{ fontSize: 13, color: "#55556a", marginTop: 6, marginBottom: 0 }}>
            Review and approve or reject user credit refund requests.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 0 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "8px 20px", border: "none", borderRadius: "8px 8px 0 0", cursor: "pointer", fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
                background: tab === t.id ? "rgba(124,92,252,0.15)" : "transparent",
                color: tab === t.id ? "#a78bfa" : "#55556a",
                borderBottom: tab === t.id ? "2px solid #7c5cfc" : "2px solid transparent",
                fontFamily: "'Outfit',sans-serif",
                transition: "all 0.15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && <div style={{ color: "#55556a", fontSize: 14 }}>Loading…</div>}
        {error   && <div style={{ color: "#f87171", fontSize: 14 }}>✕ {error}</div>}

        {!loading && !error && claims.length === 0 && (
          <div style={{ color: "#55556a", fontSize: 14, padding: "32px 0" }}>No {tab} claims.</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {claims.map(c => (
            <ClaimRow key={c.id} claim={c} onUpdate={handleUpdate} />
          ))}
        </div>

      </div>
    </AdminLayout>
  );
}
