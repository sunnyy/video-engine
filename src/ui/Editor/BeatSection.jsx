/**
 * BeatSection.jsx
 * src/ui/Editor/BeatSection.jsx
 *
 * Beat-level controls: Background, Padding, Duration, Transition.
 * Lives in the "Beat" tab of BeatEditor.
 */
import { useState } from "react";
import { useProjectStore }         from "../../store/useProjectStore";
import { backgroundPatternRegistry } from "../../core/registries/backgroundPatternRegistry.js";
import ZonePicker from "./zonePicker/ZonePickerModal";

const TRANSITION_OPTIONS = [
  "cut", "fade", "dissolve", "dipBlack", "dipWhite",
  "slideLeft", "slideRight", "slideUp", "slideDown",
  "zoom", "whipPan", "spin", "glitch", "flash",
];

const INTRO_OPTIONS = [
  { value: "none",      label: "None"      },
  { value: "fadeIn",    label: "Fade In"   },
  { value: "zoomIn",    label: "Zoom In"   },
  { value: "slideUp",   label: "Slide Up"  },
  { value: "slideDown", label: "Slide Down"},
  { value: "flash",     label: "Flash"     },
];

/* ── Small label ─────────────────────────────────────────────── */
function Label({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
      textTransform: "uppercase", color: "#7878a0", marginBottom: 5,
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      {children}
    </div>
  );
}

/* ── Slider row ──────────────────────────────────────────────── */
function SliderRow({ label, min, max, step = 1, value, onChange, format }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <Label>{label}</Label>
        <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#9090b0" }}>
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#7c5cfc", cursor: "pointer", height: 2 }}
      />
    </div>
  );
}

/* ── Section card ─────────────────────────────────────────────── */
function Card({ children }) {
  return (
    <div style={{
      background: "#111118", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12, padding: "14px 16px",
    }}>
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
    return <div style={{ position: "absolute", inset: 0, background: bg.value, backgroundSize: bg.backgroundSize || "cover" }} />;
  }
  if (bg.type === "image") {
    return <img src={bg.value} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />;
  }
  if (bg.type === "video") {
    return <video src={bg.value} muted loop style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />;
  }
  return null;
}

export default function BeatSection({ beat, isFirst }) {
  const project    = useProjectStore(s => s.project);
  const updateBeat = useProjectStore(s => s.updateBeat);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!beat) return null;

  const bg           = beat.layoutBackground || null;
  const padding      = beat.layoutPadding    ?? 0;
  const duration     = beat.duration_sec     ?? 3.0;
  const transition   = beat.transition?.type   || "cut";
  const introTrans   = beat.introTransition    || "none";

  const bgLabel = bg?.type === "pattern"
    ? (bg.value || "pattern")
    : bg?.type === "color"
    ? bg.value
    : bg?.type || null;

  const handleBackground = (asset) => {
    let background;
    if (asset.kind === "pattern") {
      background = { type: "pattern", value: asset.key };
    } else if (asset.kind === "color") {
      background = { type: "color", value: asset.color, backgroundSize: asset.backgroundSize || "auto", objectFit: "cover" };
    } else {
      const src  = asset.asset?.src || asset.url;
      const isVid = src?.endsWith(".mp4") || src?.endsWith(".webm");
      background = { type: isVid ? "video" : "image", value: src, objectFit: "cover" };
    }
    updateBeat(beat.id, { layoutBackground: background });
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
              position: "relative", width: 56, height: 42, borderRadius: 8, overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", flexShrink: 0,
              background: "#0b0b10",
            }}
          >
            <BgPreview bg={bg} />
            {!bg && (
              <div style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center",
                justifyContent: "center", color: "#55556a", fontSize: 18,
              }}>+</div>
            )}
          </div>

          {/* Controls */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={() => setPickerOpen(true)}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                  fontSize: 12, color: "#7c5cfc", fontWeight: 600,
                }}
              >
                {bg ? "Change" : "Add background"}
              </button>
              {bg && (
                <button
                  onClick={() => updateBeat(beat.id, { layoutBackground: null })}
                  style={{
                    background: "none", border: "none", cursor: "pointer", padding: 0,
                    fontSize: 11, color: "#55556a",
                  }}
                >
                  Remove
                </button>
              )}
            </div>
            {bgLabel && (
              <div style={{
                fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                color: "#55556a", marginTop: 2, overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160,
              }}>
                {bgLabel}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Duration */}
      <Card>
        <SliderRow
          label="Duration"
          min={1} max={12} step={0.1}
          value={duration}
          onChange={v => updateBeat(beat.id, { duration_sec: Math.round(v * 10) / 10 })}
          format={v => `${v.toFixed(1)}s`}
        />
      </Card>

      {/* Opening transition — first beat only */}
      {isFirst && (
        <Card>
          <Label>Opening</Label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {INTRO_OPTIONS.map(opt => {
              const isActive = introTrans === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => updateBeat(beat.id, { introTransition: opt.value })}
                  style={{
                    padding: "6px 4px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                    cursor: "pointer", border: "1px solid",
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
          <div style={{ fontSize: 10, color: "#44445a", marginTop: 8, fontFamily: "'JetBrains Mono', monospace" }}>
            How the video opens — applies to the first beat only
          </div>
        </Card>
      )}

      {/* Padding */}
      <Card>
        <SliderRow
          label="Canvas Padding"
          min={0} max={120} step={1}
          value={padding}
          onChange={v => updateBeat(beat.id, { layoutPadding: v })}
          format={v => `${v}px`}
        />
      </Card>

      {/* Transition */}
      <Card>
        <Label>Transition to next beat</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {TRANSITION_OPTIONS.map(opt => {
            const isActive = transition === opt;
            return (
              <button
                key={opt}
                onClick={() => updateBeat(beat.id, { transition: { type: opt } })}
                style={{
                  padding: "6px 4px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                  cursor: "pointer", border: "1px solid",
                  background: isActive ? "rgba(124,92,252,0.18)" : "rgba(255,255,255,0.03)",
                  borderColor: isActive ? "#7c5cfc" : "rgba(255,255,255,0.08)",
                  color: isActive ? "#c4b5fd" : "#66666a",
                  transition: "all 0.12s",
                  textTransform: "capitalize",
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
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
