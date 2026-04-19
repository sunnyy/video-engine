/**
 * Checkout.jsx
 * src/pages/Checkout.jsx
 * Auth-protected checkout with Razorpay payment.
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SERVER, serverFetch } from "../services/serverApi";
import { supabase } from "../lib/supabase";
import { useCreditsStore } from "../store/useCreditsStore";

const USD_TO_INR = 83;

function calcPrice(base, discountPct) {
  if (!discountPct) return base;
  return +(base * (1 - discountPct / 100)).toFixed(2);
}

function toINR(usd) {
  return Math.round(usd * USD_TO_INR);
}

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

export default function Checkout() {
  const navigate        = useNavigate();
  const [params]        = useSearchParams();
  const slug            = params.get("plan") || "";
  const [cycle, setCycle] = useState(params.get("cycle") === "annual" ? "annual" : "monthly");

  const { fetchCredits } = useCreditsStore();

  const [plan,    setPlan]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying,  setPaying]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(null); // { credits, balance }

  useEffect(() => {
    fetch(`${SERVER}/api/plans`)
      .then(r => r.json())
      .then(plans => {
        const found = (Array.isArray(plans) ? plans : []).find(p => p.slug === slug);
        if (!found) setError("Plan not found. Please go back and choose a plan.");
        else setPlan(found);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load plan details."); setLoading(false); });
  }, [slug]);

  // Redirect after success
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => navigate("/dashboard"), 3000);
    return () => clearTimeout(t);
  }, [success, navigate]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0b0b10", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#55556a", fontSize: 16, fontFamily: "'Outfit',sans-serif" }}>Loading…</div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div style={{ minHeight: "100vh", background: "#0b0b10", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: "'Outfit',sans-serif" }}>
        <div style={{ color: "#f87171", fontSize: 16 }}>{error || "Plan not found."}</div>
        <button onClick={() => navigate("/pricing")}
          style={{ background: "#f5c518", color: "#0b0b10", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          View Plans
        </button>
      </div>
    );
  }

  const basePrice    = cycle === "annual" && plan.price_annual ? plan.price_annual : plan.price_monthly;
  const finalUSD     = calcPrice(basePrice, plan.discount_percent);
  const finalINR     = toINR(finalUSD);
  const originalINR  = toINR(basePrice);
  const saved        = plan.discount_percent > 0;
  const features     = Array.isArray(plan.features) ? plan.features : [];
  const cycleLabel   = cycle === "annual" ? "year" : "month";

  async function handlePay() {
    setError("");
    setPaying(true);
    try {
      // 1. Get Razorpay order from server
      const orderRes = await serverFetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planSlug: slug, billingCycle: cycle }),
      });
      if (!orderRes.ok) {
        const e = await orderRes.json();
        throw new Error(e.error || "Failed to create order");
      }
      const { orderId, amount, currency, keyId, planName } = await orderRes.json();

      // 2. Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Razorpay failed to load. Check your connection.");

      // 3. Get user info for prefill
      const { data: { user } } = await supabase.auth.getUser();

      // 4. Open Razorpay modal
      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key:         keyId,
          amount,
          currency,
          name:        "Vidquence",
          description: `${planName} Plan`,
          order_id:    orderId,
          prefill: {
            email: user?.email || "",
            name:  user?.user_metadata?.full_name || user?.user_metadata?.name || "",
          },
          theme: { color: "#f5c518" },
          modal: {
            ondismiss: () => reject(new Error("Payment cancelled")),
          },
          handler: async (response) => {
            try {
              // 5. Verify payment on server
              const verifyRes = await serverFetch("/api/payments/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id:   response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature:  response.razorpay_signature,
                  planSlug:            slug,
                  billingCycle:        cycle,
                }),
              });
              if (!verifyRes.ok) {
                const e = await verifyRes.json();
                reject(new Error(e.error || "Payment verification failed"));
                return;
              }
              const data = await verifyRes.json();
              // Refresh credits in store
              fetchCredits();
              resolve(data);
            } catch (e) {
              reject(e);
            }
          },
        });
        rzp.open();
      }).then(data => {
        setSuccess(data);
      }).catch(err => {
        if (err.message !== "Payment cancelled") setError(err.message);
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setPaying(false);
    }
  }

  /* ── Success screen ── */
  if (success) {
    return (
      <div style={{ minHeight: "100vh", background: "#0b0b10", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, fontFamily: "'Outfit',sans-serif", textAlign: "center", padding: 32 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(34,197,94,0.15)", border: "2px solid #22c55e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>✓</div>
        <div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 48, color: "#e8e8f0", lineHeight: 1 }}>Payment Successful!</div>
          <div style={{ fontSize: 16, color: "#9494a8", marginTop: 8 }}>
            <span style={{ color: "#f5c518", fontWeight: 700 }}>⚡ {success.credits} credits</span> have been added to your account.
          </div>
          <div style={{ fontSize: 14, color: "#55556a", marginTop: 4 }}>New balance: {success.balance} credits</div>
        </div>
        <div style={{ fontSize: 14, color: "#55556a" }}>Redirecting to dashboard…</div>
      </div>
    );
  }

  /* ── Main checkout layout ── */
  return (
    <div style={{ minHeight: "100vh", background: "#0b0b10", color: "#e8e8f0", fontFamily: "'Outfit', sans-serif" }}>

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 40px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => navigate("/pricing")}
          style={{ background: "none", border: "none", color: "#9494a8", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'Outfit',sans-serif" }}>
          ← Back to Pricing
        </button>
        <a href="/" style={{ textDecoration: "none" }}>
          <img src="/assets/images/logo.png" alt="Vidquence" style={{ height: 40, width: "auto" }} />
        </a>
        <div style={{ width: 120 }} />
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "start" }}>

        {/* ── Order Summary ── */}
        <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "32px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#55556a", fontFamily: "'JetBrains Mono',monospace", marginBottom: 8 }}>
              Order Summary
            </div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, color: "#e8e8f0", lineHeight: 1 }}>{plan.name}</div>
            {plan.description && <div style={{ fontSize: 14, color: "#9494a8", marginTop: 4 }}>{plan.description}</div>}
          </div>

          {/* Billing toggle */}
          <div style={{ display: "inline-flex", background: "#0b0b10", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 4, gap: 4 }}>
            {["monthly", "annual"].map(c => (
              <button key={c} onClick={() => setCycle(c)}
                style={{
                  padding: "7px 18px", borderRadius: 7, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 700, fontFamily: "'Outfit',sans-serif",
                  background: cycle === c ? "#f5c518" : "transparent",
                  color:      cycle === c ? "#0b0b10" : "#9494a8",
                }}>
                {c === "monthly" ? "Monthly" : "Annual"}
                {c === "annual" && <span style={{ fontSize: 10, marginLeft: 5, color: cycle === "annual" ? "#0b0b10" : "#f5c518" }}>Save more</span>}
              </button>
            ))}
          </div>

          <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

          {/* Pricing breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {saved && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ color: "#9494a8" }}>Original</span>
                  <span style={{ color: "#55556a", textDecoration: "line-through" }}>₹{originalINR}/{cycleLabel}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ color: "#9494a8" }}>Discount</span>
                  <span style={{ color: "#22c55e", fontWeight: 600 }}>−{plan.discount_percent}%</span>
                </div>
              </>
            )}
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: 800 }}>
              <span style={{ color: "#e8e8f0" }}>Total</span>
              <span style={{ color: "#f5c518" }}>₹{finalINR}/{cycleLabel}</span>
            </div>
          </div>

          <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

          {/* Credits */}
          <div style={{ background: "rgba(245,197,24,0.06)", border: "1px solid rgba(245,197,24,0.15)", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, color: "#9494a8" }}>Credits included</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#f5c518" }}>⚡ {plan.credits}/mo</span>
          </div>

          {/* Features */}
          {features.length > 0 && (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
              {features.map((f, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#c8c8d8" }}>
                  <span style={{ color: "#f5c518", flexShrink: 0 }}>✓</span>{f}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Payment ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#55556a", fontFamily: "'JetBrains Mono',monospace", marginBottom: 8 }}>
              Payment
            </div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: "#e8e8f0" }}>Complete your order</div>
          </div>

          <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Amount summary */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, color: "#9494a8" }}>{plan.name} · {cycle}</div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 44, color: "#f5c518", lineHeight: 1 }}>₹{finalINR}</div>
                <div style={{ fontSize: 13, color: "#55556a" }}>per {cycleLabel}</div>
              </div>
              <div style={{ fontSize: 40, opacity: 0.6 }}>💳</div>
            </div>

            {error && (
              <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#f87171" }}>
                {error}
              </div>
            )}

            <button
              onClick={handlePay}
              disabled={paying}
              style={{
                background:   paying ? "rgba(245,197,24,0.4)" : "#f5c518",
                color:        "#0b0b10",
                border:       "none",
                borderRadius: 10,
                padding:      "15px 0",
                fontSize:     16,
                fontWeight:   800,
                cursor:       paying ? "not-allowed" : "pointer",
                fontFamily:   "'Outfit', sans-serif",
                transition:   "all 0.15s",
              }}
              onMouseEnter={e => { if (!paying) e.currentTarget.style.background = "#e0b016"; }}
              onMouseLeave={e => { if (!paying) e.currentTarget.style.background = "#f5c518"; }}
            >
              {paying ? "Processing…" : `Pay ₹${finalINR} with Razorpay`}
            </button>

            <div style={{ fontSize: 12, color: "#55556a", textAlign: "center", lineHeight: 1.6 }}>
              Secured by Razorpay · 256-bit SSL encryption<br />
              Cancel anytime from your account.
            </div>
          </div>

          {/* Trust badges */}
          <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
            {["Secure & encrypted", "Cancel anytime", "No hidden fees"].map(t => (
              <div key={t} style={{ fontSize: 12, color: "#55556a", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#f5c518", fontSize: 10 }}>✓</span> {t}
              </div>
            ))}
          </div>

          <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

          <button onClick={() => navigate("/pricing")}
            style={{ background: "none", border: "none", color: "#9494a8", fontSize: 14, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>
            ← Choose a different plan
          </button>
        </div>

      </div>
    </div>
  );
}
