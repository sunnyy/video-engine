import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { signOut } from "../services/auth/authService";
import { useCreditsStore } from "../store/useCreditsStore";
import { serverFetch } from "../services/serverApi";

/* ── Icons ── */
const Icons = {
  folder:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>,
  gallery:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="9" height="9" rx="1.5"/><rect x="13" y="2" width="9" height="9" rx="1.5"/><rect x="2" y="13" width="9" height="9" rx="1.5"/><rect x="13" y="13" width="9" height="9" rx="1.5"/></svg>,
  box:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  credits:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  mic:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0014 0"/><line x1="12" y1="21" x2="12" y2="17"/><line x1="9" y1="21" x2="15" y2="21"/></svg>,
  settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
};

function NavItem({ icon, label, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className="w-full flex items-center gap-[10px] px-3 py-[7px] rounded-[8px] text-left border-0 transition-all cursor-pointer"
      style={{
        background: active ? "rgba(124,92,252,0.15)" : hov ? "rgba(255,255,255,0.04)" : "transparent",
        color:      active ? "#a78bfa" : hov ? "#d8d8ea" : "#9494a8",
      }}>
      <span style={{ width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span>
      <span className="text-[15px] font-medium flex-1" style={{ fontFamily: "'Syne',sans-serif" }}>{label}</span>
    </button>
  );
}

function NavSection({ title, children }) {
  return (
    <div className="mb-5">
      <div className="px-3 mb-1 text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>{title}</div>
      <div className="flex flex-col gap-[2px]">{children}</div>
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

export default function Credits() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { balance, fetchCredits } = useCreditsStore();

  const [lifetimeCredits, setLifetimeCredits] = useState(null);
  const [transactions,    setTransactions]    = useState([]);
  const [txLoading,       setTxLoading]       = useState(true);

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
  }, []);

  return (
    <div className="flex min-h-screen text-[#e8e8f0]" style={{ background: "#0b0b10" }}>

      {/* ── Sidebar ── */}
      <aside className="flex flex-col shrink-0 border-r" style={{ width: 220, borderColor: "rgba(255,255,255,0.06)", background: "#0d0d14" }}>
        {/* Logo */}
        <div className="px-4 py-5 flex items-center gap-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <img src="/assets/images/logo.png" alt="Vidquence" style={{ height: 62, width: "auto" }} />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="flex flex-col gap-[2px] mb-5">
            <NavItem icon={Icons.folder}  label="Videos"  active={location.pathname === "/dashboard"}         onClick={() => navigate("/dashboard")} />
            <NavItem icon={Icons.gallery} label="Images"     active={location.pathname === "/image-generation"}  onClick={() => navigate("/image-generation")} />
            <NavItem icon={Icons.mic}     label="Transcribe" active={location.pathname === "/transcription"}     onClick={() => navigate("/transcription")} />
            <NavItem icon={Icons.box}     label="Assets"     active={location.pathname === "/assets"}            onClick={() => navigate("/assets")} />
            <NavItem icon={Icons.credits} label="Credits" active={true}                                       onClick={() => {}} />
          </div>

          <NavSection title="Account">
            <NavItem icon={Icons.settings} label="Settings" active={false} onClick={() => navigate("/settings")} />
          </NavSection>
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t flex flex-col gap-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between px-3 py-[7px] rounded-[8px] text-[14px] font-mono"
            style={{ background: "rgba(255,255,255,0.04)", color: balance !== null && balance < 10 ? "#f97316" : "#7c5cfc" }}>
            <span>⚡ Credits</span>
            <span className="font-bold">{balance ?? "—"}</span>
          </div>
          <button onClick={async () => { await signOut(); navigate("/"); }}
            className="w-full flex items-center gap-2 px-3 py-[7px] rounded-[8px] text-[15px] border-0 cursor-pointer transition-all text-left"
            style={{ background: "transparent", color: "#f87171" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.08)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <span>↩</span> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
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

            <button onClick={() => window.open("/#pricing", "_blank")}
              className="self-start px-5 py-2 rounded-[8px] text-[14px] font-bold border-0 cursor-pointer"
              style={{ background: "#f5c518", color: "#0b0b10", fontFamily: "'Outfit',sans-serif" }}>
              Buy Credits
            </button>

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
    </div>
  );
}
