import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreditsStore } from "../store/useCreditsStore";
import { serverFetch } from "../services/serverApi";
import AppLayout from "../ui/AppLayout";


function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function fmtDateFull(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Credits() {
  const navigate = useNavigate();
  const { balance, fetchCredits } = useCreditsStore();

  const [lifetimeCredits, setLifetimeCredits] = useState(null);
  const [transactions,    setTransactions]    = useState([]);
  const [txLoading,       setTxLoading]       = useState(true);
  const [subscription,    setSubscription]    = useState(undefined); // undefined=loading, null=none

  useEffect(() => {
    fetchCredits();
    serverFetch("/api/user/credits")
      .then(r => r.json())
      .then(d => setLifetimeCredits(d.lifetime_credits ?? null))
      .catch(() => {});
    serverFetch("/api/user/transactions")
      .then(r => r.json())
      .then(d => setTransactions(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setTxLoading(false));
    serverFetch("/api/payments/subscription")
      .then(r => r.json())
      .then(d => setSubscription(d.subscription || null))
      .catch(() => setSubscription(null));
  }, []);

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[640px] px-10 py-10">

          <h1 className="text-[20px] font-bold text-[#e8e8f0]" style={{ fontFamily: "'Syne',sans-serif" }}>Credits & Usage</h1>

          <div className="flex flex-col gap-4">

            {/* Balance cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[14px] border p-5 flex flex-col gap-1" style={{ background: "#111118", borderColor: "rgba(255,255,255,0.07)" }}>
                <div className="text-[12px]" style={{ color: "#606078", fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1 }}>CURRENT BALANCE</div>
                <div className="text-[42px] font-bold leading-none mt-1" style={{ color: "#f5c518", fontFamily: "'Syne',sans-serif" }}>{balance ?? "—"}</div>
                <div className="text-[13px]" style={{ color: "#8888a8" }}>credits available</div>
              </div>
              <div className="rounded-[14px] border p-5 flex flex-col gap-1" style={{ background: "#111118", borderColor: "rgba(255,255,255,0.07)" }}>
                <div className="text-[12px]" style={{ color: "#606078", fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1 }}>LIFETIME USED</div>
                <div className="text-[42px] font-bold leading-none mt-1" style={{ color: "#e8e8f0", fontFamily: "'Syne',sans-serif" }}>{lifetimeCredits ?? "—"}</div>
                <div className="text-[13px]" style={{ color: "#8888a8" }}>credits total</div>
              </div>
            </div>

            {/* Current Plan */}
            {subscription === undefined ? (
              <div className="rounded-[14px] border p-5" style={{ background: "#111118", borderColor: "rgba(255,255,255,0.07)" }}>
                <div className="text-[12px] animate-pulse" style={{ color: "#55556a" }}>Loading plan…</div>
              </div>
            ) : subscription ? (
              <div className="rounded-[14px] border p-5 flex flex-col gap-3" style={{ background: "#111118", borderColor: "rgba(245,197,24,0.2)" }}>
                <div className="flex items-center justify-between">
                  <div className="text-[12px] font-bold uppercase tracking-[1.5px]" style={{ color: "#8888a8", fontFamily: "'JetBrains Mono',monospace" }}>Current Plan</div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>ACTIVE</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[18px] font-bold" style={{ color: "#e8e8f0", fontFamily: "'Syne',sans-serif" }}>{subscription.plans?.name || "Plan"}</div>
                    <div className="text-[13px] capitalize" style={{ color: "#9494a8" }}>{subscription.billing_cycle} · ₹{Math.round(subscription.price_paid)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[13px]" style={{ color: "#9494a8" }}>Renews</div>
                    <div className="text-[13px] font-medium" style={{ color: "#e8e8f0" }}>{fmtDateFull(subscription.current_period_end)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[13px]" style={{ color: "#9494a8" }}>
                  <span style={{ color: "#f5c518" }}>⚡</span>
                  {subscription.credits_granted} credits/mo included
                </div>
                <button onClick={() => { window.location.href = "/#pricing"; }}
                  className="text-[13px] font-bold cursor-pointer rounded-[8px] px-4 py-2 border-0 self-start"
                  style={{ background: "rgba(245,197,24,0.1)", color: "#f5c518", fontFamily: "'Outfit',sans-serif" }}>
                  Upgrade Plan →
                </button>
              </div>
            ) : (
              <div className="rounded-[14px] border p-5 flex flex-col gap-3" style={{ background: "#111118", borderColor: "rgba(255,255,255,0.07)" }}>
                <div className="text-[12px] font-bold uppercase tracking-[1.5px]" style={{ color: "#8888a8", fontFamily: "'JetBrains Mono',monospace" }}>Current Plan</div>
                <div className="text-[15px]" style={{ color: "#9494a8" }}>No active subscription</div>
                <button onClick={() => navigate("/pricing")}
                  className="text-[13px] font-bold cursor-pointer rounded-[8px] px-4 py-2 border-0 self-start"
                  style={{ background: "#f5c518", color: "#0b0b10", fontFamily: "'Outfit',sans-serif" }}>
                  View Plans →
                </button>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => navigate("/pricing")}
                className="px-5 py-2 rounded-[8px] text-[14px] font-bold border-0 cursor-pointer"
                style={{ background: "#f5c518", color: "#0b0b10", fontFamily: "'Outfit',sans-serif" }}>
                Buy Credits
              </button>
            </div>

            {/* Transaction history */}
            <div className="rounded-[14px] border p-6 flex flex-col gap-5" style={{ background: "#111118", borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="text-[12px] font-bold uppercase tracking-[1.5px]" style={{ color: "#8888a8", fontFamily: "'JetBrains Mono',monospace" }}>Recent Transactions</div>
              {txLoading ? (
                <div className="text-[13px] animate-pulse" style={{ color: "#55556a" }}>Loading…</div>
              ) : transactions.length === 0 ? (
                <div className="text-[13px]" style={{ color: "#55556a" }}>No transactions yet.</div>
              ) : (
                <div className="flex flex-col gap-1">
                  {transactions.map((tx, i) => (
                    <div key={tx.id || i} className="flex items-center justify-between gap-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] truncate" style={{ color: "#c8c8d8" }}>{tx.description || tx.action || tx.type}</div>
                        <div className="text-[11px] mt-0.5" style={{ color: "#606078", fontFamily: "'JetBrains Mono',monospace" }}>{fmtDate(tx.created_at)}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[14px] font-bold" style={{ color: tx.amount > 0 ? "#22c55e" : "#f97316" }}>
                          {tx.amount > 0 ? "+" : ""}{tx.amount}
                        </div>
                        {tx.balance_after != null && (
                          <div className="text-[11px]" style={{ color: "#55556a" }}>→ {tx.balance_after}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
