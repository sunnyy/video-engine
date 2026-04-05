/**
 * EditorPanel.jsx
 * src/ui/Editor/EditorPanel.jsx
 */
import React from "react";
import BeatEditor         from "./BeatEditor";
import AudioSection       from "./AudioSection";
import AvatarSection      from "./AvatarSection";
import VideoOverlaySection from "./VideoOverlaySection";
import BrandingSection    from "./BrandingSection";

export default function EditorPanel({
  activeTab, setActiveTab,
  selectedZoneId, selectedZoneIds, onSelectZone,
}) {
  // When a zone is selected from canvas, switch to beats tab so ZonesSection is visible
  const handleSelectZone = (id, modifierHeld) => {
    if (id !== null) setActiveTab("beats");
    onSelectZone(id, modifierHeld);
  };

  if (activeTab === "audio") {
    return (
      <div className="flex-1 flex flex-col h-full min-h-0">
        <AudioSection />
      </div>
    );
  }

  if (activeTab === "avatar") {
    return (
      <div className="flex-1 flex flex-col h-full min-h-0">
        <AvatarSection />
      </div>
    );
  }

  if (activeTab === "videoOverlays") {
    return (
      <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto bg-[#0b0b10] px-5 py-5">
        <VideoOverlaySection />
      </div>
    );
  }

  if (activeTab === "branding") {
    return (
      <div className="flex-1 flex flex-col h-full min-h-0">
        <BrandingSection />
      </div>
    );
  }

  // Default: beats tab — shows BeatEditor with zones, captions, etc.
  return (
    <div className="flex-1  flex flex-col h-full min-h-0">
      <div className="flex-1 flex min-h-0">
        <BeatEditor
          selectedZoneId={selectedZoneId}
          selectedZoneIds={selectedZoneIds}
          onSelectZone={handleSelectZone}
          setActiveTab={setActiveTab}
        />
      </div>
    </div>
  );
}