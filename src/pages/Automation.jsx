import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../ui/AppLayout";
import BrandKitPanel from "../ui/BrandKitPanel";
import UpgradeGate from "../ui/UpgradeGate";
import { usePlanStore } from "../store/usePlanStore";
import { serverFetch } from "../services/serverApi";

/**
 * Automation — the hub. Two tabs:
 *   Campaigns — list of automation campaigns (create, quick lifecycle, open detail).
 *   Brand Kit — logo + CTA applied to generated videos (shared BrandKitPanel).
 * Each campaign owns its own settings/schedule/queue — managed on the detail page.
 * (Social account connections live on the standalone /connections page.)
 */

const T = { bg: "#090b11", surface: "#0e1018", surface2: "#14141e", border: "rgba(255,255,255,0.08)", text: "#e8eaf0", muted: "#8896a8", faint: "#55667a", accent: "#7c5cfc" };

const STATUS = {
  draft:   { label: "Draft",   color: "#8896a8" },
  active:  { label: "Active",  color: "#22c55e" },
  paused:  { label: "Paused",  color: "#f59e0b" },
  stopped: { label: "Stopped", color: "#f87171" },
};

export default function Automation() {
  const nav = useNavigate();
  const [tab, setTab] = useState("campaigns");
  const [campaigns, setCampaigns] = useState(null);
  const [busy, setBusy] = useState("");
  const { isProPlus, loaded: planLoaded, fetchPlan } = usePlanStore();
  useEffect(() => { fetchPlan(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCampaigns = async () => { try { const d = await serverFetch("/api/automation/campaigns").then(r => r.json()); setCampaigns(d.campaigns || []); } catch (_) {} };

  useEffect(() => { loadCampaigns(); }, []);

  const createCampaign = async () => {
    setBusy("new");
    try {
      const d = await serverFetch("/api/automation/campaigns", { method: "POST", body: JSON.stringify({ name: "New campaign" }) }).then(r => r.json());
      if (d.campaign) nav(`/automation/campaigns/${d.campaign.id}`);
    } catch (_) {} finally { setBusy(""); }
  };

  const lifecycle = async (id, action) => {
    setBusy(`${id}:${action}`);
    try { await serverFetch(`/api/automation/campaigns/${id}/${action}`, { method: "POST" }); await loadCampaigns(); }
    catch (_) {} finally { setBusy(""); }
  };
  const ACTING = { start: "Starting…", resume: "Resuming…", pause: "Pausing…", stop: "Stopping…" };
  const spin = <span style={{ width: 10, height: 10, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "vqspin 0.6s linear infinite" }} />;

  const btn = (bg, dis = false) => ({ background: bg, border: "none", color: "#fff", fontWeight: 700, fontSize: 12.5, padding: "8px 14px", borderRadius: 8, cursor: dis ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: dis ? 0.55 : 1, transition: "opacity 0.15s", display: "inline-flex", alignItems: "center", gap: 6 });
  const th = { padding: "10px 14px", textAlign: "left", fontWeight: 700 };
  const thC = { ...th, textAlign: "center" };
  const td = { padding: "12px 14px", color: T.text };
  const tdC = { ...td, textAlign: "center", color: T.muted };
  const TABS = [["campaigns", "Campaigns"], ["brandkit", "Brand Kit"]];

  if (planLoaded && !isProPlus) return <UpgradeGate feature="Automation" blurb="Automation — auto-generate and publish videos on a schedule — is available on the Pro and Agency plans." />;

  return (
    <AppLayout>
      <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
        <div style={{ padding: "36px 32px 80px" }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif", margin: "0 0 18px" }}>Automation</h1>
          <style>{`@keyframes vqspin { to { transform: rotate(360deg); } }`}</style>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${T.border}`, marginBottom: 24 }}>
            {TABS.map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                style={{ background: "none", border: "none", borderBottom: `2px solid ${tab === id ? T.accent : "transparent"}`, color: tab === id ? T.text : T.muted, fontWeight: 700, fontSize: 13.5, padding: "10px 14px", cursor: "pointer", fontFamily: "inherit" }}>
                {label}
              </button>
            ))}
          </div>

          {/* ── Campaigns ── */}
          {tab === "campaigns" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: T.faint }}>{campaigns?.length || 0} campaign{campaigns?.length === 1 ? "" : "s"}</span>
                <button onClick={createCampaign} disabled={busy === "new"} style={btn(T.accent)}>+ New campaign</button>
              </div>

              {!campaigns ? <div style={{ color: T.faint }}>Loading…</div>
                : campaigns.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px 20px", color: T.faint, border: `1px dashed ${T.border}`, borderRadius: 14 }}>
                    No campaigns yet. Create one to start automatic videos.
                  </div>
                ) : (
                  <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ color: T.faint, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          <th style={th}>Campaign</th>
                          <th style={th}>Status</th>
                          <th style={th}>Niche</th>
                          <th style={thC}>Posts/day</th>
                          <th style={thC}>Accounts</th>
                          <th style={thC}>Published</th>
                          <th style={thC}>Queued</th>
                          <th style={{ ...th, textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.map(c => {
                          const st = STATUS[c.status] || STATUS.draft;
                          return (
                            <tr key={c.id} onClick={() => nav(`/automation/campaigns/${c.id}`)} style={{ cursor: "pointer", borderTop: `1px solid ${T.border}` }}>
                              <td style={{ ...td, fontWeight: 700 }}>{c.name}</td>
                              <td style={td}><span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: `${st.color}1c`, padding: "2px 8px", borderRadius: 20 }}>{st.label}</span></td>
                              <td style={{ ...td, color: T.muted, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(c.niches || []).join(", ") || "—"}</td>
                              <td style={tdC}>{c.posts_per_day || 1}</td>
                              <td style={tdC}>{(c.target_accounts || []).length}</td>
                              <td style={tdC}>{c.counts?.published || 0}</td>
                              <td style={tdC}>{c.queued || 0}</td>
                              <td style={{ ...td, textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: "inline-flex", gap: 8 }}>
                                  {(() => { const rowBusy = busy.startsWith(`${c.id}:`); const lbl = (a, def) => busy === `${c.id}:${a}` ? <>{spin} {ACTING[a]}</> : def; return (<>
                                  <button onClick={() => nav(`/automation/campaigns/${c.id}`)} style={{ ...btn("transparent"), border: `1px solid ${T.border}`, color: T.muted }}>Edit</button>
                                  {(c.status === "draft" || c.status === "stopped") && <button onClick={() => lifecycle(c.id, "start")} disabled={rowBusy} style={btn("#22c55e", rowBusy)}>{lbl("start", "Start")}</button>}
                                  {c.status === "active" && <button onClick={() => lifecycle(c.id, "pause")} disabled={rowBusy} style={btn("#3a3a52", rowBusy)}>{lbl("pause", "Pause")}</button>}
                                  {c.status === "paused" && <button onClick={() => lifecycle(c.id, "resume")} disabled={rowBusy} style={btn("#22c55e", rowBusy)}>{lbl("resume", "Resume")}</button>}
                                  {(c.status === "active" || c.status === "paused") && <button onClick={() => lifecycle(c.id, "stop")} disabled={rowBusy} style={btn("#3a3a52", rowBusy)}>{lbl("stop", "Stop")}</button>}
                                  </>); })()}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          )}

          {/* ── Brand Kit ── */}
          {tab === "brandkit" && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
              <BrandKitPanel />
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
