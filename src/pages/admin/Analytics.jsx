/**
 * Analytics.jsx
 * Generation volume, credit consumption trends, top users.
 */
import { useEffect, useState } from "react";
import { supabase as sb } from "../../lib/supabase";
import { serverFetch } from "../../services/serverApi";
import AdminLayout from "./AdminLayout";

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

function buildDailyBuckets(rows, field, days = 30) {
  const buckets = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = 0;
  }
  (rows || []).forEach((r) => {
    const key = (r[field] || "")?.slice(0, 10);
    if (key in buckets) buckets[key]++;
  });
  return Object.entries(buckets).map(([date, value]) => ({
    label: new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value,
  }));
}

function buildCreditBuckets(rows, days = 30) {
  const buckets = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = 0;
  }
  (rows || []).forEach((r) => {
    if (r.type !== "debit") return;
    const key = r.created_at?.slice(0, 10);
    if (key in buckets) buckets[key] += Math.abs(r.amount || 0);
  });
  return Object.entries(buckets).map(([date, value]) => ({
    label: new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value,
  }));
}

/* ── sub-components ── */
function BarChart({ data, color = "#7c5cfc", height = 110, showLabel = true }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-[2px]" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center flex-1 gap-1 h-full justify-end" title={`${d.label}: ${d.value}`}>
          <div
            className="w-full rounded-t-sm transition-all duration-300"
            style={{
              height: `${Math.max((d.value / max) * (height - 18), d.value > 0 ? 3 : 0)}px`,
              background: d.value > 0 ? color : "rgba(255,255,255,0.04)",
            }}
          />
          {showLabel && (
            <div className="text-[8px] text-[#444] whitespace-nowrap leading-none">
              {d.label.split(" ")[1]}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PillBar({ items }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <div className="flex flex-col gap-3 mt-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="text-sm text-[#aaa] w-28 shrink-0 truncate">{item.label}</div>
          <div className="flex-1 bg-white/[0.05] rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(item.value / total) * 100}%`, background: item.color || "#7c5cfc" }}
            />
          </div>
          <div className="text-sm text-[#666] w-10 text-right">{item.value}</div>
          <div className="text-xs text-[#444] w-10 text-right">{Math.round((item.value / total) * 100)}%</div>
        </div>
      ))}
    </div>
  );
}

function SectionCard({ title, sub, children }) {
  return (
    <div className="bg-[#111118] border border-white/[0.08] rounded-2xl p-6">
      <div className="text-lg font-semibold text-[#ccc] mb-0.5">{title}</div>
      {sub && <div className="text-sm text-[#666] mb-5">{sub}</div>}
      {children}
    </div>
  );
}

const MODE_COLORS = ["#7c5cfc", "#3b9eff", "#f97316", "#22c55e", "#e879f9", "#facc15", "#64748b"];

/* ── main ── */
export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [projectsDaily, setProjectsDaily]   = useState([]);
  const [creditsDaily, setCreditsDaily]     = useState([]);
  const [modeBreakdown, setModeBreakdown]   = useState([]);
  const [topUsers, setTopUsers]             = useState([]);
  const [txTypes, setTxTypes]               = useState([]);
  const [totals, setTotals]                 = useState({ projects30: 0, credits30: 0, debits: 0, purchases: 0 });
  const [feedbackData, setFeedbackData]     = useState({ feedback: [], averageRating: 0 });

  useEffect(() => {
    async function load() {
      try {
        const since30 = daysAgo(30);

        const [
          { data: projects30 },
          { data: transactions30 },
          { data: allModes },
          { data: allTransactions },
        ] = await Promise.all([
          sb.from("projects").select("created_at, user_id").gte("created_at", since30),
          sb.from("credit_transactions").select("amount, type, created_at, user_id").gte("created_at", since30),
          sb.from("projects").select("mode"),
          sb.from("credit_transactions").select("type"),
        ]);

        // Daily buckets
        setProjectsDaily(buildDailyBuckets(projects30, "created_at", 30));
        setCreditsDaily(buildCreditBuckets(transactions30, 30));

        // Mode breakdown
        const modeCounts = {};
        (allModes || []).forEach((r) => {
          const k = r.mode || "unknown";
          modeCounts[k] = (modeCounts[k] || 0) + 1;
        });
        setModeBreakdown(
          Object.entries(modeCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([label, value], i) => ({ label, value, color: MODE_COLORS[i % MODE_COLORS.length] }))
        );

        // Top users by project count (last 30 days)
        const userCounts = {};
        (projects30 || []).forEach((r) => {
          userCounts[r.user_id] = (userCounts[r.user_id] || 0) + 1;
        });
        setTopUsers(
          Object.entries(userCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([uid, count]) => ({ uid, count }))
        );

        // Tx type breakdown
        const typeCounts = {};
        (allTransactions || []).forEach((r) => {
          typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
        });
        setTxTypes(
          Object.entries(typeCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([label, value], i) => ({ label, value, color: MODE_COLORS[i] }))
        );

        // Totals
        const credits30Used = (transactions30 || [])
          .filter((t) => t.type === "debit")
          .reduce((s, t) => s + Math.abs(t.amount || 0), 0);

        setTotals({
          projects30: (projects30 || []).length,
          credits30:  credits30Used,
          debits:     typeCounts["debit"]    || 0,
          purchases:  typeCounts["purchase"] || typeCounts["credit"] || 0,
        });
        // Feedback
        try {
          const fbRes  = await serverFetch("/api/admin/feedback");
          const fbData = await fbRes.json();
          setFeedbackData(fbData);
        } catch { /* non-fatal */ }

      } catch (e) {
        console.error("[admin] Analytics load failed:", e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <AdminLayout>
      <h1 className="text-4xl font-bold mb-1">Analytics</h1>
      <p className="text-[#888] text-lg mb-8">Last 30 days — generation volume, credits, usage patterns.</p>

      {loading ? (
        <div className="text-[#666] text-xl animate-pulse">Loading…</div>
      ) : (
        <>
          {/* Summary row */}
          <div className="flex gap-4 mb-8 flex-wrap">
            {[
              { label: "Projects Created",  value: totals.projects30, color: "#7c5cfc" },
              { label: "Credits Consumed",  value: totals.credits30.toLocaleString(),  color: "#f97316" },
              { label: "Debit Events",      value: totals.debits,     color: "#e879f9" },
              { label: "Purchase Events",   value: totals.purchases,  color: "#22c55e" },
            ].map((s) => (
              <div key={s.label} className="bg-[#111118] border border-white/[0.08] rounded-2xl px-7 py-5 flex flex-col gap-1 flex-1 min-w-[140px]">
                <div className="text-sm text-[#888]">{s.label}</div>
                <div className="text-4xl font-bold leading-none" style={{ color: s.color }}>{s.value ?? "—"}</div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="flex gap-6 mb-8 flex-wrap">
            <SectionCard title="Projects per Day" sub="last 30 days">
              <BarChart data={projectsDaily} color="#7c5cfc" height={120} />
            </SectionCard>

            <SectionCard title="Credits Consumed per Day" sub="debit transactions only">
              <BarChart data={creditsDaily} color="#f97316" height={120} />
            </SectionCard>
          </div>

          {/* Breakdowns row */}
          <div className="flex gap-6 flex-wrap">
            {modeBreakdown.length > 0 && (
              <SectionCard title="Mode Breakdown" sub="all projects by generation mode">
                <PillBar items={modeBreakdown} />
              </SectionCard>
            )}

            {txTypes.length > 0 && (
              <SectionCard title="Transaction Types" sub="all time distribution">
                <PillBar items={txTypes} />
              </SectionCard>
            )}

            {topUsers.length > 0 && (
              <div className="bg-[#111118] border border-white/[0.08] rounded-2xl p-6 flex-1 min-w-[260px]">
                <div className="text-lg font-semibold text-[#ccc] mb-0.5">Top Users</div>
                <div className="text-sm text-[#666] mb-4">by projects created (last 30 days)</div>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[#555] text-left">
                      <th className="py-1.5 font-medium">#</th>
                      <th className="py-1.5 font-medium">User ID</th>
                      <th className="py-1.5 font-medium text-right">Projects</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topUsers.map((u, i) => (
                      <tr key={u.uid} className="border-b border-white/[0.04]">
                        <td className="py-2.5 text-[#555]">{i + 1}</td>
                        <td className="py-2.5 font-mono text-[#aaa]">{u.uid?.slice(0, 12)}…</td>
                        <td className="py-2.5 text-right text-[#7c5cfc] font-semibold">{u.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Empty state */}
          {modeBreakdown.length === 0 && topUsers.length === 0 && (
            <div className="text-[#444] text-lg mt-4">No data yet — create some projects first.</div>
          )}

          {/* Feedback section */}
          <div className="mt-8">
            <SectionCard title="User Feedback" sub={`${feedbackData.feedback.length} submission${feedbackData.feedback.length !== 1 ? "s" : ""}`}>
              {feedbackData.feedback.length === 0 ? (
                <div className="text-[#444] text-sm">No feedback submitted yet.</div>
              ) : (
                <>
                  {/* Summary row */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex gap-[2px]">
                      {[1,2,3,4,5].map(n => (
                        <span key={n} style={{ fontSize: 20, color: n <= Math.round(feedbackData.averageRating) ? "#f5c518" : "#2a2a38" }}>★</span>
                      ))}
                    </div>
                    <span className="text-2xl font-bold" style={{ color: "#f5c518" }}>{feedbackData.averageRating}</span>
                    <span className="text-sm text-[#666]">average rating</span>
                  </div>

                  {/* Feedback rows */}
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-[#555] text-left">
                        <th className="py-1.5 font-medium">User</th>
                        <th className="py-1.5 font-medium">Rating</th>
                        <th className="py-1.5 font-medium">Message</th>
                        <th className="py-1.5 font-medium text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedbackData.feedback.slice(0, 50).map(f => (
                        <tr key={f.id} className="border-b border-white/[0.04]">
                          <td className="py-2.5 text-[#aaa] font-mono text-xs max-w-[160px] truncate">{f.email}</td>
                          <td className="py-2.5">
                            <span style={{ color: "#f5c518", letterSpacing: 1 }}>
                              {"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}
                            </span>
                          </td>
                          <td className="py-2.5 text-[#888] max-w-[260px]">
                            {f.message ? <span className="line-clamp-2">{f.message}</span> : <span className="text-[#444] italic">—</span>}
                          </td>
                          <td className="py-2.5 text-right text-[#555] text-xs whitespace-nowrap">{fmtDate(f.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
