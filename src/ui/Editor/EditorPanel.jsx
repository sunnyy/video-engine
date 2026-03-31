import React from "react";
import BeatList from "./BeatList";
import BeatEditor from "./BeatEditor";
import AudioSection from "./AudioSection";
import AvatarSection from "./AvatarSection";
import VideoOverlaySection from "./VideoOverlaySection";

export default function EditorPanel({ activeTab }) {

  if (activeTab === "audio") {
    return <AudioSection />;
  }

  if (activeTab === "avatar") {
    return <AvatarSection />;
  }

  if (activeTab === "videoOverlays") {
    return <VideoOverlaySection />;
  }

  return (
    <div className="flex-1 flex w-full bg-[#0b0b10]">
      <BeatList />
      <BeatEditor />
    </div>
  );
}