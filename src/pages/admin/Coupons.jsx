import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { adminListCoupons, adminCreateCoupon, adminUpdateCoupon, adminDeleteCoupon } from "../../services/coupons/couponService";

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const card  = { background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 20px" };
const input = { background: "#0b0b10", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#e8e8f0", fontSize: 13, padding: "9px 11px", fontFamily: "inherit", boxSizing: "border-box", outline: "none" };
const label = { fontSize: 11, color: "#888", marginBottom: 5, display: "block", fontWeight: 600 };

function CreateForm({ onCreated }) {
  const [code, setCode]               = useState("");
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [expiresAt, setExpiresAt]     = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [perUserOnce, setPerUserOnce] = useState(true);
  const [description, setDescription] = useState("");
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState("");

  async function submit() {
    if (!code.trim() || !discountValue) { setErr("Code and value are required."); return; }
    setBusy(true); setErr("");
    try {
      const { coupon } = await adminCreateCoupon({
        code: code.trim(), discountType, discountValue,
        expiresAt: expiresAt || null, maxRedemptions: maxRedemptions || null,
        perUserOnce, description: description.trim() || null,
      });
      onCreated(coupon);
      setCode(""); setDiscountValue(""); setExpiresAt(""); setMaxRedemptions(""); setDescription("");
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  return (
    <div style={{ ...card, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: "#e8e8f0" }}>New coupon</div>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.9fr 0.9fr", gap: 12 }}>
        <div>
          <label style={label}>Code</label>
          <input style={{ ...input, width: "100%", textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace" }} value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="LAUNCH20" />
        </div>
        <div>
          <label style={label}>Type</label>
          <select style={{ ...input, width: "100%" }} value={discountType} onChange={e => setDiscountType(e.target.value)}>
            <option value="percent">% off</option>
            <option value="fixed">$ off</option>
          </select>
        </div>
        <div>
          <label style={label}>{discountType === "percent" ? "Percent (1–100)" : "Amount (USD)"}</label>
          <input style={{ ...input, width: "100%" }} type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder={discountType === "percent" ? "20" : "10"} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div>
          <label style={label}>Expires (optional)</label>
          <input style={{ ...input, width: "100%", colorScheme: "dark", cursor: "pointer" }} type="date" value={expiresAt}
            min={new Date().toISOString().slice(0, 10)}
            onChange={e => setExpiresAt(e.target.value)}
            onClick={e => e.currentTarget.showPicker?.()} />
        </div>
        <div>
          <label style={label}>Max redemptions (optional)</label>
          <input style={{ ...input, width: "100%" }} type="number" value={maxRedemptions} onChange={e => setMaxRedemptions(e.target.value)} placeholder="Unlimited" />
        </div>
        <div>
          <label style={label}>One per user</label>
          <button onClick={() => setPerUserOnce(v => !v)} style={{ ...input, width: "100%", cursor: "pointer", textAlign: "left", color: perUserOnce ? "#22c55e" : "#9494a8" }}>
            {perUserOnce ? "Yes — once per user" : "No — reusable"}
          </button>
        </div>
      </div>
      <div>
        <label style={label}>Internal note (optional)</label>
        <input style={{ ...input, width: "100%" }} value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Launch week campaign" />
      </div>
      {err && <div style={{ color: "#f87171", fontSize: 13 }}>{err}</div>}
      <div>
        <button onClick={submit} disabled={busy} style={{ background: "#7c5cfc", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 14, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, fontFamily: "inherit" }}>
          {busy ? "Creating…" : "Create coupon"}
        </button>
      </div>
    </div>
  );
}

function CouponRow({ coupon, onChange, onDelete }) {
  const [busy, setBusy] = useState(false);
  const expired = coupon.expires_at && Date.now() > new Date(coupon.expires_at).getTime();
  const exhausted = coupon.max_redemptions != null && coupon.redeemed_count >= coupon.max_redemptions;
  const live = coupon.active && !expired && !exhausted;

  async function toggle() {
    setBusy(true);
    try { const { coupon: c } = await adminUpdateCoupon(coupon.id, { active: !coupon.active }); onChange(c); }
    catch (e) { alert(e.message); }
    setBusy(false);
  }
  async function remove() {
    if (!window.confirm(`Delete coupon ${coupon.code}? This can't be undone.`)) return;
    setBusy(true);
    try { await adminDeleteCoupon(coupon.id); onDelete(coupon.id); }
    catch (e) { alert(e.message); setBusy(false); }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.8fr 1fr 1fr 0.9fr 0.8fr", gap: 12, padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13, alignItems: "center" }}>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "#e8e8f0" }}>{coupon.code}</div>
      <div style={{ color: "#c8c8d8" }}>{coupon.discount_type === "percent" ? `${coupon.discount_value}% off` : `$${coupon.discount_value} off`}</div>
      <div style={{ color: "#9494a8" }}>
        {coupon.redeemed_count}{coupon.max_redemptions != null ? ` / ${coupon.max_redemptions}` : ""} used
        {coupon.per_user_once ? " · 1/user" : ""}
      </div>
      <div style={{ color: "#9494a8" }}>{coupon.expires_at ? `exp ${fmtDate(coupon.expires_at)}` : "no expiry"}</div>
      <div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: live ? "rgba(34,197,94,0.12)" : "rgba(248,113,113,0.12)", color: live ? "#22c55e" : "#f87171" }}>
          {live ? "Live" : expired ? "Expired" : exhausted ? "Maxed" : "Paused"}
        </span>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={toggle} disabled={busy} style={{ background: "none", border: "none", color: "#7c5cfc", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>{coupon.active ? "Pause" : "Activate"}</button>
        <button onClick={remove} disabled={busy} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>Delete</button>
      </div>
    </div>
  );
}

export default function Coupons() {
  const [coupons, setCoupons] = useState(null);
  const [error, setError]     = useState("");

  useEffect(() => { adminListCoupons().then(d => setCoupons(d.coupons)).catch(e => setError(e.message)); }, []);

  return (
    <AdminLayout>
      <div style={{ padding: "28px 32px", color: "#e8e8f0" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Coupons</h1>
        <p style={{ fontSize: 13.5, color: "#888", marginTop: 6 }}>Promo codes for plan checkout (% or $ off). Codes are matched case-insensitively.</p>

        {error && <div style={{ marginTop: 20, color: "#f87171" }}>{error}</div>}

        <div style={{ marginTop: 20 }}>
          <CreateForm onCreated={c => setCoupons(list => [c, ...(list || [])])} />
        </div>

        <div style={{ marginTop: 24, ...card, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.8fr 1fr 1fr 0.9fr 0.8fr", gap: 12, padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <div>Code</div><div>Discount</div><div>Usage</div><div>Expiry</div><div>Status</div><div style={{ textAlign: "right" }}>Actions</div>
          </div>
          {coupons == null ? (
            <div style={{ padding: "32px 18px", textAlign: "center", color: "#666" }}>Loading…</div>
          ) : coupons.length === 0 ? (
            <div style={{ padding: "32px 18px", textAlign: "center", color: "#666" }}>No coupons yet.</div>
          ) : coupons.map(c => (
            <CouponRow key={c.id} coupon={c}
              onChange={u => setCoupons(list => list.map(x => x.id === u.id ? u : x))}
              onDelete={id => setCoupons(list => list.filter(x => x.id !== id))} />
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
