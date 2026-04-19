/**
 * Sales.jsx
 * src/pages/admin/Sales.jsx
 * Sales & Revenue — subscriptions, manual plan assignment, revenue stubs.
 */
import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { serverFetch } from "../../services/serverApi";

/* ── helpers ── */
async function safeJson(res) {
  const text = await res.text();
  if (!res.ok) throw new Error(`Server ${res.status}: ${text.slice(0, 200)}`);
  try { return JSON.parse(text); } catch { throw new Error("Invalid server response"); }
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/* ── Assign Plan Modal ── */
function AssignModal({ plans, onClose, onDone }) {
  const [email,   setEmail]   = useState("");
  const [planId,  setPlanId]  = useState("");
  const [cycle,   setCycle]   = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (plans.length > 0 && !planId) setPlanId(String(plans[0].id));
  }, [plans]);

  const selectedPlan = plans.find(p => String(p.id) === String(planId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError("Email is required."); return; }
    if (!planId)       { setError("Select a plan."); return; }
    setLoading(true); setError("");
    try {
      const res = await serverFetch(`/api/admin/plans/${planId}/grant`, {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), billing_cycle: cycle }),
      });
      await safeJson(res);
      onDone();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const F = "w-full px-3 py-2.5 bg-[#0d0d14] border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#7c5cfc] transition-colors";

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000] p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <form onSubmit={handleSubmit}
        className="bg-[#16161f] border border-white/10 rounded-2xl p-7 w-full max-w-[440px] flex flex-col gap-5">

        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Assign Plan to User</h3>
          <button type="button" onClick={onClose} className="text-[#555] hover:text-white text-xl cursor-pointer bg-transparent border-0">✕</button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[#888] font-medium">User Email</label>
          <input type="email" className={F} placeholder="user@example.com"
            value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[#888] font-medium">Plan</label>
          {plans.length === 0 ? (
            <div className="text-sm text-[#555]">No plans found — create plans first.</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {plans.map(p => (
                <button key={p.id} type="button" onClick={() => setPlanId(String(p.id))}
                  className={`flex flex-col gap-1 p-3 rounded-xl border text-left cursor-pointer transition-colors
                    ${String(planId) === String(p.id)
                      ? "bg-[#7c5cfc]/20 border-[#7c5cfc]/60 text-white"
                      : "bg-white/[0.03] border-white/[0.08] text-[#888] hover:border-white/20"}`}>
                  <div className="font-semibold text-sm">{p.name}</div>
                  <div className="text-xs opacity-70">${p.price_monthly}/mo · {p.credits} credits</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[#888] font-medium">Billing Cycle</label>
          <div className="flex gap-2">
            {["monthly", "annual"].map(c => (
              <button key={c} type="button" onClick={() => setCycle(c)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border cursor-pointer transition-colors
                  ${cycle === c
                    ? "bg-[#7c5cfc]/20 border-[#7c5cfc]/60 text-white"
                    : "bg-white/[0.03] border-white/[0.08] text-[#888] hover:border-white/20"}`}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {selectedPlan && (
          <div className="bg-[#7c5cfc]/10 border border-[#7c5cfc]/25 rounded-xl px-4 py-3 text-sm text-[#a78bfa]">
            Assigns <span className="font-bold text-white">{selectedPlan.credits} credits</span> for{" "}
            <span className="font-bold text-white">{selectedPlan.name}</span> ({cycle}).
          </div>
        )}

        {error && (
          <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-lg px-4 py-2.5 text-[#f97316] text-sm">{error}</div>
        )}

        <div className="flex gap-2.5 justify-end">
          <button type="button" onClick={onClose}
            className="px-4 py-2 bg-transparent border border-white/10 rounded-lg text-[#888] text-sm cursor-pointer hover:bg-white/5">
            Cancel
          </button>
          <button type="submit" disabled={loading || plans.length === 0}
            className="px-5 py-2 bg-[#7c5cfc] rounded-lg text-white font-semibold text-sm cursor-pointer disabled:opacity-50 hover:bg-[#6d4de8] transition-colors">
            {loading ? "Assigning…" : "Assign Plan"}
          </button>
        </div>
      </form>
    </div>
  );
}

const STATUS_COLORS = {
  active:    { bg: "rgba(34,197,94,0.12)",  color: "#22c55e",  border: "rgba(34,197,94,0.3)"  },
  cancelled: { bg: "rgba(248,113,113,0.1)", color: "#f87171",  border: "rgba(248,113,113,0.3)" },
  expired:   { bg: "rgba(85,85,106,0.15)",  color: "#9494a8",  border: "rgba(85,85,106,0.3)"  },
  trialing:  { bg: "rgba(124,92,252,0.12)", color: "#a78bfa",  border: "rgba(124,92,252,0.3)" },
};

/* ── Main ── */
export default function Sales() {
  const [subs,       setSubs]       = useState([]);
  const [plans,      setPlans]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [error,      setError]      = useState("");

  const loadData = async () => {
    setLoading(true); setError("");
    try {
      const [subsRes, plansRes] = await Promise.all([
        serverFetch("/api/subscriptions/all"),
        serverFetch("/api/admin/plans"),
      ]);
      const subsData  = await safeJson(subsRes);
      const plansData = await safeJson(plansRes);
      setSubs(Array.isArray(subsData) ? subsData : (subsData.subscriptions || []));
      setPlans(Array.isArray(plansData) ? plansData.filter(p => p.is_active) : []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const activeSubs = subs.filter(s => s.status === "active").length;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-1 gap-4 flex-wrap">
        <h1 className="text-4xl font-bold">Sales & Revenue</h1>
        <button onClick={() => setShowAssign(true)}
          className="px-5 py-2.5 bg-[#7c5cfc]/20 border border-[#7c5cfc]/40 rounded-xl text-[#a78bfa] font-semibold text-sm cursor-pointer hover:bg-[#7c5cfc]/30 transition-colors">
          + Assign Plan
        </button>
      </div>
      <p className="text-[#888] text-lg mb-6">Revenue metrics and subscription management.</p>

      {/* Gateway pending banner */}
      <div className="flex items-center gap-3 bg-[#facc15]/[0.07] border border-[#facc15]/20 rounded-xl px-5 py-3.5 mb-8">
        <span className="text-[#facc15] text-lg">⚠</span>
        <div>
          <div className="text-sm font-semibold text-[#facc15]">Payment gateway not connected</div>
          <div className="text-xs text-[#a08a30] mt-0.5">
            MRR, revenue, and conversion metrics will populate automatically after Razorpay integration.
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-xl px-5 py-3 text-[#f97316] text-sm mb-6">{error}</div>
      )}

      {/* Metric cards */}
      <div className="flex gap-4 mb-10 flex-wrap">
        {[
          { label: "MRR",             value: "—", sub: "monthly recurring revenue" },
          { label: "Total Revenue",   value: "—", sub: "all-time" },
          { label: "Active Subs",     value: loading ? "…" : activeSubs || "—", sub: "paying users", live: activeSubs > 0 },
          { label: "Conversion Rate", value: "—", sub: "free → paid" },
        ].map(s => (
          <div key={s.label} className="bg-[#111118] border border-white/[0.06] rounded-2xl px-7 py-6 flex flex-col gap-2 flex-1 min-w-[140px]">
            <div className="text-sm text-[#666]">{s.label}</div>
            <div className="text-4xl font-bold leading-none" style={{ color: s.live ? "#22c55e" : "#333" }}>{s.value}</div>
            <div className="text-xs text-[#333]">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Subscriptions table */}
      <div className="text-xl font-semibold text-[#ccc] mb-4">
        Subscriptions
        {!loading && <span className="text-sm text-[#555] font-normal ml-2">({subs.length} total)</span>}
      </div>

      {loading ? (
        <div className="text-[#666] text-base animate-pulse">Loading…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-white/[0.08] text-[#555] text-left">
                <th className="px-3 py-2 font-medium">User</th>
                <th className="px-3 py-2 font-medium">Plan</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Cycle</th>
                <th className="px-3 py-2 font-medium text-right">Price</th>
                <th className="px-3 py-2 font-medium">Period</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s, i) => {
                const sc = STATUS_COLORS[s.status] || STATUS_COLORS.expired;
                return (
                  <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 py-3 text-[#aaa]">{s.email || <span className="font-mono text-[#555]">{s.user_id?.slice(0, 12)}…</span>}</td>
                    <td className="px-3 py-3 font-medium text-white">{s.plan_name || "—"}</td>
                    <td className="px-3 py-3">
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                        style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                        {s.status || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[#888]">{s.billing_cycle || "—"}</td>
                    <td className="px-3 py-3 text-right text-[#7c5cfc] font-semibold">
                      {s.price_paid != null ? `$${s.price_paid}` : "—"}
                    </td>
                    <td className="px-3 py-3 text-[#555] whitespace-nowrap text-xs">
                      {fmtDate(s.period_start)} → {fmtDate(s.period_end)}
                    </td>
                  </tr>
                );
              })}
              {subs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-[#444] text-center">
                    No subscriptions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAssign && (
        <AssignModal
          plans={plans}
          onClose={() => setShowAssign(false)}
          onDone={loadData}
        />
      )}
    </AdminLayout>
  );
}
