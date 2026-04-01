import React, { useState, useEffect, useRef } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import {
  OVERLAY_TYPES, OVERLAY_TYPE_KEYS, ANCHOR_LABELS,
  createOverlay,
} from "../../core/overlayRegistry";
import { getSafePlacementAnchors } from "../../core/overlayPlacementEngine";
import { SFX_LIBRARY, SFX_KEYS, getSFXPreviewUrl } from "../../core/sfxRegistry";

function Label({ children }) {
  return (
    <div className="text-[12px] font-bold tracking-widest uppercase text-[#7070a0] mb-[5px]"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {children}
    </div>
  );
}

function Sel({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full bg-[#12121c] border border-[rgba(255,255,255,0.08)] rounded-[6px] px-2 py-[6px] text-[14px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none cursor-pointer">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

function Slider({ label, value, onChange, min = 0, max = 100, step = 1, unit = "" }) {
  return (
    <div className="flex flex-col gap-[4px]">
      <div className="flex justify-between">
        <Label>{label}</Label>
        <span className="text-[12px] font-mono text-[#7070a0]">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#7c5cfc] cursor-pointer" style={{ height: 2 }} />
    </div>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input value={value || ""} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[#12121c] border border-[rgba(255,255,255,0.08)] rounded-[6px] px-3 py-[7px] text-[14px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none" />
  );
}

/* ── Animated overlay preview ── */
function OverlayPreview({ type }) {
  const PREVIEWS = {
    HeadlineText: (
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, fontWeight:900, color:"#fff", letterSpacing:"-0.5px", textTransform:"uppercase", lineHeight:1, textShadow:"0 1px 8px rgba(0,0,0,0.6)" }}>
        THIS CHANGES<br/><span style={{color:"#f0e040"}}>EVERYTHING</span>
      </div>
    ),
    Badge: (
      <div style={{ display:"flex", alignItems:"center", gap:5, background:"#ff4d6d", padding:"4px 12px", borderRadius:100, fontFamily:"monospace", fontSize:11, fontWeight:800, color:"#fff", letterSpacing:"0.08em", textTransform:"uppercase" }}>
        <div style={{width:6,height:6,borderRadius:"50%",background:"#fff"}}/>LIVE
      </div>
    ),
    StatCallout: (
      <div style={{ background:"rgba(0,0,0,0.6)", borderLeft:"3px solid #f0e040", padding:"6px 10px", borderRadius:"0 6px 6px 0" }}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:"#f0e040",lineHeight:1}}>↑ 94%</div>
        <div style={{fontFamily:"monospace",fontSize:9,color:"rgba(255,255,255,0.6)",letterSpacing:"0.1em",textTransform:"uppercase"}}>ENGAGEMENT</div>
      </div>
    ),
    HighlightBox: (
      <div style={{ background:"rgba(245,243,238,0.95)", padding:"6px 10px", borderRadius:6, maxWidth:160 }}>
        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:11,fontWeight:700,color:"#111",lineHeight:1.3}}>Did you know this changes everything?</div>
      </div>
    ),
    LiveDot: (
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <div style={{width:8,height:8,borderRadius:"50%",background:"#ff4d6d",boxShadow:"0 0 0 4px rgba(255,77,109,0.2)"}}/>
        <div style={{fontFamily:"monospace",fontSize:12,fontWeight:800,color:"#ff4d6d",letterSpacing:"0.12em"}}>LIVE</div>
      </div>
    ),
    EmojiFloat: (
      <div style={{ display:"flex", gap:6, fontSize:22 }}>❤️🔥💯</div>
    ),
    ArrowPointer: (
      <svg width={32} height={32} viewBox="0 0 48 48">
        <path d="M8 24 L32 24 M24 12 L36 24 L24 36" stroke="#f0e040" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" style={{transform:"rotate(90deg)",transformOrigin:"center"}}/>
      </svg>
    ),
  };

  return (
    <div style={{
      height: 64,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(160deg,#0d0d18,#050510)",
      borderRadius: "8px 8px 0 0",
      overflow: "hidden",
      padding: "8px",
    }}>
      {PREVIEWS[type] || <span style={{color:"#55556a",fontSize:11}}>{type}</span>}
    </div>
  );
}

/* ── Anchor grid ── */
const GRID_ANCHORS = [
  ["top-left","top-center","top-right"],
  ["mid-left", null,       "mid-right"],
  ["bottom-left","bottom-center","bottom-right"],
];

function AnchorGrid({ value, onChange, availableAnchors }) {
  return (
    <div className="flex flex-col gap-[3px]" style={{ width: 80 }}>
      {GRID_ANCHORS.map((row, ri) => (
        <div key={ri} className="flex gap-[3px]">
          {row.map((anchor, ci) => {
            if (!anchor) return <div key={ci} style={{ flex:1, aspectRatio:"1" }} />;
            const isActive    = value === anchor;
            const isAvailable = !availableAnchors || availableAnchors.includes(anchor);
            return (
              <button key={anchor} onClick={() => isAvailable && onChange(anchor)}
                title={ANCHOR_LABELS[anchor]} disabled={!isAvailable}
                style={{ flex:1, aspectRatio:"1" }}
                className={`rounded-[4px] border transition-all flex items-center justify-center
                  ${isActive ? "bg-[#7c5cfc] border-[#7c5cfc]"
                    : isAvailable ? "bg-[#1c1c28] border-[rgba(255,255,255,0.08)] hover:border-[#7c5cfc] cursor-pointer"
                    : "bg-[#0e0e15] border-[rgba(255,255,255,0.03)] opacity-25 cursor-not-allowed"}`}>
                <div className={`rounded-full ${isActive ? "bg-white" : "bg-[#55556a]"}`} style={{width:5,height:5}} />
              </button>
            );
          })}
        </div>
      ))}
      <div className="text-[11px] text-[#55556a] mt-[3px] text-center truncate">
        {ANCHOR_LABELS[value] || "—"}
      </div>
    </div>
  );
}

/* ── Content editors ── */
function ContentEditor({ overlay, update }) {
  const t = overlay.type;

  if (t === "HeadlineText") return (
    <div className="flex flex-col gap-3">
      <div><Label>Text</Label><TextInput value={overlay.text} onChange={v => update("text", v)} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Size</Label>
          <input type="number" value={overlay.size || 72} onChange={e => update("size", Number(e.target.value))}
            className="w-full bg-[#12121c] border border-[rgba(255,255,255,0.08)] rounded-[6px] px-2 py-[7px] text-[14px] text-[#e8e8f0]" />
        </div>
        <div><Label>Color</Label>
          <input type="color" value={overlay.color || "#ffffff"} onChange={e => update("color", e.target.value)}
            className="w-full h-[38px] rounded-[6px] cursor-pointer border border-[rgba(255,255,255,0.08)]" />
        </div>
      </div>
    </div>
  );

  if (t === "Badge" || t === "LiveDot") return (
    <div className="flex flex-col gap-3">
      <div><Label>Text</Label><TextInput value={overlay.text} onChange={v => update("text", v)} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Style</Label>
          <Sel value={overlay.variant || "pill"} onChange={v => update("variant", v)}
            options={[["pill","Pill"],["outline","Outline"]]} />
        </div>
        <div><Label>Color</Label>
          <input type="color" value={overlay.color || "#ff4d6d"} onChange={e => update("color", e.target.value)}
            className="w-full h-[38px] rounded-[6px] cursor-pointer border border-[rgba(255,255,255,0.08)]" />
        </div>
      </div>
    </div>
  );

  if (t === "StatCallout") return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Value</Label><TextInput value={overlay.value} onChange={v => update("value", v)} /></div>
        <div><Label>Label</Label><TextInput value={overlay.label} onChange={v => update("label", v)} /></div>
      </div>
      <div><Label>Color</Label>
        <input type="color" value={overlay.color || "#f0e040"} onChange={e => update("color", e.target.value)}
          className="w-full h-[38px] rounded-[6px] cursor-pointer border border-[rgba(255,255,255,0.08)]" />
      </div>
    </div>
  );

  if (t === "HighlightBox") return (
    <div className="flex flex-col gap-3">
      <div><Label>Text</Label>
        <textarea value={overlay.text || ""} rows={2} onChange={e => update("text", e.target.value)}
          className="w-full bg-[#12121c] border border-[rgba(255,255,255,0.08)] rounded-[6px] px-3 py-[7px] text-[14px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none resize-none" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Bg</Label>
          <input type="color" value={overlay.color || "#f5f3ee"} onChange={e => update("color", e.target.value)}
            className="w-full h-[38px] rounded-[6px] cursor-pointer border border-[rgba(255,255,255,0.08)]" />
        </div>
        <div><Label>Text</Label>
          <input type="color" value={overlay.textColor || "#111111"} onChange={e => update("textColor", e.target.value)}
            className="w-full h-[38px] rounded-[6px] cursor-pointer border border-[rgba(255,255,255,0.08)]" />
        </div>
      </div>
    </div>
  );

  if (t === "EmojiFloat") return (
    <div><Label>Emojis (comma separated)</Label>
      <TextInput value={(overlay.emojis || ["❤️","🔥","💯"]).join(", ")}
        onChange={v => update("emojis", v.split(",").map(s => s.trim()).filter(Boolean))} />
    </div>
  );

  if (t === "ArrowPointer") return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Direction</Label>
          <Sel value={overlay.direction || "down"} onChange={v => update("direction", v)}
            options={[["down","Down"],["up","Up"],["left","Left"],["right","Right"]]} />
        </div>
        <div><Label>Color</Label>
          <input type="color" value={overlay.color || "#f0e040"} onChange={e => update("color", e.target.value)}
            className="w-full h-[38px] rounded-[6px] cursor-pointer border border-[rgba(255,255,255,0.08)]" />
        </div>
      </div>
      <div><Label>Label</Label>
        <TextInput value={overlay.label} onChange={v => update("label", v)} placeholder="Optional" />
      </div>
    </div>
  );

  return null;
}

/* ── Overlay card ── */
function OverlayCard({ overlay, beat, onUpdate, onRemove }) {
  const [open, setOpen] = useState(true);
  const scale = overlay.scale ?? 1;
  const delay = overlay.delay ?? 0;

  const safeAnchors = getSafePlacementAnchors({
    layout:           beat.layout,
    overlayType:      overlay.type,
    captionPosition:  beat.caption?.position || "bottom",
    existingOverlays: (beat.overlays || []).filter(o => o.id !== overlay.id),
  });

  return (
    <div className="rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[#111118] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-[10px]"
        style={{ borderBottom: open ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
        <button onClick={() => setOpen(o => !o)}
          className="flex-1 flex items-center gap-2 bg-transparent border-0 cursor-pointer text-left">
          <span className="text-[14px] font-bold text-[#e8e8f0]">{OVERLAY_TYPES[overlay.type]?.label || overlay.type}</span>
          <span className="text-[13px] text-[#55556a]">{ANCHOR_LABELS[overlay.anchor] || overlay.anchor}</span>
          <span className="ml-auto text-[#55556a]">{open ? "▾" : "▸"}</span>
        </button>
        <button onClick={onRemove}
          className="text-[13px] text-[#f87171] hover:text-[#ff6b6b] bg-transparent border-0 cursor-pointer px-1">✕</button>
      </div>

      {open && (
        <div className="flex gap-0">
          <div className="flex flex-col gap-3 p-3 shrink-0" style={{ width:160, borderRight:"1px solid rgba(255,255,255,0.06)" }}>
            <AnchorGrid value={overlay.anchor} onChange={v => onUpdate("anchor", v)} availableAnchors={safeAnchors} />
            <Slider label="Scale" value={Math.round(scale*100)} onChange={v => onUpdate("scale", v/100)} min={40} max={150} unit="%" />
            <Slider label="Delay" value={Math.round(delay*10)} onChange={v => onUpdate("delay", v/10)} min={0} max={30} step={1} unit="×0.1s" />
            <div>
              <Label>Motion</Label>
              <Sel value={overlay.motion || "pop"} onChange={v => onUpdate("motion", v)}
                options={[["pop","Pop"],["slam","Slam"],["slideUp","Slide Up"],["slideLeft","Slide Left"],["fade","Fade"]]} />
            </div>
            <div className="flex flex-col gap-1 pt-2 border-t border-[rgba(255,255,255,0.05)]">
              <Label>Sound</Label>
              <select value={overlay.sfx || "none"} onChange={e => onUpdate("sfx", e.target.value)}
                className="w-full bg-[#12121c] border border-[rgba(255,255,255,0.08)] rounded-[6px] px-2 py-[5px] text-[12px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none cursor-pointer">
                <option value="none">None</option>
                {SFX_KEYS.map(k => <option key={k} value={k}>{SFX_LIBRARY[k].label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex-1 p-3">
            <ContentEditor overlay={overlay} update={(k,v) => onUpdate(k,v)} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main section ── */
export default function OverlaySection({ beat }) {
  const updateBeat = useProjectStore((s) => s.updateBeat);
  const [adding, setAdding] = useState(false);
  if (!beat) return null;

  const overlays = beat.overlays || [];

  const addOverlay = (type) => {
    const ov = createOverlay(type);
    if (!ov) return;
    const safe = getSafePlacementAnchors({
      layout: beat.layout, overlayType: type,
      captionPosition: beat.caption?.position || "bottom",
      existingOverlays: overlays,
    });
    if (safe.length > 0) ov.anchor = safe[0];
    updateBeat(beat.id, { overlays: [...overlays, ov] });
    setAdding(false);
  };

  const updateOverlay = (id, key, value) =>
    updateBeat(beat.id, { overlays: overlays.map(o => o.id === id ? { ...o, [key]: value } : o) });

  const removeOverlay = (id) =>
    updateBeat(beat.id, { overlays: overlays.filter(o => o.id !== id) });

  return (
    <div className="flex flex-col gap-3">

      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold tracking-widest uppercase text-[#55556a]"
          style={{ fontFamily:"'JetBrains Mono',monospace" }}>Overlays</span>
        <button onClick={() => setAdding(a => !a)}
          className={`text-[13px] px-3 py-[6px] rounded-[7px] border transition-all font-semibold
            ${adding ? "bg-[#7c5cfc] border-[#7c5cfc] text-white"
              : "bg-[#1c1c28] border-[rgba(255,255,255,0.08)] text-[#e8e8f0] hover:border-[#7c5cfc]"}`}>
          {adding ? "Cancel" : "+ Add"}
        </button>
      </div>

      {/* Type picker with previews — #9 */}
      {adding && (
        <div className="grid grid-cols-3 gap-2 p-3 rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[#111118]">
          {OVERLAY_TYPE_KEYS.map(type => (
            <button key={type} onClick={() => addOverlay(type)}
              className="flex flex-col rounded-[8px] border border-[rgba(255,255,255,0.06)] bg-[#0e0e15] hover:border-[#7c5cfc] transition-all cursor-pointer overflow-hidden text-left">
              <OverlayPreview type={type} />
              <div className="px-2 py-[6px] border-t border-[rgba(255,255,255,0.05)]">
                <div className="text-[12px] font-semibold text-[#e8e8f0]">{OVERLAY_TYPES[type].label}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {overlays.length === 0 && !adding && (
        <div className="flex flex-col items-center justify-center py-8 gap-2 opacity-40">
          <span className="text-[28px]">◎</span>
          <span className="text-[14px] text-[#9494a8]">No overlays on this beat</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {overlays.map(overlay => (
          <OverlayCard key={overlay.id} overlay={overlay} beat={beat}
            onUpdate={(k,v) => updateOverlay(overlay.id, k, v)}
            onRemove={() => removeOverlay(overlay.id)} />
        ))}
      </div>

    </div>
  );
}