/**
 * AdminDashboard.jsx
 * Overview — key metrics, daily project chart, recent activity.
 */
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import AdminLayout from "./AdminLayout";

const sb = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/* ── helpers ── */
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildDailyBuckets(rows, days = 14) {
  const buckets = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = 0;
  }
  (rows || []).forEach((r) => {
    const key = r.created_at?.slice(0, 10);
    if (key in buckets) buckets[key]++;
  });
  return Object.entries(buckets).map(([date, value]) => ({
    label: new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value,
  }));
}

/* ── sub-components ── */
function StatCard({ label, value, sub, color = "#7c5cfc" }) {
  return (
    <div className="bg-[#111118] border border-white/[0.08] rounded-2xl px-7 py-6 flex flex-col gap-2 min-w-[160px] flex-1">
      <div className="text-base text-[#888]">{label}</div>
      <div className="text-5xl font-bold leading-none" style={{ color }}>{value ?? "—"}</div>
      {sub && <div className="text-sm text-[#666]">{sub}</div>}
    </div>
  );
}

function BarChart({ data, color = "#7c5cfc", height = 120 }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-[3px]" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center flex-1 gap-1 h-full justify-end">
          <div
            className="w-full rounded-t-sm transition-all duration-300"
            style={{
              height: `${Math.max((d.value / max) * (height - 20), d.value > 0 ? 3 : 0)}px`,
              background: d.value > 0 ? color : "rgba(255,255,255,0.04)",
            }}
          />
          <div className="text-[9px] text-[#444] whitespace-nowrap leading-none">
            {d.label.split(" ")[1]}
          </div>
        </div>
      ))}
    </div>
  );
}

function PillBar({ items }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="text-sm text-[#aaa] w-24 shrink-0 truncate">{item.label}</div>
          <div className="flex-1 bg-white/[0.05] rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(item.value / total) * 100}%`, background: item.color || "#7c5cfc" }}
            />
          </div>
          <div className="text-sm text-[#666] w-8 text-right">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

/* ── main ── */
export default function AdminDashboard() {
  const [stats, setStats] = useState({
    projects: null,
    users: null,
    creditsConsumed: null,
    renderedToday: null,
  });
  const [daily, setDaily]               = useState([]);
  const [recent, setRecent]             = useState([]);
  const [orientations, setOrientations] = useState([]);
  const [recentTx, setRecentTx]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [txPage, setTxPage]             = useState(0);
  const TX_PER_PAGE = 5;

  useEffect(() => {
    async function load() {
      try {
        const since14    = daysAgo(14);
        const todayStart = daysAgo(0);

        const [
          { count: projectCount },
          { count: userCount },
          { data: recentProjects },
          { data: dailyProjects },
          { data: credits },
          { data: recentTransactions },
          { data: orientationData },
          { count: renderedToday },
        ] = await Promise.all([
          sb.from("projects").select("*", { count: "exact", head: true }),
          sb.from("user_credits").select("*", { count: "exact", head: true }),
          sb.from("projects").select("id, name, created_at, user_id, orientation, mode").order("created_at", { ascending: false }).limit(12),
          sb.from("projects").select("created_at").gte("created_at", since14),
          sb.from("user_credits").select("balance, lifetime_credits"),
          sb.from("credit_transactions").select("amount, type, created_at, user_id").order("created_at", { ascending: false }).limit(50),
          sb.from("projects").select("orientation"),
          sb.from("projects").select("*", { count: "exact", head: true }).gte("last_rendered_at", todayStart),
        ]);

        const totalConsumed = (credits || []).reduce((s, r) => s + (r.lifetime_credits || 0), 0);

        const orientCounts = {};
        (orientationData || []).forEach((r) => {
          const k = r.orientation || "unknown";
          orientCounts[k] = (orientCounts[k] || 0) + 1;
        });

        setStats({
          projects:        projectCount ?? 0,
          users:           userCount ?? 0,
          creditsConsumed: totalConsumed,
          renderedToday:   renderedToday ?? 0,
        });

        setDaily(buildDailyBuckets(dailyProjects));
        setRecent(recentProjects || []);
        setRecentTx(recentTransactions || []);
        setOrientations(
          [
            { label: "Portrait",  value: orientCounts["portrait"]  || 0, color: "#7c5cfc" },
            { label: "Landscape", value: orientCounts["landscape"] || 0, color: "#3b9eff" },
            { label: "Square",    value: orientCounts["square"]    || 0, color: "#f97316" },
            { label: "Unknown",   value: orientCounts["unknown"]   || 0, color: "#555" },
          ].filter((o) => o.value > 0)
        );
      } catch (e) {
        console.error("[admin] Dashboard load failed:", e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const txColor = (type) => {
    if (type === "debit") return "#f97316";
    if (type === "credit" || type === "purchase") return "#22c55e";
    return "#888";
  };

  return (
    <AdminLayout>
      <h1 className="text-4xl font-bold mb-1">Overview</h1>
      <p className="text-[#888] text-lg mb-8">Platform health at a glance.</p>

      {loading ? (
        <div className="text-[#666] text-xl animate-pulse">Loading…</div>
      ) : (
        <>
          {/* Stat row */}
          <div className="flex gap-4 mb-10 flex-wrap">
            <StatCard label="Total Projects"   value={stats.projects}                        color="#7c5cfc" />
            <StatCard label="Total Users"      value={stats.users}                           color="#3b9eff" />
            <StatCard label="Credits Consumed" value={stats.creditsConsumed?.toLocaleString()} color="#f97316" sub="all-time lifetime" />
            <StatCard label="Rendered Today"   value={stats.renderedToday}                   color="#22c55e" />
          </div>

          {/* Daily chart + orientation */}
          <div className="flex gap-6 mb-10 flex-wrap">
            <div className="bg-[#111118] border border-white/[0.08] rounded-2xl p-6 flex-1 min-w-[280px]">
              <div className="text-lg font-semibold text-[#ccc] mb-1">Projects — last 14 days</div>
              <div className="text-sm text-[#666] mb-5">
                {daily.reduce((s, d) => s + d.value, 0)} new projects
              </div>
              <BarChart data={daily} color="#7c5cfc" height={130} />
            </div>

            {orientations.length > 0 && (
              <div className="bg-[#111118] border border-white/[0.08] rounded-2xl p-6 w-[260px] shrink-0">
                <div className="text-lg font-semibold text-[#ccc] mb-1">Orientation Split</div>
                <div className="text-sm text-[#666] mb-5">all projects</div>
                <PillBar items={orientations} />
              </div>
            )}
          </div>

          {/* Recent projects + recent transactions */}
          <div className="flex gap-6 flex-wrap">
            <div className="flex-1 min-w-[320px]">
              <div className="text-xl font-semibold text-[#ccc] mb-4">Recent Projects</div>
              <table className="w-full border-collapse text-base">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[#666] text-left text-sm">
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">User</th>
                    <th className="px-3 py-2 font-medium">Mode</th>
                    <th className="px-3 py-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((p) => (
                    <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-3 py-3 text-[#e8e8f0] max-w-[180px] truncate">{p.name || "Untitled"}</td>
                      <td className="px-3 py-3 text-[#666] font-mono text-sm">{p.user_id?.slice(0, 8)}…</td>
                      <td className="px-3 py-3">
                        {p.mode && (
                          <span className="text-xs bg-white/[0.06] text-[#aaa] px-2 py-0.5 rounded-full">{p.mode}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-[#666] text-sm whitespace-nowrap">{fmtDate(p.created_at)}</td>
                    </tr>
                  ))}
                  {recent.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-6 text-[#444]">No projects yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {recentTx.length > 0 && (
              <div className="w-[300px] shrink-0">
                <div className="text-xl font-semibold text-[#ccc] mb-4">Recent Transactions</div>
                <div className="flex flex-col gap-2">
                  {recentTx
                    .slice(txPage * TX_PER_PAGE, (txPage + 1) * TX_PER_PAGE)
                    .map((tx, i) => (
                    <div key={i} className="flex items-center justify-between bg-[#111118] border border-white/[0.06] rounded-xl px-4 py-3">
                      <div>
                        <div className="text-sm text-[#aaa] font-mono">{tx.user_id?.slice(0, 8)}…</div>
                        <div className="text-xs text-[#555] mt-0.5">{fmtDate(tx.created_at)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-semibold" style={{ color: txColor(tx.type) }}>
                          {tx.type === "debit" ? "−" : "+"}{Math.abs(tx.amount)}
                        </div>
                        <div className="text-xs text-[#555]">{tx.type}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {Math.ceil(recentTx.length / TX_PER_PAGE) > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <button
                      onClick={() => setTxPage(p => Math.max(0, p - 1))}
                      disabled={txPage === 0}
                      className="px-2 py-1 rounded text-sm text-[#666] hover:text-[#aaa] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ←
                    </button>
                    <span className="text-xs text-[#555]">
                      {txPage + 1} / {Math.ceil(recentTx.length / TX_PER_PAGE)}
                    </span>
                    <button
                      onClick={() => setTxPage(p => Math.min(Math.ceil(recentTx.length / TX_PER_PAGE) - 1, p + 1))}
                      disabled={txPage >= Math.ceil(recentTx.length / TX_PER_PAGE) - 1}
                      className="px-2 py-1 rounded text-sm text-[#666] hover:text-[#aaa] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  );
}
