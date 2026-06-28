/**
 * AivLab.jsx — PRIVATE AI Video step-through lab (admin only, /admin/aiv-lab, not linked in nav).
 *
 * Enter a prompt + options, then run the pipeline ONE STAGE AT A TIME and inspect each step's raw
 * output (research → write → direct → resolve → design) — so we can see exactly which stage breaks
 * quality instead of judging the final video. The Design step composites each beat's HTML over its
 * fetched asset for a true frame preview. Calls /api/dev/* (admin-gated). Nothing is saved/charged.
 */
import { useState } from "react";
import { serverFetch } from "../services/serverApi";

const C = {
  bg: "#0c0c12", panel: "#14141e", border: "rgba(255,255,255,0.10)",
  text: "#e8e8f0", muted: "#9aa3b2", faint: "#6b7280", accent: "#7c5cfc", ok: "#34d399", warn: "#f59e0b",
};
const box = { background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 };
const btn = (on = true) => ({ background: on ? C.accent : "#2a2a3a", color: on ? "#fff" : C.faint, border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: on ? "pointer" : "default", fontFamily: "inherit" });
const inp = { background: "#0e0e16", border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: "8px 10px", fontSize: 13, fontFamily: "inherit" };
const pre = { ...box, maxHeight: 320, overflow: "auto", fontSize: 11.5, lineHeight: 1.5, fontFamily: "'JetBrains Mono',monospace", whiteSpace: "pre-wrap", color: C.muted };

const STYLES = ["auto", "editorial_retro", "minimal", "bold_pop", "dark_cinematic", "corporate_clean", "gradient_glow", "meme_chaos"];

export default function AivLab() {
  const [form, setForm] = useState({ prompt: "", targetDuration: 45, styleId: "auto", orientation: "9:16", language: "en" });
  const [research, setResearch] = useState(null);
  const [script, setScript] = useState(null);
  const [direct, setDirect] = useState(null);     // { style, palette, beats }
  const [resolved, setResolved] = useState(null); // beats[]
  const [design, setDesign] = useState(null);     // { designs, canvas }
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function call(step, body) {
    setErr(""); setBusy(step);
    try {
      const r = await serverFetch(`/api/dev/${step}`, { method: "POST", body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `${step} failed`);
      return d;
    } catch (e) { setErr(`${step}: ${e.message}`); return null; }
    finally { setBusy(""); }
  }

  const runResearch = async () => { const d = await call("research", { prompt: form.prompt }); if (d) { setResearch(d.research); setScript(null); setDirect(null); setResolved(null); setDesign(null); } };
  const runWrite    = async () => { const d = await call("write", { research, targetDuration: +form.targetDuration, language: form.language }); if (d) { setScript(d.script); setDirect(null); setResolved(null); setDesign(null); } };
  const runDirect   = async () => { const d = await call("direct", { research, script, styleId: form.styleId, targetDuration: +form.targetDuration, orientation: form.orientation }); if (d) { setDirect(d); setResolved(null); setDesign(null); } };
  const runResolve  = async () => { const d = await call("resolve", { beats: direct.beats, style: direct.style, orientation: form.orientation }); if (d) { setResolved(d.beats); setDesign(null); } };
  const runDesign   = async () => { const d = await call("design", { beats: resolved || direct.beats, style: direct.style, palette: direct.palette, orientation: form.orientation, language: form.language }); if (d) setDesign(d); };

  const Section = ({ n, title, can, onRun, runLabel, children }) => (
    <div style={{ ...box, marginTop: 14, opacity: can ? 1 : 0.5 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: children ? 12 : 0 }}>
        <span style={{ width: 24, height: 24, borderRadius: 99, background: "#2a2a3a", color: C.text, fontSize: 12, fontWeight: 800, display: "grid", placeItems: "center" }}>{n}</span>
        <strong style={{ color: C.text, fontSize: 14 }}>{title}</strong>
        <button style={{ ...btn(can && !busy), marginLeft: "auto" }} disabled={!can || !!busy} onClick={onRun}>{busy === runLabel ? "Running…" : `Run ${title}`}</button>
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Outfit',sans-serif", padding: "28px 22px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}>AI Video — Step Lab</h1>
        <div style={{ color: C.faint, fontSize: 12.5, marginBottom: 18 }}>Run each pipeline stage on its own and inspect the output. Nothing is saved or charged.</div>

        {/* Inputs */}
        <div style={box}>
          <textarea value={form.prompt} onChange={e => set("prompt", e.target.value)} placeholder="Topic / prompt…" rows={2} style={{ ...inp, width: "100%", resize: "vertical", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            <label style={{ fontSize: 12, color: C.muted }}>Duration{" "}
              <select value={form.targetDuration} onChange={e => set("targetDuration", e.target.value)} style={inp}>{[15,30,45,60,90].map(s => <option key={s} value={s}>{s}s</option>)}</select>
            </label>
            <label style={{ fontSize: 12, color: C.muted }}>Style{" "}
              <select value={form.styleId} onChange={e => set("styleId", e.target.value)} style={inp}>{STYLES.map(s => <option key={s} value={s}>{s}</option>)}</select>
            </label>
            <label style={{ fontSize: 12, color: C.muted }}>Orientation{" "}
              <select value={form.orientation} onChange={e => set("orientation", e.target.value)} style={inp}>{["9:16","1:1","4:5","16:9"].map(s => <option key={s} value={s}>{s}</option>)}</select>
            </label>
            <label style={{ fontSize: 12, color: C.muted }}>Language{" "}
              <select value={form.language} onChange={e => set("language", e.target.value)} style={inp}>{["en","hi","hinglish","es"].map(s => <option key={s} value={s}>{s}</option>)}</select>
            </label>
          </div>
        </div>

        {err && <div style={{ ...box, marginTop: 12, borderColor: "#f8717155", color: "#fca5a5", fontSize: 12.5 }}>{err}</div>}

        {/* 1 — Research */}
        <Section n={1} title="research" can={!!form.prompt.trim()} onRun={runResearch} runLabel="research">
          {research && <pre style={pre}>{JSON.stringify(research, null, 2)}</pre>}
        </Section>

        {/* 2 — Write */}
        <Section n={2} title="write" can={!!research} onRun={runWrite} runLabel="write">
          {script && <>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{script.beats.length} beats · style-agnostic · {script.music_mood}</div>
            {script.beats.map(b => (
              <div key={b.beat_index} style={{ borderBottom: `1px solid ${C.border}`, padding: "7px 0", fontSize: 12.5 }}>
                <span style={{ color: C.faint }}>#{b.beat_index}{b.continues_previous ? "+" : ""}</span>{" "}
                <span>{b.script_line}</span>
                <div style={{ color: C.muted, fontSize: 11.5, marginTop: 2 }}>content[{b.content?.kind}]: {b.content?.headline || "—"}{b.content?.subtext ? ` · ${b.content.subtext}` : ""}</div>
              </div>
            ))}
            <details style={{ marginTop: 8 }}><summary style={{ cursor: "pointer", color: C.faint, fontSize: 11.5 }}>narration + raw</summary><pre style={pre}>{JSON.stringify(script, null, 2)}</pre></details>
          </>}
        </Section>

        {/* 3 — Direct */}
        <Section n={3} title="direct" can={!!script} onRun={runDirect} runLabel="direct">
          {direct && <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 12.5 }}>
              <strong>style: {direct.style?.id}</strong>
              {["bg","accent","accent2","text"].map(k => <span key={k} title={`${k} ${direct.palette?.[k]}`} style={{ width: 18, height: 18, borderRadius: 4, background: direct.palette?.[k], border: `1px solid ${C.border}` }} />)}
              <span style={{ color: C.faint }}>theme {direct.palette?.theme}</span>
            </div>
            {direct.beats.map(b => {
              const as = b.assets || [];
              return (
              <div key={b.beat_index} style={{ borderBottom: `1px solid ${C.border}`, padding: "7px 0", fontSize: 12 }}>
                <span style={{ color: C.faint }}>#{b.beat_index}{b.continues_previous ? "+" : ""}</span>{" "}
                <span style={{ color: as.length === 0 ? C.warn : C.ok, fontWeight: 700 }}>{as.length === 0 ? "typographic" : as.length > 1 ? `${as.length}× multi` : as[0].source}</span>
                <span style={{ color: C.faint }}>{b.camera ? ` /${b.camera}` : ""} →{b.transition_out}{b.sfx_hint ? ` ♪${b.sfx_hint}` : ""} (fb:{b.fallback})</span>
                {as.map((a, k) => (
                  <div key={k} style={{ color: C.muted, fontSize: 11.5, marginTop: 2 }}>
                    <span style={{ color: C.faint }}>{a.source}{a.label ? ` "${a.label}"` : ""}:</span> {a.entity || a.query || a.prompt || "—"}
                  </div>
                ))}
              </div>
              );
            })}
          </>}
        </Section>

        {/* 4 — Resolve */}
        <Section n={4} title="resolve" can={!!direct} onRun={runResolve} runLabel="resolve">
          {resolved && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10 }}>
            {resolved.map(b => {
              const ra = b.resolvedAssets || [];
              return (
              <div key={b.beat_index} style={{ ...box, padding: 8 }}>
                <div style={{ aspectRatio: "9/16", background: "#0e0e16", borderRadius: 6, overflow: "hidden", display: "flex", gap: 2 }}>
                  {ra.length
                    ? ra.map((a, k) => a.kind === "video"
                        ? <video key={k} src={a.src} muted style={{ flex: 1, minWidth: 0, height: "100%", objectFit: "cover" }} />
                        : <img key={k} src={a.src} alt="" style={{ flex: 1, minWidth: 0, height: "100%", objectFit: "cover" }} />)
                    : <span style={{ margin: "auto", color: C.warn, fontSize: 11 }}>typographic</span>}
                </div>
                <div style={{ fontSize: 10.5, color: C.muted, marginTop: 5 }}>#{b.beat_index} {ra.length ? `${ra.length}×${ra.map(a => a.kind).join("/")}${ra.some(a => a.real) ? " real" : ""}` : "—"}</div>
              </div>
              );
            })}
          </div>}
        </Section>

        {/* 5 — Design (composited preview) */}
        <Section n={5} title="design" can={!!resolved} onRun={runDesign} runLabel="design">
          {design && <DesignGrid design={design} beats={resolved || direct.beats} />}
        </Section>
      </div>
    </div>
  );
}

// Render each beat's designed HTML scaled to a thumbnail. Image beats now place their image(s) IN
// the HTML, so we render the HTML directly. Only a VIDEO beat keeps a separate full-bleed clip
// behind the (transparent) overlay HTML, so we composite the video behind for those.
function DesignGrid({ design, beats }) {
  const { designs, canvas } = design;
  const previewW = 200;
  const scale = previewW / canvas.width;
  const boxH = Math.round(canvas.height * scale);
  const byIdx = Object.fromEntries(beats.map(b => [b.beat_index, b]));
  const videoOf = (b) => (b.resolvedAssets || []).find(a => a?.kind === "video") || (b.asset?.kind === "video" ? b.asset : null);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill,minmax(${previewW}px,1fr))`, gap: 14 }}>
      {designs.map(d => {
        const beat = byIdx[d.beatIndex] || {};
        const vid = videoOf(beat);
        return (
          <div key={d.beatIndex} style={{ ...box, padding: 8 }}>
            <div style={{ position: "relative", width: previewW, height: boxH, background: "#000", borderRadius: 6, overflow: "hidden" }}>
              {vid && <video src={vid.src} muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
              {d.html
                ? <iframe title={`b${d.beatIndex}`} srcDoc={d.html} scrolling="no"
                    style={{ position: "absolute", top: 0, left: 0, width: canvas.width, height: canvas.height, border: 0, transform: `scale(${scale})`, transformOrigin: "top left", background: vid ? "transparent" : "#000", pointerEvents: "none" }} />
                : <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#f87171", fontSize: 11 }}>no design</div>}
            </div>
            <div style={{ fontSize: 10.5, color: "#9aa3b2", marginTop: 5, display: "flex", justifyContent: "space-between" }}>
              <span>#{d.beatIndex} {beat.source}</span>
              <details><summary style={{ cursor: "pointer", color: "#6b7280" }}>html</summary>
                <textarea readOnly value={d.html} style={{ position: "fixed", left: 12, bottom: 12, width: 520, height: 300, zIndex: 50, background: "#0e0e16", color: "#9aa3b2", fontSize: 10, fontFamily: "monospace", border: "1px solid #333" }} />
              </details>
            </div>
          </div>
        );
      })}
    </div>
  );
}
