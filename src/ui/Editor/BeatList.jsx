import React from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useProjectStore } from "../../store/useProjectStore";

export default function BeatList() {

  const project = useProjectStore((s)=>s.project);
  const activeBeatId = useProjectStore((s)=>s.activeBeatId);
  const setActiveBeat = useProjectStore((s)=>s.setActiveBeat);
  const reorderBeats = useProjectStore((s)=>s.reorderBeats);
  const deleteBeat = useProjectStore((s)=>s.deleteBeat);
  const duplicateBeat = useProjectStore((s)=>s.duplicateBeat);

  if (!project) return null;

  const handleDragEnd = (event) => {

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = project.beats.findIndex((b)=>b.id===active.id);
    const newIndex = project.beats.findIndex((b)=>b.id===over.id);

    const newBeats = arrayMove(project.beats,oldIndex,newIndex);

    reorderBeats(newBeats);

  };

  return (

    <div className="w-[30%] overflow-y-auto bg-white px-2 py-4 rounded-xl">

      <h3 className="m-0 text-lg font-semibold mb-4">
        Beats
      </h3>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>

        <SortableContext
          items={project.beats.map((b)=>b.id)}
          strategy={verticalListSortingStrategy}
        >

          <div className="space-y-3">

            {project.beats.map((beat,index)=>(
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
  duplicateBeat
}) {

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id:beat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const isActive = beat.id === activeBeatId;

  const zone = beat.zones?.z1 || beat.zones?.z2 || beat.zones?.z3 || null;

  const handleDelete = () => {

    const confirmed = window.confirm("Delete this beat?");
    if (!confirmed) return;

    deleteBeat(beat.id);

  };

  const duration = Number(beat.duration_sec || 0).toFixed(1);

  return (

    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 rounded-lg border p-2 transition select-none
        ${isActive ? "border-indigo-600 bg-indigo-50" : "border-gray-200 hover:border-gray-300"}
      `}
    >

      <div {...attributes} {...listeners} className="cursor-grab text-gray-400 active:cursor-grabbing">
        ☰
      </div>

      <div
        onClick={()=>{

          const { seekToBeat } = useProjectStore.getState();
          if (seekToBeat) seekToBeat(beat.id);

          setActiveBeat(beat.id);

        }}
        className="h-[60px] w-[50px] min-w-[50px] overflow-hidden rounded-md border bg-gray-100 cursor-pointer"
      >
        <Thumbnail zone={zone} />
      </div>

      <div
        onClick={()=>{

          const { seekToBeat } = useProjectStore.getState();
          if (seekToBeat) seekToBeat(beat.id);

          setActiveBeat(beat.id);

        }}
        className="flex flex-1 flex-col cursor-pointer"
      >

        <div className="flex items-center justify-between text-sm font-medium">
          <span className="line-clamp-2 text-left">
            {beat.spoken}
          </span>
        </div>

        <div className="flex gap-2">

          <span className="text-xs bg-gray-100 font-medium text-black px-2 py-[2px]">
            {duration}s
          </span>

          <div className="text-xs bg-blue-100 font-medium text-black px-2 py-[2px]">
            {beat.layout}
          </div>

        </div>

      </div>

      <div className="flex flex-col gap-1">

        <button
          onClick={()=>duplicateBeat(beat.id)}
          className="text-xs text-gray-400 hover:text-blue-500"
        >
          ⧉
        </button>

        <button
          onClick={handleDelete}
          className="text-xs text-gray-400 hover:text-red-500"
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

    if (isVideo) {
      return <video src={src} muted className="h-full w-full object-cover" />;
    }

    return <img src={src} draggable={false} className="h-full w-full object-cover" />;

  }

  if (bg.kind === "asset") {

    const src = bg.asset?.src;
    if (!src) return null;

    const isVideo = src.endsWith(".mp4") || src.endsWith(".webm");

    if (isVideo) {
      return <video src={src} muted className="h-full w-full object-cover" />;
    }

    return <img src={src} draggable={false} className="h-full w-full object-cover" />;

  }

  if (bg.kind === "color") {

    return (
      <div
        className="h-full w-full"
        style={{ background:bg.color }}
      />
    );

  }

  return null;

}