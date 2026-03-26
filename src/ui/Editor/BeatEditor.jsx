import React from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { layoutRegistry } from "../../core/layoutRegistry";

import LayoutSelector from "./LayoutSelector";
import ZonesSection from "./ZonesSection";
import CaptionsSection from "./CaptionsSection";
import TransitionSection from "./TransitionSection";
import OverlaySection from "./OverlaySection";
import ContentSection from "./ContentSection";

export default function BeatEditor() {
  const project = useProjectStore((s) => s.project);
  const activeBeatId = useProjectStore((s) => s.activeBeatId);

  if (!project || !activeBeatId) return null;

  const activeBeat = project.beats.find((b) => b.id === activeBeatId);
  if (!activeBeat) return null;

  const layout = layoutRegistry[activeBeat.layout];
  const structure = layout?.structure || {};

  const zones = activeBeat.zones || {};

  return (
    <div className="flex-1 w-[75%] min-w-[320px] overflow-y-auto border-r border-gray-200 bg-white px-6 py-4 rounded-xl ml-4">
      <h3 className="m-0 text-lg font-semibold">Editing Beat #{activeBeat.order + 1}</h3>

      {/* Layout */}

      <div className="mt-4 mb-6">
        <LayoutSelector beat={activeBeat} />
      </div>

      {/* Assets */}

      <div className="mb-4">
        <ZonesSection beat={activeBeat} project={project} />
      </div>

      {/* ContentSection */}

      <div className="mb-4 mt-20">
        <ContentSection beat={activeBeat} />
      </div>

      {/* Captions */}

      {structure.caption && (
        <div className="mb-4">
          <CaptionsSection beat={activeBeat} />
        </div>
      )}

      {/* Overlays */}

      <div className="mb-4">
        <OverlaySection beat={activeBeat} />
      </div>

      {/* Transitions */}

      <TransitionSection beat={activeBeat} />
    </div>
  );
}
