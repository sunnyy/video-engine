/**
 * IconsTab.jsx
 * src/ui/Editor/zonePicker/tabs/IconsTab.jsx
 */
import { useState } from "react";
import { ICON_OPTIONS, ICON_GROUPS, renderIconSVG } from "../../../../core/iconRegistry.jsx";

export default function IconsTab({ onSelect }) {
  const [activeGroup, setActiveGroup] = useState("all");

  const filtered = activeGroup === "all"
    ? ICON_OPTIONS
    : ICON_OPTIONS.filter(i => i.group === activeGroup);

  return (
    <div className="flex flex-col gap-3">
      {/* Group filter */}
      <div className="flex gap-[5px] flex-wrap">
        {["all", ...ICON_GROUPS].map(g => (
          <button key={g}
            onClick={() => setActiveGroup(g)}
            className="px-3 py-[4px] rounded-[6px] text-[11px] font-bold border cursor-pointer capitalize transition-all"
            style={activeGroup === g
              ? { background: "rgba(124,92,252,0.18)", borderColor: "#7c5cfc", color: "#a78bfa" }
              : { background: "transparent", borderColor: "rgba(255,255,255,0.08)", color: "#7070a0" }}
          >{g}</button>
        ))}
      </div>

      {/* Icon grid */}
      <div className="grid grid-cols-5 gap-3">
        {filtered.map(icon => {
          const svg = renderIconSVG(icon.id, { color: "#ffffff", filled: icon.defaultFilled });
          return (
            <button
              key={icon.id}
              onClick={() => onSelect({
                kind:     "icon",
                iconId:   icon.id,
                defaults: icon.defaults,
              })}
              className="flex flex-col items-center justify-center gap-2 rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[#0e0e1a] hover:border-[#7c5cfc] hover:bg-[rgba(124,92,252,0.08)] transition-all cursor-pointer p-3 aspect-square"
            >
              <div className="w-10 h-10 flex items-center justify-center">
                {svg ? (
                  <svg viewBox={svg.viewBox} width="40" height="40"
                    style={{ display: "block", overflow: "visible" }}
                    dangerouslySetInnerHTML={{ __html: svg.content }}
                  />
                ) : (
                  <span className="text-[20px]">{icon.icon}</span>
                )}
              </div>
              <span className="text-[10px] font-mono text-[#9494a8] text-center leading-tight">
                {icon.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
