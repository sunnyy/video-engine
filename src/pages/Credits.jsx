import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreditsStore } from "../store/useCreditsStore";
import { serverFetch } from "../services/serverApi";
import AppLayout from "../ui/AppLayout";

const FALLBACK_RATE = 92.60;

function loadRazorpayScript() {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

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
  const [subscription,    setSubscription]    = useState(undefined);

  const [packages,     setPackages]     = useState([]);
  const [selectedPkg,  setSelectedPkg]  = useState(null);
  const [topping,      setTopping]      = useState(false);
  const [topupErr,     setTopupErr]     = useState("");
  const [topupSuccess, setTopupSuccess] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(FALLBACK_RATE);

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
    serverFetch("/api/credits/packages")
      .then(r => r.json())
      .then(d => {
        const pkgs = d.packages || [];
        setPackages(pkgs);
        if (pkgs.length >= 2) setSelectedPkg(pkgs[1].id); // default to $10 package
      })
      .catch(() => {});
    serverFetch("/api/exchange-rate")
      .then(r => r.json())
      .then(d => { if (d.rate) setExchangeRate(d.rate); })
      .catch(() => {});
  }, []);

  async function handleTopup() {
    if (!selectedPkg) return;
    setTopping(true); setTopupErr(""); setTopupSuccess(null);
    try {
      const orderRes  = await serverFetch("/api/credits/topup/create-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: selectedPkg, exchangeRate }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Failed to create order");

      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Razorpay failed to load. Check your connection.");

      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key:         orderData.keyId,
          amount:      orderData.amount,
          currency:    orderData.currency,
          name:        "Vidquence",
          description: `Credit Top-up — ${orderData.label}`,
          order_id:    orderData.orderId,
          handler: async (response) => {
            try {
              const verifyRes = await serverFetch("/api/credits/topup/verify", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id:   response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature:  response.razorpay_signature,
                  packageId:           selectedPkg,
                }),
              });
              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) throw new Error(verifyData.error || "Verification failed");
              setTopupSuccess(`${orderData.credits.toLocaleString()} credits added! New balance: ${verifyData.balance.toLocaleString()}`);
              fetchCredits();
              resolve();
            } catch (e) { reject(e); }
          },
          modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
          theme: { color: "#f5c518" },
        });
        rzp.open();
      });
    } catch (e) {
      if (e.message !== "Payment cancelled") setTopupErr(e.message);
    }
    setTopping(false);
  }

  const now = Date.now();
  const periodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end).getTime() : null;
  const isExpired  = subscription && periodEnd && periodEnd < now;
  const daysLeft   = periodEnd && !isExpired ? Math.ceil((periodEnd - now) / 86400000) : null;
  const isExpiring = daysLeft !== null && daysLeft <= 3;

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[640px] px-10 py-10">

          <h1 className="text-[20px] font-bold text-[#e8e8f0]" style={{ fontFamily: "'Outfit',sans-serif" }}>Credits & Usage</h1>

          {/* Plan expiry banners */}
          {isExpired && (
            <div className="rounded-[12px] px-4 py-3 mb-4 flex items-start gap-3" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <span style={{ fontSize: 18, lineHeight: 1.4 }}>⚠️</span>
              <div>
                <div className="text-[14px] font-bold" style={{ color: "#f87171" }}>Your plan has expired</div>
                {balance > 0
                  ? <div className="text-[13px] mt-0.5" style={{ color: "#c8c8d8" }}>You still have <strong style={{ color: "#f5c518" }}>{balance} credits</strong> — they never expire. Renew to unlock premium features and top up.</div>
                  : <div className="text-[13px] mt-0.5" style={{ color: "#c8c8d8" }}>Resubscribe to unlock all features and get fresh credits.</div>
                }
                <button onClick={() => navigate("/pricing")} className="mt-2 text-[12px] font-bold px-3 py-1.5 rounded-[7px] border-0 cursor-pointer" style={{ background: "#ef4444", color: "#fff" }}>
                  Renew Plan →
                </button>
              </div>
            </div>
          )}
          {isExpiring && !isExpired && (
            <div className="rounded-[12px] px-4 py-3 mb-4 flex items-start gap-3" style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.25)" }}>
              <span style={{ fontSize: 18, lineHeight: 1.4 }}>⏳</span>
              <div>
                <div className="text-[14px] font-bold" style={{ color: "#fb923c" }}>Plan expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""}</div>
                {balance > 0
                  ? <div className="text-[13px] mt-0.5" style={{ color: "#c8c8d8" }}>You have <strong style={{ color: "#f5c518" }}>{balance} credits</strong> remaining. Renew now so you don't lose access to premium features.</div>
                  : <div className="text-[13px] mt-0.5" style={{ color: "#c8c8d8" }}>Renew now to keep all features active without interruption.</div>
                }
                <button onClick={() => navigate("/pricing")} className="mt-2 text-[12px] font-bold px-3 py-1.5 rounded-[7px] border-0 cursor-pointer" style={{ background: "#f97316", color: "#fff" }}>
                  Renew Plan →
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4">

            {/* Balance cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[14px] border p-5 flex flex-col gap-1" style={{ background: "#111118", borderColor: "rgba(255,255,255,0.07)" }}>
                <div className="text-[12px]" style={{ color: "#606078", fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1 }}>CURRENT BALANCE</div>
                <div className="text-[42px] font-bold leading-none mt-1" style={{ color: "#f5c518", fontFamily: "'Outfit',sans-serif" }}>{balance ?? "—"}</div>
                <div className="text-[13px]" style={{ color: "#8888a8" }}>credits available</div>
              </div>
              <div className="rounded-[14px] border p-5 flex flex-col gap-1" style={{ background: "#111118", borderColor: "rgba(255,255,255,0.07)" }}>
                <div className="text-[12px]" style={{ color: "#606078", fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1 }}>LIFETIME USED</div>
                <div className="text-[42px] font-bold leading-none mt-1" style={{ color: "#e8e8f0", fontFamily: "'Outfit',sans-serif" }}>{lifetimeCredits ?? "—"}</div>
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
                  {isExpired
                    ? <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>EXPIRED</span>
                    : isExpiring
                      ? <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(249,115,22,0.15)", color: "#fb923c" }}>EXPIRING SOON</span>
                      : <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>ACTIVE</span>
                  }
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[18px] font-bold" style={{ color: "#e8e8f0", fontFamily: "'Outfit',sans-serif" }}>{subscription.plans?.name || "Plan"}</div>
                    <div className="text-[13px] capitalize" style={{ color: "#9494a8" }}>{subscription.billing_cycle} · ${Math.round(subscription.price_paid)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[13px]" style={{ color: "#9494a8" }}>{isExpired ? "Expired" : "Renews"}</div>
                    <div className="text-[13px] font-medium" style={{ color: isExpired ? "#f87171" : "#e8e8f0" }}>{fmtDateFull(subscription.current_period_end)}</div>
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

            {/* Top-up section — paid subscribers only (free accounts can't farm cheap credits) */}
            {subscription && packages.length > 0 && (
              <div className="rounded-[14px] border p-5 flex flex-col gap-4" style={{ background: "#111118", borderColor: "rgba(124,92,252,0.2)" }}>
                <div className="flex items-center justify-between">
                  <div className="text-[12px] font-bold uppercase tracking-[1.5px]" style={{ color: "#8888a8", fontFamily: "'JetBrains Mono',monospace" }}>Top Up Credits</div>
                  <span className="text-[11px]" style={{ color: "#55556a" }}>Never expire</span>
                </div>

                {/* Package grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {packages.map(pkg => {
                    const inrPrice  = Math.round(pkg.priceUSD * exchangeRate);
                    const isSelected = selectedPkg === pkg.id;
                    return (
                      <button key={pkg.id} onClick={() => setSelectedPkg(pkg.id)} style={{
                        padding: "10px 8px", borderRadius: 10, cursor: "pointer", textAlign: "center",
                        background:  isSelected ? "rgba(124,92,252,0.15)" : "rgba(255,255,255,0.03)",
                        border:      isSelected ? "1px solid rgba(124,92,252,0.5)" : "1px solid rgba(255,255,255,0.07)",
                        transition:  "all 0.15s",
                      }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#f5c518", fontFamily: "'Outfit',sans-serif" }}>
                          {pkg.credits.toLocaleString()}
                        </div>
                        <div style={{ fontSize: 10, color: "#9494a8", marginTop: 2 }}>credits</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#e8e8f0", marginTop: 6 }}>
                          ${pkg.priceUSD}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected package summary */}
                {selectedPkg && (() => {
                  const pkg      = packages.find(p => p.id === selectedPkg);
                  const inrPrice = Math.round(pkg.priceUSD * exchangeRate);
                  const newBal   = (balance ?? 0) + pkg.credits;
                  return (
                    <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#9494a8", marginBottom: 4 }}>
                        <span>Current balance</span>
                        <span style={{ color: "#e8e8f0" }}>{(balance ?? 0).toLocaleString()} cr</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#9494a8", marginBottom: 4 }}>
                        <span>Adding</span>
                        <span style={{ color: "#22c55e" }}>+{pkg.credits.toLocaleString()} cr</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: "#e8e8f0", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8, marginTop: 4 }}>
                        <span>New balance</span>
                        <span style={{ color: "#f5c518" }}>{newBal.toLocaleString()} cr</span>
                      </div>
                      <div style={{ marginTop: 8, fontSize: 11, color: "#55556a", textAlign: "right" }}>
                        ${pkg.priceUSD}
                      </div>
                    </div>
                  );
                })()}

                {topupSuccess && (
                  <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", fontSize: 13, color: "#22c55e" }}>
                    ✓ {topupSuccess}
                  </div>
                )}
                {topupErr && (
                  <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", fontSize: 13, color: "#f87171" }}>
                    ✕ {topupErr}
                  </div>
                )}

                <button onClick={handleTopup} disabled={topping || !selectedPkg} style={{
                  padding: "11px 20px", borderRadius: 10, border: "none",
                  cursor:  topping ? "not-allowed" : "pointer",
                  background: topping ? "rgba(124,92,252,0.4)" : "#7c5cfc",
                  color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "'Outfit',sans-serif",
                  opacity: topping ? 0.7 : 1, transition: "opacity 0.15s",
                }}>
                  {topping ? "Processing…" : "Buy Credits →"}
                </button>

                <div style={{ fontSize: 11, color: "#55556a" }}>
                  Credits never expire · Max single purchase $100 · Secure payment via Razorpay
                </div>
              </div>
            )}

            {/* Upgrade prompt for free users */}
            {subscription === null && (
              <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(245,197,24,0.06)", border: "1px solid rgba(245,197,24,0.15)", fontSize: 13, color: "#9494a8" }}>
                ⚡ Credit top-ups are available on paid plans.{" "}
                <button onClick={() => navigate("/pricing")} style={{ background: "none", border: "none", color: "#f5c518", cursor: "pointer", fontWeight: 700, fontSize: 13, padding: 0 }}>
                  Upgrade your plan →
                </button>
              </div>
            )}

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
