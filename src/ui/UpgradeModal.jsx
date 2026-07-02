import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Rocket, Crown, Users, Zap, ShieldCheck, RefreshCcw, Lock, Tag, X, ArrowRight, Check as CheckIcon } from "lucide-react";
import { SERVER } from "../services/serverApi";
import { videoServices } from "../config/serviceCatalog";
import { SERVICE_COST_LABEL, TOOLS_COST_LABEL } from "../config/serviceCostLabels";

/**
 * UpgradeModal — an in-app upgrade prompt shown from the sidebar Upgrade button. Fetches the live
 * plans from /api/plans and hands off to the in-app Checkout (/checkout) instead of bouncing the
 * user to the marketing page.
 *
 * The monthly/annual toggle surfaces a REAL discount (annual is genuinely cheaper than 12× monthly).
 * A featured-coupon discount + countdown is a planned follow-up — this modal is structured so that
 * layer can slot in later without changing the checkout hand-off.
 */

const FALLBACK_RATE = 92.60;
const POPULAR_SLUG = "pro";

// Per-plan icon + accent (visual). Feature structure lives in PLAN_FEATURES below.
const PLAN_META = {
  starter: { Icon: Rocket, accent: "#14b8a6" },
  pro:     { Icon: Crown,  accent: "#7c5cfc" },
  max:     { Icon: Users,  accent: "#f5c518" },
};
const FALLBACK_META = { Icon: Zap, accent: "#7c5cfc" };

// CTA gradient per plan — matches each card's border/accent colour.
const CTA_STYLE = {
  starter: { grad: "linear-gradient(135deg,#2dd4bf,#10b981)", text: "#053024" },
  pro:     { grad: "linear-gradient(135deg,#a78bfa,#7c5cfc)", text: "#fff" },
  max:     { grad: "linear-gradient(135deg,#f5c518,#f97316)", text: "#0b0b12" },
};

// Per-plan feature structure — mirrors the landing pricing cards so the two never drift.
//   excludeServices: video-service keys hidden from the "All video services" list
//   crosses:  "not included" rows (struck through)
//   plusLabel + checks: the "Everything in X, plus:" group
const PLAN_FEATURES = {
  starter: {
    excludeServices: ["video_clipping"],
    checks: ["Credit top-ups anytime"],
    crosses: ["Video clipping (long video → shorts)", "Automation & auto-publish to social"],
  },
  pro: {
    plusLabel: "Everything in Starter, plus:",
    checks: ["Video clipping (long video → shorts)", "Automation & auto-publish to social", "Credit top-ups anytime"],
  },
  max: {
    plusLabel: "Everything in Pro, plus:",
    checks: ["More credits for high-volume output", "Best value — lower cost per credit", "Credit top-ups anytime"],
  },
};

/* ── Feature rows (match the landing helpers) ── */
function FeatCheck({ children }) {
  return (
    <div style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13, color: "#d4d4e0", lineHeight: 1.45 }}>
      <CheckIcon size={15} style={{ color: "#22c55e", flexShrink: 0, marginTop: 1 }} strokeWidth={2.6} />
      <span>{children}</span>
    </div>
  );
}
function FeatCross({ children }) {
  return (
    <div style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13, color: "#6b6b80", lineHeight: 1.45, opacity: 0.85 }}>
      <X size={14} style={{ flexShrink: 0, marginTop: 1 }} strokeWidth={2.6} />
      <span style={{ textDecoration: "line-through" }}>{children}</span>
    </div>
  );
}
function PlusLabel({ children }) {
  return <div style={{ fontSize: 12.5, fontWeight: 700, color: "#e8e8f0", margin: "5px 0 1px" }}>{children}</div>;
}
function ServiceRow({ name, cost }) {
  return (
    <div style={{ display: "flex", gap: 9, alignItems: "center", fontSize: 13, color: "#d4d4e0", lineHeight: 1.45 }}>
      <CheckIcon size={15} style={{ color: "#22c55e", flexShrink: 0 }} strokeWidth={2.6} />
      <span>{name}{cost ? <span style={{ color: "#55667a" }}> ({cost})</span> : null}</span>
    </div>
  );
}
function ServiceList({ exclude = [] }) {
  return (
    <>
      <PlusLabel>All video services</PlusLabel>
      {videoServices().filter(s => !exclude.includes(s.key)).map(s => (
        <ServiceRow key={s.key} name={s.name} cost={SERVICE_COST_LABEL[s.key]} />
      ))}
      <ServiceRow name="10+ AI image & audio tools" cost={TOOLS_COST_LABEL} />
    </>
  );
}

export default function UpgradeModal({ open, onClose }) {
  const navigate = useNavigate();
  const [plans, setPlans] = useState(null);
  const [rate, setRate] = useState(FALLBACK_RATE);
  const [cycle, setCycle] = useState("annual");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Load plans + FX rate once, when first opened.
  useEffect(() => {
    if (!open || plans || err) return;
    setLoading(true);
    Promise.all([
      fetch(`${SERVER}/api/plans`).then(r => { if (!r.ok) throw new Error(`plans ${r.status}`); return r.json(); }),
      fetch(`${SERVER}/api/exchange-rate`).then(r => r.json()).catch(() => ({ rate: FALLBACK_RATE })),
    ]).then(([list, rateData]) => {
      if (rateData?.rate) setRate(rateData.rate);
      const active = (Array.isArray(list) ? list : [])
        .filter(p => p.is_active !== false)
        .sort((a, b) => (a.sort_order ?? a.price_monthly ?? 99) - (b.sort_order ?? b.price_monthly ?? 99));
      if (!active.length) setErr("No plans are available right now.");
      else setPlans(active);
    }).catch(e => setErr(`Couldn't load plans: ${e.message}`))
      .finally(() => setLoading(false));
  }, [open, plans, err]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const annual = cycle === "annual";

  function priceFor(plan) {
    const monthlyUSD = Number(plan.price_monthly || 0);
    const annualUSD  = plan.price_annual ? Number(plan.price_annual) : monthlyUSD * 12;
    const perMonthUSD = annual ? +(annualUSD / 12).toFixed(2) : monthlyUSD;
    const savePct = monthlyUSD > 0 && annualUSD < monthlyUSD * 12
      ? Math.round((1 - annualUSD / (monthlyUSD * 12)) * 100) : 0;
    return { monthlyUSD, annualUSD, perMonthUSD, perMonthINR: Math.round(perMonthUSD * rate), savePct };
  }

  const maxSave = plans ? Math.max(0, ...plans.map(p => priceFor(p).savePct)) : 0;

  function goCheckout(slug) {
    onClose?.();
    navigate(`/checkout?plan=${encodeURIComponent(slug)}&cycle=${cycle}`);
  }

  const modal = (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(6,7,12,0.74)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="upg-modal-scroll"
        style={{ width: "100%", maxWidth: 1140, maxHeight: "92vh", overflowY: "auto", background: "#12121c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 22, boxShadow: "0 30px 90px rgba(0,0,0,0.6)", fontFamily: "'Outfit',sans-serif", color: "#e8eaf0" }}
      >
        {/* Header — glow fades into the body (no hard divider) */}
        <div style={{ position: "relative", overflow: "hidden", padding: "30px 34px 20px", background: "radial-gradient(130% 150% at 15% -20%, rgba(124,92,252,0.28), rgba(18,18,28,0) 60%), #12121c" }}>
          <button onClick={onClose} aria-label="Close"
            style={{ position: "absolute", top: 18, right: 18, zIndex: 2, width: 32, height: 32, borderRadius: 9, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.12)", color: "#c8c8d8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={17} />
          </button>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
            {/* Left */}
            <div style={{ position: "relative", zIndex: 1, maxWidth: 560 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#a78bfa" }}>
                <Crown size={15} style={{ color: "#a78bfa" }} /> Upgrade
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, marginTop: 8, lineHeight: 1.1 }}>
                Unlock <span style={{ background: "linear-gradient(90deg,#a78bfa,#f5c518)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>every</span> tool
              </div>
              <div style={{ fontSize: 14, color: "#9a9ab0", marginTop: 8, lineHeight: 1.5 }}>Every video · image · audio service — plus automation and auto-publishing. Cancel anytime.</div>
            </div>

            {/* Right — decorative art (hidden until the asset exists / on small screens) */}
            <img src="/assets/images/upgrade_modal.png" alt="" aria-hidden="true" className="upg-hero-art"
              onError={e => { e.currentTarget.style.display = "none"; }}
              style={{ position: "relative", zIndex: 1, width: 240, height: 140, objectFit: "contain", flexShrink: 0 }} />
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "26px 34px 30px" }}>
          {loading ? (
            <div style={{ padding: "44px 0", textAlign: "center", color: "#8896a8", fontSize: 14 }}>Loading plans…</div>
          ) : err ? (
            <div style={{ padding: "24px 0", color: "#f87171", fontSize: 14 }}>{err}</div>
          ) : (
            <>
              {/* Cycle toggle */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 26 }}>
                <div style={{ display: "inline-flex", background: "#0b0b12", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, padding: 5, gap: 4 }}>
                  {["annual", "monthly"].map(c => (
                    <button key={c} onClick={() => setCycle(c)}
                      style={{ padding: "9px 24px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                        background: cycle === c ? "linear-gradient(135deg, #f5c518, #f0a500)" : "transparent", color: cycle === c ? "#0b0b10" : "#9494a8" }}>
                      {c === "annual" ? "Annual" : "Monthly"}
                      {c === "annual" && maxSave > 0 && <span style={{ fontSize: 11, marginLeft: 7, color: cycle === "annual" ? "#0b0b10" : "#22c55e", fontWeight: 800 }}>Save {maxSave}%</span>}
                    </button>
                  ))}
                </div>
                {maxSave > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#8896a8" }}>
                    <Tag size={13} style={{ color: "#f5c518" }} /> Save more with annual billing
                  </div>
                )}
              </div>

              {/* Plan cards */}
              <div className="upg-plan-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(plans.length, 3)}, 1fr)`, gap: 18, alignItems: "stretch" }}>
                {plans.map(plan => {
                  const p = priceFor(plan);
                  const slug = plan.slug?.toLowerCase();
                  const popular = slug === POPULAR_SLUG;
                  const meta = PLAN_META[slug] || FALLBACK_META;
                  const { Icon, accent } = meta;
                  const feat = PLAN_FEATURES[slug] || {};
                  const cta = CTA_STYLE[slug] || CTA_STYLE.starter;
                  return (
                    <div key={plan.slug} className={slug === "max" ? "upg-card-max" : undefined}
                      style={{ position: "relative", display: "flex", flexDirection: "column", borderRadius: 18, padding: "26px 24px",
                        ...(slug === "max" ? {} : {
                          background: popular ? "rgba(124,92,252,0.08)" : "#0e0e18",
                          border: `2px solid ${popular ? "#7c5cfc" : accent + "66"}`,
                        }) }}>
                      {popular && (
                        <span style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "#fff", background: "linear-gradient(135deg,#a78bfa,#7c5cfc)", padding: "4px 14px", borderRadius: 99, whiteSpace: "nowrap", boxShadow: "0 4px 14px rgba(124,92,252,0.5)" }}>★ Most Popular</span>
                      )}
                      {slug === "max" && (
                        <span style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0b0b10", background: "linear-gradient(135deg,#f5c518,#f97316)", padding: "4px 14px", borderRadius: 99, whiteSpace: "nowrap", boxShadow: "0 4px 14px rgba(245,150,24,0.5)" }}>★ Best Value</span>
                      )}

                      {/* Icon + name */}
                      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                        <span style={{ width: 46, height: 46, flexShrink: 0, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: `${accent}1c`, border: `1px solid ${accent}3a` }}>
                          <Icon size={22} style={{ color: accent }} strokeWidth={2.2} />
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>{plan.name}</div>
                          {plan.description && <div style={{ fontSize: 12, color: "#8896a8", marginTop: 3, lineHeight: 1.35 }}>{plan.description}</div>}
                        </div>
                      </div>

                      {/* Price */}
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, marginTop: 18 }}>
                        {annual && p.savePct > 0 && (
                          <span style={{ fontSize: 18, color: "#55667a", textDecoration: "line-through", marginBottom: 5 }}>${p.monthlyUSD}</span>
                        )}
                        <span style={{ fontSize: 38, fontWeight: 800, color: "#fff", lineHeight: 1 }}>${p.perMonthUSD}</span>
                        <span style={{ fontSize: 14, color: "#9494a8", marginBottom: 4 }}>/mo</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#55667a", marginTop: 5 }}>
                        {annual ? `$${p.annualUSD.toFixed(0)} billed yearly` : "billed monthly"} · ≈ ₹{p.perMonthINR}/mo
                      </div>

                      {/* Credits pill */}
                      {plan.credits != null && (
                        <div style={{ display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: 7, marginTop: 16, padding: "8px 14px", borderRadius: 99, background: `${accent}1f`, border: `1px solid ${accent}4d` }}>
                          <Zap size={14} style={{ color: accent }} fill={accent} />
                          <span style={{ fontSize: 13.5, fontWeight: 800, color: accent }}>{Number(plan.credits).toLocaleString()} credits / month</span>
                        </div>
                      )}

                      {/* CTA — sits above the feature list */}
                      <button onClick={() => goCheckout(plan.slug)}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", marginTop: 18, padding: "13px 0", borderRadius: 12, cursor: "pointer", fontWeight: 800, fontSize: 14.5, fontFamily: "inherit",
                          background: cta.grad, border: "none", color: cta.text }}>
                        Upgrade to {plan.name} <ArrowRight size={16} />
                      </button>

                      <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "18px 0" }} />

                      {/* Full inclusions list (mirrors landing) */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                        <ServiceList exclude={feat.excludeServices} />
                        {feat.plusLabel && <PlusLabel>{feat.plusLabel}</PlusLabel>}
                        {(feat.checks || []).map((c, i) => <FeatCheck key={`c${i}`}>{c}</FeatCheck>)}
                        {(feat.crosses || []).map((c, i) => <FeatCross key={`x${i}`}>{c}</FeatCross>)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Trust bar */}
              <div style={{ display: "flex", alignItems: "stretch", marginTop: 24, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, background: "#0e0e18", overflow: "hidden" }}>
                {[
                  { Icon: ShieldCheck, label: "Secure checkout" },
                  { Icon: RefreshCcw,  label: "Cancel anytime" },
                  { Icon: Lock,        label: "No hidden fees" },
                ].map((t, i) => (
                  <div key={t.label} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 9, padding: "14px 10px", fontSize: 13, color: "#9a9ab0", borderLeft: i ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
                    <t.Icon size={15} style={{ color: "#7c5cfc" }} /> {t.label}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`
        @media (max-width: 780px){ .upg-plan-grid{ grid-template-columns: 1fr !important; } }
        @media (max-width: 640px){ .upg-hero-art{ display:none !important; } }
        .upg-card-max{ border: 2px solid #f5c518 !important; background: #0e0e18 !important; }
        .upg-modal-scroll{ scrollbar-width: thin; scrollbar-color: #2a2a3a transparent; }
        .upg-modal-scroll::-webkit-scrollbar{ width: 10px; }
        .upg-modal-scroll::-webkit-scrollbar-track{ background: transparent; }
        .upg-modal-scroll::-webkit-scrollbar-thumb{ background: #2a2a3a; border-radius: 8px; border: 2px solid #12121c; }
        .upg-modal-scroll::-webkit-scrollbar-thumb:hover{ background: #3a3a4e; }
      `}</style>
    </div>
  );

  return createPortal(modal, document.body);
}
