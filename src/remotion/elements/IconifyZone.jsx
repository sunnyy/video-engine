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
      if (!cancelled) setSvg(result);
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
