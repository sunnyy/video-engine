import { useEffect } from "react";
import { useTimelineStore } from "../../store/useTimelineStore";
import TopBar from "./TopBar";
import LeftPanel from "./LeftPanel";
import Preview from "./Preview";
import PropertiesPanel from "./PropertiesPanel";
import TimelineToolbar from "./TimelineToolbar";
import Timeline from "./Timeline";

export default function TimelineEditor() {
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      // Undo / redo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === "KeyZ") {
        e.preventDefault();
        useTimelineStore.getState().undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.shiftKey && e.code === "KeyZ" || e.code === "KeyY")) {
        e.preventDefault();
        useTimelineStore.getState().redo();
        return;
      }

      // Escape — deselect
      if (e.code === "Escape") {
        useTimelineStore.getState().selectLayer(null);
        return;
      }

      // Delete / Backspace — remove selected layer
      if (e.code === "Delete" || e.code === "Backspace") {
        const { selectedLayerId } = useTimelineStore.getState();
        if (selectedLayerId) {
          e.preventDefault();
          useTimelineStore.getState().removeLayer(selectedLayerId);
        }
        return;
      }

      // Ctrl+D — duplicate
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyD") {
        const { selectedLayerId } = useTimelineStore.getState();
        if (selectedLayerId) {
          e.preventDefault();
          useTimelineStore.getState().duplicateLayer(selectedLayerId);
        }
        return;
      }

      // Ctrl+] / Ctrl+[ — z-order
      if ((e.ctrlKey || e.metaKey) && e.code === "BracketRight") {
        const { selectedLayerId } = useTimelineStore.getState();
        if (selectedLayerId) { e.preventDefault(); useTimelineStore.getState().bringForward(selectedLayerId); }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.code === "BracketLeft") {
        const { selectedLayerId } = useTimelineStore.getState();
        if (selectedLayerId) { e.preventDefault(); useTimelineStore.getState().sendBack(selectedLayerId); }
        return;
      }

      // Space — play / pause
      if (e.code === "Space") {
        e.preventDefault();
        const store = useTimelineStore.getState();
        store.setIsPlaying(!store.isPlaying);
        return;
      }

      // Arrow keys — nudge selected layer or seek
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code)) {
        const { selectedLayerId, project } = useTimelineStore.getState();
        if (selectedLayerId) {
          e.preventDefault();
          const layer = project?.layers?.find((l) => l.id === selectedLayerId);
          if (!layer) return;
          const step = e.shiftKey ? 10 : 1;
          const dx = e.code === "ArrowLeft" ? -step : e.code === "ArrowRight" ? step : 0;
          const dy = e.code === "ArrowUp"   ? -step : e.code === "ArrowDown"  ? step : 0;
          const kf = layer.keyframes ?? {};
          const patch = {
            transform: { ...layer.transform, x: (layer.transform?.x ?? 0) + dx, y: (layer.transform?.y ?? 0) + dy },
            keyframes: {
              ...kf,
              ...(dx && kf.x?.length ? { x: kf.x.map((k) => ({ ...k, value: k.value + dx })) } : {}),
              ...(dy && kf.y?.length ? { y: kf.y.map((k) => ({ ...k, value: k.value + dy })) } : {}),
            },
          };
          useTimelineStore.getState().updateLayer(selectedLayerId, patch);
        } else if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
          e.preventDefault();
          const { currentTime } = useTimelineStore.getState();
          const delta = e.shiftKey ? 5 : (e.ctrlKey || e.metaKey) ? 0.5 : 1;
          useTimelineStore.getState().setCurrentTime(
            currentTime + (e.code === "ArrowLeft" ? -delta : delta)
          );
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#0d0d18",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        color: "#e8e8f0",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        fontSize: 14,
      }}
    >
      <TopBar />

      {/* Main body below the top bar */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

        {/* Left column: preview area + timeline stacked vertically */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", minWidth: 0 }}>
          <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
            <LeftPanel />
            <Preview />
          </div>
          <TimelineToolbar />
          <Timeline />
        </div>

        {/* Right column: properties panel, full height */}
        <PropertiesPanel />

      </div>
    </div>
  );
}
