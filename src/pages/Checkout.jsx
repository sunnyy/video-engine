/**
 * Checkout.jsx
 * src/pages/Checkout.jsx
 * Auth-protected checkout — reads ?plan=SLUG&cycle=monthly|annual from URL.
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const SERVER = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

function calcPrice(base, discountPct) {
  if (!discountPct) return base;
  return +(base * (1 - discountPct / 100)).toFixed(2);
}

export default function Checkout() {
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const slug          = params.get("plan") || "";
  const cycle         = params.get("cycle") === "annual" ? "annual" : "monthly";

  const [plan,    setPlan]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    fetch(`${SERVER}/api/plans`)
      .then(r => r.json())
      .then(plans => {
        const found = (Array.isArray(plans) ? plans : []).find(p => p.slug === slug && p.is_active);
        if (!found) setError("Plan not found. Please go back and choose a plan.");
        else setPlan(found);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load plan details."); setLoading(false); });
  }, [slug]);

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

  const basePrice  = cycle === "annual" && plan.price_annual ? plan.price_annual : plan.price_monthly;
  const finalPrice = calcPrice(basePrice, plan.discount_percent);
  const saved      = plan.discount_percent > 0;
  const features   = Array.isArray(plan.features) ? plan.features : [];
  const cycleLabel = cycle === "annual" ? "year" : "month";

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
        <div style={{ width: 120 }} /> {/* spacer */}
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

          <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

          {/* Pricing breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
              <span style={{ color: "#9494a8" }}>Billing cycle</span>
              <span style={{ color: "#e8e8f0", fontWeight: 600, textTransform: "capitalize" }}>{cycle}</span>
            </div>
            {saved && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ color: "#9494a8" }}>Original price</span>
                  <span style={{ color: "#55556a", textDecoration: "line-through" }}>${basePrice}/{cycleLabel}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ color: "#9494a8" }}>Discount</span>
                  <span style={{ color: "#22c55e", fontWeight: 600 }}>−{plan.discount_percent}%</span>
                </div>
              </>
            )}
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 800 }}>
              <span style={{ color: "#e8e8f0" }}>Total</span>
              <span style={{ color: "#f5c518" }}>${finalPrice}/{cycleLabel}</span>
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

        {/* ── Payment Section ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#55556a", fontFamily: "'JetBrains Mono',monospace", marginBottom: 8 }}>
              Payment
            </div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: "#e8e8f0" }}>Complete your order</div>
          </div>

          {/* Payment placeholder */}
          <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 16, alignItems: "center", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, background: "rgba(245,197,24,0.1)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
              💳
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#e8e8f0", marginBottom: 4 }}>Razorpay Integration</div>
              <div style={{ fontSize: 13, color: "#9494a8" }}>Secure payment processing will be available soon.</div>
            </div>

            <button disabled style={{
              width: "100%",
              background: "rgba(245,197,24,0.15)",
              border:     "1px solid rgba(245,197,24,0.25)",
              borderRadius: 10,
              padding:    "14px 0",
              fontSize:   16,
              fontWeight: 700,
              color:      "#9a8520",
              cursor:     "not-allowed",
              fontFamily: "'Outfit', sans-serif",
            }}>
              Complete Payment — Coming Soon
            </button>

            <div style={{ fontSize: 13, color: "#55556a", lineHeight: 1.5 }}>
              You will be charged <strong style={{ color: "#9494a8" }}>${finalPrice}</strong> per {cycleLabel}.<br />
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
