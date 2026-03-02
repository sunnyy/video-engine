import React from "react";
import BeatList from "./BeatList";
import BeatEditor from "./BeatEditor";
import MusicSection from "./MusicSection";
import AvatarSection from "./AvatarSection";

export default function EditorPanel({ activeTab }) {
  if (activeTab === "audio") {
    return <MusicSection />;
  }

  if (activeTab === "avatar") {
    return <AvatarSection />;
  }

  return (
    <div className="flex-1 flex w-full">
      <BeatList />
      <BeatEditor />
    </div>
  );
}
