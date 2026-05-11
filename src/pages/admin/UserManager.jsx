/**
 * UserManager.jsx
 * Users list with search, sort, edit user modal, credit history.
 */
import { useEffect, useState, useRef } from "react";
import { showToast } from "../../ui/Toast";
import AdminLayout from "./AdminLayout";
import { serverFetch } from "../../services/serverApi";

/* ── helpers ── */
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/* ── Edit User Modal ── */
function EditUserModal({ user, onClose, onUpdated }) {
  const [tab, setTab]           = useState("profile"); // "profile" | "credits" | "history" | "plan"
  const [role, setRole]         = useState(user.role || "user");
  const [addAmt, setAddAmt]     = useState("");
  const [setAmt, setSetAmt]     = useState("");
  const [reason, setReason]     = useState("");
  const [history, setHistory]   = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  // Plan tab state
  const [plans,        setPlans]        = useState([]);
  const [currentSub,   setCurrentSub]   = useState(undefined); // undefined=loading, null=none
  const [planLoading,  setPlanLoading]  = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billCycle,    setBillCycle]    = useState("monthly");
  const [grantCreds,   setGrantCreds]   = useState(true);

  // Load transaction history when tab switches to history
  useEffect(() => {
    if (tab !== "history") return;
    setHistLoading(true);
    serverFetch(`/api/admin/user-transactions/${user.id}`)
      .then(async r => {
        const text = await r.text();
        if (!r.ok) throw new Error(`Server error ${r.status}: ${text.slice(0, 120)}`);
        try { return JSON.parse(text); } catch { throw new Error("Invalid response from server"); }
      })
      .then(data => setHistory(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message))
      .finally(() => setHistLoading(false));
  }, [tab, user.id]);

  // Load plans + current subscription when tab switches to plan
  useEffect(() => {
    if (tab !== "plan") return;
    setPlanLoading(true);
    Promise.all([
      serverFetch("/api/admin/plans").then(r => r.json()),
      serverFetch(`/api/admin/user-subscription/${user.id}`).then(r => r.json()),
    ])
      .then(([plansData, subData]) => {
        const ps = Array.isArray(plansData) ? plansData.filter(p => p.is_active) : [];
        setPlans(ps);
        const sub = subData.subscription || null;
        setCurrentSub(sub);
        if (sub?.plans?.id) setSelectedPlan(sub.plans.id);
        else if (ps.length > 0) setSelectedPlan(ps[0].id);
      })
      .catch(e => setError(e.message))
      .finally(() => setPlanLoading(false));
  }, [tab, user.id]);

  function clearMessages() { setError(""); setSuccess(""); }

  async function handleSaveProfile() {
    clearMessages();
    setSaving(true);
    try {
      const res = await serverFetch("/api/admin/update-user", {
        method: "POST",
        body: JSON.stringify({ userId: user.id, role }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setSuccess("Role updated.");
      onUpdated({ ...user, role });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCredits() {
    clearMessages();
    const n = parseInt(addAmt, 10);
    if (!n || n <= 0) { setError("Enter a positive number."); return; }
    setSaving(true);
    try {
      const res = await serverFetch("/api/admin/add-credits", {
        method: "POST",
        body: JSON.stringify({ userId: user.id, amount: n, reason: reason || undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setSuccess(`+${n} credits added.`);
      setAddAmt(""); setReason("");
      onUpdated({ ...user, balance: (user.balance ?? 0) + n, lifetime_credits: (user.lifetime_credits ?? 0) + n });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSetBalance() {
    clearMessages();
    const n = parseInt(setAmt, 10);
    if (isNaN(n) || n < 0) { setError("Enter a non-negative number."); return; }
    setSaving(true);
    try {
      const res = await serverFetch("/api/admin/set-balance", {
        method: "POST",
        body: JSON.stringify({ userId: user.id, balance: n, reason: reason || undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setSuccess(`Balance set to ${n}.`);
      setSetAmt(""); setReason("");
      onUpdated({ ...user, balance: n, lifetime_credits: d.lifetime_credits ?? user.lifetime_credits });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePlan() {
    if (!selectedPlan) return;
    clearMessages();
    setSaving(true);
    try {
      const res = await serverFetch("/api/admin/change-user-plan", {
        method: "POST",
        body: JSON.stringify({ userId: user.id, planId: selectedPlan, billingCycle: billCycle, grantCredits: grantCreds }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      const msg = grantCreds
        ? `Plan set to "${d.plan}". +${d.credits} credits granted.`
        : `Plan set to "${d.plan}". No credits granted.`;
      setSuccess(msg);
      setCurrentSub({ plans: { id: selectedPlan, name: d.plan } });
      if (grantCreds && d.balance !== null) onUpdated({ ...user, balance: d.balance });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const txColor = (type) => {
    if (type === "debit" || type === "deduction") return "#f97316";
    if (type?.includes("admin")) return "#e879f9";
    return "#22c55e";
  };

  const TABS = [
    { id: "profile", label: "Profile" },
    { id: "credits", label: "Credits" },
    { id: "plan",    label: "Plan"    },
    { id: "history", label: "History" },
  ];

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[1000]" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#16161f] border border-white/10 rounded-2xl w-[480px] max-h-[85vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xl font-bold text-white">{user.email}</div>
              <div className="text-sm text-[#666] font-mono mt-0.5">{user.id}</div>
            </div>
            <button onClick={onClose} className="text-[#555] hover:text-white text-xl leading-none mt-0.5 cursor-pointer">✕</button>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 mt-4">
            {TABS.map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); clearMessages(); }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors
                  ${tab === t.id ? "bg-[#7c5cfc]/20 text-[#a78bfa] border border-[#7c5cfc]/40" : "text-[#666] hover:text-[#aaa]"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Messages */}
          {error   && <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-lg px-4 py-2.5 text-[#f97316] text-sm mb-4">{error}</div>}
          {success && <div className="bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-lg px-4 py-2.5 text-[#22c55e] text-sm mb-4">{success}</div>}

          {/* Profile tab */}
          {tab === "profile" && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white/[0.03] rounded-xl p-3">
                  <div className="text-[#666] mb-1">Joined</div>
                  <div className="text-[#ccc]">{fmtDate(user.created_at)}</div>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-3">
                  <div className="text-[#666] mb-1">Last Sign In</div>
                  <div className="text-[#ccc]">{fmtDate(user.last_sign_in_at)}</div>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-3">
                  <div className="text-[#666] mb-1">Balance</div>
                  <div className="text-[#7c5cfc] font-bold text-base">⚡ {user.balance ?? "—"}</div>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-3">
                  <div className="text-[#666] mb-1">Lifetime Credits</div>
                  <div className="text-[#aaa] font-semibold text-base">{user.lifetime_credits ?? "—"}</div>
                </div>
              </div>

              <div>
                <label className="text-sm text-[#ccc] block mb-2">Role</label>
                <select value={role} onChange={e => setRole(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0d0d14] border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#7c5cfc] cursor-pointer">
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>

              <button onClick={handleSaveProfile} disabled={saving || role === user.role}
                className="w-full py-2.5 bg-[#7c5cfc] rounded-lg text-white font-semibold text-sm cursor-pointer disabled:opacity-50 hover:bg-[#6d4de8] transition-colors">
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          )}

          {/* Credits tab */}
          {tab === "credits" && (
            <div className="flex flex-col gap-6">
              {/* Current balance display */}
              <div className="bg-white/[0.03] rounded-xl p-4 flex items-center justify-between">
                <div className="text-sm text-[#888]">Current Balance</div>
                <div className="text-2xl font-bold text-[#7c5cfc]">⚡ {user.balance ?? 0}</div>
              </div>

              {/* Add credits */}
              <div className="flex flex-col gap-3">
                <div className="text-sm font-semibold text-[#ccc]">Add Credits</div>
                <input type="number" min="1" placeholder="Amount to add" value={addAmt}
                  onChange={e => setAddAmt(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0d0d14] border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#22c55e]" />
                <input type="text" placeholder="Reason (optional)" value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0d0d14] border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#22c55e]" />
                <button onClick={handleAddCredits} disabled={saving}
                  className="py-2.5 bg-[#22c55e]/20 border border-[#22c55e]/40 rounded-lg text-[#22c55e] font-semibold text-sm cursor-pointer disabled:opacity-50 hover:bg-[#22c55e]/30 transition-colors">
                  {saving ? "…" : "+ Add Credits"}
                </button>
              </div>

              <div className="border-t border-white/[0.06]" />

              {/* Set balance */}
              <div className="flex flex-col gap-3">
                <div className="text-sm font-semibold text-[#ccc]">Override Balance</div>
                <div className="text-xs text-[#555]">Directly sets the balance to an exact value and logs the change.</div>
                <input type="number" min="0" placeholder="New balance" value={setAmt}
                  onChange={e => setSetAmt(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0d0d14] border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#e879f9]" />
                <button onClick={handleSetBalance} disabled={saving}
                  className="py-2.5 bg-[#e879f9]/15 border border-[#e879f9]/30 rounded-lg text-[#e879f9] font-semibold text-sm cursor-pointer disabled:opacity-50 hover:bg-[#e879f9]/25 transition-colors">
                  {saving ? "…" : "Set Balance"}
                </button>
              </div>
            </div>
          )}

          {/* Plan tab */}
          {tab === "plan" && (
            <div className="flex flex-col gap-5">
              {planLoading ? (
                <div className="text-[#555] text-sm animate-pulse">Loading…</div>
              ) : (
                <>
                  {/* Current subscription */}
                  <div className="bg-white/[0.03] rounded-xl p-4">
                    <div className="text-xs text-[#555] mb-1.5 uppercase tracking-wider">Current Plan</div>
                    {currentSub ? (
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-white">{currentSub.plans?.name || "Unknown"}</div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#22c55e]/15 text-[#22c55e]">ACTIVE</span>
                      </div>
                    ) : (
                      <div className="text-sm text-[#555]">No active plan</div>
                    )}
                  </div>

                  {/* Plan selector */}
                  <div className="flex flex-col gap-2">
                    <div className="text-sm font-semibold text-[#ccc]">Assign Plan</div>
                    <div className="flex flex-col gap-2">
                      {plans.map(p => {
                        const isCurrent  = currentSub?.plans?.id === p.id;
                        const isSelected = selectedPlan === p.id;
                        return (
                          <button key={p.id} onClick={() => setSelectedPlan(p.id)}
                            className="w-full text-left px-4 py-3 rounded-xl border transition-all cursor-pointer"
                            style={{
                              background:   isSelected ? "rgba(124,92,252,0.12)" : "rgba(255,255,255,0.03)",
                              borderColor:  isSelected ? "rgba(124,92,252,0.5)"  : "rgba(255,255,255,0.08)",
                            }}>
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm font-semibold text-white">{p.name}</span>
                                {isCurrent && <span className="ml-2 text-[10px] text-[#22c55e] font-bold">current</span>}
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-[#f5c518] font-semibold">{p.credits.toLocaleString()} cr/mo</div>
                                <div className="text-[11px] text-[#555]">${p.price_monthly}/mo</div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Billing cycle */}
                  <div className="flex flex-col gap-2">
                    <div className="text-sm font-semibold text-[#ccc]">Billing Cycle</div>
                    <div className="flex gap-2">
                      {["monthly", "annual"].map(c => (
                        <button key={c} onClick={() => setBillCycle(c)}
                          className="flex-1 py-2 rounded-lg text-sm font-medium border transition-all cursor-pointer capitalize"
                          style={{
                            background:  billCycle === c ? "rgba(124,92,252,0.15)" : "rgba(255,255,255,0.03)",
                            borderColor: billCycle === c ? "rgba(124,92,252,0.5)"  : "rgba(255,255,255,0.08)",
                            color:       billCycle === c ? "#a78bfa" : "#666",
                          }}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grant credits toggle */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className={`w-10 h-5 rounded-full transition-colors relative ${grantCreds ? "bg-[#7c5cfc]" : "bg-white/10"}`}
                      onClick={() => setGrantCreds(v => !v)}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${grantCreds ? "translate-x-5" : "translate-x-0.5"}`} />
                    </div>
                    <div>
                      <div className="text-sm text-[#ccc]">Grant plan credits now</div>
                      <div className="text-xs text-[#555]">
                        {grantCreds
                          ? `Will add ${plans.find(p => p.id === selectedPlan)?.credits?.toLocaleString() ?? "?"} credits to balance`
                          : "Subscription only — no credits added"}
                      </div>
                    </div>
                  </label>

                  <button onClick={handleChangePlan} disabled={saving || !selectedPlan}
                    className="w-full py-2.5 rounded-lg text-white font-semibold text-sm cursor-pointer disabled:opacity-50 transition-colors"
                    style={{ background: saving ? "rgba(124,92,252,0.4)" : "#7c5cfc" }}>
                    {saving ? "Saving…" : currentSub ? "Change Plan" : "Assign Plan"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* History tab */}
          {tab === "history" && (
            <div>
              {histLoading ? (
                <div className="text-[#555] text-sm animate-pulse py-4">Loading transactions…</div>
              ) : history.length === 0 ? (
                <div className="text-[#444] text-sm py-4">No transactions found.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {history.map((tx, i) => (
                    <div key={tx.id || i} className="bg-white/[0.03] border border-white/[0.05] rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[#aaa] truncate">{tx.description || tx.action || tx.type}</div>
                        <div className="text-xs text-[#555] mt-0.5">{fmtDateTime(tx.created_at)}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-base font-semibold" style={{ color: txColor(tx.type) }}>
                          {tx.amount > 0 ? "+" : ""}{tx.amount}
                        </div>
                        {tx.balance_after !== null && tx.balance_after !== undefined && (
                          <div className="text-xs text-[#444]">→ {tx.balance_after}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main ── */
export default function UserManager() {
  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [sortBy,       setSortBy]       = useState("created_at");
  const [sortDir,      setSortDir]      = useState("desc");
  const [editUser,     setEditUser]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // user to delete
  const [deleting,     setDeleting]     = useState(false);
  const [suspending,   setSuspending]   = useState(null); // userId being toggled
  const [creditTarget, setCreditTarget] = useState(null); // userId for inline credit adjust
  const [creditAmt,    setCreditAmt]    = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await serverFetch("/api/admin/users");
        if (!res.ok) throw new Error(await res.text());
        setUsers(await res.json());
      } catch (e) {
        console.error("[admin] UserManager load failed:", e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleUpdated(updated) {
    setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u));
    if (editUser?.id === updated.id) setEditUser(u => ({ ...u, ...updated }));
  }

  async function handleDelete(user) {
    setDeleting(true);
    try {
      const res = await serverFetch("/api/admin/delete-user", {
        method: "POST",
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setUsers(prev => prev.filter(u => u.id !== user.id));
      setDeleteTarget(null);
    } catch (e) {
      showToast("Delete failed: " + e.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleSuspend(user) {
    const suspend = !user.banned_until;
    setSuspending(user.id);
    try {
      const res = await serverFetch("/api/admin/suspend-user", {
        method: "POST",
        body: JSON.stringify({ userId: user.id, suspend }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, banned_until: suspend ? "suspended" : null } : u));
    } catch (e) {
      showToast("Suspend failed: " + e.message);
    } finally {
      setSuspending(null);
    }
  }

  async function handleQuickCredits(user) {
    const n = parseInt(creditAmt, 10);
    if (!n || n === 0) return;
    try {
      const res = await serverFetch("/api/admin/add-credits", {
        method: "POST",
        body: JSON.stringify({ userId: user.id, amount: n, reason: "Admin quick adjust" }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, balance: (u.balance ?? 0) + n } : u));
      setCreditTarget(null);
      setCreditAmt("");
    } catch (e) {
      showToast("Credits failed: " + e.message);
    }
  }

  /* Sort + filter */
  const filtered = users
    .filter(u => !search || u.email?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let va = a[sortBy] ?? "";
      let vb = b[sortBy] ?? "";
      if (sortBy === "balance" || sortBy === "lifetime_credits") {
        va = va ?? -1; vb = vb ?? -1;
        return sortDir === "asc" ? va - vb : vb - va;
      }
      return sortDir === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });

  function toggleSort(col) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  }

  function SortTh({ col, children }) {
    const active = sortBy === col;
    return (
      <th onClick={() => toggleSort(col)}
        className={`px-3 py-2 cursor-pointer select-none whitespace-nowrap font-medium hover:text-white transition-colors
          ${active ? "text-[#a78bfa]" : "text-[#555]"}`}>
        {children} {active ? (sortDir === "asc" ? "↑" : "↓") : ""}
      </th>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-2 gap-4 flex-wrap">
        <h1 className="text-4xl font-bold">Users</h1>
        <div className="text-sm text-[#666]">{filtered.length} / {users.length} users</div>
      </div>
      <p className="text-[#888] text-lg mb-6">
        Manage roles, credits, and view transaction history.
      </p>

      {/* Search bar */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="Search by email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[220px] px-4 py-2.5 bg-[#111118] border border-white/[0.08] rounded-xl text-white text-base outline-none focus:border-[#7c5cfc] placeholder-[#444]"
        />
        {search && (
          <button onClick={() => setSearch("")}
            className="px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-[#888] text-sm cursor-pointer hover:text-white transition-colors">
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-[#666] text-xl animate-pulse">Loading…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-base min-w-[700px]">
            <thead>
              <tr className="border-b border-white/[0.08] text-left text-sm">
                <SortTh col="email">Email</SortTh>
                <SortTh col="role">Role</SortTh>
                <SortTh col="plan">Plan</SortTh>
                <SortTh col="balance">Balance</SortTh>
                <SortTh col="lifetime_credits">Lifetime</SortTh>
                <SortTh col="last_sign_in_at">Last Sign In</SortTh>
                <SortTh col="created_at">Joined</SortTh>
                <th className="px-3 py-2 text-[#555] font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
                  <td className="px-3 py-3 text-[#e8e8f0] max-w-[220px] truncate">{u.email}</td>
                  <td className="px-3 py-3">
                    {u.role === "admin"
                      ? <span className="text-[#f5c518] text-xs font-bold bg-[#f5c518]/10 px-2 py-0.5 rounded-full">admin</span>
                      : <span className="text-[#555] text-xs">user</span>}
                  </td>
                  <td className="px-3 py-3">
                    {u.plan
                      ? <span className="text-[#a78bfa] text-xs font-semibold bg-[#7c5cfc]/10 px-2 py-0.5 rounded-full">{u.plan}</span>
                      : <span className="text-[#444] text-xs">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`font-semibold text-sm ${u.balance === null ? "text-[#444]" : u.balance < 10 ? "text-[#f97316]" : "text-[#7c5cfc]"}`}>
                      {u.balance !== null ? `⚡ ${u.balance}` : "—"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[#666] text-sm">{u.lifetime_credits ?? "—"}</td>
                  <td className="px-3 py-3 text-[#666] text-sm whitespace-nowrap">{fmtDate(u.last_sign_in_at)}</td>
                  <td className="px-3 py-3 text-[#666] text-sm whitespace-nowrap">{fmtDate(u.created_at)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Edit */}
                      <button onClick={() => setEditUser(u)}
                        className="px-2.5 py-1.5 bg-white/[0.05] border border-white/10 rounded-lg text-[#aaa] text-xs cursor-pointer hover:bg-[#7c5cfc]/20 hover:text-[#a78bfa] hover:border-[#7c5cfc]/40 transition-colors">
                        Edit
                      </button>

                      {/* Suspend */}
                      <button
                        onClick={() => handleSuspend(u)}
                        disabled={suspending === u.id}
                        className="px-2.5 py-1.5 rounded-lg text-xs cursor-pointer border transition-colors disabled:opacity-50"
                        style={u.banned_until
                          ? { background: "rgba(245,197,24,0.08)", borderColor: "rgba(245,197,24,0.3)", color: "#f5c518" }
                          : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)", color: "#888" }}>
                        {suspending === u.id ? "…" : u.banned_until ? "Unsuspend" : "Suspend"}
                      </button>

                      {/* Quick credits */}
                      {creditTarget === u.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            type="number"
                            placeholder="±amt"
                            value={creditAmt}
                            onChange={e => setCreditAmt(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleQuickCredits(u); if (e.key === "Escape") { setCreditTarget(null); setCreditAmt(""); } }}
                            className="w-16 px-2 py-1 bg-[#0d0d14] border border-[#22c55e]/40 rounded-lg text-white text-xs outline-none"
                          />
                          <button onClick={() => handleQuickCredits(u)}
                            className="px-2 py-1.5 bg-[#22c55e]/15 border border-[#22c55e]/30 rounded-lg text-[#22c55e] text-xs cursor-pointer hover:bg-[#22c55e]/25 transition-colors">
                            ✓
                          </button>
                          <button onClick={() => { setCreditTarget(null); setCreditAmt(""); }}
                            className="px-2 py-1.5 bg-white/[0.03] border border-white/10 rounded-lg text-[#666] text-xs cursor-pointer hover:text-white transition-colors">
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setCreditTarget(u.id); setCreditAmt(""); }}
                          className="px-2.5 py-1.5 bg-transparent border border-[#22c55e]/20 rounded-lg text-[#22c55e] text-xs cursor-pointer hover:bg-[#22c55e]/20 transition-colors">
                          ⚡ Credits
                        </button>
                      )}

                      {/* Delete */}
                      <button onClick={() => setDeleteTarget(u)}
                        className="px-2.5 py-1.5 bg-red-500/[0.08] border border-red-500/20 rounded-lg text-red-400 text-xs cursor-pointer hover:bg-red-500/20 transition-colors">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-8 text-[#444] text-center">
                  {search ? `No users matching "${search}"` : "No users found."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onUpdated={handleUpdated}
        />
      )}

      {/* Delete confirm dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[1000]"
          onClick={e => e.target === e.currentTarget && !deleting && setDeleteTarget(null)}>
          <div className="bg-[#16161f] border border-red-500/20 rounded-2xl w-[400px] p-7 flex flex-col gap-5">
            <div>
              <div className="text-lg font-bold text-white mb-1">Delete User</div>
              <div className="text-sm text-[#888]">This is irreversible. All data — projects, images, credits, and the account — will be permanently deleted.</div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
              <div className="text-xs text-[#555] mb-0.5">User</div>
              <div className="text-sm text-white font-mono truncate">{deleteTarget.email}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                className="flex-1 py-2.5 bg-white/[0.05] border border-white/10 rounded-lg text-[#888] text-sm cursor-pointer hover:text-white transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteTarget)} disabled={deleting}
                className="flex-1 py-2.5 bg-red-500/20 border border-red-500/40 rounded-lg text-red-400 text-sm font-semibold cursor-pointer hover:bg-red-500/30 transition-colors disabled:opacity-50">
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
