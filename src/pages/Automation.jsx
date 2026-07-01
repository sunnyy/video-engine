import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UploadCloud, CalendarClock, LayoutGrid, Link2 } from "lucide-react";
import UpgradeGate from "../ui/UpgradeGate";
import { usePlanStore } from "../store/usePlanStore";
import { serverFetch } from "../services/serverApi";

/**
 * Automation → Campaigns (the index tab of /automation). Overview stat cards + a searchable
 * campaigns table with quick lifecycle actions. Page chrome (title + tabs) lives in
 * AutomationLayout. Pro/Max only.
 */

const T = { bg: "#090b11", surface: "#0e1018", surface2: "#14141e", border: "rgba(255,255,255,0.08)", text: "#e8eaf0", muted: "#8896a8", faint: "#55667a", accent: "#7c5cfc" };

const STATUS = {
  draft:   { label: "Draft",   color: "#8896a8" },
  active:  { label: "Active",  color: "#22c55e", sub: "Running" },
  paused:  { label: "Paused",  color: "#f59e0b" },
  stopped: { label: "Stopped", color: "#f87171" },
};

const PLATFORM_GLYPH = { youtube: "▶", instagram: "📸", tiktok: "🎵", twitter: "𝕏", x: "𝕏", facebook: "f", linkedin: "in" };

function relTime(d) {
  if (!d) return "";
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const days = Math.floor(s / 86400);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// Ornamental mini-bar strip (deterministic heights — decorative, not trend data).
function Spark({ value = 0, color }) {
  if (!value) return <span style={{ color: T.faint, fontSize: 11 }}>—</span>;
  const bars = Array.from({ length: 11 }, (_, i) => 0.3 + (((i * 41 + value * 7) % 100) / 100) * 0.7);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 18, marginTop: 4 }}>
      {bars.map((h, i) => <span key={i} style={{ width: 3, height: `${Math.round(h * 18)}px`, background: color, borderRadius: 1, opacity: 0.85 }} />)}
    </div>
  );
}

export default function Automation() {
  const nav = useNavigate();
  const [campaigns, setCampaigns] = useState(null);
  const [accounts, setAccounts]   = useState([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const { isProPlus, loaded: planLoaded, fetchPlan } = usePlanStore();
  useEffect(() => { fetchPlan(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCampaigns = async () => { try { const d = await serverFetch("/api/automation/campaigns").then(r => r.json()); setCampaigns(d.campaigns || []); } catch (_) {} };
  const loadAccounts  = async () => { try { const d = await serverFetch("/api/social/accounts").then(r => r.json()); setAccounts(d.accounts || []); } catch (_) {} };
  useEffect(() => { loadCampaigns(); loadAccounts(); }, []);

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

  const obtn = (color, dis = false) => ({ background: "transparent", border: `1px solid ${color}44`, color, fontWeight: 700, fontSize: 12, padding: "6px 11px", borderRadius: 8, cursor: dis ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: dis ? 0.55 : 1, display: "inline-flex", alignItems: "center", gap: 6 });
  const th = { padding: "11px 16px", textAlign: "left", fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: T.faint };
  const td = { padding: "14px 16px", color: T.text, verticalAlign: "middle" };

  if (planLoaded && !isProPlus) return <UpgradeGate feature="Automation" blurb="Automation — auto-generate and publish videos on a schedule — is available on the Pro and Max plans." />;

  const list = campaigns || [];
  const activeCount = list.filter(c => c.status === "active").length;
  const published   = list.reduce((n, c) => n + (c.counts?.published || 0), 0);
  const queued      = list.reduce((n, c) => n + (c.queued || 0), 0);
  const postsAvg    = list.length ? Math.round(list.reduce((n, c) => n + (c.posts_per_day || 1), 0) / list.length) : 0;
  const acctById    = Object.fromEntries(accounts.map(a => [a.id, a]));

  const STATS = [
    { Icon: Users,         label: "Active Campaigns",   value: activeCount, sub: `${activeCount} running now`,   color: "#a78bfa" },
    { Icon: UploadCloud,   label: "Published",          value: published,   sub: "Total posts published",       color: "#38bdf8" },
    { Icon: CalendarClock, label: "Queued",             value: queued,      sub: "Scheduled posts",             color: "#22c55e" },
    { Icon: LayoutGrid,    label: "Posts / Day",        value: postsAvg,    sub: "Average per campaign",        color: "#f59e0b" },
    { Icon: Link2,         label: "Connected Accounts", value: accounts.length, sub: "Across all channels",     color: "#f472b6" },
  ];

  const filtered = q.trim()
    ? list.filter(c => `${c.name} ${(c.niches || []).join(" ")}`.toLowerCase().includes(q.trim().toLowerCase()))
    : list;

  return (
    <div>
      <style>{`@keyframes vqspin { to { transform: rotate(360deg); } }`}</style>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 22 }}>
        {STATS.map(s => (
          <div key={s.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "15px 16px", boxShadow: "0 1px 2px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: `${s.color}1c`, border: `1px solid ${s.color}33`, color: s.color }}>
                <s.Icon size={18} strokeWidth={2.2} />
              </span>
              <span style={{ fontSize: 26, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif", lineHeight: 1 }}>{s.value}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginTop: 11 }}>{s.label}</div>
            <div style={{ fontSize: 11.5, color: T.faint, marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Campaigns panel */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.28)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, padding: "16px 18px", flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{list.length} campaign{list.length === 1 ? "" : "s"}</span>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.faint, fontSize: 14 }}>⌕</span>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search campaigns…"
                style={{ padding: "9px 12px 9px 32px", borderRadius: 10, background: T.surface2, border: `1px solid ${T.border}`, color: T.text, fontSize: 13, fontFamily: "inherit", outline: "none", width: 240, boxSizing: "border-box" }} />
            </div>
            <button onClick={createCampaign} disabled={busy === "new"}
              style={{ background: T.accent, border: "none", color: "#fff", fontWeight: 700, fontSize: 13, padding: "9px 15px", borderRadius: 10, cursor: busy === "new" ? "default" : "pointer", fontFamily: "inherit", opacity: busy === "new" ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 7 }}>
              + New campaign
            </button>
          </div>
        </div>

        {!campaigns ? (
          <div style={{ color: T.faint, padding: "40px 18px" }}>Loading…</div>
        ) : list.length === 0 ? (
          <div style={{ textAlign: "center", padding: "56px 20px", color: T.faint }}>No campaigns yet. Create one to start automatic videos.</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "44px 20px", color: T.faint }}>No campaigns match “{q}”.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
                  <th style={th}>Campaign</th><th style={th}>Status</th><th style={th}>Niche</th>
                  <th style={th}>Posts/day</th><th style={th}>Accounts</th><th style={th}>Published</th><th style={th}>Queued</th>
                  <th style={{ ...th, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const st = STATUS[c.status] || STATUS.draft;
                  const niches = c.niches || [];
                  const rowBusy = busy.startsWith(`${c.id}:`);
                  const lbl = (a, def) => busy === `${c.id}:${a}` ? <>{spin} {ACTING[a]}</> : def;
                  const plats = [...new Set((c.target_accounts || []).map(id => acctById[id]?.platform).filter(Boolean))];
                  return (
                    <tr key={c.id} onClick={() => nav(`/automation/campaigns/${c.id}`)} style={{ cursor: "pointer", borderBottom: `1px solid ${T.border}` }}>
                      {/* Campaign */}
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, background: "linear-gradient(135deg,#7c5cfc,#a855f7)" }}>🚀</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{c.name}</div>
                            <div style={{ fontSize: 11.5, color: T.faint, marginTop: 2 }}>Created {relTime(c.created_at)}</div>
                          </div>
                        </div>
                      </td>
                      {/* Status */}
                      <td style={td}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: st.color, background: `${st.color}1c`, padding: "3px 10px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.color }} />{st.label}
                        </span>
                        {st.sub && <div style={{ fontSize: 11, color: st.color, marginTop: 4 }}>{st.sub}</div>}
                      </td>
                      {/* Niche */}
                      <td style={td}>
                        <div style={{ color: T.text }}>{niches[0] || "—"}</div>
                        {niches.length > 1 && <div style={{ fontSize: 11.5, color: T.faint, marginTop: 2 }}>{niches.slice(1).join(", ")}</div>}
                      </td>
                      {/* Posts/day */}
                      <td style={td}><span style={{ fontWeight: 700 }}>{c.posts_per_day || 1}</span> <span style={{ color: T.faint, fontSize: 11.5 }}>posts</span></td>
                      {/* Accounts */}
                      <td style={td}>
                        <div style={{ fontWeight: 700 }}>{(c.target_accounts || []).length}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                          <span style={{ color: T.faint, fontSize: 11.5 }}>account{(c.target_accounts || []).length === 1 ? "" : "s"}</span>
                          {plats.slice(0, 3).map(p => (
                            <span key={p} title={p} style={{ width: 15, height: 15, borderRadius: "50%", background: "rgba(124,92,252,0.25)", color: "#c4b5fd", fontSize: 8, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{PLATFORM_GLYPH[p] || p[0]?.toUpperCase()}</span>
                          ))}
                        </div>
                      </td>
                      {/* Published */}
                      <td style={td}><div style={{ fontWeight: 700, color: "#22c55e" }}>{c.counts?.published || 0}</div><Spark value={c.counts?.published || 0} color="#22c55e" /></td>
                      {/* Queued */}
                      <td style={td}><div style={{ fontWeight: 700, color: "#f59e0b" }}>{c.queued || 0}</div><Spark value={c.queued || 0} color="#f59e0b" /></td>
                      {/* Actions */}
                      <td style={{ ...td, textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "inline-flex", gap: 7, alignItems: "center" }}>
                          <button onClick={() => nav(`/automation/campaigns/${c.id}`)} style={obtn(T.muted)}>✎ Edit</button>
                          {(c.status === "draft" || c.status === "stopped") && <button onClick={() => lifecycle(c.id, "start")} disabled={rowBusy} style={obtn("#22c55e", rowBusy)}>{lbl("start", "▶ Start")}</button>}
                          {c.status === "active" && <button onClick={() => lifecycle(c.id, "pause")} disabled={rowBusy} style={obtn("#f59e0b", rowBusy)}>{lbl("pause", "❚❚ Pause")}</button>}
                          {c.status === "paused" && <button onClick={() => lifecycle(c.id, "resume")} disabled={rowBusy} style={obtn("#22c55e", rowBusy)}>{lbl("resume", "▶ Resume")}</button>}
                          {(c.status === "active" || c.status === "paused") && <button onClick={() => lifecycle(c.id, "stop")} disabled={rowBusy} style={obtn("#f87171", rowBusy)}>{lbl("stop", "■ Stop")}</button>}
                          <button onClick={() => nav(`/automation/campaigns/${c.id}`)} title="More" style={{ ...obtn(T.faint), border: "none", padding: "6px 8px", fontSize: 15 }}>⋮</button>
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
    </div>
  );
}
