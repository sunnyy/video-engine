/**
 * CompositionDecorativeLayer.jsx
 * src/remotion/elements/CompositionDecorativeLayer.jsx
 *
 * Renders all decoratives for a beat.
 * Used in both Remotion (LayoutRenderer) and the editor preview (ZoneCanvas).
 *
 * Props:
 *   decoratives  - beat.decoratives[] array
 *   canvasW      - canvas width in px (already scaled for editor)
 *   canvasH      - canvas height in px
 */

import React from "react";
import DecorativeRenderer from "./DecorativeRenderer";
import { decorativeById } from "../../core/registries/decorativeRegistry";

export default function CompositionDecorativeLayer({ decoratives, canvasW, canvasH }) {
  if (!decoratives?.length || !canvasW || !canvasH) return null;

  return (
    <>
      {decoratives.map((dec, i) => {
        const entry = decorativeById[dec.decorativeId];
        if (!entry) return null;

        // floating_scattered with quantity > 1: render multiple instances
        if (dec._scatter && dec._scatterCount > 1) {
          return Array.from({ length: dec._scatterCount }, (_, si) => (
            <DecorativeRenderer
              key={`dec_${i}_${si}`}
              decorative={{
                ...dec,
                position: dec._scatterPositions?.[si] || dec.position,
              }}
              canvasW={canvasW}
              canvasH={canvasH}
            />
          ));
        }

        return (
          <DecorativeRenderer
            key={`dec_${i}`}
            decorative={dec}
            canvasW={canvasW}
            canvasH={canvasH}
          />
        );
      })}
    </>
  );
}
