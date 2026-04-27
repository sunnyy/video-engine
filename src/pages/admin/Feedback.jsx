import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { serverFetch } from "../../services/serverApi";

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Stars({ rating }) {
  return (
    <span style={{ color: "#f5c518", letterSpacing: 2 }}>
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  );
}

export default function AdminFeedback() {
  const [items,   setItems]   = useState([]);
  const [avg,     setAvg]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [filter,  setFilter]  = useState(0);

  useEffect(() => {
    serverFetch("/api/admin/feedback")
      .then(r => r.json())
      .then(d => { setItems(d.feedback || []); setAvg(d.averageRating); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter ? items.filter(f => f.rating === filter) : items;

  return (
    <AdminLayout>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#e8e8f0", margin: 0 }}>User Feedback</h1>
          {avg !== null && (
            <p style={{ fontSize: 14, color: "#555", marginTop: 6 }}>
              Average rating: <span style={{ color: "#f5c518", fontWeight: 700 }}>{Number(avg).toFixed(1)} ★</span> across {items.length} submission{items.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Filter */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[0, 5, 4, 3, 2, 1].map(r => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              style={{
                padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                border: filter === r ? "none" : "1px solid rgba(255,255,255,0.1)",
                background: filter === r ? "#7c5cfc" : "transparent",
                color: filter === r ? "#fff" : "#666",
              }}
            >
              {r === 0 ? "All" : `${r} ★`}
            </button>
          ))}
        </div>

        {loading && <div style={{ color: "#555", fontSize: 14 }}>Loading…</div>}
        {error   && <div style={{ color: "#f87171", fontSize: 14 }}>✕ {error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div style={{ color: "#555", fontSize: 14 }}>No feedback yet.</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(f => (
            <div key={f.id} style={{
              background: "#111118", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12, padding: "16px 20px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <Stars rating={f.rating} />
                  <span style={{ fontSize: 12, color: "#555", marginLeft: 10 }}>{f.email}</span>
                </div>
                <span style={{ fontSize: 11, color: "#444" }}>{fmtDate(f.created_at)}</span>
              </div>
              {f.message && <p style={{ fontSize: 13, color: "#c0c0d0", margin: 0, lineHeight: 1.6 }}>{f.message}</p>}
              {f.context && <div style={{ fontSize: 11, color: "#444", marginTop: 6 }}>Context: {f.context}</div>}
            </div>
          ))}
        </div>

      </div>
    </AdminLayout>
  );
}
