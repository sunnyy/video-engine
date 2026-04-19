/**
 * Credits.jsx
 * Global credit stats, top consumers, recent transactions, manual adjustments.
 */
import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { serverFetch } from "../../services/serverApi";

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

/* ── Quick Adjust Modal ── */
function AdjustModal({ onClose, onDone }) {
  const [userId,  setUserId]  = useState("");
  const [mode,    setMode]    = useState("add");   // "add" | "deduct" | "set"
  const [amount,  setAmount]  = useState("");
  const [reason,  setReason]  = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const n = parseInt(amount, 10);
    if (!userId.trim()) { setError("User ID is required."); return; }
    if (isNaN(n) || n < 0 || (mode !== "set" && n <= 0)) { setError("Enter a valid positive number."); return; }
    setLoading(true); setError("");
    try {
      const endpoint = mode === "add" ? "/api/admin/add-credits"
        : mode === "deduct"           ? "/api/admin/deduct-credits"
        :                               "/api/admin/set-balance";
      const body = mode === "set"
        ? { userId: userId.trim(), balance: n, reason }
        : { userId: userId.trim(), amount: n, reason };
      const res = await serverFetch(endpoint, { method: "POST", body: JSON.stringify(body) });
      const d   = await safeJson(res);
      onDone(d);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const modeColor = mode === "add" ? "#22c55e" : mode === "deduct" ? "#f97316" : "#e879f9";

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[1000]"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <form onSubmit={handleSubmit}
        className="bg-[#16161f] border border-white/10 rounded-2xl p-7 w-[400px] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Manual Credit Adjustment</h3>
          <button type="button" onClick={onClose} className="text-[#555] hover:text-white text-xl cursor-pointer">✕</button>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2">
          {[["add","Add"],["deduct","Deduct"],["set","Set Balance"]].map(([v, label]) => (
            <button key={v} type="button" onClick={() => setMode(v)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold cursor-pointer border transition-colors
                ${mode === v
                  ? v === "add"    ? "bg-[#22c55e]/20 border-[#22c55e]/50 text-[#22c55e]"
                  : v === "deduct" ? "bg-[#f97316]/20 border-[#f97316]/50 text-[#f97316]"
                  :                  "bg-[#e879f9]/20 border-[#e879f9]/50 text-[#e879f9]"
                  : "bg-transparent border-white/10 text-[#666] hover:text-[#aaa]"}`}>
              {label}
            </button>
          ))}
        </div>

        <input type="text" placeholder="User ID (UUID)" value={userId}
          onChange={e => setUserId(e.target.value)}
          className="w-full px-3 py-2.5 bg-[#0d0d14] border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#7c5cfc] font-mono" />

        <input type="number" min={mode === "set" ? "0" : "1"} placeholder={mode === "set" ? "New balance" : "Amount"}
          value={amount} onChange={e => setAmount(e.target.value)}
          className="w-full px-3 py-2.5 bg-[#0d0d14] border border-white/10 rounded-lg text-white text-sm outline-none"
          style={{ borderColor: amount ? modeColor + "55" : undefined }} />

        <input type="text" placeholder="Reason (optional)" value={reason}
          onChange={e => setReason(e.target.value)}
          className="w-full px-3 py-2.5 bg-[#0d0d14] border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#7c5cfc]" />

        {error && <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-lg px-4 py-2.5 text-[#f97316] text-sm">{error}</div>}

        <div className="flex gap-2.5 justify-end">
          <button type="button" onClick={onClose}
            className="px-4 py-2 bg-transparent border border-white/10 rounded-lg text-[#888] text-sm cursor-pointer hover:bg-white/5">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="px-5 py-2 rounded-lg text-white font-semibold text-sm cursor-pointer disabled:opacity-50 transition-colors"
            style={{ background: modeColor + "33", border: `1px solid ${modeColor}55`, color: modeColor }}>
            {loading ? "…" : mode === "add" ? "Add Credits" : mode === "deduct" ? "Deduct Credits" : "Set Balance"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Pill bar ── */
function PillBar({ items }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <div className="flex flex-col gap-3">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="text-sm text-[#aaa] w-28 shrink-0 truncate">{item.label}</div>
          <div className="flex-1 bg-white/[0.05] rounded-full h-2.5 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(item.value / total) * 100}%`, background: item.color || "#7c5cfc" }} />
          </div>
          <div className="text-sm text-[#666] w-8 text-right">{item.value}</div>
          <div className="text-xs text-[#444] w-10 text-right">{Math.round((item.value / total) * 100)}%</div>
        </div>
      ))}
    </div>
  );
}

const TX_COLORS = {
  deduction:      "#f97316",
  debit:          "#f97316",
  admin_deduct:   "#f97316",
  bonus:          "#22c55e",
  credit:         "#22c55e",
  purchase:       "#3b9eff",
  admin_grant:    "#a78bfa",
  admin_set:      "#e879f9",
  admin_set_balance: "#e879f9",
};

const TYPE_PILL_COLORS = ["#7c5cfc","#3b9eff","#22c55e","#f97316","#e879f9","#facc15","#64748b"];

/* ── Filter bar ── */
const ALL = "all";

/* ── Main ── */
export default function Credits() {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [showModal, setShowModal] = useState(false);
  const [txFilter, setTxFilter] = useState(ALL);
  const [txSearch, setTxSearch] = useState("");
  const [txPage,   setTxPage]   = useState(1);
  const TX_PAGE_SIZE = 25;

  async function load() {
    setLoading(true); setError("");
    try {
      const res = await serverFetch("/api/admin/credits-overview");
      const d   = await safeJson(res);
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const txTypes = data
    ? Object.entries(data.typeBreakdown)
        .sort((a, b) => b[1] - a[1])
        .map(([label, value], i) => ({ label, value, color: TYPE_PILL_COLORS[i % TYPE_PILL_COLORS.length] }))
    : [];

  const allTypes = data ? [ALL, ...Object.keys(data.typeBreakdown)] : [ALL];

  const filteredTx = (data?.recentTransactions || [])
    .filter(tx => txFilter === ALL || tx.type === txFilter)
    .filter(tx => !txSearch || tx.user_id?.includes(txSearch) || tx.description?.toLowerCase().includes(txSearch.toLowerCase()));

  const txTotalPages = Math.max(1, Math.ceil(filteredTx.length / TX_PAGE_SIZE));
  const pagedTx = filteredTx.slice((txPage - 1) * TX_PAGE_SIZE, txPage * TX_PAGE_SIZE);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-1 gap-4 flex-wrap">
        <h1 className="text-4xl font-bold">Credits</h1>
        <button onClick={() => setShowModal(true)}
          className="px-5 py-2.5 bg-[#7c5cfc]/20 border border-[#7c5cfc]/40 rounded-xl text-[#a78bfa] font-semibold text-sm cursor-pointer hover:bg-[#7c5cfc]/30 transition-colors">
          + Manual Adjustment
        </button>
      </div>
      <p className="text-[#888] text-lg mb-8">Global credit stats, top consumers, and transaction log.</p>

      {error && <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-xl px-5 py-3 text-[#f97316] text-sm mb-6">{error}</div>}

      {loading ? (
        <div className="text-[#666] text-xl animate-pulse">Loading…</div>
      ) : data && (
        <>
          {/* Global stat cards */}
          <div className="flex gap-4 mb-10 flex-wrap">
            {[
              { label: "Credits in Circulation", value: data.stats.totalBalance.toLocaleString(), color: "#7c5cfc", sub: "current balances" },
              { label: "Total Issued (Lifetime)",  value: data.stats.totalLifetime.toLocaleString(), color: "#3b9eff", sub: "all-time" },
              { label: "Users with Credits",       value: data.stats.totalUsers, color: "#22c55e" },
              { label: "Low Balance Users",         value: data.stats.lowBalance, color: "#f97316", sub: "< 10 credits" },
            ].map(s => (
              <div key={s.label} className="bg-[#111118] border border-white/[0.08] rounded-2xl px-7 py-6 flex flex-col gap-2 flex-1 min-w-[160px]">
                <div className="text-sm text-[#888]">{s.label}</div>
                <div className="text-5xl font-bold leading-none" style={{ color: s.color }}>{s.value ?? "—"}</div>
                {s.sub && <div className="text-xs text-[#555]">{s.sub}</div>}
              </div>
            ))}
          </div>

          {/* Top consumers + type breakdown */}
          <div className="flex gap-6 mb-10 flex-wrap">
            {/* Top consumers */}
            <div className="bg-[#111118] border border-white/[0.08] rounded-2xl p-6 flex-1 min-w-[280px]">
              <div className="text-lg font-semibold text-[#ccc] mb-1">Top Consumers</div>
              <div className="text-sm text-[#666] mb-5">by lifetime credits issued</div>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[#555] text-left">
                    <th className="py-1.5 font-medium">#</th>
                    <th className="py-1.5 font-medium">User ID</th>
                    <th className="py-1.5 font-medium text-right">Balance</th>
                    <th className="py-1.5 font-medium text-right">Lifetime</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topConsumers.map((u, i) => (
                    <tr key={u.user_id} className="border-b border-white/[0.04]">
                      <td className="py-2.5 text-[#555] w-6">{i + 1}</td>
                      <td className="py-2.5 font-mono text-[#aaa]">{u.user_id?.slice(0, 13)}…</td>
                      <td className="py-2.5 text-right">
                        <span className={`font-semibold ${u.balance < 10 ? "text-[#f97316]" : "text-[#7c5cfc]"}`}>
                          ⚡ {u.balance}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-[#3b9eff] font-semibold">{u.lifetime_credits}</td>
                    </tr>
                  ))}
                  {data.topConsumers.length === 0 && (
                    <tr><td colSpan={4} className="py-4 text-[#444]">No data yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Type breakdown */}
            {txTypes.length > 0 && (
              <div className="bg-[#111118] border border-white/[0.08] rounded-2xl p-6 w-[280px] shrink-0">
                <div className="text-lg font-semibold text-[#ccc] mb-1">Transaction Types</div>
                <div className="text-sm text-[#666] mb-5">all-time distribution</div>
                <PillBar items={txTypes} />
              </div>
            )}
          </div>

          {/* Recent transactions */}
          <div>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <div className="text-xl font-semibold text-[#ccc]">Recent Transactions</div>
              <div className="text-sm text-[#555]">({filteredTx.length} shown)</div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-4 flex-wrap items-center">
              <input type="text" placeholder="Search user ID or description…" value={txSearch}
                onChange={e => { setTxSearch(e.target.value); setTxPage(1); }}
                className="px-3 py-2 bg-[#111118] border border-white/[0.08] rounded-lg text-sm text-white outline-none focus:border-[#7c5cfc] placeholder-[#444] w-64" />

              <div className="flex gap-1 flex-wrap">
                {allTypes.map(t => (
                  <button key={t} onClick={() => { setTxFilter(t); setTxPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border transition-colors
                      ${txFilter === t
                        ? "bg-[#7c5cfc]/20 border-[#7c5cfc]/40 text-[#a78bfa]"
                        : "bg-transparent border-white/[0.07] text-[#555] hover:text-[#aaa]"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[#555] text-left">
                    <th className="px-3 py-2 font-medium">User</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 font-medium text-right">Amount</th>
                    <th className="px-3 py-2 font-medium text-right">Balance After</th>
                    <th className="px-3 py-2 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedTx.map((tx, i) => {
                    const col = TX_COLORS[tx.type] || "#888";
                    return (
                      <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 py-3 font-mono text-[#888]">{tx.user_id?.slice(0, 10)}…</td>
                        <td className="px-3 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: col + "22", color: col, border: `1px solid ${col}44` }}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[#888] max-w-[200px] truncate">{tx.description || tx.action || "—"}</td>
                        <td className="px-3 py-3 text-right font-semibold" style={{ color: col }}>
                          {tx.amount > 0 ? "+" : ""}{tx.amount}
                        </td>
                        <td className="px-3 py-3 text-right text-[#555]">
                          {tx.balance_after !== null && tx.balance_after !== undefined ? tx.balance_after : "—"}
                        </td>
                        <td className="px-3 py-3 text-[#555] whitespace-nowrap">{fmtDateTime(tx.created_at)}</td>
                      </tr>
                    );
                  })}
                  {pagedTx.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-8 text-[#444] text-center">No transactions match.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {txTotalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-1">
                <div className="text-xs text-[#555]">
                  {(txPage - 1) * TX_PAGE_SIZE + 1}–{Math.min(txPage * TX_PAGE_SIZE, filteredTx.length)} of {filteredTx.length}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setTxPage(1)} disabled={txPage === 1}
                    className="px-2 py-1 rounded text-xs text-[#555] hover:text-white disabled:opacity-30 cursor-pointer border border-white/[0.07] bg-transparent transition-colors">
                    «
                  </button>
                  <button onClick={() => setTxPage(p => p - 1)} disabled={txPage === 1}
                    className="px-3 py-1 rounded text-xs text-[#555] hover:text-white disabled:opacity-30 cursor-pointer border border-white/[0.07] bg-transparent transition-colors">
                    ‹ Prev
                  </button>
                  {Array.from({ length: txTotalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === txTotalPages || Math.abs(p - txPage) <= 2)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) => p === "…"
                      ? <span key={`ellipsis-${i}`} className="px-2 text-[#444] text-xs">…</span>
                      : <button key={p} onClick={() => setTxPage(p)}
                          className={`px-3 py-1 rounded text-xs cursor-pointer border transition-colors
                            ${txPage === p
                              ? "bg-[#7c5cfc]/20 border-[#7c5cfc]/40 text-[#a78bfa]"
                              : "bg-transparent border-white/[0.07] text-[#555] hover:text-white"}`}>
                          {p}
                        </button>
                    )}
                  <button onClick={() => setTxPage(p => p + 1)} disabled={txPage === txTotalPages}
                    className="px-3 py-1 rounded text-xs text-[#555] hover:text-white disabled:opacity-30 cursor-pointer border border-white/[0.07] bg-transparent transition-colors">
                    Next ›
                  </button>
                  <button onClick={() => setTxPage(txTotalPages)} disabled={txPage === txTotalPages}
                    className="px-2 py-1 rounded text-xs text-[#555] hover:text-white disabled:opacity-30 cursor-pointer border border-white/[0.07] bg-transparent transition-colors">
                    »
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {showModal && (
        <AdjustModal
          onClose={() => setShowModal(false)}
          onDone={() => load()}
        />
      )}
    </AdminLayout>
  );
}
