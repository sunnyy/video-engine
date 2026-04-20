/**
 * BeatSection.jsx
 * src/ui/Editor/BeatSection.jsx
 *
 * Beat-level controls: Background, Padding, Duration, Transition.
 * Lives in the "Beat" tab of BeatEditor.
 */
import { useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { backgroundPatternRegistry } from "../../core/registries/backgroundPatternRegistry.js";
import ZonePicker from "./zonePicker/ZonePickerModal";

const TRANSITION_OPTIONS = [
  { value: "cut", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "dissolve", label: "Dissolve" },
  { value: "dipBlack", label: "Dip Black" },
  { value: "dipWhite", label: "Dip White" },
  { value: "slideLeft", label: "Slide ←" },
  { value: "slideRight", label: "Slide →" },
  { value: "slideUp", label: "Slide ↑" },
  { value: "slideDown", label: "Slide ↓" },
  { value: "zoom", label: "Zoom" },
  { value: "whipPan", label: "Whip" },
  { value: "spin", label: "Spin" },
  { value: "glitch", label: "Glitch" },
  { value: "flash", label: "Flash" },
];

/* ── Small label ─────────────────────────────────────────────── */
function Label({ children }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#7878a0",
        marginBottom: 5,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {children}
    </div>
  );
}

/* ── Slider row ──────────────────────────────────────────────── */
function SliderRow({ label, min, max, step = 1, value, onChange, format }) {
  return (
    <div className="w-full">
      <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <Label>{label}</Label>
        <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#9090b0" }}>
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#7c5cfc", cursor: "pointer", height: 2 }}
      />
    </div>
  );
}

/* ── Section card ─────────────────────────────────────────────── */
function Card({ children }) {
  return (
    <div
      style={{
        background: "#111118",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        padding: "14px 16px",
        width: "93%"
      }}
    >
      {children}
    </div>
  );
}

/* ── Background preview ───────────────────────────────────────── */
function BgPreview({ bg }) {
  if (!bg) return <div style={{ position: "absolute", inset: 0, background: "#0b0b10" }} />;
  if (bg.type === "pattern") {
    const entry = backgroundPatternRegistry[bg.value];
    return <div style={{ position: "absolute", inset: 0, ...(entry?.style || { background: "#0b0b10" }) }} />;
  }
  if (bg.type === "color" || bg.type === "gradient") {
    return (
      <div
        style={{ position: "absolute", inset: 0, background: bg.value, backgroundSize: bg.backgroundSize || "cover" }}
      />
    );
  }
  if (bg.type === "image") {
    return (
      <img
        src={bg.value}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  }
  if (bg.type === "video") {
    return (
      <video
        src={bg.value}
        muted
        loop
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  }
  return null;
}

export default function BeatSection({ beat }) {
  const project = useProjectStore((s) => s.project);
  const activeBeatId = useProjectStore((s) => s.activeBeatId);
  const updateBeat = useProjectStore((s) => s.updateBeat);
  const [pickerOpen, setPickerOpen] = useState(false);

  const currentBeat = project?.beats?.find((b) => b.id === activeBeatId);
  // Use array position — robust to beat reordering
  const isFirstBeat = project?.beats?.[0]?.id === (currentBeat?.id ?? beat?.id);

  if (!currentBeat && !beat) return null;

  const targetBeat = currentBeat || beat;
  const bg = targetBeat.layoutBackground || null;
  const padding = targetBeat.layoutPadding ?? 0;
  const duration = targetBeat.duration_sec ?? 3.0;
  const transition = targetBeat.transition?.type      || "cut";
  const intensity  = targetBeat.transition?.intensity ?? 1.0;
  const speed      = targetBeat.transition?.speed     ?? 1.0;

  const bgLabel = bg?.type === "pattern" ? bg.value || "pattern" : bg?.type === "color" ? bg.value : bg?.type || null;

  const handleBackground = (asset) => {
    let background;
    if (asset.kind === "pattern") {
      background = { type: "pattern", value: asset.key };
    } else if (asset.kind === "color") {
      background = {
        type: "color",
        value: asset.color,
        backgroundSize: asset.backgroundSize || "auto",
        objectFit: "cover",
      };
    } else {
      const src = asset.asset?.src || asset.url;
      const isVid = src?.endsWith(".mp4") || src?.endsWith(".webm");
      background = { type: isVid ? "video" : "image", value: src, objectFit: "cover" };
    }
    updateBeat(targetBeat.id, { layoutBackground: background });
    setPickerOpen(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Background */}
      <Card>
        <Label>Background</Label>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Swatch */}
          <div
            onClick={() => setPickerOpen(true)}
            style={{
              position: "relative",
              width: 100,
              height: 80,
              borderRadius: 8,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer",
              flexShrink: 0,
              background: "#0b0b10",
            }}
          >
            <BgPreview bg={bg} />
            {!bg && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#55556a",
                  fontSize: 18,
                }}
              >
                +
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={() => setPickerOpen(true)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: 12,
                  color: "#7c5cfc",
                  fontWeight: 600,
                }}
              >
                {bg ? "Change" : "Add background"}
              </button>
              {bg && (
                <button
                  onClick={() => updateBeat(targetBeat.id, { layoutBackground: null })}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: 11,
                    color: "#55556a",
                  }}
                >
                  Remove
                </button>
              )}
            </div>
            {bgLabel && (
              <div
                style={{
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "#55556a",
                  marginTop: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 160,
                }}
              >
                {bgLabel}
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="flex-1 flex gap-4">
        {/* Duration */}
        <Card>
          <SliderRow
            label="Beat Duration"
            min={1}
            max={60}
            step={0.1}
            value={duration}
            onChange={(v) => updateBeat(targetBeat.id, { duration_sec: Math.round(v * 10) / 10 })}
            format={(v) => `${v.toFixed(1)}s`}
          />
        </Card>

        {/* Padding */}
        <Card>
          <SliderRow
            label="Padding"
            min={0}
            max={120}
            step={1}
            value={padding}
            onChange={(v) => updateBeat(targetBeat.id, { layoutPadding: v })}
            format={(v) => `${v}px`}
          />
        </Card>
      </div>
        
      
      {/* Transition */}
      <Card>
        <Label>{isFirstBeat ? "Opening" : "Transition"}</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
          {TRANSITION_OPTIONS.map((opt) => {
            const isActive = transition === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => updateBeat(targetBeat.id, { transition: { type: opt.value, intensity } })}
                style={{
                  padding: "6px 4px",
                  borderRadius: 7,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "1px solid",
                  background: isActive ? "rgba(124,92,252,0.18)" : "rgba(255,255,255,0.03)",
                  borderColor: isActive ? "#7c5cfc" : "rgba(255,255,255,0.08)",
                  color: isActive ? "#c4b5fd" : "#66666a",
                  transition: "all 0.12s",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {transition !== "cut" && (
          <div className="flex-1 flex gap-4 mt-10">
            <SliderRow
              label="Intensity"
              min={0.3} max={5.0} step={0.1}
              value={intensity}
              onChange={(v) => updateBeat(targetBeat.id, { transition: { type: transition, intensity: v, speed } })}
              format={(v) => `${v.toFixed(1)}×`}
            />
            <SliderRow
              label="Speed"
              min={0.2} max={5.0} step={0.1}
              value={speed}
              onChange={(v) => updateBeat(targetBeat.id, { transition: { type: transition, intensity, speed: v } })}
              format={(v) => `${v.toFixed(1)}×`}
            />
          </div>
        )}
      </Card>

      {pickerOpen && (
        <ZonePicker
          mode="background"
          orientation={project?.meta?.orientation}
          allowedTabs={["colors", "assets", "gallery"]}
          onSelect={handleBackground}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
