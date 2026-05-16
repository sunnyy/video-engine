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

      if (e.code === "Space") {
        e.preventDefault();
        useTimelineStore.getState().setIsPlaying(
          !useTimelineStore.getState().isPlaying
        );
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        useTimelineStore
          .getState()
          .setCurrentTime(useTimelineStore.getState().currentTime - 1);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        useTimelineStore
          .getState()
          .setCurrentTime(useTimelineStore.getState().currentTime + 1);
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === "KeyZ") {
        e.preventDefault();
        useTimelineStore.getState().undo();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyZ") {
        e.preventDefault();
        useTimelineStore.getState().redo();
      } else if (e.code === "Delete" || e.code === "Backspace") {
        const { selectedLayerId } = useTimelineStore.getState();
        if (selectedLayerId) {
          e.preventDefault();
          useTimelineStore.getState().removeLayer(selectedLayerId);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.code === "KeyD") {
        const { selectedLayerId } = useTimelineStore.getState();
        if (selectedLayerId) {
          e.preventDefault();
          useTimelineStore.getState().duplicateLayer(selectedLayerId);
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
