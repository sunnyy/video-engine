/**
 * adapter.js
 * src/services/ai/aiVideo/adapter.js
 *
 * Bridges the two shapes: htmlMeasure returns flat graph-entries (x/y/w/h at top
 * level — the promo shape); the stitch compiler + renderer want timeline layers
 * (geometry under transform{}, plus start/end and type-specific fields).
 *
 * Unlike the promo timelineBuilder, this does NOT bake in entrance keyframes — in
 * AI Video the stitch compiler + motion expander own ALL motion. It just carries the
 * measured geometry, the motion intents (enter/exit/emphasis), and the hero tag
 * (data-scene-element) across, so a measured scene can flow straight into the
 * transformation engine.
 */

const EMPTY_KF = () => ({ x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] });

function entryToLayer(e, start, end) {
  const base = {
    id: e.id, trackId: e.id, name: e.role || e.type, type: e.type,
    start, end, zIndex: e.zIndex ?? 10,
    visible: true, locked: false, sfx: null,
    filter: e.filter || null, boxShadow: e.boxShadow || null,
    mixBlendMode: e.mixBlendMode || null, backdropFilter: e.backdropFilter || null,
    persist: false,
    // carried for the transformation engine:
    sceneElement: e.sceneElement || "supporting",   // hero | supporting | decoration | background
    enter:    e.enter    || null,
    exit:     e.exit     || null,
    emphasis: e.emphasis || (e.ambientPulse ? { type: "breathe" } : null),
    keyframes: EMPTY_KF(),
    transition: { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } },
    transform: {
      x: e.x, y: e.y, width: e.width, height: e.height,
      opacity: e.opacity ?? 1, rotation: e.rotation ?? 0, scale: 1, blur: 0,
      borderRadius: e.borderRadius ?? 0, borderWidth: e.borderWidth ?? 0, borderColor: e.borderColor ?? "#ffffff",
    },
  };

  if (e.type === "text")     return { ...base, content: e.text ?? "", style: { ...e.style, _captionStyle: null }, captionStyle: null };
  if (e.type === "gradient") return { ...base, gradient: e.background ?? ((e.borderWidth ?? 0) > 0 ? "transparent" : "rgba(0,0,0,0.3)") };
  if (e.type === "image")    return { ...base, src: e.src ?? null, objectFit: e.objectFit ?? "cover", assetType: e.assetType ?? null, assetHint: e.assetHint ?? null };
  if (e.type === "icon")     return { ...base, iconName: e.iconName ?? null, style: { color: e.style?.color ?? "#ffffff" } };
  return base;
}

/**
 * entriesToLayers(measuredEntries, start, end) → timeline layers for one beat.
 */
export function entriesToLayers(entries, start, end) {
  return (entries || []).map(e => entryToLayer(e, start, end));
}
