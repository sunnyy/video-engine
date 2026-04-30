/**
 * CreditConfirmModal — reusable credit pre-flight confirmation modal.
 * Props:
 *   service    : string               — display name e.g. "Poster Studio"
 *   breakdown  : { [label]: cost }    — line items
 *   total      : number               — total credits required
 *   balance    : number               — current user balance
 *   onConfirm  : () => void
 *   onCancel   : () => void
 *   onTopUp    : () => void           — navigate to credits/top-up page
 */
export default function CreditConfirmModal({ service, breakdown, total, balance, onConfirm, onCancel, onTopUp }) {
  const canAfford = balance >= total;
  const remaining = balance - total;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(7,7,16,0.85)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        background: "#111118", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16, padding: 28, width: "100%", maxWidth: 400,
        display: "flex", flexDirection: "column", gap: 20,
      }}>
        {/* Header */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            Credit Estimate
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#e8e8f0", fontFamily: "'Outfit',sans-serif" }}>
            {service}
          </div>
          <div style={{ fontSize: 13, color: canAfford ? "#22c55e" : "#f97316", marginTop: 4 }}>
            {canAfford ? "Ready to generate" : "Insufficient credits"}
          </div>
        </div>

        {/* Breakdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {Object.entries(breakdown).map(([label, cost]) => (
            <div key={label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}>
              <span style={{ fontSize: 13, color: "#9494a8" }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#a78bfa" }}>⚡ {cost}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#e8e8f0" }}>Total</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#7c5cfc" }}>⚡ {total}</span>
          </div>
        </div>

        {/* Balance */}
        <div style={{
          padding: "12px 16px", borderRadius: 10,
          background: canAfford ? "rgba(34,197,94,0.08)" : "rgba(249,115,22,0.08)",
          border: `1px solid ${canAfford ? "rgba(34,197,94,0.2)" : "rgba(249,115,22,0.25)"}`,
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "#9494a8" }}>Your balance</span>
            <span style={{ fontWeight: 700, color: canAfford ? "#22c55e" : "#f97316" }}>⚡ {balance}</span>
          </div>
          {canAfford && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "#9494a8" }}>After generation</span>
              <span style={{ fontWeight: 700, color: "#e8e8f0" }}>⚡ {remaining}</span>
            </div>
          )}
          {!canAfford && (
            <div style={{ fontSize: 12, color: "#f97316" }}>
              You need <strong>⚡ {total - balance} more credits</strong> to proceed.
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {canAfford ? (
            <>
              <button onClick={onConfirm} style={{
                padding: "11px 20px", background: "#f5c518", color: "#0a0a10",
                border: "none", borderRadius: 10, fontSize: 14, fontWeight: 800,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                Generate — ⚡ {total}
              </button>
              <button onClick={onCancel} style={{
                padding: "10px 20px", background: "transparent",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
                fontSize: 13, fontWeight: 600, color: "#9494a8", cursor: "pointer",
              }}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button onClick={onTopUp} style={{
                padding: "11px 20px", background: "#7c5cfc", color: "#fff",
                border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                Top Up Credits →
              </button>
              <button onClick={onCancel} style={{
                padding: "10px 20px", background: "transparent",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
                fontSize: 13, fontWeight: 600, color: "#9494a8", cursor: "pointer",
              }}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
