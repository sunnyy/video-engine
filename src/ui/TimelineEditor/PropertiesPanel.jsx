import { useState, useRef, useEffect } from "react";
import { useTimelineStore } from "../../store/useTimelineStore";
import { interpolateKeyframes, resolveTransform } from "./keyframeUtils";
import { loadSFXLibrary, getSFXPreviewUrl } from "../../core/registries/sfxRegistry";
import { cinematicById } from "../../core/registries/cinematicRegistry";
import PresetsModal from "./modals/PresetsModal";
import IconModal from "./modals/IconModal";
import MediaModal from "./modals/MediaModal";

const FONT_FAMILIES = [
  "Outfit", "Inter", "Roboto", "Montserrat",
  "Playfair Display", "Oswald", "Lato", "Raleway",
];
const TRANSITION_TYPES = ["none", "fade", "dissolve", "slide-left", "slide-right", "zoom"];
const OBJECT_FIT_OPTIONS = ["cover", "contain", "fill"];
const BOX_SHADOW_PRESETS = [
  { label: "None",    value: null },
  { label: "Soft",    value: "0 4px 24px rgba(0,0,0,0.5)" },
  { label: "Hard",    value: "6px 6px 0px rgba(0,0,0,0.85)" },
  { label: "Glow",    value: "0 0 24px rgba(255,255,255,0.55)" },
  { label: "Purple",  value: "0 0 24px rgba(124,92,252,0.75)" },
  { label: "Gold",    value: "0 0 24px rgba(255,200,0,0.7)" },
];

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

function roundToStep(value, step) {
  const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
  const factor = Math.pow(10, decimals);
  return Math.round((value ?? 0) * factor) / factor;
}

function NumberInput({ value, onChange, min, max, step = 1 }) {
  return (
    <input
      type="number"
      value={roundToStep(value, step)}
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

// ── Scene Source Switcher (TH video projects only) ────────────────────────────
const BG_TRACKS  = new Set(["track_background", "track_asset"]);
const TH_TRACKS  = new Set(["track_talking_head"]);

function SceneSourceSection({ layer, project, updateLayer, addLayer }) {
  const [showMedia, setShowMedia] = useState(false);
  const [activeTab, setActiveTab] = useState(() => TH_TRACKS.has(layer.trackId) ? "th" : "asset");

  const isTHProject = project?.meta?.source === "promo_video" &&
    project?.layers?.some(l => TH_TRACKS.has(l.trackId) && l.type === "video");
  if (!isTHProject) return null;
  if (layer.type === "audio" || layer._system) return null;

  const sceneStart = layer.start;
  const sceneEnd   = layer.end;
  const sceneLayers = project.layers.filter(l =>
    Math.abs(l.start - sceneStart) < 0.05 && l.type !== "audio" && !l._system
  );

  const thLayer  = sceneLayers.find(l => TH_TRACKS.has(l.trackId) && l.type === "video");
  const bgLayer  = sceneLayers.find(l => BG_TRACKS.has(l.trackId) && (l.type === "image" || l.type === "video"));
  const thUrl    = project.layers.find(l => TH_TRACKS.has(l.trackId) && l.type === "video")?.src;


  const switchToTH = () => {
    setActiveTab("th");
    if (thLayer) {
      updateLayer(thLayer.id, { visible: true });
    } else if (thUrl) {
      addLayer({
        id: `s_th_${Date.now()}`, trackId: "track_talking_head",
        type: "video", src: thUrl, objectFit: "cover",
        start: sceneStart, end: sceneEnd, zIndex: 2,
        visible: true, locked: false, sfx: null,
        trimStart: sceneStart, trimEnd: sceneEnd,
        muted: true, volume: 0,
        keyframes: { x:[], y:[], scale:[], rotation:[], blur:[], opacity:[] },
        transition: { in: { type:"none", duration:0 }, out: { type:"none", duration:0 } },
        transform: { x:0, y:0, width:1080, height:1920, opacity:1, rotation:0, scale:1, blur:0, borderRadius:0, borderWidth:0, borderColor:"#ffffff" },
      });
    }
    if (bgLayer) updateLayer(bgLayer.id, { visible: false });
  };

  const switchToAsset = () => {
    setActiveTab("asset");
    if (thLayer) updateLayer(thLayer.id, { visible: false });
    if (bgLayer) updateLayer(bgLayer.id, { visible: true });
    else setShowMedia(true);
  };

  const handleReplace = (src, type) => {
    const layerType = type === "video" ? "video" : "image";
    if (bgLayer) {
      updateLayer(bgLayer.id, { src, type: layerType, visible: true });
    } else {
      addLayer({
        id: `s_bg_asset_${Date.now()}`,
        trackId: "track_background",
        type: layerType, src, objectFit: "cover",
        start: sceneStart, end: sceneEnd, zIndex: 0,
        visible: true, locked: false, sfx: null,
        keyframes: { x:[], y:[], scale:[], rotation:[], blur:[], opacity:[] },
        transition: { in: { type:"none", duration:0 }, out: { type:"none", duration:0 } },
        transform: { x:0, y:0, width:1080, height:1920, opacity:1, rotation:0, scale:1, blur:0, borderRadius:0, borderWidth:0, borderColor:"#ffffff" },
        animation: null,
      });
    }
  };

  const tabBtn = (label, active, onClick) => (
    <button onClick={onClick} style={{
      flex: 1, padding: "6px 0", fontSize: 12, fontWeight: 600, cursor: "pointer",
      borderRadius: 6, border: "none",
      background: active ? "rgba(124,92,252,0.3)" : "rgba(255,255,255,0.05)",
      color: active ? "#c4b5fd" : "#666",
      transition: "background 0.15s",
    }}>{label}</button>
  );

  return (
    <>
      <Section title="Scene Source">
        <div style={{ display:"flex", gap:4, marginBottom:10 }}>
          {tabBtn("Asset", activeTab === "asset", switchToAsset)}
          {tabBtn("Talking Head", activeTab === "th", switchToTH)}
        </div>

        {activeTab === "asset" ? (
          <div
            onClick={() => setShowMedia(true)}
            style={{
              width:"55%", aspectRatio:"9/16", borderRadius:8, overflow:"hidden",
              background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)",
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
              position:"relative", margin:"0 auto",
            }}
          >
            {bgLayer?.src ? (
              bgLayer.type === "video"
                ? <video src={bgLayer.src} style={{ width:"100%", height:"100%", objectFit:"cover", pointerEvents:"none" }} muted />
                : <img src={bgLayer.src} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            ) : (
              <div style={{ textAlign:"center", color:"#555", fontSize:12 }}>
                <div style={{ fontSize:20, marginBottom:4 }}>+</div>
                Select asset
              </div>
            )}
            <div style={{
              position:"absolute", inset:0, background:"rgba(0,0,0,0)", display:"flex",
              alignItems:"center", justifyContent:"center", opacity:0, transition:"all 0.15s",
              fontSize:12, fontWeight:600, color:"#fff",
            }}
              onMouseEnter={e => { e.currentTarget.style.background="rgba(0,0,0,0.55)"; e.currentTarget.style.opacity=1; }}
              onMouseLeave={e => { e.currentTarget.style.background="rgba(0,0,0,0)"; e.currentTarget.style.opacity=0; }}
            >
              {bgLayer?.src ? "Change" : "Select"}
            </div>
          </div>
        ) : (
          <div style={{
            width:"100%", aspectRatio:"9/16", borderRadius:8, overflow:"hidden",
            background:"#0a0a14", border:"1px solid rgba(255,255,255,0.1)",
          }}>
            {thUrl && (
              <video
                src={thUrl} muted playsInline preload="metadata"
                style={{ width:"100%", height:"100%", objectFit:"cover", pointerEvents:"none" }}
                onLoadedMetadata={e => { e.target.currentTime = sceneStart; }}
              />
            )}
          </div>
        )}
      </Section>

      {showMedia && (
        <MediaModal
          onClose={() => setShowMedia(false)}
          onReplace={(src, type) => { handleReplace(src, type); setShowMedia(false); }}
        />
      )}
    </>
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

function VideoProps({ layer, update, updateSilent, commit, resolvedObjectFitVal, updateObjectFit }) {
  const preVol = useRef(null);
  return (
    <Section title="Video">
      <SrcField layer={layer} update={update} />
      <Field label="Volume">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <button
            onClick={() => update({ muted: !layer.muted })}
            style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 16, opacity: layer.muted ? 0.4 : 1, padding: 0 }}
          >
            {layer.muted ? "🔇" : (layer.volume ?? 1) > 0.5 ? "🔊" : "🔉"}
          </button>
          <span style={{ fontSize: 11, color: "#7070a0", minWidth: 36, textAlign: "right" }}>
            {layer.muted ? "Muted" : `${Math.round((layer.volume ?? 1) * 100)}%`}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={layer.muted ? 0 : (layer.volume ?? 1)}
          onMouseDown={() => { preVol.current = JSON.parse(JSON.stringify(useTimelineStore.getState().project)); }}
          onChange={(e) => updateSilent({ volume: parseFloat(e.target.value), muted: false })}
          onMouseUp={(e) => commit({ volume: parseFloat(e.target.value), muted: false }, preVol.current)}
          style={{ width: "100%", accentColor: "#7c5cfc", margin: 0 }}
        />
      </Field>
      <Field label="Speed">
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {[0.25, 0.5, 1, 1.5, 2].map((speed) => {
            const active = (layer.playbackRate ?? 1) === speed;
            return (
              <button
                key={speed}
                onClick={() => {
                  const trimStart = layer.trimStart ?? 0;
                  const trimEnd = layer.trimEnd ?? layer.end;
                  const originalDuration = trimEnd - trimStart;
                  const effectiveDuration = originalDuration / speed;
                  update({ playbackRate: speed, end: layer.start + effectiveDuration });
                }}
                style={{
                  padding: "4px 8px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                  border: `1px solid ${active ? "#7c5cfc" : "rgba(255,255,255,0.1)"}`,
                  background: active ? "rgba(124,92,252,0.2)" : "transparent",
                  color: active ? "#a78bfa" : "#9090b0",
                  fontWeight: active ? 700 : 400,
                }}
              >
                {speed}x
              </button>
            );
          })}
        </div>
        {(layer.playbackRate ?? 1) !== 1 && (
          <div style={{ fontSize: 11, color: "#7070a0", marginTop: 5 }}>
            At {layer.playbackRate}x — {((layer.end - layer.start) * layer.playbackRate).toFixed(1)}s of source plays in {(layer.end - layer.start).toFixed(1)}s
          </div>
        )}
      </Field>
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
    </Section>
  );
}

function AudioProps({ layer, update, updateSilent, commit }) {
  const preVol   = useRef(null);
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  function togglePreview() {
    if (!layer.src) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current = null;
      setIsPlaying(false);
      return;
    }
    const a = new Audio(layer.src);
    a.volume = layer.muted ? 0 : Math.max(0, Math.min(1, layer.volume ?? 1));
    a.onended = () => { audioRef.current = null; setIsPlaying(false); };
    a.play().catch(() => { audioRef.current = null; setIsPlaying(false); });
    audioRef.current = a;
    setIsPlaying(true);
  }

  // Stop playback if layer changes
  const layerId = layer.id;
  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, [layerId]);

  const label = layer.name || (layer.audioType === "voiceover" ? "Voiceover" : "Music");

  return (
    <Section title="Audio">
      {/* Preview player */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9 }}>
        <button
          onClick={togglePreview}
          disabled={!layer.src}
          title={isPlaying ? "Stop preview" : "Preview audio"}
          style={{
            width: 34, height: 34, borderRadius: "50%", border: "none", cursor: layer.src ? "pointer" : "not-allowed",
            background: isPlaying ? "rgba(124,92,252,0.3)" : "rgba(124,92,252,0.15)",
            color: layer.src ? "#a78bfa" : "#44445a",
            fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            transition: "background 0.15s",
          }}
        >
          {isPlaying ? "⏹" : "▶"}
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: isPlaying ? "#a78bfa" : "#c0c0d8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {label}
          </div>
          <div style={{ fontSize: 10, color: "#55556a", marginTop: 2 }}>
            {layer.src ? (isPlaying ? "Playing..." : "Click ▶ to preview") : "No audio source"}
          </div>
        </div>
      </div>

      <SrcField layer={layer} update={update} />
      <Field label="Volume">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <button
            onClick={() => update({ muted: !layer.muted })}
            style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 16, opacity: layer.muted ? 0.4 : 1, padding: 0 }}
          >
            {layer.muted ? "🔇" : (layer.volume ?? 1) > 0.5 ? "🔊" : "🔉"}
          </button>
          <span style={{ fontSize: 11, color: "#7070a0", minWidth: 36, textAlign: "right" }}>
            {layer.muted ? "Muted" : `${Math.round((layer.volume ?? 1) * 100)}%`}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={layer.muted ? 0 : (layer.volume ?? 1)}
          onMouseDown={() => { preVol.current = JSON.parse(JSON.stringify(useTimelineStore.getState().project)); }}
          onChange={(e) => updateSilent({ volume: parseFloat(e.target.value), muted: false })}
          onMouseUp={(e) => commit({ volume: parseFloat(e.target.value), muted: false }, preVol.current)}
          style={{ width: "100%", accentColor: "#7c5cfc", margin: 0 }}
        />
      </Field>
      <Row2>
        <Field label="Fade In">
          <NumberInput value={layer.fadeIn} onChange={(v) => update({ fadeIn: Math.max(0, v) })} min={0} step={0.1} />
        </Field>
        <Field label="Fade Out">
          <NumberInput value={layer.fadeOut} onChange={(v) => update({ fadeOut: Math.max(0, v) })} min={0} step={0.1} />
        </Field>
      </Row2>
    </Section>
  );
}

function TextProps({ layer, update, updateSilent, commit }) {
  const s = layer.style ?? {};
  const updateStyle = (patch) => update({ style: { ...s, ...patch } });
  const updateStyleSilent = (patch) => updateSilent({ style: { ...s, ...patch } });
  const commitStyle = (patch, pre) => commit({ style: { ...s, ...patch } }, pre);
  const preColor = useRef(null);
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
          <NumberInput value={s.fontSize} onChange={(v) => {
            const newFs = Math.max(1, v);
            const ratio = newFs / (s.fontSize || 48);
            update({
              style: { ...s, fontSize: newFs },
              transform: {
                ...layer.transform,
                width:  Math.round(layer.transform.width  * ratio),
                height: Math.round(layer.transform.height * ratio),
              },
            });
          }} min={1} step={1} />
        </Field>
        <Field label="Weight">
          <select style={selectStyle} value={s.fontWeight ?? 700} onChange={(e) => updateStyle({ fontWeight: parseInt(e.target.value) })}>
            {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
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
            onFocus={() => { preColor.current = JSON.parse(JSON.stringify(useTimelineStore.getState().project)); }}
            onChange={(e) => updateStyleSilent({ color: e.target.value })}
            onBlur={(e) => commitStyle({ color: e.target.value }, preColor.current)}
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
      <Field label="Style">
        <div style={{ display: "flex", gap: 5 }}>
          {[
            { value: "normal", label: "Normal" },
            { value: "italic", label: "Italic" },
          ].map(({ value, label }) => {
            const active = (s.fontStyle ?? "normal") === value;
            return (
              <button key={value} onClick={() => updateStyle({ fontStyle: value })}
                style={{
                  flex: 1, padding: "4px 0", borderRadius: 5, fontSize: 12, cursor: "pointer",
                  border: `1px solid ${active ? "#7c5cfc" : "rgba(255,255,255,0.1)"}`,
                  background: active ? "rgba(124,92,252,0.2)" : "transparent",
                  color: active ? "#a78bfa" : "#9090b0",
                  fontStyle: value,
                }}
              >{label}</button>
            );
          })}
        </div>
      </Field>
      <Field label="Transform">
        <div style={{ display: "flex", gap: 5 }}>
          {[
            { value: "none",       label: "Aa" },
            { value: "uppercase",  label: "AA" },
            { value: "lowercase",  label: "aa" },
            { value: "capitalize", label: "Aa+" },
          ].map(({ value, label }) => {
            const active = (s.textTransform ?? "none") === value;
            return (
              <button key={value} onClick={() => updateStyle({ textTransform: value })}
                style={{
                  flex: 1, padding: "4px 0", borderRadius: 5, fontSize: 11, cursor: "pointer",
                  border: `1px solid ${active ? "#7c5cfc" : "rgba(255,255,255,0.1)"}`,
                  background: active ? "rgba(124,92,252,0.2)" : "transparent",
                  color: active ? "#a78bfa" : "#9090b0",
                  fontWeight: active ? 700 : 400,
                }}
              >{label}</button>
            );
          })}
        </div>
      </Field>
      <Row2>
        <Field label="Letter Spacing">
          <NumberInput value={s.letterSpacing ?? 0} onChange={(v) => updateStyle({ letterSpacing: v })} step={0.5} />
        </Field>
        <Field label="Line Height">
          <NumberInput value={s.lineHeight ?? 1.2} onChange={(v) => updateStyle({ lineHeight: Math.max(0.5, v) })} min={0.5} step={0.1} />
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

function ShapeProps({ layer, update }) {
  const parseGradient = (g) => {
    if (!g) return { angle: 135, c1: "#7c5cfc", c2: "#ffffff" };
    const colors = g.match(/#[0-9a-fA-F]{3,6}|rgb[^)]+\)|rgba[^)]+\)/g);
    const angle = g.match(/(\d+)deg/)?.[1] ?? 135;
    return { angle: parseInt(angle), c1: colors?.[0] ?? "#7c5cfc", c2: colors?.[1] ?? "#ffffff" };
  };
  const [gradientMode, setGradientMode] = useState(!!(layer.gradient || layer.gradientRaw));
  const [gradState, setGradState] = useState(() => parseGradient(layer.gradient));
  const [showPresetsModal, setShowPresetsModal] = useState(false);

  const entry = layer.registry === "cinematic" ? cinematicById[layer.shapeId] : null;
  const colorMode = layer.registry === "cinematic"
    ? (entry?.colorMode ?? "fill")
    : (layer.filled !== false ? "fill" : "stroke");

  const buildGradient = (gs) => `linear-gradient(${gs.angle}deg, ${gs.c1}, ${gs.c2})`;
  const applyGradient = (gs) => update({ gradient: buildGradient(gs), gradientRaw: null });

  const CINEMATIC_FILL_NO_PATTERN = new Set(["blob_asymmetric", "liquid_blob", "cloud_soft", "ink_splash", "grunge_splat", "paint_stroke_h", "wave_swoosh", "overlay_vignette", "overlay_light_leak", "overlay_color_grade", "spotlight_cone", "radial_glow", "glow_halo"]);
  const showPresets = (
    (colorMode === "fill" || colorMode === "mixed") &&
    (
      (layer.registry === "shape" && layer.filled !== false) ||
      (layer.registry === "cinematic" && CINEMATIC_FILL_NO_PATTERN.has(layer.shapeId)) ||
      (layer.registry === "decorative")
    )
  );

  const applyPreset = (_key, entry) => {
    const bg = entry.style?.background ?? entry.style?.backgroundImage ?? entry.style?.backgroundColor;
    if (!bg) { update({ color: "#ffffff", gradient: null, gradientRaw: null }); setGradientMode(false); return; }
    const extractedColors = bg.match(/#[0-9a-fA-F]{3,6}|rgb[^)]+\)|rgba[^)]+\)/g) ?? [];
    if (!bg.includes("gradient")) {
      update({ color: extractedColors[0] ?? bg, gradient: null, gradientRaw: null });
      setGradientMode(false);
    } else if (extractedColors.length === 2) {
      const angle = parseInt(bg.match(/(\d+)deg/)?.[1] ?? 135);
      const gs = { c1: extractedColors[0], c2: extractedColors[1], angle };
      setGradState(gs);
      setGradientMode(true);
      update({ gradient: buildGradient(gs), gradientRaw: null });
    } else {
      update({ gradientRaw: bg, gradient: null });
      setGradientMode(true);
    }
  };

  return (
    <>
      <Section title="Shape">
        {layer.registry === "shape" && (
          <Field label="Style">
            <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
              <button
                onClick={() => update({ filled: true })}
                style={{ flex: 1, padding: "4px 0", borderRadius: 5, fontSize: 12, cursor: "pointer",
                  border: `1px solid ${layer.filled !== false ? "#7c5cfc" : "rgba(255,255,255,0.1)"}`,
                  background: layer.filled !== false ? "rgba(124,92,252,0.2)" : "transparent",
                  color: layer.filled !== false ? "#a78bfa" : "#9090b0" }}>
                Filled
              </button>
              <button
                onClick={() => update({ filled: false })}
                style={{ flex: 1, padding: "4px 0", borderRadius: 5, fontSize: 12, cursor: "pointer",
                  border: `1px solid ${layer.filled === false ? "#7c5cfc" : "rgba(255,255,255,0.1)"}`,
                  background: layer.filled === false ? "rgba(124,92,252,0.2)" : "transparent",
                  color: layer.filled === false ? "#a78bfa" : "#9090b0" }}>
                Outline
              </button>
            </div>
          </Field>
        )}
        {colorMode === "stroke" && (
          <>
            <Field label="Stroke">
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <button
                  onClick={() => { setGradientMode(false); update({ gradient: null, gradientRaw: null }); }}
                  style={{ flex: 1, padding: "4px 0", borderRadius: 5, fontSize: 12, cursor: "pointer",
                    border: `1px solid ${!gradientMode ? "#7c5cfc" : "rgba(255,255,255,0.1)"}`,
                    background: !gradientMode ? "rgba(124,92,252,0.2)" : "transparent",
                    color: !gradientMode ? "#a78bfa" : "#9090b0" }}>
                  Solid
                </button>
                <button
                  onClick={() => {
                    const currentColor = layer.color ?? "#ffffff";
                    const initialGrad = layer.gradient
                      ? gradState
                      : { angle: 135, c1: currentColor, c2: "#000000" };
                    setGradState(initialGrad);
                    setGradientMode(true);
                    applyGradient(initialGrad);
                  }}
                  style={{ flex: 1, padding: "4px 0", borderRadius: 5, fontSize: 12, cursor: "pointer",
                    border: `1px solid ${gradientMode ? "#7c5cfc" : "rgba(255,255,255,0.1)"}`,
                    background: gradientMode ? "rgba(124,92,252,0.2)" : "transparent",
                    color: gradientMode ? "#a78bfa" : "#9090b0" }}>
                  Gradient
                </button>
              </div>
              {layer.registry === "shape" && (
                <div style={{ marginBottom: 8 }}>
                  <button
                    onClick={() => setShowPresetsModal(true)}
                    style={{
                      width: "100%", padding: "4px 0", borderRadius: 5, fontSize: 12, cursor: "pointer",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.04)",
                      color: "#9090b0", fontWeight: 600,
                    }}
                  >
                    🎨 Presets
                  </button>
                </div>
              )}
            </Field>
            {layer.gradientRaw ? (
              <div style={{ fontSize: 11, color: "#9090b0", padding: "6px 8px", background: "rgba(255,255,255,0.04)", borderRadius: 5, wordBreak: "break-all", marginBottom: 8 }}>
                {layer.gradientRaw}
              </div>
            ) : !gradientMode ? (
              <Field label="Stroke Color">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={layer.strokeColor ?? layer.color ?? "#ffffff"}
                    onChange={(e) => update({ strokeColor: e.target.value, color: e.target.value })}
                    style={{ width: 36, height: 28, border: "none", borderRadius: 4, cursor: "pointer" }} />
                  <input style={{ ...inputStyle, flex: 1 }} value={layer.strokeColor ?? layer.color ?? "#ffffff"}
                    onChange={(e) => update({ strokeColor: e.target.value, color: e.target.value })} />
                </div>
              </Field>
            ) : (
              <>
                <Row2>
                  <Field label="Color 1">
                    <input type="color" value={gradState.c1}
                      onChange={(e) => { const gs = { ...gradState, c1: e.target.value }; setGradState(gs); applyGradient(gs); }}
                      style={{ width: "100%", height: 28, border: "none", borderRadius: 4, cursor: "pointer" }} />
                  </Field>
                  <Field label="Color 2">
                    <input type="color" value={gradState.c2}
                      onChange={(e) => { const gs = { ...gradState, c2: e.target.value }; setGradState(gs); applyGradient(gs); }}
                      style={{ width: "100%", height: 28, border: "none", borderRadius: 4, cursor: "pointer" }} />
                  </Field>
                </Row2>
                <Field label="Angle">
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="range" min={0} max={360} value={gradState.angle}
                      onChange={(e) => { const gs = { ...gradState, angle: parseInt(e.target.value) }; setGradState(gs); applyGradient(gs); }}
                      style={{ flex: 1, accentColor: "#7c5cfc" }} />
                    <span style={{ fontSize: 12, color: "#9090b0", minWidth: 36 }}>{gradState.angle}°</span>
                  </div>
                </Field>
              </>
            )}
          </>
        )}
        {layer.registry === "shape" && layer.filled === false && (
          <Field label="Stroke Width">
            <NumberInput value={layer.strokeWidth ?? 2} onChange={(v) => update({ strokeWidth: Math.max(0, v) })} min={0} step={1} />
          </Field>
        )}
        {colorMode === "fill" && (
          <Field label="Fill Color">
            <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
              {["Solid", "Gradient"].map((m) => {
                const active = m === "Gradient" ? gradientMode : !gradientMode;
                return (
                  <button key={m} onClick={() => {
                    const isGrad = m === "Gradient";
                    if (isGrad) {
                      const currentColor = layer.color ?? "#ffffff";
                      const initialGrad = layer.gradient
                        ? gradState
                        : { angle: 135, c1: currentColor, c2: "#000000" };
                      setGradState(initialGrad);
                      setGradientMode(true);
                      applyGradient(initialGrad);
                    } else {
                      setGradientMode(false);
                      update({ gradient: null, gradientRaw: null, color: layer.color ?? "#ffffff" });
                    }
                  }}
                    style={{
                      flex: 1, padding: "4px 0", borderRadius: 6, fontSize: 11, cursor: "pointer",
                      border: `1px solid ${active ? "#7c5cfc" : "rgba(255,255,255,0.1)"}`,
                      background: active ? "rgba(124,92,252,0.18)" : "transparent",
                      color: active ? "#a78bfa" : "#9090b0",
                    }}
                  >{m}</button>
                );
              })}
            </div>
            {showPresets && (
              <div style={{ marginBottom: 8 }}>
                <button
                  onClick={() => setShowPresetsModal(true)}
                  style={{
                    width: "100%", padding: "4px 0", borderRadius: 5, fontSize: 12, cursor: "pointer",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#9090b0", fontWeight: 600,
                  }}
                >
                  🎨 Presets
                </button>
              </div>
            )}
            {layer.gradientRaw ? (
              <div style={{ fontSize: 11, color: "#9090b0", padding: "6px 8px", background: "rgba(255,255,255,0.04)", borderRadius: 5, wordBreak: "break-all", marginBottom: 8 }}>
                {layer.gradientRaw}
              </div>
            ) : !gradientMode ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="color" value={layer.color ?? "#ffffff"} onChange={(e) => update({ color: e.target.value })} style={{ width: 36, height: 28, border: "none", borderRadius: 4, cursor: "pointer", background: "none" }} />
                <input style={{ ...inputStyle, flex: 1 }} value={layer.color ?? "#ffffff"} onChange={(e) => update({ color: e.target.value })} />
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <Row2>
                  <Field label="Color 1">
                    <input type="color" value={gradState.c1} onChange={(e) => { const gs = { ...gradState, c1: e.target.value }; setGradState(gs); applyGradient(gs); }} style={{ ...inputStyle, height: 30, padding: 3, cursor: "pointer" }} />
                  </Field>
                  <Field label="Color 2">
                    <input type="color" value={gradState.c2} onChange={(e) => { const gs = { ...gradState, c2: e.target.value }; setGradState(gs); applyGradient(gs); }} style={{ ...inputStyle, height: 30, padding: 3, cursor: "pointer" }} />
                  </Field>
                </Row2>
                <Field label="Angle">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="range" min={0} max={360} step={1} value={gradState.angle}
                      onChange={(e) => { const gs = { ...gradState, angle: parseInt(e.target.value) }; setGradState(gs); applyGradient(gs); }}
                      style={{ flex: 1, accentColor: "#7c5cfc" }} />
                    <span style={{ fontSize: 11, color: "#7070a0", minWidth: 30 }}>{gradState.angle}°</span>
                  </div>
                </Field>
              </div>
            )}
          </Field>
        )}
        {colorMode !== "mixed" && (
          <Field label="Opacity">
            <NumberInput value={layer.shapeOpacity ?? 1} onChange={(v) => update({ shapeOpacity: Math.max(0, Math.min(1, v)) })} min={0} max={1} step={0.05} />
          </Field>
        )}
      </Section>
      {colorMode === "mixed" && (
        <Section title="Colors">
          <Field label="Stroke Color">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="color" value={layer.strokeColor ?? layer.color ?? "#ffffff"}
                onChange={(e) => update({ strokeColor: e.target.value })}
                style={{ width: 36, height: 28, border: "none", borderRadius: 4, cursor: "pointer" }} />
              <input style={{ ...inputStyle, flex: 1 }} value={layer.strokeColor ?? layer.color ?? "#ffffff"}
                onChange={(e) => update({ strokeColor: e.target.value })} />
            </div>
          </Field>
          <Field label="Fill">
            <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
              {["Solid", "Gradient"].map((m) => {
                const active = m === "Gradient" ? gradientMode : !gradientMode;
                return (
                  <button key={m} onClick={() => {
                    const isGrad = m === "Gradient";
                    if (isGrad) {
                      const currentColor = layer.color ?? "#ffffff";
                      const initialGrad = layer.gradient
                        ? gradState
                        : { angle: 135, c1: currentColor, c2: "#000000" };
                      setGradState(initialGrad);
                      setGradientMode(true);
                      applyGradient(initialGrad);
                    } else {
                      setGradientMode(false);
                      update({ gradient: null, gradientRaw: null, color: layer.color ?? "#ffffff" });
                    }
                  }}
                    style={{
                      flex: 1, padding: "4px 0", borderRadius: 6, fontSize: 11, cursor: "pointer",
                      border: `1px solid ${active ? "#7c5cfc" : "rgba(255,255,255,0.1)"}`,
                      background: active ? "rgba(124,92,252,0.18)" : "transparent",
                      color: active ? "#a78bfa" : "#9090b0",
                    }}
                  >{m}</button>
                );
              })}
            </div>
            {showPresets && (
              <div style={{ marginBottom: 8 }}>
                <button
                  onClick={() => setShowPresetsModal(true)}
                  style={{
                    width: "100%", padding: "4px 0", borderRadius: 5, fontSize: 12, cursor: "pointer",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#9090b0", fontWeight: 600,
                  }}
                >
                  🎨 Presets
                </button>
              </div>
            )}
            {layer.gradientRaw ? (
              <div style={{ fontSize: 11, color: "#9090b0", padding: "6px 8px", background: "rgba(255,255,255,0.04)", borderRadius: 5, wordBreak: "break-all", marginBottom: 8 }}>
                {layer.gradientRaw}
              </div>
            ) : !gradientMode ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="color" value={layer.color ?? "#ffffff"} onChange={(e) => update({ color: e.target.value })} style={{ width: 36, height: 28, border: "none", borderRadius: 4, cursor: "pointer", background: "none" }} />
                <input style={{ ...inputStyle, flex: 1 }} value={layer.color ?? "#ffffff"} onChange={(e) => update({ color: e.target.value })} />
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <Row2>
                  <Field label="Color 1">
                    <input type="color" value={gradState.c1} onChange={(e) => { const gs = { ...gradState, c1: e.target.value }; setGradState(gs); applyGradient(gs); }} style={{ ...inputStyle, height: 30, padding: 3, cursor: "pointer" }} />
                  </Field>
                  <Field label="Color 2">
                    <input type="color" value={gradState.c2} onChange={(e) => { const gs = { ...gradState, c2: e.target.value }; setGradState(gs); applyGradient(gs); }} style={{ ...inputStyle, height: 30, padding: 3, cursor: "pointer" }} />
                  </Field>
                </Row2>
                <Field label="Angle">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="range" min={0} max={360} step={1} value={gradState.angle}
                      onChange={(e) => { const gs = { ...gradState, angle: parseInt(e.target.value) }; setGradState(gs); applyGradient(gs); }}
                      style={{ flex: 1, accentColor: "#7c5cfc" }} />
                    <span style={{ fontSize: 11, color: "#7070a0", minWidth: 30 }}>{gradState.angle}°</span>
                  </div>
                </Field>
              </div>
            )}
          </Field>
          <Field label="Opacity">
            <NumberInput value={layer.shapeOpacity ?? 1} onChange={(v) => update({ shapeOpacity: Math.max(0, Math.min(1, v)) })} min={0} max={1} step={0.05} />
          </Field>
        </Section>
      )}
      {showPresetsModal && (
        <PresetsModal
          categories={["bright", "light", "dark", "gradient"]}
          onClose={() => setShowPresetsModal(false)}
          onSelect={applyPreset}
        />
      )}
    </>
  );
}

const ICON_WEIGHTS = ["thin", "light", "regular", "bold", "fill", "duotone"];

function IconProps({ layer, update }) {
  const [showIconModal, setShowIconModal] = useState(false);
  return (
    <>
      <Section title="Icon">
        <Field label="Icon">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#e8e8f0", flex: 1 }}>{layer.iconName || "—"}</span>
            <button
              onClick={() => setShowIconModal(true)}
              style={{
                padding: "4px 12px", borderRadius: 5, fontSize: 12, cursor: "pointer",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(251,146,60,0.12)",
                color: "#fb923c", fontWeight: 600,
              }}
            >
              Change Icon
            </button>
          </div>
        </Field>
        <Field label="Color">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="color"
              value={layer.style?.color || "#ffffff"}
              onChange={(e) => update({ style: { ...layer.style, color: e.target.value } })}
              style={{ width: 32, height: 28, border: "none", borderRadius: 6, cursor: "pointer", padding: 2, background: "transparent" }}
            />
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={layer.style?.color || "#ffffff"}
              onChange={(e) => update({ style: { ...layer.style, color: e.target.value } })}
            />
          </div>
        </Field>
        <Field label="Weight">
          <select
            value={layer.style?.weight || "regular"}
            onChange={(e) => update({ style: { ...layer.style, weight: e.target.value } })}
            style={selectStyle}
          >
            {ICON_WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </Field>
        <Field label="Size">
          <NumberInput
            value={layer.transform?.width ?? 100}
            onChange={(v) => update({ transform: { ...layer.transform, width: Math.max(16, v), height: Math.max(16, v) } })}
            min={16}
            step={8}
          />
        </Field>
      </Section>
      {showIconModal && (
        <IconModal
          onClose={() => setShowIconModal(false)}
          onSelect={(iconName, color, weight) => update({ iconName, style: { ...layer.style, color, weight } })}
        />
      )}
    </>
  );
}

function GradientProps({ layer, update }) {
  const [showPresetsModal, setShowPresetsModal] = useState(false);
  return (
    <>
    <Section title="Gradient">
      <Field label="CSS Gradient">
        <input
          style={inputStyle}
          defaultValue={layer.gradient ?? ""}
          placeholder="linear-gradient(135deg, #000000, #ffffff)"
          onBlur={(e) => update({ gradient: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
        />
      </Field>
      <div style={{ marginBottom: 8 }}>
        <button
          onClick={() => setShowPresetsModal(true)}
          style={{
            width: "100%", padding: "4px 0", borderRadius: 5, fontSize: 12, cursor: "pointer",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.04)",
            color: "#9090b0", fontWeight: 600,
          }}
        >
          🎨 Presets
        </button>
      </div>
    </Section>
    {showPresetsModal && (
      <PresetsModal
        allowPatterns={true}
        onClose={() => setShowPresetsModal(false)}
        onSelect={(_key, entry) => {
          const bg = entry.style?.background ?? entry.style?.backgroundImage ?? entry.style?.backgroundColor;
          update({ gradient: bg ?? "#000000" });
        }}
      />
    )}
    </>
  );
}

function AppearanceSection({ layer, update, updateSilent, commit,
  showBorderRadius = false,
  showBorder = false,
  showBackground = false,
  showPadding = false,
  showBoxShadow = false,
  showBlendMode = false,
}) {
  const shadow = layer.boxShadow ?? null;
  const hasBg  = !!layer.backgroundColor;
  const pre = useRef(null);
  const snap = () => { pre.current = JSON.parse(JSON.stringify(useTimelineStore.getState().project)); };
  return (
    <Section title="Appearance">
      {showBorderRadius && (
        <Field label="Border Radius">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="range" min={0} max={500} step={1}
              value={layer.borderRadius ?? 0}
              onMouseDown={snap}
              onChange={(e) => updateSilent({ borderRadius: parseInt(e.target.value) })}
              onMouseUp={(e) => commit({ borderRadius: parseInt(e.target.value) }, pre.current)}
              style={{ flex: 1, accentColor: "#7c5cfc", margin: 0 }}
            />
            <span style={{ fontSize: 11, color: "#7070a0", minWidth: 30, textAlign: "right" }}>
              {layer.borderRadius ?? 0}px
            </span>
          </div>
        </Field>
      )}

      {showBorder && (
        <Row2>
          <Field label="Border Width">
            <NumberInput value={layer.borderWidth ?? 0} onChange={(v) => update({ borderWidth: Math.max(0, v) })} min={0} step={1} />
          </Field>
          <Field label="Border Color">
            <input
              type="color"
              value={layer.borderColor ?? "#ffffff"}
              onFocus={snap}
              onChange={(e) => updateSilent({ borderColor: e.target.value })}
              onBlur={(e) => commit({ borderColor: e.target.value }, pre.current)}
              style={{ ...inputStyle, height: 34, padding: 3, cursor: "pointer" }}
            />
          </Field>
        </Row2>
      )}

      {(showBackground || showPadding) && (
        <Row2>
          {showBackground && (
            <Field label="Background">
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="color"
                  value={hasBg ? layer.backgroundColor : "#000000"}
                  onFocus={snap}
                  onChange={(e) => updateSilent({ backgroundColor: e.target.value })}
                  onBlur={(e) => commit({ backgroundColor: e.target.value }, pre.current)}
                  style={{ ...inputStyle, height: 32, padding: 3, cursor: "pointer", flex: 1, opacity: hasBg ? 1 : 0.35 }}
                />
                <button
                  onClick={() => update({ backgroundColor: hasBg ? null : "#000000" })}
                  style={{
                    padding: "5px 8px", borderRadius: 5, fontSize: 11, cursor: "pointer",
                    border: `1px solid ${hasBg ? "#7c5cfc" : "rgba(255,255,255,0.1)"}`,
                    background: hasBg ? "rgba(124,92,252,0.18)" : "transparent",
                    color: hasBg ? "#a78bfa" : "#55556a", whiteSpace: "nowrap",
                  }}
                >
                  {hasBg ? "✕" : "Off"}
                </button>
              </div>
            </Field>
          )}
          {showPadding && (
            <Field label="Padding">
              <NumberInput value={layer.padding ?? 0} onChange={(v) => update({ padding: Math.max(0, v) })} min={0} step={2} />
            </Field>
          )}
        </Row2>
      )}

      {showBoxShadow && (
        <Field label="Shadow">
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {BOX_SHADOW_PRESETS.map(({ label, value }) => {
              const active = shadow === value;
              return (
                <button key={label} onClick={() => update({ boxShadow: value })}
                  style={{
                    padding: "4px 9px", borderRadius: 5, fontSize: 11, cursor: "pointer",
                    border: `1px solid ${active ? "#7c5cfc" : "rgba(255,255,255,0.1)"}`,
                    background: active ? "rgba(124,92,252,0.18)" : "transparent",
                    color: active ? "#a78bfa" : "#9090b0",
                    fontWeight: active ? 700 : 400,
                  }}
                >{label}</button>
              );
            })}
          </div>
        </Field>
      )}

      <Field label="Flip">
        <div style={{ display: "flex", gap: 6 }}>
          {[["flipX", "↔ Horizontal"], ["flipY", "↕ Vertical"]].map(([prop, label]) => (
            <button key={prop} onClick={() => update({ [prop]: !layer[prop] })}
              style={{
                flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 12, cursor: "pointer",
                border: `1px solid ${layer[prop] ? "#7c5cfc" : "rgba(255,255,255,0.1)"}`,
                background: layer[prop] ? "rgba(124,92,252,0.18)" : "transparent",
                color: layer[prop] ? "#a78bfa" : "#9090b0",
              }}
            >{label}</button>
          ))}
        </div>
      </Field>

      {showBlendMode && (
        <Field label="Blend Mode">
          <select
            style={selectStyle}
            value={layer.blendMode ?? "normal"}
            onChange={(e) => update({ blendMode: e.target.value === "normal" ? undefined : e.target.value })}
          >
            {["normal","multiply","screen","overlay","darken","lighten","color-dodge","color-burn","hard-light","soft-light","difference","exclusion"].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </Field>
      )}
    </Section>
  );
}


function TransitionProps({ layer, update }) {
  const tr = layer.transition ?? { type: "none", duration: 0.5 };
  const updateTr = (patch) => update({ transition: { ...tr, ...patch } });
  const active = (tr.type ?? "none") !== "none";
  return (
    <Section title="Transition">
      <Field label="Type">
        <select style={selectStyle} value={tr.type ?? "none"} onChange={(e) => updateTr({ type: e.target.value })}>
          {TRANSITION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
      {active && (
        <Row2>
          <Field label="Duration (s)">
            <NumberInput
              value={tr.duration ?? 0.5}
              onChange={(v) => updateTr({ duration: Math.max(0.1, Math.min(2, v)) })}
              min={0.1} max={2} step={0.1}
            />
          </Field>
          <Field label="Intensity">
            <NumberInput
              value={tr.intensity ?? 1}
              onChange={(v) => updateTr({ intensity: Math.max(0, Math.min(1, v)) })}
              min={0} max={1} step={0.05}
            />
          </Field>
        </Row2>
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

function SfxSection({ layer, update }) {
  const sfx = layer.sfx ?? null;
  const previewRef = useRef(null);
  const [sfxOptions, setSfxOptions] = useState([{ key: "", label: "None" }]);

  useEffect(() => {
    loadSFXLibrary().then(lib => {
      const opts = Object.entries(lib)
        .sort((a, b) => (a[1].title || a[0]).localeCompare(b[1].title || b[0]))
        .map(([key, t]) => ({ key, label: t.duration ? `${t.title || key} (${t.duration}s)` : (t.title || key) }));
      setSfxOptions([{ key: "", label: "None" }, ...opts]);
    });
  }, []);

  const updateSfx = (patch) =>
    update({ sfx: { key: sfx?.key ?? "", volume: sfx?.volume ?? 1, delay: sfx?.delay ?? 0, ...patch } });

  const playPreview = () => {
    if (previewRef.current) { previewRef.current.pause(); }
    if (!sfx?.key) return;
    const a = new Audio(getSFXPreviewUrl(sfx.key));
    a.volume = Math.max(0, Math.min(1, sfx?.volume ?? 1));
    a.play().catch(() => {});
    previewRef.current = a;
  };

  return (
    <Section title="Sound Effect">
      <Field label="SFX">
        <select
          style={selectStyle}
          value={sfx?.key ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            update({ sfx: val ? { key: val, volume: sfx?.volume ?? 1, delay: sfx?.delay ?? 0 } : null });
          }}
        >
          {sfxOptions.map(({ key, label }) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </Field>
      {sfx?.key && (
        <>
          <Field label="Volume">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={sfx.volume ?? 1}
              onChange={(e) => updateSfx({ volume: parseFloat(e.target.value) })}
              style={{ width: "100%", accentColor: "#7c5cfc", margin: 0 }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
              <span style={{ fontSize: 11, color: "#7070a0" }}>Volume</span>
              <span style={{ fontSize: 11, color: "#7070a0" }}>{Math.round((sfx.volume ?? 1) * 100)}%</span>
            </div>
          </Field>
          <Field label="Delay (s)">
            <NumberInput
              value={sfx.delay ?? 0}
              onChange={(v) => updateSfx({ delay: Math.max(0, v) })}
              min={0}
              step={0.1}
            />
            <div style={{ fontSize: 11, color: "#7070a0", marginTop: 3 }}>
              {sfx.delay ? `Plays ${sfx.delay}s after layer start` : "Plays at layer start"}
            </div>
          </Field>
          <button
            onClick={playPreview}
            style={{
              width: "100%", padding: "5px 0", borderRadius: 6, cursor: "pointer",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#c0c0d8", fontSize: 12, fontWeight: 600,
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(124,92,252,0.15)")}
            onMouseOut={(e)  => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
          >
            ▶ Preview Sound
          </button>
        </>
      )}
    </Section>
  );
}

export default function PropertiesPanel() {
  const project = useTimelineStore((s) => s.project);
  const selectedLayerId = useTimelineStore((s) => s.selectedLayerId);
  const selectedLayerIds = useTimelineStore((s) => s.selectedLayerIds);
  const alignSelectedLayers = useTimelineStore((s) => s.alignSelectedLayers);
  const updateLayer = useTimelineStore((s) => s.updateLayer);
  const updateLayerSilent = useTimelineStore((s) => s.updateLayerSilent);
  const commitDrag = useTimelineStore((s) => s.commitDrag);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const addKeyframeAction = useTimelineStore((s) => s.addKeyframe);

  const layer = project?.layers?.find((l) => l.id === selectedLayerId);
  const canvasW = project?.format?.width  ?? 1080;
  const canvasH = project?.format?.height ?? 1920;
  const update = (patch) => { if (layer) updateLayer(layer.id, patch); };
  const updateSilent = (patch) => { if (layer) updateLayerSilent(layer.id, patch); };
  const commit = (patch, pre) => { if (layer) commitDrag(layer.id, patch, pre); };

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
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: "#8888a8", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Properties
        </span>
      </div>

      {selectedLayerIds.length > 1 ? (
        <div style={{ flex: 1, padding: "20px 16px" }}>
          <div style={{ fontSize: 11, color: "#7070a0", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
            {selectedLayerIds.length} layers selected
          </div>
          <span style={labelStyle}>Align</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {/* Horizontal row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
              {[
                { type: "left",    title: "Align left",    x: -1 },
                { type: "centerH", title: "Center horiz",  x: 0  },
                { type: "right",   title: "Align right",   x: 1  },
              ].map(({ type, title, x }) => (
                <button key={type} title={title} onClick={() => alignSelectedLayers(type)}
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, cursor: "pointer", padding: "5px 0", display: "flex", alignItems: "center", justifyContent: "center" }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "rgba(124,92,252,0.15)")}
                  onMouseOut={(e)  => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <rect x="1" y="8" width="20" height="6" rx="1" fill="rgba(255,255,255,0.12)" />
                    {x < 0  && <rect x="1"   y="8" width="7" height="6" rx="1" fill="#7c5cfc" />}
                    {x === 0 && <rect x="7.5" y="8" width="7" height="6" rx="1" fill="#7c5cfc" />}
                    {x > 0  && <rect x="14"  y="8" width="7" height="6" rx="1" fill="#7c5cfc" />}
                    {x < 0  && <line x1="1"  y1="4" x2="1"  y2="18" stroke="#7c5cfc" strokeWidth="1.5" />}
                    {x === 0 && <line x1="11" y1="4" x2="11" y2="18" stroke="#7c5cfc" strokeWidth="1.5" />}
                    {x > 0  && <line x1="21" y1="4" x2="21" y2="18" stroke="#7c5cfc" strokeWidth="1.5" />}
                  </svg>
                </button>
              ))}
            </div>
            {/* Vertical row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
              {[
                { type: "top",     title: "Align top",    y: -1 },
                { type: "centerV", title: "Center vert",  y: 0  },
                { type: "bottom",  title: "Align bottom", y: 1  },
              ].map(({ type, title, y }) => (
                <button key={type} title={title} onClick={() => alignSelectedLayers(type)}
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, cursor: "pointer", padding: "5px 0", display: "flex", alignItems: "center", justifyContent: "center" }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "rgba(124,92,252,0.15)")}
                  onMouseOut={(e)  => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <rect x="8" y="1" width="6" height="20" rx="1" fill="rgba(255,255,255,0.12)" />
                    {y < 0  && <rect x="8" y="1"   width="6" height="7" rx="1" fill="#7c5cfc" />}
                    {y === 0 && <rect x="8" y="7.5" width="6" height="7" rx="1" fill="#7c5cfc" />}
                    {y > 0  && <rect x="8" y="14"  width="6" height="7" rx="1" fill="#7c5cfc" />}
                    {y < 0  && <line x1="4" y1="1"  x2="18" y2="1"  stroke="#7c5cfc" strokeWidth="1.5" />}
                    {y === 0 && <line x1="4" y1="11" x2="18" y2="11" stroke="#7c5cfc" strokeWidth="1.5" />}
                    {y > 0  && <line x1="4" y1="21" x2="18" y2="21" stroke="#7c5cfc" strokeWidth="1.5" />}
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : !layer ? (
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
        <div className="dark-scroll" style={{ flex: 1, overflowY: "auto", padding: "14px 16px", position: "relative" }}>
          {layer.locked && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 20,
              background: "rgba(10,10,20,0.55)",
              backdropFilter: "blur(1px)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
              pointerEvents: "all",
            }}>
              <span style={{ fontSize: 28 }}>🔒</span>
              <span style={{ fontSize: 13, color: "#ffb432", fontWeight: 600 }}>Layer is locked</span>
              <button
                onClick={() => update({ locked: false })}
                style={{
                  marginTop: 4, padding: "6px 18px", borderRadius: 7, cursor: "pointer",
                  background: "rgba(255,180,50,0.15)", border: "1px solid rgba(255,180,50,0.4)",
                  color: "#ffb432", fontSize: 12, fontWeight: 600,
                }}
              >
                Unlock
              </button>
            </div>
          )}
          {/* Scene source switcher — hidden for text layers */}
          {layer.type !== "text" && (
            <SceneSourceSection
              layer={layer}
              project={project}
              updateLayer={updateLayer}
              addLayer={useTimelineStore.getState().addLayer}
              key={layer.id}
            />
          )}

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
              {/* Align */}
              <div style={{ marginBottom: 12 }}>
                <span style={labelStyle}>Align</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {[
                    [
                      { title: "Align left",   icon: "⬛◻◻", x: -(canvasW - (resolvedTr.width ?? layer.transform?.width ?? canvasW)) / 2 },
                      { title: "Center horiz", icon: "◻⬛◻", x: 0 },
                      { title: "Align right",  icon: "◻◻⬛", x:  (canvasW - (resolvedTr.width ?? layer.transform?.width ?? canvasW)) / 2 },
                    ],
                    [
                      { title: "Align top",    icon: "⬛◻◻", y: -(canvasH - (resolvedTr.height ?? layer.transform?.height ?? canvasH)) / 2 },
                      { title: "Center vert",  icon: "◻⬛◻", y: 0 },
                      { title: "Align bottom", icon: "◻◻⬛", y:  (canvasH - (resolvedTr.height ?? layer.transform?.height ?? canvasH)) / 2 },
                    ],
                  ].map((row, ri) => (
                    <div key={ri} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
                      {row.map(({ title, icon, x, y }) => {
                        const svgH = ri === 0;
                        return (
                          <button
                            key={title}
                            title={title}
                            onClick={() => updateTransform(x !== undefined ? { x } : { y })}
                            style={{
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: 6, cursor: "pointer", padding: "5px 0",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(124,92,252,0.15)")}
                            onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                          >
                            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                              {svgH ? (
                                <>
                                  <rect x="1" y="8" width="20" height="6" rx="1" fill="rgba(255,255,255,0.12)" />
                                  {x !== undefined && x < 0  && <rect x="1"  y="8" width="7" height="6" rx="1" fill="#7c5cfc" />}
                                  {x !== undefined && x === 0 && <rect x="7.5" y="8" width="7" height="6" rx="1" fill="#7c5cfc" />}
                                  {x !== undefined && x > 0  && <rect x="14" y="8" width="7" height="6" rx="1" fill="#7c5cfc" />}
                                  {x !== undefined && x < 0  && <line x1="1"  y1="4" x2="1"  y2="18" stroke="#7c5cfc" strokeWidth="1.5" />}
                                  {x !== undefined && x === 0 && <line x1="11" y1="4" x2="11" y2="18" stroke="#7c5cfc" strokeWidth="1.5" />}
                                  {x !== undefined && x > 0  && <line x1="21" y1="4" x2="21" y2="18" stroke="#7c5cfc" strokeWidth="1.5" />}
                                </>
                              ) : (
                                <>
                                  <rect x="8" y="1" width="6" height="20" rx="1" fill="rgba(255,255,255,0.12)" />
                                  {y !== undefined && y < 0  && <rect x="8" y="1"  width="6" height="7" rx="1" fill="#7c5cfc" />}
                                  {y !== undefined && y === 0 && <rect x="8" y="7.5" width="6" height="7" rx="1" fill="#7c5cfc" />}
                                  {y !== undefined && y > 0  && <rect x="8" y="14" width="6" height="7" rx="1" fill="#7c5cfc" />}
                                  {y !== undefined && y < 0  && <line x1="4" y1="1"  x2="18" y2="1"  stroke="#7c5cfc" strokeWidth="1.5" />}
                                  {y !== undefined && y === 0 && <line x1="4" y1="11" x2="18" y2="11" stroke="#7c5cfc" strokeWidth="1.5" />}
                                  {y !== undefined && y > 0  && <line x1="4" y1="21" x2="18" y2="21" stroke="#7c5cfc" strokeWidth="1.5" />}
                                </>
                              )}
                            </svg>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Fill canvas */}
              <div style={{ marginBottom: 12 }}>
                <button
                  title="Set layer to fill the full canvas (x=0, y=0, width=canvasW, height=canvasH)"
                  onClick={() => updateTransform({ x: 0, y: 0, width: canvasW, height: canvasH })}
                  style={{
                    width: "100%", padding: "5px 0", borderRadius: 6, cursor: "pointer",
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "#c0c0d8", fontSize: 12, fontWeight: 600,
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "rgba(124,92,252,0.15)")}
                  onMouseOut={(e)  => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                >
                  Fill Canvas
                </button>
              </div>

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

          {/* Type-specific props */}
          {layer.type === "video"    && <VideoProps layer={layer} update={update} updateSilent={updateSilent} commit={commit} resolvedObjectFitVal={resolvedObjectFitVal} updateObjectFit={updateObjectFit} />}
          {layer.type === "audio"   && <AudioProps layer={layer} update={update} updateSilent={updateSilent} commit={commit} />}
          {layer.type === "text"    && <TextProps  layer={layer} update={update} updateSilent={updateSilent} commit={commit} />}
          {(layer.type === "image" || layer.type === "sticker") && <ImageProps layer={layer} update={update} resolvedObjectFitVal={resolvedObjectFitVal} updateObjectFit={updateObjectFit} />}
          {layer.type === "shape"    && <ShapeProps    layer={layer} update={update} />}
          {layer.type === "gradient" && <GradientProps layer={layer} update={update} />}
          {layer.type === "icon"     && <IconProps     layer={layer} update={update} />}

          {/* Appearance — scoped per layer type */}
          {layer.type === "text" && (
            <AppearanceSection layer={layer} update={update} updateSilent={updateSilent} commit={commit}
              showBorderRadius showBorder showBackground showPadding showBoxShadow showBlendMode />
          )}
          {(layer.type === "image" || layer.type === "video" || layer.type === "sticker") && (
            <AppearanceSection layer={layer} update={update} updateSilent={updateSilent} commit={commit}
              showBorderRadius showBorder showBoxShadow showBlendMode />
          )}
          {layer.type === "gradient" && (
            <AppearanceSection layer={layer} update={update} updateSilent={updateSilent} commit={commit}
              showBorderRadius showBlendMode />
          )}
          {layer.type === "shape" && (
            <AppearanceSection layer={layer} update={update} updateSilent={updateSilent} commit={commit}
              showBlendMode />
          )}

          {/* Transitions — image and video only */}
          {(layer.type === "image" || layer.type === "video") && (
            <TransitionProps layer={layer} update={update} />
          )}

          {/* SFX — all visual layers except audio and captions */}
          {!["audio", "captions"].includes(layer.type) && (
            <SfxSection layer={layer} update={update} />
          )}

          {/* Keyframes — all visual layers except audio and captions */}
          {!["audio", "captions"].includes(layer.type) && (
            <KeyframesSection layer={layer} />
          )}
        </div>
      )}
    </div>
  );
}
