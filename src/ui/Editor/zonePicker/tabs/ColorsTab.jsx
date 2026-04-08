/**
 * ColorsTab.jsx
 */
import { useState } from "react";
import {
  backgroundPatternRegistry,
  backgroundCategories,
} from "../../../../core/backgroundPatternRegistry";

const CATEGORY_LABELS = {
  bright:   "Bright",
  light:    "Light",
  dark:     "Dark",
  gradient: "Gradients",
  neon:     "Neon",
  mesh:     "Mesh",
  pattern:  "Patterns",
};

export default function ColorsTab({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState("bright");
  const [hovered, setHovered] = useState(null);

  const keys = backgroundCategories[activeCategory] || [];

  return (
    <div className="flex flex-col h-full gap-3">

      {/* Category tabs */}
      <div className="flex flex-wrap gap-[4px]">
        {Object.keys(backgroundCategories).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-[5px] rounded-[6px] text-[11px] font-semibold transition-all
              ${activeCategory === cat
                ? "bg-[#7c5cfc] text-white"
                : "bg-[#1c1c28] text-[#9494a8] hover:text-[#e8e8f0] border border-[rgba(255,255,255,0.06)]"
              }`}
          >
            {CATEGORY_LABELS[cat] || cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-4 gap-2">
          {keys.map(key => {
            const entry = backgroundPatternRegistry[key];
            if (!entry) return null;
            const { style } = entry;
            const isHovered = hovered === key;

            return (
              <div
                key={key}
                onClick={() => {
                  onSelect({ kind: "pattern", key });
                  onClose();
                }}
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer rounded-[8px] overflow-hidden flex flex-col transition-all"
                style={{ border: isHovered ? "2px solid #7c5cfc" : "2px solid rgba(255,255,255,0.07)" }}
              >
                {/* Swatch */}
                <div
                  style={{
                    aspectRatio: "4/3",
                    ...style,
                    transform:  isHovered ? "scale(1.03)" : "scale(1)",
                    transition: "transform 0.15s",
                  }}
                />
                {/* Label */}
                <div
                  className="px-[6px] py-[4px] text-[9px] font-mono truncate"
                  style={{
                    background: "#0e0e1a",
                    color: isHovered ? "#c4b5fd" : "#55556a",
                  }}
                >
                  {key}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
