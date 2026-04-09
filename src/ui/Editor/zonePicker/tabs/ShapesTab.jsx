/**
 * ShapesTab.jsx
 * src/ui/Editor/zonePicker/tabs/ShapesTab.jsx
 *
 * Picker tab for inserting decorative shape zones.
 */
import { DECORATIVE_SHAPE_OPTIONS } from "../../../../core/decorativeShapeRegistry.js";
import { renderDecorativeSVG } from "../../../../core/decorativeShapeRegistry.js";

export default function ShapesTab({ onSelect }) {
  return (
    <div className="grid grid-cols-4 gap-3 p-1">
      {DECORATIVE_SHAPE_OPTIONS.map(shape => {
        const svg = renderDecorativeSVG(shape.id, shape.defaults);
        return (
          <button
            key={shape.id}
            onClick={() => onSelect({
              kind:     "decorative",
              shape:    shape.id,
              defaults: shape.defaults,
            })}
            className="flex flex-col items-center justify-center gap-2 rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[#0e0e1a] hover:border-[#7c5cfc] hover:bg-[rgba(124,92,252,0.08)] transition-all cursor-pointer p-4 aspect-square"
          >
            <div className="w-12 h-12 flex items-center justify-center">
              {svg ? (
                <svg
                  viewBox={svg.viewBox}
                  width="48" height="48"
                  style={{ display: "block", overflow: "visible" }}
                  dangerouslySetInnerHTML={{ __html: svg.content }}
                />
              ) : (
                <span className="text-[28px] text-white/60">{shape.icon}</span>
              )}
            </div>
            <span className="text-[11px] font-mono text-[#9494a8] text-center leading-tight">
              {shape.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
