import React from "react";
import { useProjectStore } from "../../store/useProjectStore";

import LayoutSelector from "./LayoutSelector";
import ContentSection from "./ContentSection";
import AssetsSection from "./AssetsSection";
import LayoutSettingsSection from "./LayoutSettingsSection";
import CaptionsSection from "./CaptionsSection";
import TransitionSection from "./TransitionSection";


export default function BeatEditor() {
  const project = useProjectStore((s) => s.project);
  const activeBeatId = useProjectStore((s) => s.activeBeatId);

  if (!project || !activeBeatId) return null;

  const activeBeat = project.beats.find(
    (b) => b.id === activeBeatId
  );

  if (!activeBeat) return null;

  return (
    <div className="w-[30%] min-w-[320px] overflow-y-auto border-r border-gray-200 bg-white px-6 py-2 rounded-xl h-3/4">
      <h3 className="mb-6 text-lg font-semibold">
        Editing Beat #{activeBeat.order + 1}
      </h3>

      <div className="mb-8">
        <h4 className="mb-3 text-sm font-medium text-gray-600 uppercase tracking-wide">
          Layout
        </h4>
        <LayoutSelector beat={activeBeat} />
      </div>

      <LayoutSettingsSection beat={activeBeat} />

      <ContentSection beat={activeBeat} />

      <div className="mt-8">
        <AssetsSection beat={activeBeat} project={project} />
      </div>

      <div className="mt-8">
        <CaptionsSection beat={activeBeat} />
      </div>

      <div className="mt-8">
        <TransitionSection beat={activeBeat} />
      </div>
    </div>
  );
}