import { useEffect, useState } from "react";
import AppLayout from "../ui/AppLayout";
import { serverFetch } from "../services/serverApi";
import { showToast } from "../ui/Toast";

/**
 * SocialAccounts — connect/disconnect the social channels you publish to. Standalone page
 * (top-level nav) so every user discovers it; the accounts here power both Automation
 * campaigns and the editor's Publish button. The OAuth callback returns here with
 * ?connected / ?social_error.
 *
 * BYO model: for YouTube, each user connects through THEIR OWN Google Cloud project, so
 * uploads run on their own API quota (no shared ceiling, no single point of failure). The
 * one-time setup modal walks them through creating the OAuth client and pasting in their
 * client ID/secret before the OAuth handshake.
 */

const T = { bg: "#090b11", surface: "#0e1018", surface2: "#14141e", border: "rgba(255,255,255,0.08)", text: "#e8eaf0", muted: "#8896a8", faint: "#55667a", accent: "#7c5cfc" };

const PLATFORMS = [
  { id: "youtube", label: "YouTube", ready: true, byo: true, color: "#FF0000" },
  { id: "tiktok", label: "TikTok", ready: false, color: "#141417" },
  { id: "instagram", label: "Instagram", ready: true, color: "#E1306C", note: "Needs a Business or Creator account" },
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
  const [credStatus, setCredStatus] = useState({});   // { youtube: { configured, clientId, redirectUri } }
  const [setup, setSetup] = useState(null);            // { platform, redirectUri, clientId, clientSecret, configured }

  const load = async () => { try { setConns(await serverFetch("/api/social/accounts").then(r => r.json())); } catch (_) {} };

  // Fetch BYO credential status for platforms that use it (so we know whether to open setup).
  const loadCredStatus = async () => {
    const byo = PLATFORMS.filter(p => p.byo && p.ready);
    const entries = await Promise.all(byo.map(async (p) => {
      try { return [p.id, await serverFetch(`/api/social/${p.id}/credentials`).then(r => r.json())]; }
      catch { return [p.id, null]; }
    }));
    setCredStatus(Object.fromEntries(entries.filter(([, v]) => v)));
  };

  useEffect(() => {
    load();
    loadCredStatus();
    const q = new URLSearchParams(window.location.search);
    if (q.get("connected")) { setConnMsg({ ok: true, text: `Connected ${q.get("connected")} ✓` }); showToast(`${q.get("connected")} connected ✓`, "success"); }
    else if (q.get("social_error")) { const t = decodeURIComponent(q.get("social_error")); setConnMsg({ ok: false, text: t }); showToast(`Couldn't connect: ${t}`); }
    if (q.get("connected") || q.get("social_error")) window.history.replaceState({}, "", "/connections");
  }, []);

  const accountFor = (platform) => (conns?.accounts || []).find(a => a.platform === platform) || null;
  const isByo = (platform) => !!PLATFORMS.find(p => p.id === platform)?.byo;

  // Start the actual OAuth handshake (credentials must already be saved for BYO platforms).
  const connectOAuth = async (platform) => {
    setBusy(`connect-${platform}`); setConnMsg(null);
    try {
      const r = await serverFetch(`/api/social/${platform}/connect`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.url) throw new Error(d.error || "Could not start connection");
      window.location.href = d.url;
    } catch (e) { setConnMsg({ ok: false, text: e.message }); showToast(e.message || "Could not start connection"); setBusy(""); }
  };

  // Connect button: BYO platforms ALWAYS open the setup modal (so the steps + credentials are
  // always visible), then connect from there. Non-BYO platforms go straight to OAuth.
  const connectPlatform = async (platform) => {
    if (isByo(platform)) { openSetup(platform); return; }
    connectOAuth(platform);
  };

  const openSetup = async (platform) => {
    let info = credStatus[platform];
    if (!info) { try { info = await serverFetch(`/api/social/${platform}/credentials`).then(r => r.json()); } catch {} }
    setSetup({ platform, redirectUri: info?.redirectUri || "", clientId: info?.clientId || "", clientSecret: "", configured: !!info?.configured });
  };

  // Save credentials (only if entered/changed), then start OAuth. When already configured, the
  // user can just click Connect without re-typing the secret — we reuse the stored credentials.
  const saveAndConnect = async () => {
    const clientId = (setup.clientId || "").trim();
    const clientSecret = (setup.clientSecret || "").trim();
    setBusy("setup");
    try {
      if (clientId && clientSecret) {
        const r = await serverFetch(`/api/social/${setup.platform}/credentials`, { method: "POST", body: JSON.stringify({ clientId, clientSecret }) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.ok) throw new Error(d.error || "Could not save credentials");
        await loadCredStatus();
      } else if (!setup.configured) {
        showToast("Enter both Client ID and Client Secret"); setBusy(""); return;
      }
      const platform = setup.platform;
      setSetup(null);
      await connectOAuth(platform);
    } catch (e) { showToast(e.message); setBusy(""); }
  };

  // Disconnect = revoke the channel (tokens) but KEEP the saved credentials, so reconnect is
  // one click. (loadCredStatus is harmless — creds remain, so the card still shows "configured".)
  const disconnectPlatform = async (platform) => {
    setBusy(`connect-${platform}`);
    try { await serverFetch(`/api/social/${platform}/disconnect`, { method: "POST" }); await Promise.all([load(), loadCredStatus()]); showToast(`${platform} disconnected`, "info"); }
    catch (_) { showToast(`Couldn't disconnect ${platform}`); } finally { setBusy(""); }
  };

  // Explicit, deliberate full wipe — removes saved credentials (+ disconnects). Warned, because
  // reconnecting afterwards means redoing the whole Google setup.
  const removeCredentials = async () => {
    if (!setup) return;
    if (!window.confirm("Remove your saved Google project setup? To reconnect later you'll have to go through all the setup steps again.")) return;
    const platform = setup.platform;
    setBusy("setup");
    try {
      await serverFetch(`/api/social/${platform}/credentials`, { method: "DELETE" });
      try { await serverFetch(`/api/social/${platform}/disconnect`, { method: "POST" }); } catch {}
      await Promise.all([loadCredStatus(), load()]);
      setSetup(null);
      showToast("Setup removed", "info");
    } catch (e) { showToast(e.message); } finally { setBusy(""); }
  };

  const copy = (text) => { try { navigator.clipboard.writeText(text); showToast("Copied", "success"); } catch {} };

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
                  {p.ready && p.byo && (
                    <button onClick={() => openSetup(p.id)} style={{ background: "none", border: "none", color: T.faint, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit", padding: 0, textAlign: "left" }}>
                      {credStatus[p.id]?.configured ? "Manage Google credentials" : "Uses your own Google project"}
                    </button>
                  )}
                  {p.ready && !p.byo && p.note && !connected && (
                    <div style={{ fontSize: 11.5, color: T.faint, lineHeight: 1.5 }}>{p.note}</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* BYO why-note */}
          <div style={{ marginTop: 22, fontSize: 12.5, color: T.faint, lineHeight: 1.7 }}>
            YouTube connects through your own Google Cloud project, so your uploads run on your own API quota — your channel, your limits. It's a one-time ~15-minute setup.
          </div>
        </div>
      </div>

      {setup && (
        <SetupModal
          setup={setup}
          setSetup={setSetup}
          busy={busy === "setup"}
          onSave={saveAndConnect}
          onRemove={removeCredentials}
          onCopy={copy}
          T={T}
          btn={btn}
        />
      )}
    </AppLayout>
  );
}

/* ── One-time BYO setup modal ──────────────────────────────────────────────── */
function SetupModal({ setup, setSetup, busy, onSave, onRemove, onCopy, T, btn }) {
  const label = setup.platform === "youtube" ? "YouTube" : setup.platform;
  const consoleUrl = "https://console.cloud.google.com/";
  // Two guided paths — Google's UI differs for brand-new projects vs. ones already set up.
  // Both keep the redirect-URI copy box at index 4 (step 5).
  const firstTimeSteps = [
    <>Open the <a href={consoleUrl} target="_blank" rel="noreferrer" style={{ color: "#f5c518" }}>Google Cloud Console</a>, create or pick a project, then in <a href="https://console.cloud.google.com/apis/dashboard?authuser=1" target="_blank" rel="noreferrer" style={{ color: "#f5c518" }}>APIs &amp; Services</a> → <strong style={{ color: T.text }}>Library</strong> enable <strong style={{ color: T.text }}>YouTube Data API v3</strong>.</>,
    <>
      Open <strong style={{ color: T.text }}>Google Auth Platform</strong> (APIs &amp; Services → OAuth consent screen) and click <strong style={{ color: T.text }}>Get started</strong>. Fill the short wizard:
      <ul style={{ paddingLeft: 18, margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 5 }}>
        <li><strong style={{ color: T.text }}>App Information</strong> → App name (anything — e.g. your channel name or "My Publisher", only you see it) + your email as support email.</li>
        <li><strong style={{ color: T.text }}>Audience</strong> → choose <strong style={{ color: T.text }}>External</strong>.</li>
        <li><strong style={{ color: T.text }}>Contact Information</strong> → enter your email.</li>
        <li><strong style={{ color: T.text }}>Finish</strong> → agree, then click <strong style={{ color: T.text }}>Create</strong>.</li>
      </ul>
    </>,
    <>Open the <strong style={{ color: T.text }}>Audience</strong> tab. Under <strong style={{ color: T.text }}>Publishing status</strong> (it starts on "Testing"), click <strong style={{ color: T.text }}>Publish app</strong>, then <strong style={{ color: T.text }}>Confirm</strong> on the "Push to production?" dialog. <strong style={{ color: "#f5c518" }}>This step is essential</strong> — on "Testing" your connection breaks every 7 days. Connecting your own channel needs no verification, so ignore that note in the dialog.</>,
    <>Open the <strong style={{ color: T.text }}>Clients</strong> tab → <strong style={{ color: T.text }}>Create client</strong> → application type <strong style={{ color: T.text }}>Web application</strong>.</>,
    <>In that client's <strong style={{ color: T.text }}>Authorized redirect URIs</strong>, add this exact URL:</>,
    <>Click <strong style={{ color: T.text }}>Create</strong> — Google shows the <strong style={{ color: T.text }}>Client ID</strong> and <strong style={{ color: T.text }}>Client Secret</strong> once. Copy both into the <strong style={{ color: T.text }}>Client ID</strong> and <strong style={{ color: T.text }}>Client Secret</strong> fields right side.</>,
  ];

  const returningSteps = [
    <>Open the <a href={consoleUrl} target="_blank" rel="noreferrer" style={{ color: "#f5c518" }}>Google Cloud Console</a> and select your existing project. Make sure <strong style={{ color: T.text }}>YouTube Data API v3</strong> is enabled under <a href="https://console.cloud.google.com/apis/dashboard?authuser=1" target="_blank" rel="noreferrer" style={{ color: "#f5c518" }}>APIs &amp; Services</a> → <strong style={{ color: T.text }}>Library</strong>.</>,
    <>
      Open <strong style={{ color: T.text }}>Google Auth Platform</strong> (APIs &amp; Services → OAuth consent screen) — it opens on the <strong style={{ color: T.text }}>Overview</strong> page. Your app is already configured; if you want to double-check, the settings live in the tabs on the left:
      <ul style={{ paddingLeft: 18, margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 5 }}>
        <li><strong style={{ color: T.text }}>Branding</strong> → app name, support email, developer contact email.</li>
        <li><strong style={{ color: T.text }}>Audience</strong> → <strong style={{ color: T.text }}>User type</strong> is <strong style={{ color: T.text }}>External</strong>.</li>
      </ul>
    </>,
    <>Open the <strong style={{ color: T.text }}>Audience</strong> tab. If <strong style={{ color: T.text }}>Publishing status</strong> shows <strong style={{ color: T.text }}>"Testing"</strong>, click <strong style={{ color: T.text }}>Publish app</strong> → <strong style={{ color: T.text }}>Confirm</strong>. <strong style={{ color: "#f5c518" }}>This is essential</strong> — on "Testing" your connection breaks every 7 days. (If it already says "In production", you're set.)</>,
    <>Open the <strong style={{ color: T.text }}>Clients</strong> tab and open your existing <strong style={{ color: T.text }}>Web application</strong> client (or <strong style={{ color: T.text }}>Create client</strong> → Web application if you don't have one).</>,
    <>In that client's <strong style={{ color: T.text }}>Authorized redirect URIs</strong>, make sure this exact URL is listed — add it if it's missing:</>,
    <>Google won't show an existing client's secret. Under <strong style={{ color: T.text }}>Client secrets</strong> click <strong style={{ color: T.text }}>Add secret</strong>, copy the new secret it shows, and paste it with your <strong style={{ color: T.text }}>Client ID</strong> into the fields on right side.</>,
  ];

  const [mode, setMode] = useState("first");
  const steps = mode === "first" ? firstTimeSteps : returningSteps;

  const input = { width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 13, padding: "10px 12px", fontFamily: "inherit", boxSizing: "border-box" };

  // Already configured users default to the compact reconnect view; first-timers see the full
  // steps. "Use a different Google project" flips a configured user into the full editor.
  const [editing, setEditing] = useState(!setup.configured);
  const showFull = !setup.configured || editing;
  const maskedId = setup.clientId ? setup.clientId.replace(/^(.{8}).*?(.{6})$/, "$1…$2") : "";
  const title = !setup.configured ? `Connect ${label} — one-time setup` : editing ? `Update ${label} credentials` : `Reconnect ${label}`;

  const unverifiedNote = (
    <div style={{ background: "rgba(245,197,24,0.08)", border: "1px solid rgba(245,197,24,0.25)", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 12.5, color: "rgba(255,255,255,0.78)", lineHeight: 1.6 }}>
      <strong style={{ color: "#f5c518" }}>What to expect next:</strong> Google shows a <strong style={{ color: T.text }}>"Google hasn't verified this app"</strong> screen. That's normal and <strong style={{ color: T.text }}>not a risk</strong> — it's <em>your own</em> app connecting to <em>your own</em> channel. Click <strong style={{ color: T.text }}>Advanced → Go to {label} (unsafe)</strong>, then <strong style={{ color: T.text }}>Allow</strong>. No verification is needed.
      <img
        src="/assets/images/google-unverified.png"
        alt="Google 'hasn't verified this app' screen — click Advanced, then Go to your app"
        onError={(e) => { e.currentTarget.style.display = "none"; }}
        style={{ display: "block", width: "100%", borderRadius: 8, border: `1px solid ${T.border}`, marginTop: 10 }}
      />
    </div>
  );

  return (
    <div onClick={() => !busy && setSetup(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, width: showFull ? "min(1040px, 82vw)" : "min(480px, 94vw)", maxWidth: "100%", marginBottom: 40 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 4 }}>
          <button onClick={() => setSetup(null)} disabled={busy} style={{ background: "none", border: "none", color: T.muted, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {!showFull ? (
          // ── Compact reconnect: creds already saved, no need to redo setup ──
          <>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: T.text, margin: "0 0 8px" }}>{title}</h2>
            <p style={{ fontSize: 13.5, color: T.muted, marginTop: 0, marginBottom: 16, lineHeight: 1.6 }}>
              Your Google project is already set up{maskedId ? <> (Client ID <code style={{ color: T.text }}>{maskedId}</code>)</> : ""}. Reconnecting just re-authorizes your channel — no setup needed.
            </p>
            {unverifiedNote}
            <div style={{ fontSize: 12.5, marginBottom: 16 }}>
              <button onClick={() => setEditing(true)} style={{ background: "none", border: "none", color: T.accent, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>Use a different Google project →</button>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={onRemove} disabled={busy} style={{ ...btn("transparent"), border: "1px solid rgba(248,113,113,0.4)", color: "#f87171" }}>Remove &amp; start over</button>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setSetup(null)} disabled={busy} style={{ ...btn("transparent"), border: `1px solid ${T.border}`, color: T.muted }}>Cancel</button>
                <button onClick={onSave} disabled={busy} style={{ ...btn(T.accent), opacity: busy ? 0.6 : 1 }}>{busy ? "Working…" : "Connect"}</button>
              </div>
            </div>
          </>
        ) : (
          // ── Full setup: first-time, or switching to a different project ──
          <>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "stretch", marginBottom: 18 }}>
              {/* Left — title, intro + the step-by-step guide */}
              <div style={{ flex: "1 1 380px", minWidth: 0 }}>
                <h2 style={{ fontSize: 19, fontWeight: 800, color: T.text, margin: "0 0 6px" }}>{title}</h2>
                <p style={{ fontSize: 14, color: T.muted, marginTop: 0, marginBottom: 16, lineHeight: 1.6 }}>
                  This connects {label} through your own Google project so uploads run on your own quota. You only do this once.
                </p>
                <div style={{ display: "inline-flex", gap: 4, padding: 4, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 16 }}>
                  {[{ k: "first", label: "First time" }, { k: "returning", label: "Already have a Google Cloud project" }].map(({ k, label: tl }) => (
                    <button key={k} onClick={() => setMode(k)} style={{
                      background: mode === k ? T.accent : "transparent", color: mode === k ? "#0b0b10" : T.muted,
                      border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 12.5, fontWeight: 700,
                      cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                    }}>{tl}</button>
                  ))}
                </div>
                <ol style={{ paddingLeft: 20, margin: 0, display: "flex", flexDirection: "column", gap: 11 }}>
                  {steps.map((s, i) => (
                    <li key={i} style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.6 }}>
                      {s}
                      {i === 4 && (
                        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                          <code style={{ flex: 1, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 12, padding: "9px 11px", overflowX: "auto", whiteSpace: "nowrap" }}>{setup.redirectUri || "—"}</code>
                          <button onClick={() => onCopy(setup.redirectUri)} style={{ ...btn(T.accent), padding: "9px 12px", flexShrink: 0 }}>Copy</button>
                        </div>
                      )}
                    </li>
                  ))}
                </ol>

                {/* Daily upload limit heads-up — the #1 reason automation appears to "stop" */}
                <div style={{ marginTop: 16, background: "rgba(245,197,24,0.07)", border: "1px solid rgba(245,197,24,0.28)", borderRadius: 10, padding: "11px 13px", fontSize: 12.5, color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>
                  <strong style={{ color: "#f5c518" }}>One more thing — your daily upload limit.</strong> YouTube limits new or unverified channels to just a few uploads per day. <strong style={{ color: T.text }}>Verify your channel</strong> (free, takes a minute) at <a href="https://www.youtube.com/verify" target="_blank" rel="noreferrer" style={{ color: "#f5c518" }}>youtube.com/verify</a> to raise it to ~100 uploads/day. If a campaign hits the limit, publishing pauses and auto-resumes after YouTube's daily reset — you'll get a notification.
                </div>
              </div>

              {/* Right — enter credentials + what to expect (separated by a divider) */}
              <div style={{ flex: "1 1 320px", minWidth: 0, borderLeft: `1px solid ${T.border}`, paddingLeft: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 12 }}>Paste your credentials (from step 6)</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 12, color: T.muted, display: "block", marginBottom: 5 }}>Client ID</label>
                      <input style={input} value={setup.clientId} placeholder="xxxxx.apps.googleusercontent.com"
                        name="yt-oauth-client-id" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                        data-lpignore="true" data-1p-ignore data-form-type="other"
                        onChange={(e) => setSetup({ ...setup, clientId: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: T.muted, display: "block", marginBottom: 5 }}>Client Secret</label>
                      <input style={input} type="password" value={setup.clientSecret} placeholder="GOCSPX-…"
                        name="yt-oauth-client-secret" autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                        data-lpignore="true" data-1p-ignore data-form-type="other"
                        onChange={(e) => setSetup({ ...setup, clientSecret: e.target.value })} />
                    </div>
                  </div>
                </div>
                {unverifiedNote}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
              <div>
                {setup.configured && (
                  <button onClick={() => setEditing(false)} disabled={busy} style={{ ...btn("transparent"), border: `1px solid ${T.border}`, color: T.muted }}>← Back</button>
                )}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setSetup(null)} disabled={busy} style={{ ...btn("transparent"), border: `1px solid ${T.border}`, color: T.muted }}>Cancel</button>
                <button onClick={onSave} disabled={busy} style={{ ...btn(T.accent), opacity: busy ? 0.6 : 1 }}>{busy ? "Working…" : "Save & Connect"}</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
