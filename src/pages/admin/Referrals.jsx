import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { adminListReferrals } from "../../services/referrals/referralService";

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }) {
  const map = {
    pending:   { bg: "rgba(245,197,24,0.12)", color: "#f5c518", label: "Pending"   },
    qualified: { bg: "rgba(34,197,94,0.12)",  color: "#22c55e", label: "Qualified" },
  };
  const s = map[status] || map.pending;
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: s.bg, color: s.color }}>{s.label}</span>;
}

function StatCard({ value, label }) {
  return (
    <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 20px", flex: "1 1 160px" }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#e8e8f0" }}>{value}</div>
      <div style={{ fontSize: 12.5, color: "#888", marginTop: 3 }}>{label}</div>
    </div>
  );
}

export default function Referrals() {
  const [data, setData]   = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminListReferrals().then(setData).catch(e => setError(e.message));
  }, []);

  return (
    <AdminLayout>
      <div style={{ padding: "28px 32px", color: "#e8e8f0" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Referrals</h1>
        <p style={{ fontSize: 13.5, color: "#888", marginTop: 6 }}>
          Who referred whom and credits paid out (referee {data?.refereeBonus ?? 50} on signup · referrer {data?.referrerReward ?? 100} on first purchase).
        </p>

        {error && <div style={{ marginTop: 20, color: "#f87171" }}>{error}</div>}

        {data && (
          <>
            <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
              <StatCard value={data.totals.total}       label="Total referrals" />
              <StatCard value={data.totals.qualified}   label="Qualified (purchased)" />
              <StatCard value={data.totals.creditsPaid} label="Credits paid out" />
            </div>

            <div style={{ marginTop: 24, background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.4fr 0.7fr 0.8fr 1fr", gap: 12, padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <div>Referrer</div><div>Referee</div><div>Code</div><div>Status</div><div>Joined</div>
              </div>
              {data.referrals.length === 0 ? (
                <div style={{ padding: "32px 18px", textAlign: "center", color: "#666", fontSize: 14 }}>No referrals yet.</div>
              ) : data.referrals.map((r) => (
                <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1.4fr 0.7fr 0.8fr 1fr", gap: 12, padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13, alignItems: "center" }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.referrer_email}</div>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.referee_email}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", color: "#aaa" }}>{r.code}</div>
                  <div><StatusBadge status={r.status} /></div>
                  <div style={{ color: "#aaa" }}>{fmtDate(r.created_at)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
