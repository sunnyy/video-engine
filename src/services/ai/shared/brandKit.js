/**
 * shared/brandKit.js — applies a user's brand kit to a FINISHED timeline as a
 * post-processing transform. Deliberately does NOT touch any generation pipeline:
 * the generator stays generic; branding is layered on after.
 *
 * v1 adds two layers (palette injection deferred):
 *   - a small persistent logo "bug" in the top-right corner (if logo_url)
 *   - a closing CTA line over the final ~3s (if cta_text or channel_name)
 *
 * Pure function: returns a new timeline; the input is not mutated. Safe to call with a
 * null/empty kit (returns the timeline unchanged).
 */

const FULL_TRANSFORM = {
  x: 0, y: 0, width: 0, height: 0, opacity: 1, scale: 1, blur: 0,
  rotation: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff",
};

function baseLayer({ id, name, type, start, end, zIndex, transform, extra }) {
  return {
    id, name: name || "Brand", type,
    visible: true, locked: false,
    start, end, zIndex: zIndex ?? 9000,
    sfx: null, cssAnimation: null, filter: null, boxShadow: null,
    mixBlendMode: null, backdropFilter: null,
    keyframes: {}, transition: { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } },
    transform: { ...FULL_TRANSFORM, ...(transform || {}) },
    ...(extra || {}),
  };
}

export function applyBrandKit(timeline, brandKit) {
  if (!timeline || !brandKit) return timeline;

  const W   = timeline.format?.width  || 1080;
  const H   = timeline.format?.height || 1920;
  const dur = timeline.format?.duration || 0;
  if (!dur) return timeline;

  const added = [];

  // ── Logo bug — small, top-right, persistent. objectFit:contain handles any aspect. ──
  if (brandKit.logo_url) {
    const pad = Math.round(W * 0.04);
    const box = Math.round(W * 0.13);
    added.push(baseLayer({
      id: "brand_logo", name: "Brand Logo", type: "image",
      start: 0, end: dur, zIndex: 9000,
      transform: { x: W - box - pad, y: pad, width: box, height: box, opacity: 0.95 },
      extra: { src: brandKit.logo_url, objectFit: "contain" },
    }));
  }

  // ── Closing CTA — bottom area, final ~3s (or last third for very short videos). ──
  const ctaText = (brandKit.cta_text || (brandKit.channel_name ? `Follow ${brandKit.channel_name}` : "")).trim();
  if (ctaText) {
    const ctaStart = Math.max(0, dur > 4 ? dur - 3 : dur * 0.67);
    added.push(baseLayer({
      id: "brand_cta", name: "Brand CTA", type: "text",
      start: parseFloat(ctaStart.toFixed(3)), end: dur, zIndex: 9001,
      transform: { x: Math.round(W * 0.08), y: Math.round(H * 0.80), width: Math.round(W * 0.84), height: Math.round(H * 0.12), opacity: 1 },
      extra: {
        content: ctaText,
        style: {
          fontSize: Math.round(W * 0.052), fontFamily: "Outfit", fontWeight: 800,
          color: "#ffffff", textAlign: "center", lineHeight: 1.15, letterSpacing: 0,
          textShadow: "0 2px 10px rgba(0,0,0,0.55)",
        },
      },
    }));
  }

  if (!added.length) return timeline;
  return { ...timeline, layers: [...(timeline.layers || []), ...added] };
}
