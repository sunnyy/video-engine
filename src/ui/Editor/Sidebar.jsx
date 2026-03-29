import React from "react";
import { useProjectStore } from "../../store/useProjectStore";

export default function Sidebar({ activeTab, setActiveTab }) {

  const project = useProjectStore((s) => s.project);

  if (!project) return null;

  const isTalkingHead = project.meta.mode === "talking_head";

  const Item = ({ id, label }) => {

    const active = activeTab === id;

    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`w-full text-[11px] font-semibold uppercase tracking-[0.08em] px-2 py-[6px] rounded-[6px] border transition ${
          active
            ? "bg-[#1c1c28] border-[#7c5cfc] text-[#e8e8f0]"
            : "bg-[#16161f] border-[rgba(255,255,255,0.06)] text-[#9494a8] hover:border-[rgba(255,255,255,0.2)]"
        }`}
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        {label}
      </button>
    );

  };

  return (

    <div className="w-[110px] border-r border-[rgba(255,255,255,0.06)] bg-[#111118] p-4 flex flex-col gap-3">

      <Item id="beats" label="Beats" />

      {isTalkingHead && (
        <Item id="avatar" label="Video" />
      )}

      <Item id="audio" label="Audio" />

      <Item id="videoOverlays" label="Overlays" />

    </div>

  );

}