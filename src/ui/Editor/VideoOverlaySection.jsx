/**
 * VideoOverlaySection.jsx
 * src/ui/Editor/VideoOverlaySection.jsx
 *
 * Editor for video-level overlays — persistent across all beats.
 * Stored on project.overlays (not beat.overlays).
 */
import React, { useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { ANCHOR_LABELS, createOverlay } from "../../core/overlayRegistry";
import ZonePickerModal from "./zonePicker/ZonePickerModal";

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
  ["top-left",    "top-center",    "top-right"],
  ["mid-left",     null,           "mid-right"],
  ["bottom-left", "bottom-center", "bottom-right"],
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

function ContentEditor({ overlay, update }) {
  const t = overlay.type;

  if (t === "ImageOverlay") return (
    <div className="flex flex-col gap-2">
      {overlay.src && (
        <img src={overlay.src} className="w-full rounded-[6px] object-contain"
          style={{ maxHeight: 90, background: "#0a0a14" }} />
      )}
      <div>
        <Label>Fit</Label>
        <Sel value={overlay.objectFit || "contain"} onChange={v => update("objectFit", v)}
          options={[["contain","Contain"],["cover","Cover"],["fill","Fill"]]} />
      </div>
    </div>
  );

  if (t === "VideoOverlay") return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Fit</Label>
          <Sel value={overlay.objectFit || "contain"} onChange={v => update("objectFit", v)}
            options={[["contain","Contain"],["cover","Cover"]]} />
        </div>
        <div className="flex flex-col gap-1 pt-[18px]">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={overlay.loop ?? true} onChange={e => update("loop", e.target.checked)}
              className="accent-[#7c5cfc]" />
            <span className="text-[12px] text-[#9494a8]">Loop</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={overlay.muted ?? true} onChange={e => update("muted", e.target.checked)}
              className="accent-[#7c5cfc]" />
            <span className="text-[12px] text-[#9494a8]">Muted</span>
          </label>
        </div>
      </div>
    </div>
  );

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

  return null;
}


function VideoOverlayCard({ overlay, onUpdate, onReplace, onRemove, orientation, totalDuration }) {
  const [open, setOpen] = useState(true);
  const [replacePicker, setReplacePicker] = useState(false);
  const isMedia = overlay.type === "ImageOverlay" || overlay.type === "VideoOverlay";

  const handleReplace = (data) => {
    if (!data) return;
    if (data.kind === "asset") {
      onReplace({
        src:  data.asset?.src || "",
        type: data.asset?.type === "video" ? "VideoOverlay" : "ImageOverlay",
      });
    }
    setReplacePicker(false);
  };

  return (
    <div className="rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[#111118] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-[10px]"
        style={{ borderBottom: open ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
        <button onClick={() => setOpen(o => !o)}
          className="flex-1 flex items-center gap-2 bg-transparent border-0 cursor-pointer text-left">
          <span className="text-[11px] px-2 py-[2px] rounded-full font-semibold"
            style={{
              background: isMedia ? "rgba(0,210,200,0.12)" : "rgba(124,92,252,0.15)",
              color:      isMedia ? "#00d4c8" : "#a78fff",
            }}>
            {isMedia ? "Media" : "Overlay"}
          </span>
          <span className="text-[14px] font-bold text-[#e8e8f0]">
            {overlay.type === "ImageOverlay" ? "Image"
              : overlay.type === "VideoOverlay" ? "Video"
              : overlay.type}
          </span>
          <span className="text-[13px] text-[#55556a]">{ANCHOR_LABELS[overlay.anchor] || overlay.anchor}</span>
          {(overlay.start_sec != null || overlay.end_sec != null) && (
            <span className="text-[10px] font-mono text-[#55556a]">
              {overlay.start_sec ?? 0}s–{overlay.end_sec != null ? `${overlay.end_sec}s` : "end"}
            </span>
          )}
          <span className="ml-auto text-[#55556a]">{open ? "▾" : "▸"}</span>
        </button>
        <button onClick={onRemove}
          className="text-[13px] text-[#f87171] hover:text-[#ff6b6b] bg-transparent border-0 cursor-pointer px-1">✕</button>
      </div>

      {open && (
        <>
          <div className="flex gap-0">
            <div className="flex flex-col gap-3 p-3 shrink-0"
              style={{ width: 160, borderRight: "1px solid rgba(255,255,255,0.06)" }}>
              {isMedia ? (
                <button onClick={() => setReplacePicker(true)}
                  className="text-[11px] font-bold text-[#00d4c8] hover:text-[#5ffff7] bg-transparent border-0 cursor-pointer text-left transition-colors mt-1">
                  Replace asset ↗
                </button>
              ) : (
                <>
                  <AnchorGrid value={overlay.anchor} onChange={v => onUpdate("anchor", v)} />
                  <Slider label="Scale" value={Math.round((overlay.scale ?? 1) * 100)}
                    onChange={v => onUpdate("scale", v / 100)} min={10} max={200} unit="%" />
                </>
              )}
            </div>
            <div className="flex-1 p-3">
              <ContentEditor overlay={overlay} update={(k, v) => onUpdate(k, v)} />
            </div>
          </div>

          {/* Timing */}
          <div className="flex gap-3 px-3 py-3 border-t border-[rgba(255,255,255,0.06)]">
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <Label>Start</Label>
                <span className="text-[11px] font-mono text-[#7070a0]">
                  {overlay.start_sec != null ? `${overlay.start_sec.toFixed(1)}s` : "0s"}
                </span>
              </div>
              <input type="range" min={0} max={totalDuration} step={0.1}
                value={overlay.start_sec ?? 0}
                onChange={e => onUpdate("start_sec", Number(e.target.value) === 0 ? null : Number(e.target.value))}
                className="w-full accent-[#7c5cfc] cursor-pointer" style={{ height: 2 }} />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <Label>End</Label>
                <span className="text-[11px] font-mono text-[#7070a0]">
                  {overlay.end_sec != null ? `${overlay.end_sec.toFixed(1)}s` : `${totalDuration.toFixed(1)}s`}
                </span>
              </div>
              <input type="range" min={0} max={totalDuration} step={0.1}
                value={overlay.end_sec ?? totalDuration}
                onChange={e => onUpdate("end_sec", Number(e.target.value) >= totalDuration ? null : Number(e.target.value))}
                className="w-full accent-[#7c5cfc] cursor-pointer" style={{ height: 2 }} />
            </div>
          </div>
        </>
      )}

      {replacePicker && (
        <ZonePickerModal
          orientation={orientation}
          mode="content"
          allowedTabs={["assets"]}
          onSelect={handleReplace}
          onClose={() => setReplacePicker(false)}
        />
      )}
    </div>
  );
}

export default function VideoOverlaySection() {
  const project           = useProjectStore((s) => s.project);
  const updateProjectMeta = useProjectStore((s) => s.updateProjectMeta);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!project) return null;

  const overlays      = project.overlays || [];
  const orientation   = project.meta?.orientation || "9:16";
  const totalDuration = project.duration_sec || 30;

  const handlePickerSelect = (data) => {
    if (!data) return;
    let overlay;

    if (data.kind === "asset") {
      const isVideo = data.asset?.type === "video";
      overlay = {
        id:        `overlay_${Date.now()}`,
        type:      isVideo ? "VideoOverlay" : "ImageOverlay",
        src:       data.asset?.src || "",
        objectFit: "contain",
        x: 10, y: 20, width: 80, height: 50,
        zIndex: 20,
        ...(isVideo ? { loop: true, muted: true } : {}),
      };
    } else if (data.kind === "text") {
      overlay = createOverlay("HeadlineText");
      overlay.text   = data.text || "Your text";
      overlay.anchor = "top-left";
    } else {
      return;
    }

    updateProjectMeta({ overlays: [...overlays, overlay] });
    setPickerOpen(false);
  };

  const updateOverlay = (id, key, value) =>
    updateProjectMeta({ overlays: overlays.map(o => o.id === id ? { ...o, [key]: value } : o) });

  const replaceOverlay = (id, patch) =>
    updateProjectMeta({ overlays: overlays.map(o => o.id === id ? { ...o, ...patch } : o) });

  const removeOverlay = (id) =>
    updateProjectMeta({ overlays: overlays.filter(o => o.id !== id) });

  return (
    <div className="flex w-[100%] flex-col gap-3">

      <div className="flex items-center justify-between">
        <div>
          <span className="text-[20px] font-bold text-[#e8e8f0]" style={{ fontFamily: "'Syne', sans-serif" }}>Video Overlays</span>
          <div className="text-[14px] text-[#666] mt-[2px]">Persist across all beats</div>
        </div>
        <button onClick={() => setPickerOpen(true)}
          className="text-[13px] px-4 py-[8px] rounded-[7px] border transition-all font-semibold bg-[#1c1c28] border-[rgba(255,255,255,0.08)] text-[#e8e8f0] hover:border-[#7c5cfc]">
          + Add
        </button>
      </div>

      {overlays.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 gap-2 opacity-40">
          <span className="text-[28px]">◎</span>
          <span className="text-[14px] text-[#9494a8]">No video-level overlays</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {overlays.map(overlay => (
          <VideoOverlayCard key={overlay.id} overlay={overlay}
            orientation={orientation}
            totalDuration={totalDuration}
            onUpdate={(k, v) => updateOverlay(overlay.id, k, v)}
            onReplace={(patch) => replaceOverlay(overlay.id, patch)}
            onRemove={() => removeOverlay(overlay.id)} />
        ))}
      </div>

      {pickerOpen && (
        <ZonePickerModal
          orientation={orientation}
          mode="content"
          allowedTabs={["assets", "text"]}
          onSelect={handlePickerSelect}
          onClose={() => setPickerOpen(false)}
        />
      )}

    </div>
  );
}
