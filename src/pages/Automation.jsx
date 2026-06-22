import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../ui/AppLayout";
import BrandKitPanel from "../ui/BrandKitPanel";
import { serverFetch } from "../services/serverApi";

/**
 * Automation — the hub. Three tabs:
 *   Campaigns       — list of automation campaigns (create, quick lifecycle, open detail).
 *   Social Accounts — connect/disconnect the accounts campaigns publish to.
 *   Brand Kit       — logo + CTA applied to generated videos (shared BrandKitPanel).
 * Each campaign owns its own settings/schedule/queue — managed on the detail page.
 */

const T = { bg: "#090b11", surface: "#0e1018", surface2: "#14141e", border: "rgba(255,255,255,0.08)", text: "#e8eaf0", muted: "#8896a8", faint: "#55667a", accent: "#7c5cfc" };

const PLATFORMS = [
  { id: "youtube", label: "YouTube", ready: true, color: "#FF0000" },
  { id: "tiktok", label: "TikTok", ready: false, color: "#141417" },
  { id: "instagram", label: "Instagram", ready: false, color: "#E1306C" },
  { id: "linkedin", label: "LinkedIn", ready: false, color: "#0A66C2" },
  { id: "x", label: "X", ready: false, color: "#141417" },
];

// Brand badge — a rounded square in the platform's colour with its mark.
function PlatformBadge({ id, color }) {
  const glyph = {
    youtube: <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>,
    tiktok: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l10-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /></svg>,
    instagram: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="#fff" stroke="none" /></svg>,
    linkedin: <span style={{ color: "#fff", fontWeight: 800, fontSize: 13 }}>in</span>,
    x: <span style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>X</span>,
  }[id];
  return <div style={{ width: 38, height: 38, borderRadius: 10, background: color, border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{glyph}</div>;
}

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
  const [conns, setConns] = useState(null);
  const [connMsg, setConnMsg] = useState(null);
  const [busy, setBusy] = useState("");

  const loadCampaigns = async () => { try { const d = await serverFetch("/api/automation/campaigns").then(r => r.json()); setCampaigns(d.campaigns || []); } catch (_) {} };
  const loadConns = async () => { try { setConns(await serverFetch("/api/social/accounts").then(r => r.json())); } catch (_) {} };

  useEffect(() => {
    loadCampaigns(); loadConns();
    const q = new URLSearchParams(window.location.search);
    if (q.get("connected")) { setConnMsg({ ok: true, text: `Connected ${q.get("connected")} ✓` }); setTab("accounts"); }
    else if (q.get("social_error")) { setConnMsg({ ok: false, text: decodeURIComponent(q.get("social_error")) }); setTab("accounts"); }
    if (q.get("connected") || q.get("social_error")) window.history.replaceState({}, "", "/automation");
  }, []);

  const createCampaign = async () => {
    setBusy("new");
    try {
      const d = await serverFetch("/api/automation/campaigns", { method: "POST", body: JSON.stringify({ name: "New campaign" }) }).then(r => r.json());
      if (d.campaign) nav(`/automation/campaigns/${d.campaign.id}`);
    } catch (_) {} finally { setBusy(""); }
  };

  const lifecycle = async (id, action) => {
    setBusy(id);
    try { await serverFetch(`/api/automation/campaigns/${id}/${action}`, { method: "POST" }); await loadCampaigns(); }
    catch (_) {} finally { setBusy(""); }
  };

  // ── Connections ──
  const accountFor = (platform) => (conns?.accounts || []).find(a => a.platform === platform) || null;
  const connectPlatform = async (platform) => {
    setBusy(`connect-${platform}`); setConnMsg(null);
    try {
      const r = await serverFetch(`/api/social/${platform}/connect`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.url) throw new Error(d.error || "Could not start connection");
      window.location.href = d.url;
    } catch (e) { setConnMsg({ ok: false, text: e.message }); setBusy(""); }
  };
  const disconnectPlatform = async (platform) => {
    setBusy(`connect-${platform}`);
    try { await serverFetch(`/api/social/${platform}/disconnect`, { method: "POST" }); await loadConns(); }
    catch (_) {} finally { setBusy(""); }
  };

  const btn = (bg) => ({ background: bg, border: "none", color: "#fff", fontWeight: 700, fontSize: 12.5, padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" });
  const th = { padding: "10px 14px", textAlign: "left", fontWeight: 700 };
  const thC = { ...th, textAlign: "center" };
  const td = { padding: "12px 14px", color: T.text };
  const tdC = { ...td, textAlign: "center", color: T.muted };
  const TABS = [["campaigns", "Campaigns"], ["accounts", "Social Accounts"], ["brandkit", "Brand Kit"]];

  return (
    <AppLayout>
      <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
        <div style={{ padding: "36px 32px 80px" }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif", margin: "0 0 18px" }}>Automation</h1>

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
                                  <button onClick={() => nav(`/automation/campaigns/${c.id}`)} style={{ ...btn("transparent"), border: `1px solid ${T.border}`, color: T.muted }}>Edit</button>
                                  {(c.status === "draft" || c.status === "stopped") && <button onClick={() => lifecycle(c.id, "start")} disabled={busy === c.id} style={btn("#22c55e")}>Start</button>}
                                  {c.status === "active" && <button onClick={() => lifecycle(c.id, "pause")} disabled={busy === c.id} style={btn("#3a3a52")}>Pause</button>}
                                  {c.status === "paused" && <button onClick={() => lifecycle(c.id, "resume")} disabled={busy === c.id} style={btn("#22c55e")}>Resume</button>}
                                  {(c.status === "active" || c.status === "paused") && <button onClick={() => lifecycle(c.id, "stop")} disabled={busy === c.id} style={btn("#3a3a52")}>Stop</button>}
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

          {/* ── Social Accounts ── */}
          {tab === "accounts" && (
            <div>
              <div style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>Connect the accounts your campaigns publish to.</div>
              {connMsg && <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 14, color: connMsg.ok ? "#22c55e" : "#f87171" }}>{connMsg.text}</div>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
                {PLATFORMS.map(p => {
                  const acct = accountFor(p.id);
                  const connected = acct && acct.status === "connected";
                  const errored = acct && acct.status === "error";
                  const statusText = connected ? (acct.display_name || "Connected") : errored ? "Reconnect needed" : p.ready ? "Not connected" : "Coming soon";
                  const statusColor = connected ? "#22c55e" : errored ? "#f87171" : T.faint;
                  return (
                    <div key={p.id} style={{ background: T.surface, border: `1px solid ${connected ? "#22c55e44" : T.border}`, borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 14, opacity: p.ready ? 1 : 0.6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                        <PlatformBadge id={p.id} color={p.color} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{p.label}</div>
                          <div style={{ fontSize: 12, color: statusColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{statusText}</div>
                        </div>
                      </div>
                      {p.ready
                        ? (connected
                            ? <button onClick={() => disconnectPlatform(p.id)} disabled={busy === `connect-${p.id}`} style={{ ...btn("transparent"), width: "100%", border: `1px solid ${T.border}`, color: T.muted }}>Disconnect</button>
                            : <button onClick={() => connectPlatform(p.id)} disabled={busy === `connect-${p.id}`} style={{ ...btn(T.accent), width: "100%" }}>{errored ? "Reconnect" : "Connect"}</button>)
                        : <button disabled style={{ ...btn("transparent"), width: "100%", border: `1px solid ${T.border}`, color: T.faint, cursor: "default" }}>Soon</button>}
                    </div>
                  );
                })}
              </div>
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
