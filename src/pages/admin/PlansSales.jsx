/**
 * PlansSales.jsx
 * Plans & Sales skeleton — plan cards, manual assignment, assignment history.
 * Revenue/MRR metrics are stubs pending payment gateway integration.
 */
import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { serverFetch } from "../../services/serverApi";
import { PLANS, CREDIT_COSTS } from "../../core/utils/creditCosts";

/* ── helpers ── */
function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

async function safeJson(res) {
  const text = await res.text();
  if (!res.ok) throw new Error(`Server ${res.status}: ${text.slice(0, 120)}`);
  try { return JSON.parse(text); } catch { throw new Error("Invalid server response"); }
}

/* ── Assign Plan Modal ── */
function AssignModal({ onClose, onDone }) {
  const [userId,  setUserId]  = useState("");
  const [planId,  setPlanId]  = useState("starter");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const plan = PLANS[planId];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!userId.trim()) { setError("User ID is required."); return; }
    setLoading(true); setError("");
    try {
      const res = await serverFetch("/api/admin/assign-plan", {
        method: "POST",
        body: JSON.stringify({
          userId:    userId.trim(),
          planId,
          planLabel: plan.label,
          credits:   plan.credits,
          price:     plan.price,
        }),
      });
      await safeJson(res);
      onDone();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[1000]"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <form onSubmit={handleSubmit}
        className="bg-[#16161f] border border-white/10 rounded-2xl p-7 w-[420px] flex flex-col gap-5">

        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Assign Plan to User</h3>
          <button type="button" onClick={onClose} className="text-[#555] hover:text-white text-xl cursor-pointer">✕</button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-[#888]">User ID</label>
          <input type="text" placeholder="Paste UUID…" value={userId}
            onChange={e => setUserId(e.target.value)}
            className="w-full px-3 py-2.5 bg-[#0d0d14] border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#7c5cfc] font-mono" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-[#888]">Plan</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(PLANS).map(([id, p]) => (
              <button key={id} type="button" onClick={() => setPlanId(id)}
                className={`flex flex-col gap-1 p-3 rounded-xl border text-left cursor-pointer transition-colors
                  ${planId === id
                    ? "bg-[#7c5cfc]/20 border-[#7c5cfc]/60 text-white"
                    : "bg-white/[0.03] border-white/[0.08] text-[#888] hover:border-white/20"}`}>
                <div className="font-semibold text-sm">{p.label}</div>
                <div className="text-xs opacity-70">${p.price}/mo · {p.credits} credits</div>
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-[#7c5cfc]/10 border border-[#7c5cfc]/25 rounded-xl px-4 py-3 text-sm text-[#a78bfa]">
          This will add <span className="font-bold text-white">{plan.credits} credits</span> to the user
          and log it as a <span className="font-bold text-white">{plan.label}</span> plan assignment.
        </div>

        {error && <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-lg px-4 py-2.5 text-[#f97316] text-sm">{error}</div>}

        <div className="flex gap-2.5 justify-end">
          <button type="button" onClick={onClose}
            className="px-4 py-2 bg-transparent border border-white/10 rounded-lg text-[#888] text-sm cursor-pointer hover:bg-white/5">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="px-5 py-2 bg-[#7c5cfc] rounded-lg text-white font-semibold text-sm cursor-pointer disabled:opacity-50 hover:bg-[#6d4de8] transition-colors">
            {loading ? "Assigning…" : "Assign Plan"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Plan card ── */
const PLAN_COLORS = {
  payg:    "#3b9eff",
  starter: "#22c55e",
  creator: "#7c5cfc",
  pro:     "#f97316",
};

function PlanCard({ id, plan }) {
  const color = PLAN_COLORS[id] || "#7c5cfc";
  const costPerVideo = Math.ceil(
    CREDIT_COSTS.base_generation +
    CREDIT_COSTS.tts_generation +
    CREDIT_COSTS.export_local
  );
  const videosPerMonth = Math.floor(plan.credits / costPerVideo);

  return (
    <div className="bg-[#111118] border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-4 flex-1 min-w-[190px]"
      style={{ borderColor: color + "33" }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-lg font-bold text-white">{plan.label}</div>
          <div className="text-3xl font-bold mt-1" style={{ color }}>${plan.price}
            <span className="text-base font-normal text-[#666]">/mo</span>
          </div>
        </div>
        <div className="text-xs px-2.5 py-1 rounded-full font-semibold border"
          style={{ background: color + "22", color, borderColor: color + "44" }}>
          {id.toUpperCase()}
        </div>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[#666]">Credits</span>
          <span className="text-white font-semibold">⚡ {plan.credits}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#666]">~Videos / mo</span>
          <span className="text-[#aaa]">~{videosPerMonth}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#666]">$/credit</span>
          <span className="text-[#aaa]">${(plan.price / plan.credits).toFixed(3)}</span>
        </div>
      </div>

      {/* Revenue stub */}
      <div className="mt-auto pt-4 border-t border-white/[0.06]">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-[#555]">Active subs</span>
          <span className="text-[#555]">—</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#555]">MRR</span>
          <span className="text-[#555]">—</span>
        </div>
      </div>
    </div>
  );
}

/* ── Main ── */
export default function PlansSales() {
  const [assignments, setAssignments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [error,       setError]       = useState("");

  async function loadAssignments() {
    setLoading(true); setError("");
    try {
      const res = await serverFetch("/api/admin/plan-assignments");
      const d   = await safeJson(res);
      setAssignments(Array.isArray(d) ? d : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAssignments(); }, []);

  /* Count by plan from description string */
  const planCounts = {};
  assignments.forEach(a => {
    const match = a.description?.match(/Plan assigned: ([^(]+)/);
    if (match) {
      const key = match[1].trim();
      planCounts[key] = (planCounts[key] || 0) + 1;
    }
  });

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-1 gap-4 flex-wrap">
        <h1 className="text-4xl font-bold">Plans & Sales</h1>
        <button onClick={() => setShowModal(true)}
          className="px-5 py-2.5 bg-[#7c5cfc]/20 border border-[#7c5cfc]/40 rounded-xl text-[#a78bfa] font-semibold text-sm cursor-pointer hover:bg-[#7c5cfc]/30 transition-colors">
          + Assign Plan
        </button>
      </div>
      <p className="text-[#888] text-lg mb-4">
        Plan configuration and manual assignment. Revenue metrics pending payment gateway.
      </p>

      {/* Gateway pending banner */}
      <div className="flex items-center gap-3 bg-[#facc15]/[0.07] border border-[#facc15]/20 rounded-xl px-5 py-3.5 mb-8">
        <span className="text-[#facc15] text-lg">⚠</span>
        <div>
          <div className="text-sm font-semibold text-[#facc15]">Payment gateway not connected</div>
          <div className="text-xs text-[#a08a30] mt-0.5">
            MRR, revenue, and conversion metrics will populate automatically after Stripe/Razorpay integration.
            Manual plan assignment is available now.
          </div>
        </div>
      </div>

      {error && <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-xl px-5 py-3 text-[#f97316] text-sm mb-6">{error}</div>}

      {/* Revenue stub cards */}
      <div className="flex gap-4 mb-10 flex-wrap">
        {[
          { label: "MRR",              value: "—", sub: "monthly recurring revenue" },
          { label: "Total Revenue",    value: "—", sub: "all-time" },
          { label: "Active Subs",      value: "—", sub: "paying users" },
          { label: "Conversion Rate",  value: "—", sub: "free → paid" },
        ].map(s => (
          <div key={s.label} className="bg-[#111118] border border-white/[0.06] rounded-2xl px-7 py-6 flex flex-col gap-2 flex-1 min-w-[140px]">
            <div className="text-sm text-[#666]">{s.label}</div>
            <div className="text-4xl font-bold text-[#333] leading-none">{s.value}</div>
            <div className="text-xs text-[#333]">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Plan cards */}
      <div className="text-xl font-semibold text-[#ccc] mb-4">Plan Catalogue</div>
      <div className="flex gap-4 mb-10 flex-wrap">
        {Object.entries(PLANS).map(([id, plan]) => (
          <PlanCard key={id} id={id} plan={plan} />
        ))}
      </div>

      {/* Credit cost reference */}
      <div className="bg-[#111118] border border-white/[0.08] rounded-2xl p-6 mb-10">
        <div className="text-base font-semibold text-[#ccc] mb-4">Credit Cost Reference</div>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
          {Object.entries(CREDIT_COSTS).map(([action, cost]) => (
            <div key={action} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2">
              <span className="text-sm text-[#888]">{action.replace(/_/g, " ")}</span>
              <span className="text-sm font-semibold text-[#7c5cfc]">⚡ {cost}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Assignment history */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="text-xl font-semibold text-[#ccc]">Manual Assignments</div>
        <div className="text-sm text-[#555]">({assignments.length} total)</div>
        {Object.entries(planCounts).length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {Object.entries(planCounts).map(([label, count]) => (
              <span key={label} className="text-xs bg-white/[0.05] border border-white/[0.08] text-[#888] px-2.5 py-1 rounded-full">
                {label}: {count}
              </span>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-[#666] text-base animate-pulse">Loading…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm min-w-[540px]">
            <thead>
              <tr className="border-b border-white/[0.08] text-[#555] text-left">
                <th className="px-3 py-2 font-medium">User</th>
                <th className="px-3 py-2 font-medium">Plan</th>
                <th className="px-3 py-2 font-medium text-right">Credits</th>
                <th className="px-3 py-2 font-medium">Assigned</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a, i) => {
                const planMatch  = a.description?.match(/Plan assigned: ([^(]+)/);
                const planLabel  = planMatch?.[1]?.trim() || "—";
                const planKey    = Object.keys(PLANS).find(k => PLANS[k].label === planLabel);
                const color      = PLAN_COLORS[planKey] || "#888";
                return (
                  <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 py-3 font-mono text-[#888]">{a.user_id?.slice(0, 13)}…</td>
                    <td className="px-3 py-3">
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                        style={{ background: color + "22", color, border: `1px solid ${color}44` }}>
                        {planLabel}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-[#7c5cfc]">+{a.amount}</td>
                    <td className="px-3 py-3 text-[#555] whitespace-nowrap">{fmtDateTime(a.created_at)}</td>
                  </tr>
                );
              })}
              {assignments.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-8 text-[#444] text-center">
                  No manual assignments yet. Use "Assign Plan" to add one.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <AssignModal
          onClose={() => setShowModal(false)}
          onDone={loadAssignments}
        />
      )}
    </AdminLayout>
  );
}
