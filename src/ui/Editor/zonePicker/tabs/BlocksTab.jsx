/**
 * BlocksTab.jsx
 * src/ui/Editor/zones/zonePicker/tabs/BlocksTab.jsx
 * Fix #10 — block previews with icon, description, variant count
 */
import React from "react";
import blockRegistry, { getBlockDefaults } from "../../../../core/blockRegistry";

const BLOCK_META = {
  StatExplosion:   { icon: "📊", desc: "Big number with label and badge"       },
  ListCountdown:   { icon: "📋", desc: "Ranked list with progress bars"         },
  QuoteHighlight:  { icon: "💬", desc: "Pull quote with accent line"            },
  BeforeAfter:     { icon: "↔️",  desc: "Split comparison reveal"               },
  ProcessSteps:    { icon: "🔢", desc: "Sequential numbered steps"              },
  ProblemSolution: { icon: "✅", desc: "Problem vs solution split"              },
  HookImpact:      { icon: "⚡", desc: "Full-frame headline with CTA"           },
  Slideshow:       { icon: "🖼️",  desc: "Auto-cycling image sequence"           },
  ChapterTitle:    { icon: "📖", desc: "Chapter or section title card"          },
};

export default function BlocksTab({ onSelect, onClose }) {

  const handleBlockSelect = (type) => {
    const defaults = getBlockDefaults(type);
    onSelect({ kind: "block", block: { type, variant: "default", props: { ...defaults } } });
    onClose();
  };

  return (
    <div className="grid grid-cols-2 gap-3 overflow-y-auto content-start pb-2">
      {Object.keys(blockRegistry).map(type => {
        const meta     = BLOCK_META[type] || { icon: "🧩", desc: "" };
        const def      = blockRegistry[type];
        const variants = def?.variants?.length || 1;

        return (
          <div
            key={type}
            onClick={() => handleBlockSelect(type)}
            className="cursor-pointer rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[#111118] hover:border-[#7c5cfc] hover:bg-[#16163a] transition-all p-3 flex flex-col gap-2"
          >
            <div className="text-[22px] leading-none">{meta.icon}</div>
            <div>
              <div className="text-[13px] font-bold text-[#e8e8f0]">{type}</div>
              <div className="text-[11px] text-[#55556a] mt-[2px] leading-snug">{meta.desc}</div>
            </div>
            <div className="text-[10px] font-mono text-[#7c5cfc] mt-auto">
              {variants} variant{variants !== 1 ? "s" : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}