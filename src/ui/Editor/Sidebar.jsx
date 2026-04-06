/**
 * Sidebar.jsx
 * src/ui/Editor/Sidebar.jsx
 */
import { useProjectStore } from "../../store/useProjectStore";

export default function Sidebar({ activeTab, setActiveTab }) {
  const project = useProjectStore((s) => s.project);
  if (!project) return null;

  const isTalkingHead = project.meta.mode === "talking_head";

  const Item = ({ id, icon, label }) => {
    const active = activeTab === id;
    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`w-full flex flex-col items-center gap-[5px] py-[14px] px-1 rounded-[8px] border transition cursor-pointer
          ${active
            ? "bg-[#1c1c28] border-[#7c5cfc] text-[#e8e8f0]"
            : "bg-transparent border-transparent text-[#55556a] hover:text-[#9494a8] hover:bg-[#111118]"
          }`}
        style={{ fontFamily: "'Syne',sans-serif" }}
      >
        <span className="text-[20px] leading-none">{icon}</span>
        <span className="text-[14px] font-bold uppercase tracking-[0.06em] leading-tight text-center">{label}</span>
      </button>
    );
  };

  return (
    <div className="h-full border-r border-[rgba(255,255,255,0.06)] bg-[#0b0b10] py-4 px-2 flex flex-col gap-[4px] overflow-y-auto shrink-0">
      <Item id="beats"        icon="🎬" label="Beats"    />
      {isTalkingHead && <Item id="avatar" icon="🎥" label="Avatar" />}
      <Item id="audio"        icon="🎵" label="Audio"    />
      <Item id="videoOverlays"icon="✨" label="Overlays" />
      <Item id="branding"     icon="🎨" label="Brand"    />
      <Item id="files"        icon="📁" label="Files"    />
      <Item id="myRules"      icon="📋" label="Rules"    />
    </div>
  );
}
