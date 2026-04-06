/**
 * EditorPanel.jsx
 * src/ui/Editor/EditorPanel.jsx
 */
import BeatEditor          from "./BeatEditor";
import AudioSection        from "./AudioSection";
import AvatarSection       from "./AvatarSection";
import VideoOverlaySection from "./VideoOverlaySection";
import BrandingSection     from "./BrandingSection";
import FilesSection        from "./FilesSection";
import MyRulesSection      from "./MyRulesSection";

export default function EditorPanel({
  activeTab, setActiveTab,
  selectedZoneId, selectedZoneIds, onSelectZone,
}) {
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

  if (activeTab === "files") {
    return (
      <div className="flex-1 flex flex-col h-full min-h-0">
        <FilesSection />
      </div>
    );
  }

  if (activeTab === "myRules") {
    return (
      <div className="flex-1 flex flex-col h-full min-h-0">
        <MyRulesSection />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
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
