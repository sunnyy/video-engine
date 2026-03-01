import React from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useProjectStore } from "../../store/useProjectStore";

export default function BeatList() {
  const project = useProjectStore((s) => s.project);
  const activeBeatId = useProjectStore((s) => s.activeBeatId);
  const setActiveBeat = useProjectStore((s) => s.setActiveBeat);
  const reorderBeats = useProjectStore((s) => s.reorderBeats);
  const deleteBeat = useProjectStore((s) => s.deleteBeat);

  if (!project) return null;

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = project.beats.findIndex((b) => b.id === active.id);
    const newIndex = project.beats.findIndex((b) => b.id === over.id);

    const newBeats = arrayMove(project.beats, oldIndex, newIndex);

    reorderBeats(newBeats);
  };

  return (
    <div className="w-[420px] overflow-y-auto border-r border-gray-200 bg-white px-2 py-2 rounded-xl">
      <h4 className="mb-4 text-sm font-semibold text-gray-600 uppercase">Beats</h4>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={project.beats.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {project.beats.map((beat, index) => (
              <SortableBeat
                key={beat.id}
                beat={beat}
                index={index}
                activeBeatId={activeBeatId}
                setActiveBeat={setActiveBeat}
                deleteBeat={deleteBeat}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableBeat({ beat, index, activeBeatId, setActiveBeat, deleteBeat }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: beat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isActive = beat.id === activeBeatId;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 rounded-lg border p-2 transition select-none
        ${isActive ? "border-indigo-600 bg-indigo-50" : "border-gray-200 hover:border-gray-300"}
      `}
    >
      {/* Drag Handle */}
      <div {...attributes} {...listeners} className="cursor-grab text-gray-400 active:cursor-grabbing">
        ☰
      </div>

      {/* Thumbnail */}
      <div
        onClick={() => {
          const { seekToBeat } = useProjectStore.getState();
          if (seekToBeat) seekToBeat(beat.id);
          setActiveBeat(beat.id);
        }}
        className="h-14 w-14 overflow-hidden rounded-md border bg-gray-100 cursor-pointer"
      >
        <Thumbnail asset={beat.assets.main} />
      </div>

      {/* Info */}
      <div
        onClick={() => {
          const { seekToBeat } = useProjectStore.getState();
          if (seekToBeat) seekToBeat(beat.id);
          setActiveBeat(beat.id);
        }}
        className="flex flex-1 flex-col cursor-pointer"
      >
        <div className="flex items-center justify-between text-sm font-medium">
          <span className="line-clamp-2 text-left">{beat.spoken}</span>
        </div>

        <div className="flex gap-2">
          <span className="text-xs bg-gray-100 font-medium text-black px-2 py-[2px]">{beat.duration_sec}s</span>
          <div className="text-xs bg-blue-100 font-medium text-black px-2 py-[2px]">{beat.visual_mode}</div>
        </div>
      </div>

      {/* Delete */}
      <button onClick={() => deleteBeat(beat.id)} className="text-xs text-gray-400 hover:text-red-500">
        ✕
      </button>
    </div>
  );
}

function Thumbnail({ asset }) {
  if (!asset) return null;

  // Background
  if (asset.type === "background") {
    return (
      <div
        className="h-full w-full"
        style={asset.value?.color ? { background: asset.value.color } : { background: asset.value?.gradient }}
      />
    );
  }

  // 🔥 Support both url + src
  const source = asset.url || asset.src;
  if (!source) return null;

  const isVideo = source.endsWith(".mp4") || source.endsWith(".webm");

  if (isVideo) {
    return <video src={source} muted className="h-full w-full object-cover" />;
  }

  return <img src={source} draggable={false} className="h-full w-full object-cover" />;
}
