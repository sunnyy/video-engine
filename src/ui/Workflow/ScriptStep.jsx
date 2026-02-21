import React, { useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { updateProject } from "../../services/projects/projectService";
import { useParams } from "react-router-dom";
import { normalizeBeats } from "../../normalize/normalizeBeats";
import { calculateTimeline } from "../../core/calculateTimeline";

export default function ScriptStep() {
  const { id } = useParams();
  const project = useProjectStore((s) => s.project);
  const setProject = useProjectStore((s) => s.setProject);

  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(project.script.text);

  const handleContinue = async () => {
    const lines = text.split("\n").filter((l) => l.trim() !== "");

    const rawBeats = lines.map((line, index) => ({
      order: index,
      beat_type: "default",
      visual_mode: project.meta.mode === "talking_head" ? "split" : "full",

      // 🔥 ADD THIS
      content_type: project.meta.mode === "talking_head" ? "avatar" : "asset",

      duration_sec: 3,
      spoken: line,
      visible: true,
      assets: { main: null, secondary: null },
      caption: {
        show: true,
        style: "clean",
        position: "bottom",
        animation: "fade",
      },
      transition: { type: "cut", duration: 0.3 },
      components: [],
    }));

    // ✅ Normalize here
    const normalizedBeats = normalizeBeats(rawBeats, project.meta);

    const updated = {
      ...project,
      script: {
        text,
        structured_lines: rawBeats,
      },
      workflow: {
        ...project.workflow,
        script_completed: true,
        beats_initialized: true,
      },
      beats: normalizedBeats,
    };

    const finalProject = calculateTimeline(updated);

    setProject(finalProject);
    await updateProject(id, finalProject);
  };

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6">
      <h2 className="text-xl font-semibold">Review Script</h2>

      <textarea
        value={text}
        readOnly={!editing}
        onChange={(e) => setText(e.target.value)}
        className="h-[300px] w-[600px] rounded border p-4 text-lg"
      />

      <div className="flex gap-4">
        <button onClick={() => navigator.clipboard.writeText(text)} className="rounded bg-gray-200 px-4 py-2">
          Copy
        </button>

        <button onClick={() => setEditing(true)} className="rounded bg-gray-200 px-4 py-2">
          Edit
        </button>

        <button onClick={handleContinue} className="rounded bg-black px-6 py-2 text-white">
          Continue
        </button>
      </div>
    </div>
  );
}
