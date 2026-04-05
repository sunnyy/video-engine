import React from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useProjectStore } from "../../store/useProjectStore";

// Layout → color chip mapping
const LAYOUT_COLORS = {
  ThreeZone:      { bg: "rgba(124,92,252,0.15)", border: "rgba(124,92,252,0.25)", text: "#a78fff" },
  SplitZone:      { bg: "rgba(59,158,255,0.15)", border: "rgba(59,158,255,0.25)", text: "#7bbfff" },
  TwoTopOneBottom:{ bg: "rgba(45,212,191,0.15)", border: "rgba(45,212,191,0.25)", text: "#5eead4" },
  FourGrid:       { bg: "rgba(249,115,22,0.15)", border: "rgba(249,115,22,0.25)", text: "#fb923c" },
  SplitV:         { bg: "rgba(59,158,255,0.15)", border: "rgba(59,158,255,0.25)", text: "#7bbfff" },
  Full:           { bg: "rgba(239,68,68,0.15)",  border: "rgba(239,68,68,0.25)",  text: "#f87171" },
};

function LayoutChip({ layout }) {
  const c =
    LAYOUT_COLORS[layout] || {
      bg: "rgba(148,148,168,0.15)",
      border: "rgba(148,148,168,0.25)",
      text: "#9494a8",
    };

  return (
    <span
      className="text-[11px] font-semibold px-[6px] py-[2px] rounded-full"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        letterSpacing: "0.04em",
      }}
    >
      {layout}
    </span>
  );
}

export default function BeatList() {
  const project = useProjectStore((s) => s.project);
  const activeBeatId = useProjectStore((s) => s.activeBeatId);
  const setActiveBeat = useProjectStore((s) => s.setActiveBeat);
  const reorderBeats = useProjectStore((s) => s.reorderBeats);
  const deleteBeat = useProjectStore((s) => s.deleteBeat);
  const duplicateBeat = useProjectStore((s) => s.duplicateBeat);

  if (!project) return null;

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = project.beats.findIndex((b) => b.id === active.id);
    const newIndex = project.beats.findIndex((b) => b.id === over.id);

    reorderBeats(arrayMove(project.beats, oldIndex, newIndex));
  };

  return (
    <div className="w-[30%] h-full overflow-y-auto bg-[#111118] border-r border-[rgba(255,255,255,0.06)] px-2 py-4 flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-2 mb-3">
        <h3
          className="m-0 text-[15px] font-bold tracking-[0.1em] uppercase text-[#bbb]"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          Timeline
        </h3>

        <span
          className="text-[12px] px-2 py-[2px] rounded-[4px] border border-[rgba(255,255,255,0.06)] bg-[#1c1c28] text-[#bbb]"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {project.beats.length} beats
        </span>
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={project.beats.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-[3px]">
            {project.beats.map((beat, index) => (
              <SortableBeat
                key={beat.id}
                beat={beat}
                index={index}
                activeBeatId={activeBeatId}
                setActiveBeat={setActiveBeat}
                deleteBeat={deleteBeat}
                duplicateBeat={duplicateBeat}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

    </div>
  );
}

function SortableBeat({
  beat,
  index,
  activeBeatId,
  setActiveBeat,
  deleteBeat,
  duplicateBeat,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: beat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isActive = beat.id === activeBeatId;

  const zone = beat.zones?.z1 || beat.zones?.z2 || beat.zones?.z3 || null;

  const duration = Number(beat.duration_sec || 0).toFixed(1);

  const handleClick = () => {
    const { seekToBeat } = useProjectStore.getState();
    if (seekToBeat) seekToBeat(beat.id);
    setActiveBeat(beat.id);
  };

  const handleDelete = () => {
    if (window.confirm("Delete this beat?")) deleteBeat(beat.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center gap-2 rounded-[10px] p-2 transition-all select-none cursor-pointer border
      ${
        isActive
          ? "bg-[#1c1c28] border-[rgba(255,255,255,0.1)]"
          : "bg-transparent border-transparent hover:bg-[#16161f] hover:border-[rgba(255,255,255,0.06)]"
      }`}
    >
      {/* Active accent */}
      {isActive && (
        <div
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
          style={{
            background: "#f5c518",
            boxShadow: "0 0 8px rgba(245,197,24,0.35)",
          }}
        />
      )}

      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-[#55556a] hover:text-[#9494a8] transition-colors pl-1 text-[13px]"
      >
        ⠿
      </div>

      {/* Thumbnail */}
      <div
        onClick={handleClick}
        className="h-[70px] w-[50px] min-w-[50px] overflow-hidden rounded-[7px] border border-[rgba(255,255,255,0.06)] bg-[#16161f]"
      >
        <Thumbnail zone={zone} />
      </div>

      {/* Info */}
      <div onClick={handleClick} className="flex flex-1 flex-col gap-[5px] min-w-0">
        <span className={`text-[13px] font-medium ${isActive ? "text-[#BEBAD3]" : "text-[#514E5A]"} line-clamp-2 leading-[1.3]`}>
          {beat.spoken}
        </span>

        <div className="flex items-center gap-[5px]">
          <span
            className="text-[12px] px-[5px] py-[1px] rounded-[4px] border border-[rgba(255,255,255,0.06)] bg-[#1c1c28] text-[#ccc]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {duration}s
          </span>

          <LayoutChip layout={beat.layout} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">

        <button
          onClick={(e) => {
            e.stopPropagation();
            duplicateBeat(beat.id);
          }}
          className="w-[20px] h-[20px] flex items-center justify-center rounded text-[12px] text-[#55556a] hover:text-[#7bbfff] hover:bg-[#1c1c28] transition"
          title="Duplicate"
        >
          ⧉
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          className="w-[20px] h-[20px] flex items-center justify-center rounded text-[12px] text-[#55556a] hover:text-[#f87171] hover:bg-[#1c1c28] transition"
          title="Delete"
        >
          ✕
        </button>

      </div>
    </div>
  );
}

function Thumbnail({ zone }) {
  if (!zone) return null;

  const content = zone.content || {};
  const bg = zone.background || {};

  if (content.kind === "asset") {
    const src = content.asset?.src;
    if (!src) return null;

    const isVideo = src.endsWith(".mp4") || src.endsWith(".webm");

    if (isVideo)
      return <video src={src} muted className="h-full w-full object-cover" />;

    return <img src={src} draggable={false} className="h-full w-full object-cover" />;
  }

  if (bg.kind === "asset") {
    const src = bg.asset?.src;
    if (!src) return null;

    const isVideo = src.endsWith(".mp4") || src.endsWith(".webm");

    if (isVideo)
      return <video src={src} muted className="h-full w-full object-cover" />;

    return <img src={src} draggable={false} className="h-full w-full object-cover" />;
  }

  if (bg.kind === "color") {
    return <div className="h-full w-full" style={{ background: bg.color }} />;
  }

  return null;
}