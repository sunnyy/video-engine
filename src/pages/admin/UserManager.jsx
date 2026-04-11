/**
 * UserManager.jsx
 */
import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { serverFetch } from "../../services/serverApi";

function CreditModal({ userId, onClose, onSuccess }) {
  const [amount,  setAmount]  = useState("");
  const [reason,  setReason]  = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const n = parseInt(amount, 10);
    if (!n || n <= 0) { setError("Enter a positive number."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await serverFetch("/api/admin/add-credits", {
        method: "POST",
        body: JSON.stringify({ userId, amount: n, reason }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      onSuccess(userId, n);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]">
      <form onSubmit={handleSubmit}
        className="bg-[#16161f] border border-white/10 rounded-xl p-7 w-[360px] flex flex-col gap-4">
        <h3 className="text-xl font-bold m-0">Add Credits</h3>
        <div className="text-sm text-[#888] font-mono break-all">{userId}</div>

        <label className="text-base text-[#ccc]">Amount
          <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)}
            className="block w-full mt-1.5 px-3 py-2 bg-[#0d0d14] border border-white/10 rounded-lg text-white text-base outline-none focus:border-[#7c5cfc]" />
        </label>

        <label className="text-base text-[#ccc]">Reason (optional)
          <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. support refund"
            className="block w-full mt-1.5 px-3 py-2 bg-[#0d0d14] border border-white/10 rounded-lg text-white text-base outline-none focus:border-[#7c5cfc]" />
        </label>

        {error && <div className="text-[#f97316] text-base">{error}</div>}

        <div className="flex gap-2.5 justify-end">
          <button type="button" onClick={onClose}
            className="px-4 py-2 bg-transparent border border-white/10 rounded-lg text-[#aaa] text-base cursor-pointer hover:bg-white/5">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="px-4 py-2 bg-[#7c5cfc] border-none rounded-lg text-white font-semibold text-base cursor-pointer disabled:opacity-60">
            {loading ? "Adding…" : "Add Credits"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function UserManager() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await serverFetch("/api/admin/users");
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setUsers(data);
      } catch (e) {
        console.error("[admin] UserManager load failed:", e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleCreditSuccess(userId, amount) {
    setUsers(prev => prev.map(u =>
      u.id === userId
        ? { ...u, balance: (u.balance ?? 0) + amount, lifetime_credits: (u.lifetime_credits ?? 0) + amount }
        : u
    ));
  }

  return (
    <AdminLayout>
      <h1 className="text-4xl font-bold mb-2">Users</h1>
      <p className="text-[#aaa] text-lg mb-10">
        {users.length} user{users.length !== 1 ? "s" : ""} from{" "}
        <code className="text-[#7c5cfc]">auth.users</code>
      </p>

      {loading ? (
        <div className="text-[#888] text-lg">Loading...</div>
      ) : (
        <table className="w-full border-collapse text-base">
          <thead>
            <tr className="border-b border-white/[0.08] text-[#888] text-left">
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Balance</th>
              <th className="px-3 py-2">Lifetime</th>
              <th className="px-3 py-2">Last Sign In</th>
              <th className="px-3 py-2">Joined</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="px-3 py-3 text-[#e8e8f0]">{u.email}</td>
                <td className="px-3 py-3">
                  {u.role === "admin"
                    ? <span className="text-[#f5c518] text-sm font-bold bg-[#f5c518]/10 px-1.5 py-0.5 rounded">admin</span>
                    : <span className="text-[#666] text-sm">user</span>}
                </td>
                <td className="px-3 py-3">
                  <span className={`font-semibold ${u.balance !== null ? (u.balance < 10 ? "text-[#f97316]" : "text-[#7c5cfc]") : "text-[#555]"}`}>
                    {u.balance !== null ? `⚡ ${u.balance}` : "—"}
                  </span>
                </td>
                <td className="px-3 py-3 text-[#888]">{u.lifetime_credits ?? "—"}</td>
                <td className="px-3 py-3 text-[#888]">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "—"}</td>
                <td className="px-3 py-3 text-[#888]">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-3 py-3">
                  <button onClick={() => setModal(u.id)}
                    className="px-3 py-1.5 bg-[#7c5cfc]/15 border border-[#7c5cfc]/30 rounded-lg text-[#7c5cfc] text-sm cursor-pointer hover:bg-[#7c5cfc]/25 transition-colors">
                    + Credits
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-[#555]">No users found.</td></tr>
            )}
          </tbody>
        </table>
      )}

      {modal && (
        <CreditModal
          userId={modal}
          onClose={() => setModal(null)}
          onSuccess={handleCreditSuccess}
        />
      )}
    </AdminLayout>
  );
}
