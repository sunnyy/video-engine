/**
 * IconifyZone.jsx
 * src/remotion/elements/IconifyZone.jsx
 *
 * Renders a single Iconify (Phosphor) icon by fetching its SVG from the API.
 * Uses in-memory cache from iconifyService so the same icon is never fetched twice.
 */

import { useState, useEffect } from "react";
import { fetchIconSVG } from "../../services/assets/iconifyService";

export function IconifyZone({ set, icon, color, style }) {
  const [svg, setSvg] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchIconSVG(set, icon, color).then(result => {
      if (!cancelled && result) {
        // The Iconify API returns SVGs with fixed pixel width/height (e.g. width="100" height="100").
        // Replace them with "100%" so the icon fills and scales with its container instead of
        // staying a fixed 100×100 px box regardless of zone size or iconSize wrapper dimensions.
        const scalable = result
          .replace(/(<svg\b[^>]*?)\s+width="[^"]*"/, '$1 width="100%"')
          .replace(/(<svg\b[^>]*?)\s+height="[^"]*"/, '$1 height="100%"');
        setSvg(scalable);
      } else if (!cancelled) {
        setSvg(result);
      }
    });
    return () => { cancelled = true; };
  }, [set, icon, color]);

  if (!svg) return null;

  return (
    <div
      style={{
        width: "100%", height: "100%",
        opacity: style?.opacity ?? 1,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
