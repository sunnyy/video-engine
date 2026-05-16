import { useState } from "react";
import { useTimelineStore } from "../../store/useTimelineStore";
import { interpolateKeyframes, resolveTransform } from "./keyframeUtils";

const FONT_FAMILIES = [
  "Outfit", "Inter", "Roboto", "Montserrat",
  "Playfair Display", "Oswald", "Lato", "Raleway",
];
const ANIMATION_TYPES_IN = [
  "none", "fade", "slide-up", "slide-down", "slide-left", "slide-right",
  "zoom", "bounce", "typewriter",
];
const ANIMATION_TYPES_OUT = ["none", "fade"];
const TRANSITION_TYPES = ["none", "fade", "dissolve", "slide-left", "slide-right", "zoom"];
const OBJECT_FIT_OPTIONS = ["cover", "contain", "fill"];

const labelStyle = {
  fontSize: 11,
  color: "#9090b0",
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  marginBottom: 4,
  display: "block",
};

const inputStyle = {
  width: "100%",
  background: "#0d0d1e",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 5,
  color: "#e8e8f0",
  fontSize: 13,
  padding: "5px 8px",
  outline: "none",
  boxSizing: "border-box",
};

const selectStyle = { ...inputStyle, cursor: "pointer" };

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 11 }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </div>
  );
}

function NumberInput({ value, onChange, min, max, step = 1 }) {
  return (
    <input
      type="number"
      value={value ?? 0}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={inputStyle}
    />
  );
}

function Row2({ children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
      {children}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: 14, marginBottom: 14 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#7070a0",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function SrcField({ layer, update }) {
  return (
    <Field label="Source URL">
      <input
        type="text"
        defaultValue={layer.src ?? ""}
        placeholder="https://…"
        style={inputStyle}
        onBlur={(e) => update({ src: e.target.value || null })}
        onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
      />
    </Field>
  );
}

function VideoProps({ layer, update, resolvedObjectFitVal, updateObjectFit }) {
  return (
    <Section title="Video">
      <SrcField layer={layer} update={update} />
      <Row2>
        <Field label="Volume">
          <NumberInput value={layer.volume} onChange={(v) => update({ volume: Math.max(0, Math.min(1, v)) })} min={0} max={1} step={0.05} />
        </Field>
        <Field label="Speed">
          <NumberInput value={layer.playbackRate} onChange={(v) => update({ playbackRate: Math.max(0.1, v) })} min={0.1} max={4} step={0.1} />
        </Field>
      </Row2>
      <Row2>
        <Field label="Trim Start">
          <NumberInput value={layer.trimStart} onChange={(v) => update({ trimStart: Math.max(0, v) })} min={0} step={0.1} />
        </Field>
        <Field label="Trim End">
          <NumberInput value={layer.trimEnd} onChange={(v) => update({ trimEnd: Math.max(0, v) })} min={0} step={0.1} />
        </Field>
      </Row2>
      <Field label="Object Fit">
        <select style={selectStyle} value={resolvedObjectFitVal} onChange={(e) => updateObjectFit(e.target.value)}>
          {OBJECT_FIT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </Field>
      <Field label="Muted">
        <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
          <input type="checkbox" checked={layer.muted ?? false} onChange={(e) => update({ muted: e.target.checked })} />
          <span style={{ fontSize: 13, color: "#c0c0d8" }}>Muted</span>
        </label>
      </Field>
    </Section>
  );
}

function AudioProps({ layer, update }) {
  return (
    <Section title="Audio">
      <SrcField layer={layer} update={update} />
      <Row2>
        <Field label="Volume">
          <NumberInput value={layer.volume} onChange={(v) => update({ volume: Math.max(0, Math.min(1, v)) })} min={0} max={1} step={0.05} />
        </Field>
        <Field label="Type">
          <select style={selectStyle} value={layer.audioType ?? "music"} onChange={(e) => update({ audioType: e.target.value })}>
            <option value="music">Music</option>
            <option value="voiceover">Voiceover</option>
          </select>
        </Field>
      </Row2>
      <Row2>
        <Field label="Fade In">
          <NumberInput value={layer.fadeIn} onChange={(v) => update({ fadeIn: Math.max(0, v) })} min={0} step={0.1} />
        </Field>
        <Field label="Fade Out">
          <NumberInput value={layer.fadeOut} onChange={(v) => update({ fadeOut: Math.max(0, v) })} min={0} step={0.1} />
        </Field>
      </Row2>
      <Field label="Muted">
        <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
          <input type="checkbox" checked={layer.muted ?? false} onChange={(e) => update({ muted: e.target.checked })} />
          <span style={{ fontSize: 13, color: "#c0c0d8" }}>Muted</span>
        </label>
      </Field>
    </Section>
  );
}

function TextProps({ layer, update }) {
  const s = layer.style ?? {};
  const updateStyle = (patch) => update({ style: { ...s, ...patch } });
  return (
    <Section title="Text">
      <Field label="Content">
        <textarea
          value={layer.content ?? ""}
          onChange={(e) => update({ content: e.target.value })}
          rows={3}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
        />
      </Field>
      <Row2>
        <Field label="Font Size">
          <NumberInput value={s.fontSize} onChange={(v) => updateStyle({ fontSize: Math.max(1, v) })} min={1} step={1} />
        </Field>
        <Field label="Weight">
          <NumberInput value={s.fontWeight} onChange={(v) => updateStyle({ fontWeight: v })} min={100} max={900} step={100} />
        </Field>
      </Row2>
      <Field label="Font">
        <select style={selectStyle} value={s.fontFamily ?? "Outfit"} onChange={(e) => updateStyle({ fontFamily: e.target.value })}>
          {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </Field>
      <Row2>
        <Field label="Color">
          <input
            type="color"
            value={s.color ?? "#ffffff"}
            onChange={(e) => updateStyle({ color: e.target.value })}
            style={{ ...inputStyle, height: 34, padding: 3, cursor: "pointer" }}
          />
        </Field>
        <Field label="Align">
          <select style={selectStyle} value={s.textAlign ?? "center"} onChange={(e) => updateStyle({ textAlign: e.target.value })}>
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </Field>
      </Row2>
    </Section>
  );
}

function ImageProps({ layer, update, resolvedObjectFitVal, updateObjectFit }) {
  return (
    <Section title="Image">
      <SrcField layer={layer} update={update} />
      <Field label="Object Fit">
        <select style={selectStyle} value={resolvedObjectFitVal} onChange={(e) => updateObjectFit(e.target.value)}>
          {OBJECT_FIT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </Field>
    </Section>
  );
}

function AnimationProps({ layer, update }) {
  const anim = layer.animation ?? {
    in: { type: "none", duration: 0.3 },
    out: { type: "none", duration: 0.3 },
  };
  const updateIn = (patch) => update({ animation: { ...anim, in: { ...anim.in, ...patch } } });
  const updateOut = (patch) => update({ animation: { ...anim, out: { ...anim.out, ...patch } } });
  return (
    <Section title="Animation">
      <Row2>
        <Field label="In Type">
          <select style={selectStyle} value={anim.in?.type ?? "none"} onChange={(e) => updateIn({ type: e.target.value })}>
            {ANIMATION_TYPES_IN.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="In Duration">
          <NumberInput value={anim.in?.duration ?? 0.3} onChange={(v) => updateIn({ duration: Math.max(0, v) })} min={0} step={0.05} />
        </Field>
        <Field label="Out Type">
          <select style={selectStyle} value={anim.out?.type ?? "none"} onChange={(e) => updateOut({ type: e.target.value })}>
            {ANIMATION_TYPES_OUT.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Out Duration">
          <NumberInput value={anim.out?.duration ?? 0.3} onChange={(v) => updateOut({ duration: Math.max(0, v) })} min={0} step={0.05} />
        </Field>
      </Row2>
    </Section>
  );
}

function TransitionProps({ layer, update }) {
  const tr = layer.transition ?? { type: "none", duration: 0.5 };
  const updateTr = (patch) => update({ transition: { ...tr, ...patch } });
  return (
    <Section title="Transition">
      <Field label="Type">
        <select style={selectStyle} value={tr.type ?? "none"} onChange={(e) => updateTr({ type: e.target.value })}>
          {TRANSITION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
      {(tr.type ?? "none") !== "none" && (
        <Field label="Duration (s)">
          <NumberInput
            value={tr.duration ?? 0.5}
            onChange={(v) => updateTr({ duration: Math.max(0.1, Math.min(2, v)) })}
            min={0.1} max={2} step={0.1}
          />
        </Field>
      )}
      <div style={{ fontSize: 11, color: "#55557a", marginTop: -4 }}>Applied at the start of this clip (entrance)</div>
    </Section>
  );
}

const KEYFRAMEABLE = [
  { prop: "x",        label: "X",        step: 1,    digits: 1 },
  { prop: "y",        label: "Y",        step: 1,    digits: 1 },
  { prop: "width",    label: "Width",    step: 1,    digits: 0 },
  { prop: "height",   label: "Height",   step: 1,    digits: 0 },
  { prop: "scale",    label: "Scale",    step: 0.05, digits: 2 },
  { prop: "rotation", label: "Rotation", step: 1,    digits: 1 },
  { prop: "opacity",  label: "Opacity",  step: 0.05, digits: 2 },
  { prop: "blur",     label: "Blur",     step: 1,    digits: 1 },
];

function KeyframesSection({ layer }) {
  const currentTime    = useTimelineStore((s) => s.currentTime);
  const addKeyframe    = useTimelineStore((s) => s.addKeyframe);
  const removeKeyframe = useTimelineStore((s) => s.removeKeyframe);
  const updateKeyframe = useTimelineStore((s) => s.updateKeyframe);
  const [editing, setEditing] = useState({});

  const kf = layer.keyframes ?? {};
  const localTime = Math.max(0, currentTime - layer.start);

  return (
    <Section title="Keyframes">
      {KEYFRAMEABLE.map(({ prop, label, step, digits }) => {
        const frames = [...(kf[prop] ?? [])].sort((a, b) => a.time - b.time);
        const hasFrames = frames.length > 0;
        const interpValue = hasFrames
          ? (interpolateKeyframes(frames, localTime) ?? layer.transform?.[prop] ?? 0)
          : (layer.transform?.[prop] ?? 0);
        const displayVal = editing[prop] !== undefined
          ? editing[prop]
          : Number(interpValue).toFixed(digits);

        return (
          <div key={prop} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: hasFrames ? 5 : 0 }}>
              <span style={{ fontSize: 9, color: hasFrames ? "#f5c518" : "#33334a", flexShrink: 0 }}>◆</span>
              <span style={{ ...labelStyle, marginBottom: 0, width: 54, flexShrink: 0 }}>{label}</span>
              <input
                type="number"
                step={step}
                value={displayVal}
                style={{ ...inputStyle, flex: 1 }}
                onChange={(e) => setEditing((s) => ({ ...s, [prop]: e.target.value }))}
                onBlur={(e) => {
                  // Only commit if user actually typed something (editing[prop] set by onChange)
                  if (editing[prop] !== undefined) {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) addKeyframe(layer.id, prop, localTime, val);
                  }
                  setEditing((s) => { const c = { ...s }; delete c[prop]; return c; });
                }}
                onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
              />
            </div>
            {frames.map((frame, i) => (
              <div key={`${i}-${frame.time}`} style={{ display: "flex", alignItems: "center", gap: 5, paddingLeft: 16, marginBottom: 3 }}>
                <span style={{ fontSize: 9, color: "#f5c518", flexShrink: 0 }}>◆</span>
                <span style={{ fontSize: 11, color: "#7070a0", width: 34, flexShrink: 0 }}>
                  {frame.time.toFixed(1)}s
                </span>
                <input
                  type="number"
                  step={step}
                  defaultValue={Number(frame.value).toFixed(digits)}
                  key={`${prop}-${i}-${frame.value}`}
                  style={{ ...inputStyle, flex: 1 }}
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value);
                    // Only commit if value actually changed
                    if (!isNaN(val) && Math.abs(val - frame.value) > 0.0001) {
                      updateKeyframe(layer.id, prop, i, { value: val });
                    }
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                />
                <button
                  onClick={() => removeKeyframe(layer.id, prop, i)}
                  title="Delete keyframe"
                  style={{ background: "none", border: "none", color: "#ff4f4f", cursor: "pointer", fontSize: 12, padding: "2px 3px", flexShrink: 0, lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        );
      })}
    </Section>
  );
}

export default function PropertiesPanel() {
  const project = useTimelineStore((s) => s.project);
  const selectedLayerId = useTimelineStore((s) => s.selectedLayerId);
  const updateLayer = useTimelineStore((s) => s.updateLayer);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const addKeyframeAction = useTimelineStore((s) => s.addKeyframe);

  const layer = project?.layers?.find((l) => l.id === selectedLayerId);
  const update = (patch) => { if (layer) updateLayer(layer.id, patch); };

  // Resolved transform at current time — uses keyframe interpolation when active
  const resolvedTr = layer ? resolveTransform(layer, currentTime) : {};

  const localTime = layer ? Math.max(0, currentTime - layer.start) : 0;
  const resolvedObjectFitVal = layer?.objectFit ?? "cover";

  // For the 6 keyframeable props: show resolved value; write to keyframe if KFs are active,
  // otherwise write to base transform. Width/height are NOT keyframeable — always base transform.
  const updateOrKeyframe = (prop, val) => {
    if (!layer) return;
    const hasKF = (layer.keyframes?.[prop]?.length ?? 0) > 0;
    if (hasKF) {
      addKeyframeAction(layer.id, prop, localTime, val);
    } else {
      updateLayer(layer.id, { transform: { ...layer.transform, [prop]: val } });
    }
  };

  const updateObjectFit = (val) => { if (layer) update({ objectFit: val }); };

  const updateTransform = (patch) => {
    if (layer) updateLayer(layer.id, { transform: { ...layer.transform, ...patch } });
  };

  return (
    <div
      style={{
        width: 290,
        flexShrink: 0,
        background: "#111118",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "9px 16px",
          fontSize: 11,
          fontWeight: 700,
          color: "#8888a8",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        Properties
      </div>

      {!layer ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#55556a",
            fontSize: 13,
            textAlign: "center",
            padding: 24,
            lineHeight: 1.6,
          }}
        >
          Select a layer to edit its properties
        </div>
      ) : (
        <div className="dark-scroll" style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
          {/* Layer info */}
          <Section title="Layer">
            <Field label="Name">
              <input style={inputStyle} value={layer.name ?? ""} onChange={(e) => update({ name: e.target.value })} />
            </Field>
            <Row2>
              <Field label="Start">
                <NumberInput value={layer.start} onChange={(v) => update({ start: Math.max(0, Math.min(layer.end - 0.1, v)) })} min={0} step={0.1} />
              </Field>
              <Field label="End">
                <NumberInput value={layer.end} onChange={(v) => update({ end: Math.max(layer.start + 0.1, v) })} min={0.1} step={0.1} />
              </Field>
            </Row2>
          </Section>

          {/* Transform */}
          {layer.type !== "audio" && (
            <Section title="Transform">
              <Row2>
                <Field label="X"><NumberInput value={resolvedTr.x ?? 0} onChange={(v) => updateOrKeyframe("x", v)} /></Field>
                <Field label="Y"><NumberInput value={resolvedTr.y ?? 0} onChange={(v) => updateOrKeyframe("y", v)} /></Field>
              </Row2>
              <Row2>
                <Field label="Width"><NumberInput value={resolvedTr.width ?? layer.transform?.width} onChange={(v) => updateOrKeyframe("width", Math.max(1, v))} min={1} /></Field>
                <Field label="Height"><NumberInput value={resolvedTr.height ?? layer.transform?.height} onChange={(v) => updateOrKeyframe("height", Math.max(1, v))} min={1} /></Field>
              </Row2>
              <Row2>
                <Field label="Rotation"><NumberInput value={resolvedTr.rotation ?? 0} onChange={(v) => updateOrKeyframe("rotation", v)} step={1} /></Field>
                <Field label="Scale"><NumberInput value={resolvedTr.scale ?? 1} onChange={(v) => updateOrKeyframe("scale", Math.max(0.01, v))} min={0.01} step={0.05} /></Field>
              </Row2>
              <Row2>
                <Field label="Opacity"><NumberInput value={resolvedTr.opacity ?? 1} onChange={(v) => updateOrKeyframe("opacity", Math.max(0, Math.min(1, v)))} min={0} max={1} step={0.05} /></Field>
                <Field label="Blur"><NumberInput value={resolvedTr.blur ?? 0} onChange={(v) => updateOrKeyframe("blur", Math.max(0, v))} min={0} step={1} /></Field>
              </Row2>
            </Section>
          )}

          {layer.type === "video" && <VideoProps layer={layer} update={update} resolvedObjectFitVal={resolvedObjectFitVal} updateObjectFit={updateObjectFit} />}
          {layer.type === "audio" && <AudioProps layer={layer} update={update} />}
          {layer.type === "text" && <TextProps layer={layer} update={update} />}
          {(layer.type === "image" || layer.type === "sticker") && <ImageProps layer={layer} update={update} resolvedObjectFitVal={resolvedObjectFitVal} updateObjectFit={updateObjectFit} />}
          {layer.type !== "audio" && <AnimationProps layer={layer} update={update} />}
          {(layer.type === "video" || layer.type === "image") && <TransitionProps layer={layer} update={update} />}
          {layer.type !== "audio" && layer.type !== "captions" && (
            <KeyframesSection layer={layer} />
          )}
        </div>
      )}
    </div>
  );
}
