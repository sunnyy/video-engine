import React from "react";
import Header from "../ui/Editor/Header";
import BeatList from "../ui/Editor/BeatList";
import BeatEditor from "../ui/Editor/BeatEditor";
import Preview from "../ui/Editor/Preview";

export default function Editor() {
  return (
    <div className="flex h-screen w-full flex-col">
      <Header />

      <div className="flex flex-1 overflow-hidden gap-5">
        <BeatList />
        <BeatEditor />

        <div className="flex flex-1 flex-col">
          <Preview />
        </div>
      </div>
    </div>
  );
}