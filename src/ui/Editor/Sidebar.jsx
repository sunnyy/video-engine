import React from "react";
import { useProjectStore } from "../../store/useProjectStore";

export default function Sidebar({ activeTab, setActiveTab }) {
  const project = useProjectStore((s) => s.project);

  if (!project) return null;

  const isTalkingHead = project.meta.mode === "talking_head";

  return (
    <div className="w-full border-r border-gray-200 bg-white p-4 flex justify-center gap-3">
      <button
        onClick={() => setActiveTab("beats")}
        className={`text-left text-base px-4 py-1 rounded ${
          activeTab === "beats" ? "bg-indigo-100 text-indigo-600" : "hover:bg-gray-100"
        }`}
      >
        Beats
      </button>

      {isTalkingHead && (
        <button
          onClick={() => setActiveTab("avatar")}
          className={`text-left text-base px-3 py-2 rounded ${
            activeTab === "avatar" ? "bg-indigo-100 text-indigo-600" : "hover:bg-gray-100"
          }`}
        >
          Video
        </button>
      )}

      <button
        onClick={() => setActiveTab("audio")}
        className={`text-left text-base px-3 py-2 rounded ${
          activeTab === "audio" ? "bg-indigo-100 text-indigo-600" : "hover:bg-gray-100"
        }`}
      >
        Audio
      </button>
    </div>
  );
}
