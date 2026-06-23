import { useEffect, useState } from "react";
import AppLayout from "../ui/AppLayout";
import { serverFetch } from "../services/serverApi";

/**
 * SocialAccounts — connect/disconnect the social channels you publish to. Standalone page
 * (top-level nav) so every user discovers it; the accounts here power both Automation
 * campaigns and the editor's Publish button. The OAuth callback returns here with
 * ?connected / ?social_error.
 */

const T = { bg: "#090b11", surface: "#0e1018", border: "rgba(255,255,255,0.08)", text: "#e8eaf0", muted: "#8896a8", faint: "#55667a", accent: "#7c5cfc" };

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

export default function SocialAccounts() {
  const [conns, setConns] = useState(null);
  const [connMsg, setConnMsg] = useState(null);
  const [busy, setBusy] = useState("");

  const load = async () => { try { setConns(await serverFetch("/api/social/accounts").then(r => r.json())); } catch (_) {} };

  useEffect(() => {
    load();
    const q = new URLSearchParams(window.location.search);
    if (q.get("connected")) setConnMsg({ ok: true, text: `Connected ${q.get("connected")} ✓` });
    else if (q.get("social_error")) setConnMsg({ ok: false, text: decodeURIComponent(q.get("social_error")) });
    if (q.get("connected") || q.get("social_error")) window.history.replaceState({}, "", "/connections");
  }, []);

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
    try { await serverFetch(`/api/social/${platform}/disconnect`, { method: "POST" }); await load(); }
    catch (_) {} finally { setBusy(""); }
  };

  const btn = (bg) => ({ background: bg, border: "none", color: "#fff", fontWeight: 700, fontSize: 12.5, padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" });

  return (
    <AppLayout>
      <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "44px 24px 80px" }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif", margin: "0 0 6px" }}>Social Accounts</h1>
          <p style={{ fontSize: 14, color: T.muted, marginTop: 0, marginBottom: 26 }}>
            Connect the channels you publish to — then post your videos straight from the editor, or let Automation publish for you.
          </p>

          {connMsg && <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 16, color: connMsg.ok ? "#22c55e" : "#f87171" }}>{connMsg.text}</div>}

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
      </div>
    </AppLayout>
  );
}
