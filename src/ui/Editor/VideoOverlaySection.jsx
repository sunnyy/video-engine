/**
 * VideoOverlaySection.jsx
 * src/ui/Editor/VideoOverlaySection.jsx
 *
 * Editor for video-level overlays — persistent across all beats.
 * Stored on project.overlays (not beat.overlays).
 */
import React, { useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import {
  OVERLAY_TYPES, OVERLAY_TYPE_KEYS, ANCHOR_LABELS, createOverlay,
} from "../../core/overlayRegistry";
import { SFX_LIBRARY, SFX_KEYS } from "../../core/sfxRegistry";

function Label({ children }) {
  return (
    <div className="text-[12px] font-bold tracking-widest uppercase text-[#7070a0] mb-[4px]"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {children}
    </div>
  );
}

function Sel({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full bg-[#12121c] border border-[rgba(255,255,255,0.08)] rounded-[6px] px-2 py-[6px] text-[13px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none cursor-pointer">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

function Slider({ label, value, onChange, min = 0, max = 100, step = 1, unit = "" }) {
  return (
    <div className="flex flex-col gap-[3px]">
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

/* 3×3 anchor grid */
const GRID_ANCHORS = [
  ["top-left","top-center","top-right"],
  ["mid-left", null,       "mid-right"],
  ["bottom-left","bottom-center","bottom-right"],
];

function AnchorGrid({ value, onChange }) {
  return (
    <div className="flex flex-col gap-[3px]" style={{ width: 80 }}>
      {GRID_ANCHORS.map((row, ri) => (
        <div key={ri} className="flex gap-[3px]">
          {row.map((anchor, ci) => {
            if (!anchor) return <div key={ci} style={{ flex:1, aspectRatio:"1" }} />;
            const isActive = value === anchor;
            return (
              <button key={anchor} onClick={() => onChange(anchor)}
                title={ANCHOR_LABELS[anchor]}
                style={{ flex:1, aspectRatio:"1" }}
                className={`rounded-[4px] border transition-all flex items-center justify-center cursor-pointer
                  ${isActive
                    ? "bg-[#7c5cfc] border-[#7c5cfc]"
                    : "bg-[#1c1c28] border-[rgba(255,255,255,0.08)] hover:border-[#7c5cfc]"}`}>
                <div className={`rounded-full ${isActive ? "bg-white" : "bg-[#55556a]"}`}
                  style={{ width:5, height:5 }} />
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

/* Content editors — same as beat overlays */
function ContentEditor({ overlay, update }) {
  const t = overlay.type;

  if (t === "HeadlineText") return (
    <div className="flex flex-col gap-2">
      <div><Label>Text</Label>
        <input value={overlay.text || ""} onChange={e => update("text", e.target.value)}
          className="w-full bg-[#12121c] border border-[rgba(255,255,255,0.08)] rounded-[6px] px-3 py-[7px] text-[13px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Size</Label>
          <input type="number" value={overlay.size || 72} onChange={e => update("size", Number(e.target.value))}
            className="w-full bg-[#12121c] border border-[rgba(255,255,255,0.08)] rounded-[6px] px-2 py-[7px] text-[13px] text-[#e8e8f0]" />
        </div>
        <div><Label>Color</Label>
          <input type="color" value={overlay.color || "#ffffff"} onChange={e => update("color", e.target.value)}
            className="w-full h-[38px] rounded-[6px] cursor-pointer border border-[rgba(255,255,255,0.08)]" />
        </div>
      </div>
    </div>
  );

  if (t === "Badge" || t === "LiveDot") return (
    <div className="flex flex-col gap-2">
      <div><Label>Text</Label>
        <input value={overlay.text || ""} onChange={e => update("text", e.target.value)}
          className="w-full bg-[#12121c] border border-[rgba(255,255,255,0.08)] rounded-[6px] px-3 py-[7px] text-[13px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none" />
      </div>
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
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Value</Label>
          <input value={overlay.value || ""} onChange={e => update("value", e.target.value)}
            className="w-full bg-[#12121c] border border-[rgba(255,255,255,0.08)] rounded-[6px] px-2 py-[7px] text-[13px] text-[#e8e8f0]" />
        </div>
        <div><Label>Label</Label>
          <input value={overlay.label || ""} onChange={e => update("label", e.target.value)}
            className="w-full bg-[#12121c] border border-[rgba(255,255,255,0.08)] rounded-[6px] px-2 py-[7px] text-[13px] text-[#e8e8f0]" />
        </div>
      </div>
      <div><Label>Color</Label>
        <input type="color" value={overlay.color || "#f0e040"} onChange={e => update("color", e.target.value)}
          className="w-full h-[38px] rounded-[6px] cursor-pointer border border-[rgba(255,255,255,0.08)]" />
      </div>
    </div>
  );

  if (t === "HighlightBox") return (
    <div className="flex flex-col gap-2">
      <div><Label>Text</Label>
        <textarea value={overlay.text || ""} rows={2} onChange={e => update("text", e.target.value)}
          className="w-full bg-[#12121c] border border-[rgba(255,255,255,0.08)] rounded-[6px] px-3 py-[7px] text-[13px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none resize-none" />
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
      <input value={(overlay.emojis || ["❤️","🔥","💯"]).join(", ")}
        onChange={e => update("emojis", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
        className="w-full bg-[#12121c] border border-[rgba(255,255,255,0.08)] rounded-[6px] px-3 py-[7px] text-[13px] text-[#e8e8f0]" />
    </div>
  );

  if (t === "ArrowPointer") return (
    <div className="flex flex-col gap-2">
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
    </div>
  );

  return null;
}

function VideoOverlayCard({ overlay, onUpdate, onRemove }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[#111118] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-[10px]"
        style={{ borderBottom: open ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
        <button onClick={() => setOpen(o => !o)}
          className="flex-1 flex items-center gap-2 bg-transparent border-0 cursor-pointer text-left">
          <span className="text-[11px] px-2 py-[2px] rounded-full bg-[rgba(124,92,252,0.15)] text-[#a78fff] font-semibold">Video</span>
          <span className="text-[14px] font-bold text-[#e8e8f0]">{OVERLAY_TYPES[overlay.type]?.label || overlay.type}</span>
          <span className="text-[13px] text-[#55556a]">{ANCHOR_LABELS[overlay.anchor] || overlay.anchor}</span>
          <span className="ml-auto text-[#55556a]">{open ? "▾" : "▸"}</span>
        </button>
        <button onClick={onRemove}
          className="text-[13px] text-[#f87171] hover:text-[#ff6b6b] bg-transparent border-0 cursor-pointer px-1">✕</button>
      </div>

      {open && (
        <div className="flex gap-0">
          <div className="flex flex-col gap-3 p-3 shrink-0"
            style={{ width:160, borderRight:"1px solid rgba(255,255,255,0.06)" }}>
            <AnchorGrid value={overlay.anchor} onChange={v => onUpdate("anchor", v)} />
            <Slider label="Scale" value={Math.round((overlay.scale ?? 1) * 100)}
              onChange={v => onUpdate("scale", v / 100)} min={40} max={150} unit="%" />
            <div>
              <Label>Motion</Label>
              <Sel value={overlay.motion || "pop"} onChange={v => onUpdate("motion", v)}
                options={[["pop","Pop"],["slam","Slam"],["slideUp","Slide Up"],["slideLeft","Slide Left"],["fade","Fade"]]} />
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

function MiniPreview({ type }) {
  const PREVIEWS = {
    HeadlineText: <div style={{fontFamily:"monospace",fontSize:11,fontWeight:900,color:"#fff",textTransform:"uppercase"}}>HEADLINE</div>,
    Badge:        <div style={{background:"#ff4d6d",padding:"2px 8px",borderRadius:100,fontFamily:"monospace",fontSize:9,fontWeight:800,color:"#fff"}}>LIVE</div>,
    StatCallout:  <div style={{borderLeft:"2px solid #f0e040",paddingLeft:6,fontFamily:"monospace",fontSize:14,fontWeight:900,color:"#f0e040"}}>94%</div>,
    HighlightBox: <div style={{background:"rgba(245,243,238,0.9)",padding:"3px 7px",borderRadius:4,fontSize:9,fontWeight:700,color:"#111"}}>Key insight</div>,
    LiveDot:      <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:6,height:6,borderRadius:"50%",background:"#ff4d6d"}}/><span style={{fontFamily:"monospace",fontSize:9,color:"#ff4d6d",fontWeight:800}}>LIVE</span></div>,
    EmojiFloat:   <div style={{fontSize:16}}>❤️🔥</div>,
    ArrowPointer: <div style={{fontSize:16,color:"#f0e040"}}>↓</div>,
  };
  return (
    <div style={{ height:44, display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(160deg,#0d0d18,#050510)", borderRadius:"6px 6px 0 0", padding:6 }}>
      {PREVIEWS[type] || <span style={{color:"#55556a",fontSize:10}}>{type}</span>}
    </div>
  );
}

export default function VideoOverlaySection() {
  const project           = useProjectStore((s) => s.project);
  const updateProjectMeta = useProjectStore((s) => s.updateProjectMeta);
  const [adding, setAdding] = useState(false);

  if (!project) return null;

  const overlays = project.overlays || [];

  const addOverlay = (type) => {
    const ov = createOverlay(type);
    if (!ov) return;
    ov.anchor = "top-right"; // default for video overlays
    updateProjectMeta({ overlays: [...overlays, ov] });
    setAdding(false);
  };

  const updateOverlay = (id, key, value) =>
    updateProjectMeta({ overlays: overlays.map(o => o.id === id ? { ...o, [key]: value } : o) });

  const removeOverlay = (id) =>
    updateProjectMeta({ overlays: overlays.filter(o => o.id !== id) });

  return (
    <div className="flex w-[100%] flex-col gap-3">

      <div className="flex items-center justify-between">
        <div>
          <span className="text-[20px] font-bold text-[#e8e8f0]" style={{ fontFamily: "'Syne', sans-serif" }}>Video Overlays</span>
          <div className="text-[14px] text-[#666] mt-[2px]">Persist across all beats</div>
        </div>
        <button onClick={() => setAdding(a => !a)}
          className={`text-[13px] px-4 py-[8px] rounded-[7px] border transition-all font-semibold
            ${adding ? "bg-[#7c5cfc] border-[#7c5cfc] text-white"
              : "bg-[#1c1c28] border-[rgba(255,255,255,0.08)] text-[#e8e8f0] hover:border-[#7c5cfc]"}`}>
          {adding ? "Cancel" : "+ Add"}
        </button>
      </div>

      {adding && (
        <div className="grid grid-cols-4 gap-2 p-3 rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[#111118]">
          {OVERLAY_TYPE_KEYS.map(type => (
            <button key={type} onClick={() => addOverlay(type)}
              className="flex flex-col rounded-[8px] border border-[rgba(255,255,255,0.06)] bg-[#0e0e15] hover:border-[#7c5cfc] transition-all cursor-pointer overflow-hidden">
              <MiniPreview type={type} />
              <div className="px-1 py-[5px] border-t border-[rgba(255,255,255,0.05)]">
                <div className="text-[10px] font-semibold text-[#e8e8f0] text-center truncate">{OVERLAY_TYPES[type].label}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {overlays.length === 0 && !adding && (
        <div className="flex flex-col items-center justify-center py-8 gap-2 opacity-40">
          <span className="text-[28px]">◎</span>
          <span className="text-[14px] text-[#9494a8]">No video-level overlays</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {overlays.map(overlay => (
          <VideoOverlayCard key={overlay.id} overlay={overlay}
            onUpdate={(k,v) => updateOverlay(overlay.id, k, v)}
            onRemove={() => removeOverlay(overlay.id)} />
        ))}
      </div>

    </div>
  );
}