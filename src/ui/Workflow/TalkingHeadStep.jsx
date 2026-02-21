import React, { useRef } from "react";
import { useParams } from "react-router-dom";
import { useProjectStore } from "../../store/useProjectStore";
import { updateProject } from "../../services/projects/projectService";

export default function TalkingHeadStep() {
  const { id } = useParams();
  const project = useProjectStore((s) => s.project);
  const setProject = useProjectStore((s) => s.setProject);

  const fileRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // TEMP: local URL (we connect Supabase storage next)
    const url = URL.createObjectURL(file);

    const updated = {
      ...project,
      avatar: {
        src: url,
        duration_sec: 60,
        speed: 1,
      },
      workflow: {
        ...project.workflow,
        avatar_completed: true,
      },
    };

    setProject(updated);
    await updateProject(id, updated);
  };

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6">
      <h2 className="text-xl font-semibold">
        Upload Talking Head Video
      </h2>

      <div className="w-[600px] rounded border p-4 bg-white">
        <div className="mb-4 text-gray-600 text-sm">
          Record a video using this script. Then upload it here.
        </div>

        <button
          onClick={() => fileRef.current.click()}
          className="rounded bg-black px-6 py-3 text-white"
        >
          Upload Video
        </button>

        <input
          type="file"
          accept="video/*"
          ref={fileRef}
          onChange={handleUpload}
          className="hidden"
        />
      </div>
    </div>
  );
}