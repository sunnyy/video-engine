import React from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { layoutRegistry } from "../../core/layoutRegistry";

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

  const layout = layoutRegistry[activeBeat.layout];
  const structure = layout?.structure || {};

  return (
    <div className="flex-1 w-[75%] min-w-[320px] overflow-y-auto border-r border-gray-200 bg-white px-6 py-4 rounded-xl ml-4">
      <h3 className="m-0 text-lg font-semibold">Editing Beat #{activeBeat.order + 1}</h3>

      <div className="mt-4 mb-6">
        <LayoutSelector beat={activeBeat} />
      </div>

      <div className="mb-4">
        <AssetsSection beat={activeBeat} project={project} />
      </div>

      <div className="mb-4">
        <ContentSection beat={activeBeat} />
      </div>

      {structure.caption && (
        <div className="mb-4">
          <CaptionsSection beat={activeBeat} />
        </div>
      )}

      <TransitionSection beat={activeBeat} />
    </div>
  );
}
