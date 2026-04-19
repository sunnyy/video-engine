/**
 * Pricing.jsx
 * src/pages/Pricing.jsx
 * Public pricing page — fetches live plans + live USD→INR rate from server.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SERVER } from "../services/serverApi";

const FALLBACK_RATE = 83;

function calcPrice(base, discountPct) {
  if (!discountPct) return base;
  return +(base * (1 - discountPct / 100)).toFixed(2);
}

function toINR(usd, rate) { return Math.round(usd * rate); }

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#f5c518" stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}

export default function Pricing() {
  const navigate = useNavigate();
  const [plans,   setPlans]   = useState([]);
  const [cycle,   setCycle]   = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [rate,    setRate]    = useState(FALLBACK_RATE);

  useEffect(() => {
    fetch(`${SERVER}/api/plans`)
      .then(r => r.json())
      .then(d => { setPlans(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { setError("Failed to load plans."); setLoading(false); });

    fetch(`${SERVER}/api/exchange-rate`)
      .then(r => r.json())
      .then(d => { if (d?.rate) setRate(d.rate); })
      .catch(() => {});
  }, []);

  const activePlans = plans.sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99));

  const getUSD = (plan) => {
    const base = cycle === "annual" && plan.price_annual ? plan.price_annual : plan.price_monthly;
    return calcPrice(base, plan.discount_percent);
  };
  const getUSDOriginal = (plan) => cycle === "annual" && plan.price_annual ? plan.price_annual : plan.price_monthly;

  const handleCTA = (plan) => navigate(`/checkout?plan=${plan.slug}&cycle=${cycle}`);

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b10", color: "#e8e8f0", fontFamily: "'Outfit', sans-serif" }}>

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 40px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <a href="/" style={{ textDecoration: "none" }}>
          <img src="/assets/images/logo.png" alt="Vidquence" style={{ height: 48, width: "auto" }} />
        </a>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <a href="/" style={{ color: "#9494a8", textDecoration: "none", fontSize: 15 }}>Home</a>
          <button
            onClick={() => navigate("/login")}
            style={{ background: "#f5c518", color: "#0b0b10", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Header */}
      <div style={{ textAlign: "center", padding: "64px 24px 40px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#f5c518", marginBottom: 16, fontFamily: "'JetBrains Mono',monospace" }}>
          Pricing
        </div>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(48px, 8vw, 88px)", lineHeight: 1, color: "#e8e8f0", margin: "0 0 16px" }}>
          Simple pricing.<br /><span style={{ color: "#f5c518" }}>No surprises.</span>
        </h1>
        <p style={{ fontSize: 18, color: "#9494a8", margin: "0 auto 40px", maxWidth: 480 }}>
          Pick a plan, start creating. Upgrade or cancel anytime.
        </p>

        {/* Billing toggle */}
        <div style={{ display: "inline-flex", background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 4, gap: 4, marginBottom: 8 }}>
          {["monthly", "annual"].map(c => (
            <button key={c} onClick={() => setCycle(c)}
              style={{
                padding: "8px 24px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 14, fontWeight: 700, fontFamily: "'Outfit',sans-serif",
                background: cycle === c ? "#f5c518" : "transparent",
                color:      cycle === c ? "#0b0b10" : "#9494a8",
                transition: "all 0.15s",
              }}>
              {c === "monthly" ? "Monthly" : "Annual"}
              {c === "annual" && <span style={{ fontSize: 11, marginLeft: 6, color: cycle === "annual" ? "#0b0b10" : "#f5c518" }}>Save more</span>}
            </button>
          ))}
        </div>

        {/* Live rate note */}
        <div style={{ fontSize: 12, color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>
          Live rate: 1 USD = ₹{rate.toFixed(2)}
        </div>
      </div>

      {/* Plans */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px" }}>
        {loading && (
          <div style={{ textAlign: "center", color: "#55556a", fontSize: 16, padding: "60px 0" }}>Loading plans…</div>
        )}
        {error && (
          <div style={{ textAlign: "center", color: "#f87171", fontSize: 14, padding: "40px 0" }}>{error}</div>
        )}

        {!loading && !error && activePlans.length === 0 && (
          <div style={{ textAlign: "center", color: "#55556a", fontSize: 16, padding: "60px 0" }}>No plans available yet.</div>
        )}

        {!loading && activePlans.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(activePlans.length, 3)}, 1fr)`,
            gap: 24,
          }}>
            {activePlans.map(plan => {
              const usdPrice    = getUSD(plan);
              const usdOriginal = getUSDOriginal(plan);
              const inrPrice    = toINR(usdPrice, rate);
              const inrOriginal = toINR(usdOriginal, rate);
              const saved       = plan.discount_percent > 0;
              const isPopular   = plan.is_popular;
              const features    = Array.isArray(plan.features) ? plan.features : [];

              return (
                <div key={plan.id} style={{
                  background:    isPopular ? "rgba(245,197,24,0.04)" : "#111118",
                  border:        isPopular ? "2px solid #f5c518" : "1px solid rgba(255,255,255,0.08)",
                  borderRadius:  20,
                  padding:       "32px 28px",
                  display:       "flex",
                  flexDirection: "column",
                  gap:           20,
                  position:      "relative",
                }}>
                  {isPopular && (
                    <div style={{
                      position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                      background: "#f5c518", color: "#0b0b10",
                      fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase",
                      padding: "4px 16px", borderRadius: 99,
                      display: "flex", alignItems: "center", gap: 5,
                    }}>
                      <StarIcon /> Most Popular
                    </div>
                  )}

                  {/* Plan name */}
                  <div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: "#e8e8f0", lineHeight: 1, marginBottom: 4 }}>
                      {plan.name}
                    </div>
                    {plan.description && (
                      <div style={{ fontSize: 14, color: "#9494a8" }}>{plan.description}</div>
                    )}
                  </div>

                  {/* Price — USD primary, INR secondary */}
                  <div>
                    {saved && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, color: "#55556a", textDecoration: "line-through" }}>
                          ${usdOriginal}{cycle === "annual" ? "/yr" : "/mo"}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, background: "rgba(245,197,24,0.15)", color: "#f5c518", padding: "2px 8px", borderRadius: 99 }}>
                          Save {plan.discount_percent}%
                        </span>
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 56, color: isPopular ? "#f5c518" : "#e8e8f0", lineHeight: 1 }}>
                        ${usdPrice}
                      </span>
                      <span style={{ fontSize: 15, color: "#9494a8", paddingBottom: 8 }}>
                        /{cycle === "annual" ? "yr" : "mo"}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "#55556a", marginTop: 2 }}>
                      {saved
                        ? <>≈ <s>₹{inrOriginal}</s> ₹{inrPrice}{cycle === "annual" ? "/yr" : "/mo"}</>
                        : <>≈ ₹{inrPrice}{cycle === "annual" ? "/yr" : "/mo"}</>
                      }
                    </div>
                  </div>

                  {/* Credits */}
                  <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#e8e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#9494a8" }}>Credits included</span>
                    <span style={{ fontWeight: 700, color: "#f5c518" }}>⚡ {plan.credits}</span>
                  </div>

                  {/* Features */}
                  {features.length > 0 && (
                    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                      {features.map((f, i) => (
                        <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#c8c8d8" }}>
                          <span style={{ color: "#f5c518", flexShrink: 0, marginTop: 1 }}>✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* CTA */}
                  <button
                    onClick={() => handleCTA(plan)}
                    style={{
                      marginTop:    "auto",
                      background:   isPopular ? "#f5c518" : "rgba(245,197,24,0.1)",
                      color:        isPopular ? "#0b0b10" : "#f5c518",
                      border:       isPopular ? "none" : "1px solid rgba(245,197,24,0.3)",
                      borderRadius: 10,
                      padding:      "14px 0",
                      fontSize:     16,
                      fontWeight:   700,
                      cursor:       "pointer",
                      fontFamily:   "'Outfit', sans-serif",
                      transition:   "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#f5c518"; e.currentTarget.style.color = "#0b0b10"; }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = isPopular ? "#f5c518" : "rgba(245,197,24,0.1)";
                      e.currentTarget.style.color      = isPopular ? "#0b0b10" : "#f5c518";
                    }}
                  >
                    Get Started
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Reassurance */}
        <div style={{ textAlign: "center", marginTop: 48, display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
          {["Cancel anytime", "No hidden fees", "Instant access"].map(t => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#55556a" }}>
              <span style={{ color: "#f5c518" }}>✓</span> {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
