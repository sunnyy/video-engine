/**
 * Plans.jsx
 * src/pages/admin/Plans.jsx
 * Plan catalogue management — CRUD for plans table.
 */
import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { serverFetch } from "../../services/serverApi";
import { CREDIT_COSTS } from "../../core/utils/creditCosts";

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

const EMPTY_FORM = {
  name: "", slug: "", description: "",
  credits: "", price_monthly: "", price_annual: "",
  discount_percent: 0, is_active: true, is_popular: false,
  sort_order: 0, features: "",
};

/* ── Plan form modal ── */
function PlanModal({ plan, onClose, onSaved }) {
  const isEdit = !!plan?.id;
  const [form, setForm] = useState(
    isEdit
      ? {
          ...plan,
          features: Array.isArray(plan.features) ? plan.features.join("\n") : (plan.features || ""),
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.slug || !form.credits || !form.price_monthly) {
      setError("Name, slug, credits, and monthly price are required."); return;
    }
    setSaving(true); setError("");
    try {
      const payload = {
        ...form,
        credits:          Number(form.credits),
        price_monthly:    Number(form.price_monthly),
        price_annual:     form.price_annual ? Number(form.price_annual) : null,
        discount_percent: Number(form.discount_percent) || 0,
        sort_order:       Number(form.sort_order) || 0,
        features:         form.features.split("\n").map(s => s.trim()).filter(Boolean),
      };
      const res = isEdit
        ? await serverFetch(`/api/admin/plans/${plan.id}`, { method: "PUT",  body: JSON.stringify(payload) })
        : await serverFetch("/api/admin/plans",             { method: "POST", body: JSON.stringify(payload) });
      await safeJson(res);
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const F = "w-full px-3 py-2.5 bg-[#0d0d14] border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#7c5cfc] transition-colors";
  const L = "text-xs text-[#888] font-medium mb-1";

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000] p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#16161f] border border-white/10 rounded-2xl p-7 w-full max-w-[540px] flex flex-col gap-5 max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">{isEdit ? "Edit Plan" : "Add Plan"}</h3>
          <button type="button" onClick={onClose} className="text-[#555] hover:text-white text-xl cursor-pointer bg-transparent border-0">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className={L}>Name *</label>
            <input className={F} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Pro" />
          </div>
          <div className="flex flex-col">
            <label className={L}>Slug *</label>
            <input className={F} value={form.slug} onChange={e => set("slug", e.target.value)} placeholder="pro" />
          </div>
        </div>

        <div className="flex flex-col">
          <label className={L}>Description</label>
          <input className={F} value={form.description} onChange={e => set("description", e.target.value)} placeholder="For power creators" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col">
            <label className={L}>Credits / mo *</label>
            <input className={F} type="number" value={form.credits} onChange={e => set("credits", e.target.value)} placeholder="500" />
          </div>
          <div className="flex flex-col">
            <label className={L}>Price / mo ($) *</label>
            <input className={F} type="number" step="0.01" value={form.price_monthly} onChange={e => set("price_monthly", e.target.value)} placeholder="29" />
          </div>
          <div className="flex flex-col">
            <label className={L}>Price / yr ($)</label>
            <input className={F} type="number" step="0.01" value={form.price_annual} onChange={e => set("price_annual", e.target.value)} placeholder="290" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className={L}>Discount %</label>
            <input className={F} type="number" value={form.discount_percent} onChange={e => set("discount_percent", e.target.value)} placeholder="0" />
          </div>
          <div className="flex flex-col">
            <label className={L}>Sort Order</label>
            <input className={F} type="number" value={form.sort_order} onChange={e => set("sort_order", e.target.value)} placeholder="0" />
          </div>
        </div>

        <div className="flex flex-col">
          <label className={L}>Features (one per line)</label>
          <textarea className={F} rows={4} value={form.features} onChange={e => set("features", e.target.value)}
            placeholder={"500 credits/month\nUnlimited exports\nPriority support"} style={{ resize: "vertical", fontFamily: "inherit" }} />
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-[#aaa]">
            <input type="checkbox" checked={form.is_active} onChange={e => set("is_active", e.target.checked)}
              className="w-4 h-4 rounded accent-[#7c5cfc]" />
            Active
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-[#aaa]">
            <input type="checkbox" checked={form.is_popular} onChange={e => set("is_popular", e.target.checked)}
              className="w-4 h-4 rounded accent-[#f5c518]" />
            Popular badge
          </label>
        </div>

        {error && <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-lg px-4 py-2.5 text-[#f97316] text-sm">{error}</div>}

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose}
            className="px-4 py-2 bg-transparent border border-white/10 rounded-lg text-[#888] text-sm cursor-pointer hover:bg-white/5">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-[#7c5cfc] rounded-lg text-white font-semibold text-sm cursor-pointer disabled:opacity-50 hover:bg-[#6d4de8] transition-colors">
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Plan"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Plan card ── */
function PlanCard({ plan, onEdit, onToggle, onDelete }) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const color = plan.is_active ? "#7c5cfc" : "#555";

  const videosPerMonth = plan.credits
    ? Math.floor(plan.credits / Math.ceil(
        (CREDIT_COSTS.base_generation || 10) +
        (CREDIT_COSTS.tts_generation  || 5)  +
        (CREDIT_COSTS.export_local    || 5)
      ))
    : "—";

  const handleToggle = async () => {
    setToggling(true);
    try { await onToggle(plan); } finally { setToggling(false); }
  };
  const handleDelete = async () => {
    if (!confirm(`Delete plan "${plan.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try { await onDelete(plan.id); } finally { setDeleting(false); }
  };

  return (
    <div className="bg-[#111118] border rounded-2xl p-6 flex flex-col gap-4 flex-1 min-w-[200px]"
      style={{ borderColor: color + "44", opacity: plan.is_active ? 1 : 0.55 }}>

      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">{plan.name}</span>
            {plan.is_popular && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f5c518]/20 text-[#f5c518] border border-[#f5c518]/30">POPULAR</span>
            )}
          </div>
          <div className="text-2xl font-bold mt-1" style={{ color }}>
            ${plan.price_monthly}<span className="text-sm font-normal text-[#666]">/mo</span>
          </div>
          {plan.price_annual && (
            <div className="text-xs text-[#555]">${plan.price_annual}/yr {plan.discount_percent > 0 ? `(${plan.discount_percent}% off)` : ""}</div>
          )}
        </div>
        <div className="text-xs px-2.5 py-1 rounded-full font-semibold border shrink-0"
          style={{ background: color + "22", color, borderColor: color + "44" }}>
          {plan.slug?.toUpperCase() || "—"}
        </div>
      </div>

      {plan.description && <p className="text-xs text-[#666] m-0">{plan.description}</p>}

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[#666]">Credits</span>
          <span className="text-white font-semibold">⚡ {plan.credits}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#666]">~Videos/mo</span>
          <span className="text-[#aaa]">~{videosPerMonth}</span>
        </div>
        {plan.credits && plan.price_monthly && (
          <div className="flex justify-between">
            <span className="text-[#666]">$/credit</span>
            <span className="text-[#aaa]">${(plan.price_monthly / plan.credits).toFixed(3)}</span>
          </div>
        )}
      </div>

      {Array.isArray(plan.features) && plan.features.length > 0 && (
        <div className="flex flex-col gap-1">
          {plan.features.slice(0, 4).map((f, i) => (
            <div key={i} className="text-xs text-[#888] flex items-start gap-1.5">
              <span style={{ color }}>✓</span>{f}
            </div>
          ))}
          {plan.features.length > 4 && (
            <div className="text-xs text-[#555]">+{plan.features.length - 4} more…</div>
          )}
        </div>
      )}

      <div className="mt-auto pt-3 border-t border-white/[0.06] flex gap-2">
        <button onClick={() => onEdit(plan)}
          className="flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border border-white/10 bg-transparent text-[#aaa] hover:bg-white/5 transition-colors">
          Edit
        </button>
        <button onClick={handleToggle} disabled={toggling}
          className="flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-colors"
          style={plan.is_active
            ? { borderColor: "#f97316/50", background: "rgba(249,115,22,0.08)", color: "#f97316" }
            : { borderColor: "rgba(34,197,94,0.4)", background: "rgba(34,197,94,0.08)", color: "#22c55e" }
          }>
          {toggling ? "…" : plan.is_active ? "Deactivate" : "Activate"}
        </button>
        <button onClick={handleDelete} disabled={deleting}
          className="w-8 h-7 flex items-center justify-center rounded-lg text-xs cursor-pointer border border-[#f87171]/20 bg-transparent text-[#f87171]/50 hover:bg-[#f87171]/10 hover:text-[#f87171] transition-colors">
          {deleting ? "…" : "✕"}
        </button>
      </div>
    </div>
  );
}

/* ── Main ── */
export default function Plans() {
  const [plans,    setPlans]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [modal,    setModal]    = useState(null); // null | { plan? }

  const loadPlans = async () => {
    setLoading(true); setError("");
    try {
      const res = await serverFetch("/api/admin/plans");
      const d   = await safeJson(res);
      setPlans(Array.isArray(d) ? d : (d.plans || []));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadPlans(); }, []);

  const handleToggle = async (plan) => {
    const res = await serverFetch(`/api/admin/plans/${plan.id}`, {
      method: "PUT",
      body: JSON.stringify({ ...plan, is_active: !plan.is_active }),
    });
    await safeJson(res);
    await loadPlans();
  };

  const handleDelete = async (id) => {
    const res = await serverFetch(`/api/admin/plans/${id}`, { method: "DELETE" });
    await safeJson(res);
    await loadPlans();
  };

  const sorted = [...plans].sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99));

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-1 gap-4 flex-wrap">
        <h1 className="text-4xl font-bold">Plans & Pricing</h1>
        <button onClick={() => setModal({})}
          className="px-5 py-2.5 bg-[#7c5cfc]/20 border border-[#7c5cfc]/40 rounded-xl text-[#a78bfa] font-semibold text-sm cursor-pointer hover:bg-[#7c5cfc]/30 transition-colors">
          + Add Plan
        </button>
      </div>
      <p className="text-[#888] text-lg mb-8">Manage subscription plans and pricing tiers.</p>

      {error && (
        <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-xl px-5 py-3 text-[#f97316] text-sm mb-6">{error}</div>
      )}

      {/* Plan catalogue */}
      <div className="text-lg font-semibold text-[#ccc] mb-4">Plan Catalogue</div>

      {loading ? (
        <div className="text-[#666] text-base animate-pulse">Loading plans…</div>
      ) : sorted.length === 0 ? (
        <div className="text-[#444] text-base bg-[#111118] border border-white/[0.06] rounded-2xl px-7 py-10 text-center mb-8">
          No plans yet. Click "Add Plan" to create the first one.
        </div>
      ) : (
        <div className="flex gap-4 mb-10 flex-wrap">
          {sorted.map(plan => (
            <PlanCard
              key={plan.id} plan={plan}
              onEdit={p => setModal({ plan: p })}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Credit cost reference */}
      <div className="bg-[#111118] border border-white/[0.08] rounded-2xl p-6">
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

      {modal !== null && (
        <PlanModal
          plan={modal.plan || null}
          onClose={() => setModal(null)}
          onSaved={loadPlans}
        />
      )}
    </AdminLayout>
  );
}
