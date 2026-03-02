import React from "react";
import { useProjectStore } from "../../store/useProjectStore";

import LayoutSelector from "./LayoutSelector";
import ContentSection from "./ContentSection";
import AssetsSection from "./AssetsSection";
import CaptionsSection from "./CaptionsSection";
import TransitionSection from "./TransitionSection";

export default function BeatEditor() {
  const project = useProjectStore((s) => s.project);
  const activeBeatId = useProjectStore((s) => s.activeBeatId);

  if (!project || !activeBeatId) return null;

  const activeBeat = project.beats.find((b) => b.id === activeBeatId);

  if (!activeBeat) return null;

  return (
    <div className="flex-1 w-[75%] min-w-[320px] overflow-y-auto border-r border-gray-200 bg-white px-6 py-2 rounded-xl ml-4">
      <h3 className="mb-0 text-lg font-semibold">Editing Beat #{activeBeat.order + 1}</h3>

      <ContentSection beat={activeBeat} />

      <div className="mb-2">
        <h4 className="mb-3 text-sm text-black font-semibold uppercase tracking-wide">Layout</h4>
        <LayoutSelector beat={activeBeat} />
      </div>
      
      <div className="mb-2">
        <AssetsSection beat={activeBeat} project={project} />
      </div>

      <TransitionSection beat={activeBeat} />

      <div className="flex gap-2">
        <CaptionsSection beat={activeBeat} />
      </div>
      
    </div>
  );
}
