import React, { useState } from "react";
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

/* ── Delete beat modal ── */
function DeleteBeatModal({ beat, warnings = [], onConfirm, onCancel }) {
  const isTts    = warnings.includes("tts");
  const isAvatar = warnings.includes("avatar");
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}
    >
      <div
        className="relative w-[380px] rounded-[16px] border p-6 flex flex-col gap-4"
        style={{
          background: "#16162a",
          borderColor: "rgba(248,113,113,0.3)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(248,113,113,0.1)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Icon + title */}
        <div className="flex items-center gap-3">
          <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0"
            style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}>
            <span style={{ fontSize: 18 }}>🗑️</span>
          </div>
          <div>
            <div className="text-[15px] font-bold text-[#f0e0e0]">Delete beat?</div>
            <div className="text-[11px] text-[#7070a0] font-mono mt-[2px]">This cannot be undone</div>
          </div>
        </div>

        {/* Beat info */}
        <div className="px-3 py-[10px] rounded-[10px] flex flex-col gap-[4px]"
          style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.12)" }}>
          {beat.spoken && (
            <div className="text-[12px] text-[#c0c0d8] leading-relaxed line-clamp-2">
              "{beat.spoken}"
            </div>
          )}
          <div className="flex items-center gap-2 mt-[2px]">
            <span className="text-[10px] font-mono text-[#55556a]">{beat.layout}</span>
            <span className="text-[10px] font-mono text-[#55556a]">·</span>
            <span className="text-[10px] font-mono text-[#55556a]">{Number(beat.duration_sec || 0).toFixed(1)}s</span>
          </div>
        </div>

        {/* Sync warnings */}
        {(isTts || isAvatar) && (
          <div className="flex flex-col gap-2">
            {isTts && (
              <div className="flex gap-3 px-3 py-[10px] rounded-[10px]"
                style={{ background: "rgba(251,146,60,0.07)", border: "1px solid rgba(251,146,60,0.15)" }}>
                <span className="text-[15px] shrink-0 mt-[1px]">🎙️</span>
                <div>
                  <div className="text-[12px] font-bold text-[#fbbf80] mb-[2px]">Voiceover will desync</div>
                  <div className="text-[11px] text-[#9090b0] leading-relaxed">
                    Deleting this beat will shift all TTS audio timing. Regenerate voiceover after to restore sync.
                  </div>
                </div>
              </div>
            )}
            {isAvatar && (
              <div className="flex gap-3 px-3 py-[10px] rounded-[10px]"
                style={{ background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.15)" }}>
                <span className="text-[15px] shrink-0 mt-[1px]">🎥</span>
                <div>
                  <div className="text-[12px] font-bold text-[#c4b5fd] mb-[2px]">Avatar video will break</div>
                  <div className="text-[11px] text-[#9090b0] leading-relaxed">
                    Removing a beat will shift the avatar video out of sync with the remaining audio.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-[9px] rounded-[9px] text-[13px] font-bold border cursor-pointer transition-all"
            style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#7070a0" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-[9px] rounded-[9px] text-[13px] font-bold border cursor-pointer transition-all"
            style={{ background: "rgba(248,113,113,0.15)", borderColor: "rgba(248,113,113,0.35)", color: "#f87171" }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Duplicate warning modal ── */
function DuplicateWarnModal({ warnings, onConfirm, onCancel }) {
  const isTts    = warnings.includes("tts");
  const isAvatar = warnings.includes("avatar");

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}
    >
      <div
        className="relative w-[380px] rounded-[16px] border p-6 flex flex-col gap-4"
        style={{
          background: "#16162a",
          borderColor: "rgba(251,146,60,0.3)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(251,146,60,0.1)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Icon + title */}
        <div className="flex items-center gap-3">
          <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0"
            style={{ background: "rgba(251,146,60,0.12)", border: "1px solid rgba(251,146,60,0.25)" }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
          </div>
          <div>
            <div className="text-[15px] font-bold text-[#f0e8d8]">Sync will break</div>
            <div className="text-[11px] text-[#7070a0] font-mono mt-[2px]">Heads up before duplicating</div>
          </div>
        </div>

        {/* Warning items */}
        <div className="flex flex-col gap-2">
          {isTts && (
            <div className="flex gap-3 px-3 py-[10px] rounded-[10px]"
              style={{ background: "rgba(251,146,60,0.07)", border: "1px solid rgba(251,146,60,0.15)" }}>
              <span className="text-[16px] shrink-0 mt-[1px]">🎙️</span>
              <div>
                <div className="text-[12px] font-bold text-[#fbbf80] mb-[2px]">Voiceover will desync</div>
                <div className="text-[11px] text-[#9090b0] leading-relaxed">
                  Your TTS audio was generated for the current beat order. After duplicating, regenerate voiceover to restore sync.
                </div>
              </div>
            </div>
          )}
          {isAvatar && (
            <div className="flex gap-3 px-3 py-[10px] rounded-[10px]"
              style={{ background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.15)" }}>
              <span className="text-[16px] shrink-0 mt-[1px]">🎥</span>
              <div>
                <div className="text-[12px] font-bold text-[#c4b5fd] mb-[2px]">Avatar video will break</div>
                <div className="text-[11px] text-[#9090b0] leading-relaxed">
                  The duplicated beat will show the avatar video out of sequence with the original audio track.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-[9px] rounded-[9px] text-[13px] font-bold border cursor-pointer transition-all"
            style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#7070a0" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-[9px] rounded-[9px] text-[13px] font-bold border cursor-pointer transition-all"
            style={{ background: "rgba(251,146,60,0.15)", borderColor: "rgba(251,146,60,0.35)", color: "#fbbf80" }}
          >
            Duplicate anyway
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BeatList({ setActiveTab }) {
  const project = useProjectStore((s) => s.project);
  const activeBeatId = useProjectStore((s) => s.activeBeatId);
  const setActiveBeat = useProjectStore((s) => s.setActiveBeat);
  const reorderBeats = useProjectStore((s) => s.reorderBeats);
  const deleteBeat = useProjectStore((s) => s.deleteBeat);
  const duplicateBeat = useProjectStore((s) => s.duplicateBeat);
  const [dupWarn, setDupWarn]     = useState(null); // { beatId, warnings: [] }
  const [deleteTarget, setDeleteTarget] = useState(null); // { beat, warnings: [] }

  if (!project) return null;

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = project.beats.findIndex((b) => b.id === active.id);
    const newIndex = project.beats.findIndex((b) => b.id === over.id);

    reorderBeats(arrayMove(project.beats, oldIndex, newIndex));
  };

  return (
    <div className="h-full overflow-y-auto bg-[#111118] border-r border-[rgba(255,255,255,0.06)] px-2 py-4 flex flex-col">

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
                setActiveTab={setActiveTab}
                onDeleteRequest={setDeleteTarget}
                onDuplicateRequest={setDupWarn}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {deleteTarget && (
        <DeleteBeatModal
          beat={deleteTarget.beat}
          warnings={deleteTarget.warnings}
          onConfirm={() => { deleteBeat(deleteTarget.beat.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {dupWarn && (
        <DuplicateWarnModal
          warnings={dupWarn.warnings}
          onConfirm={() => { duplicateBeat(dupWarn.beatId); setDupWarn(null); }}
          onCancel={() => setDupWarn(null)}
        />
      )}

    </div>
  );
}

function SortableBeat({
  beat, index, activeBeatId, setActiveBeat, setActiveTab,
  onDeleteRequest, onDuplicateRequest,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: beat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isActive = beat.id === activeBeatId;

  const duration = Number(beat.duration_sec || 0).toFixed(1);

  const handleClick = () => {
    const { seekToBeat } = useProjectStore.getState();
    if (seekToBeat) seekToBeat(beat.id);
    setActiveBeat(beat.id);
    if (setActiveTab) setActiveTab("beats");
  };

  const handleDelete = () => {
    const { project } = useProjectStore.getState();
    const warnings = [];
    if (project?.audio?.tts?.src) warnings.push("tts");
    if (project?.avatar?.src && project?.meta?.mode === "talking_head") warnings.push("avatar");
    onDeleteRequest({ beat, warnings });
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
        <Thumbnail beat={beat} />
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
            const { project } = useProjectStore.getState();
            const warnings = [];
            if (project?.audio?.tts?.src) warnings.push("tts");
            if (project?.avatar?.src && project?.meta?.mode === "talking_head") warnings.push("avatar");
            if (warnings.length > 0) {
              onDuplicateRequest({ beatId: beat.id, warnings });
            } else {
              const { duplicateBeat } = useProjectStore.getState();
              duplicateBeat(beat.id);
            }
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

function Thumbnail({ beat }) {
  // Find first zone with real content
  const zones = beat?.zones || {};
  const layoutBg = beat?.layoutBackground;

  // Search all zones for first image or video asset
  let src = null;
  let isVideo = false;

  for (const zone of Object.values(zones)) {
    const content = zone.content || {};
    const bg      = zone.background || {};

    if (content.kind === "asset" && content.asset?.src) {
      src = content.asset.src;
      isVideo = src.endsWith(".mp4") || src.endsWith(".webm") || content.asset.type === "video";
      break;
    }
    if (bg.kind === "asset" && bg.asset?.src) {
      src = bg.asset.src;
      isVideo = src.endsWith(".mp4") || src.endsWith(".webm") || bg.asset.type === "video";
      break;
    }
  }

  // Fall back to layoutBackground
  if (!src && layoutBg) {
    if (layoutBg.type === "color" || layoutBg.type === "gradient") {
      return <div className="h-full w-full" style={{ background: layoutBg.value }} />;
    }
    if (layoutBg.type === "image" || layoutBg.type === "video") {
      src = layoutBg.value;
      isVideo = layoutBg.type === "video";
    }
  }

  if (!src) {
    // Show layout label as colored block
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#1c1c28]">
        <span style={{ fontSize: 8, color: "#55556a", fontFamily: "monospace" }}>
          {beat?.layout?.slice(0, 6)}
        </span>
      </div>
    );
  }

  if (isVideo) {
    return (
      <video
        src={src} muted playsInline preload="metadata"
        className="h-full w-full object-cover"
        onLoadedMetadata={e => { e.target.currentTime = 0.5; }}
      />
    );
  }

  return <img src={src} draggable={false} className="h-full w-full object-cover" />;
}