/**
 * ColorsTab.jsx
 * src/ui/Editor/zones/zonePicker/tabs/ColorsTab.jsx
 *
 * Loads backgrounds from backgroundPatternRegistry.
 * Grouped by category with tab switcher.
 * Same registry used by automated video generation.
 */
import React, { useState } from "react";
import backgroundPatternRegistry, { backgroundCategories } from "../../../../core/backgroundPatternRegistry";

const CATEGORY_LABELS = {
  dark:     "Dark",
  light:    "Light",
  gradient: "Gradients",
  vibrant:  "Vibrant",
  neon:     "Neon",
  mesh:     "Mesh",
  pattern:  "Patterns",
};

export default function ColorsTab({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState("dark");

  const keys = backgroundCategories[activeCategory] || [];

  return (
    <div className="flex flex-col h-full gap-3">

      {/* Category tabs */}
      <div className="flex flex-wrap gap-[3px]">
        {Object.keys(backgroundCategories).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-[5px] rounded-[6px] text-[11px] font-medium transition-all capitalize
              ${activeCategory === cat
                ? "bg-[#7c5cfc] text-white"
                : "bg-[#1c1c28] text-[#9494a8] hover:text-[#e8e8f0] border border-[rgba(255,255,255,0.06)]"
              }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-6 gap-2">
          {keys.map(key => {
            const styleObj = backgroundPatternRegistry[key]?.() || {};
            const cssStyle = {
              background:     styleObj.background,
              backgroundSize: styleObj.backgroundSize || "auto",
            };

            return (
              <div
                key={key}
                onClick={() => {
                  onSelect({ kind: "color", color: styleObj.background, backgroundSize: styleObj.backgroundSize });
                  onClose();
                }}
                className="cursor-pointer rounded-[8px] border border-[rgba(255,255,255,0.08)] hover:border-[#7c5cfc] transition-all hover:scale-[1.03] overflow-hidden"
                style={{ height: "180px", ...cssStyle }}
                title={key}
              />
            );
          })}
        </div>
      </div>

    </div>
  );
}