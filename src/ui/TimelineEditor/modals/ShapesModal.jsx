import { useState } from "react";
import { useTimelineStore } from "../../../store/useTimelineStore";
import EditorModal from "./EditorModal";
import { shapeRegistry, renderDecorativeSVG } from "../../../core/registries/shapeRegistry";
import { decorativeRegistry } from "../../../core/registries/decorativeRegistry";
import cinematicRegistry from "../../../core/registries/cinematicRegistry";

const TABS = ["Shapes", "Decoratives", "Cinematic"];

const SHAPE_ENTRIES = Object.entries(shapeRegistry);

function ShapePreview({ shapeId, color }) {
  const result = renderDecorativeSVG(shapeId, { color, strokeWidth: 0, filled: true });
  if (!result) return null;
  const { viewBox, content } = result;
  return (
    <div style={{ width: "100%", aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg
        viewBox={viewBox}
        width="60%"
        height="60%"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}

function DecorativePreview({ entry }) {
  if (!entry.svg) {
    return <div style={{ fontSize: 20, color: "#7c5cfc" }}>◈</div>;
  }
  const html = entry.svg
    .replace(/currentColor/g, "#c0b4ff")
    .replace(/width="[^"]*"/, 'width="52"')
    .replace(/height="[^"]*"/, 'height="52"');
  return (
    <div
      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", aspectRatio: "1" }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function ShapesModal({ onClose }) {
  const [tab, setTab] = useState("Shapes");
  const [color, setColor] = useState("#ffffff");
  const project     = useTimelineStore((s) => s.project);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const addLayer    = useTimelineStore((s) => s.addLayer);

  const totalDuration = project?.format?.duration ?? 30;
  const start = currentTime;
  const end   = Math.min(start + 5, totalDuration);

  function addShape(shapeId) {
    const id = crypto.randomUUID();
    addLayer({
      id, trackId: id,
      type: "shape",
      name: shapeRegistry[shapeId]?.label ?? shapeId,
      visible: true, locked: false,
      start, end,
      zIndex: (project?.layers?.length ?? 0) + 5,
      shapeId,
      registry: "shape",
      color,
      filled: true,
      strokeWidth: 0,
      shapeOpacity: 1,
      objectFit: "cover",
      transform: { x: 0, y: 0, width: 200, height: 200, rotation: 0, scale: 1, opacity: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" },
      keyframes: { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] },
      animation:  { in: { type: "fade", duration: 0.3 }, out: { type: "none", duration: 0.3 } },
      transition: { type: "none", duration: 0.5 },
      sfx: null,
    });
    onClose();
  }

  function addCinematic(entry) {
    const id = crypto.randomUUID();
    addLayer({
      id, trackId: id,
      type: "shape",
      name: entry.label ?? entry.id,
      visible: true, locked: false,
      start, end,
      zIndex: (project?.layers?.length ?? 0) + 5,
      shapeId: entry.id,
      registry: "cinematic",
      color,
      filled: false,
      strokeWidth: 0,
      shapeOpacity: 1,
      objectFit: "cover",
      transform: { x: 0, y: 0, width: 300, height: 300, rotation: 0, scale: 1, opacity: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" },
      keyframes: { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] },
      animation:  { in: { type: "fade", duration: 0.3 }, out: { type: "none", duration: 0.3 } },
      transition: { type: "none", duration: 0.5 },
      sfx: null,
    });
    onClose();
  }

  function addDecorative(entry) {
    const id = crypto.randomUUID();
    addLayer({
      id, trackId: id,
      type: "shape",
      name: entry.id,
      visible: true, locked: false,
      start, end,
      zIndex: (project?.layers?.length ?? 0) + 5,
      shapeId: entry.id,
      registry: "decorative",
      color,
      filled: true,
      strokeWidth: 0,
      shapeOpacity: 1,
      objectFit: "cover",
      transform: { x: 0, y: 0, width: 200, height: 200, rotation: 0, scale: 1, opacity: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" },
      keyframes: { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] },
      animation:  { in: { type: "fade", duration: 0.3 }, out: { type: "none", duration: 0.3 } },
      transition: { type: "none", duration: 0.5 },
      sfx: null,
    });
    onClose();
  }

  const decorativeCategories = tab === "Decoratives"
    ? [...new Set(decorativeRegistry.map((e) => e.category))]
    : [];

  const cinematicCategories = tab === "Cinematic"
    ? [...new Set(cinematicRegistry.map((e) => e.category))]
    : [];

  return (
    <EditorModal title="Shapes" onClose={onClose} width={560}>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {TABS.map((t) => {
          const active = tab === t;
          const accent = t === "Cinematic" ? "#f59e0b" : "#7c5cfc";
          const accentText = t === "Cinematic" ? "#fbbf24" : "#a68dff";
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "6px 18px", borderRadius: 20, fontSize: 13, cursor: "pointer",
                fontWeight: active ? 700 : 400,
                background: active ? `${accent}22` : "transparent",
                border: `1px solid ${active ? accent : "rgba(255,255,255,0.15)"}`,
                color: active ? accentText : "#9090b0",
              }}
            >
              {t}
            </button>
          );
        })}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#7070a0" }}>Color</span>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ width: 32, height: 28, border: "none", borderRadius: 6, cursor: "pointer", padding: 2, background: "transparent" }}
          />
        </div>
      </div>

      {tab === "Shapes" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
          {SHAPE_ENTRIES.map(([shapeId, entry]) => (
            <button
              key={shapeId}
              onClick={() => addShape(shapeId)}
              title={entry.label}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 9,
                cursor: "pointer",
                padding: 6,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = "rgba(124,92,252,0.15)"; e.currentTarget.style.borderColor = "rgba(124,92,252,0.4)"; }}
              onMouseOut={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
            >
              <ShapePreview shapeId={shapeId} color={color} />
              <span style={{ fontSize: 10, color: "#8888a8", textAlign: "center" }}>{entry.label}</span>
            </button>
          ))}
        </div>
      )}

      {tab === "Decoratives" && (
        <div>
          {decorativeCategories.map((cat) => {
            const items = decorativeRegistry.filter((e) => e.category === cat);
            return (
              <div key={cat} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#7070a0", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  {cat}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                  {items.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => addDecorative(entry)}
                      title={entry.id}
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 9,
                        cursor: "pointer",
                        padding: 6,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = "rgba(124,92,252,0.15)"; e.currentTarget.style.borderColor = "rgba(124,92,252,0.4)"; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                    >
                      <DecorativePreview entry={entry} />
                      <span style={{ fontSize: 9, color: "#8888a8", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                        {entry.id.replace(/_/g, " ")}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "Cinematic" && (
        <div>
          {cinematicCategories.map((cat) => {
            const items = cinematicRegistry.filter((e) => e.category === cat);
            return (
              <div key={cat} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#7070a0", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  {cat}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {items.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => addCinematic(entry)}
                      title={entry.label}
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 9,
                        cursor: "pointer",
                        padding: 0,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = "rgba(124,92,252,0.15)"; e.currentTarget.style.borderColor = "rgba(124,92,252,0.4)"; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                    >
                      {entry.render === "css_repeat" ? (
                        <div style={{ width: "100%", height: 54, color: "#ffffff", ...(entry.css ?? {}) }} />
                      ) : (
                        <div
                          style={{
                            width: "100%", height: 54, color: "#ffffff",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            filter: entry.render === "svg_filter" ? "drop-shadow(0 0 6px #ffffff)" : undefined,
                          }}
                          dangerouslySetInnerHTML={{ __html: entry.svg ?? "" }}
                        />
                      )}
                      <div style={{ padding: "4px 6px", fontSize: 9, color: "#8888a8", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%", width: "100%" }}>
                        {entry.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </EditorModal>
  );
}
