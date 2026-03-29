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

    <div className="flex h-screen items-center justify-center bg-[#0b0b10] text-[#e8e8f0]">

      <div className="w-[640px] rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[#111118] p-8">

        <h2
          className="text-[20px] font-bold mb-4"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          Upload Talking Head Video
        </h2>

        <div className="text-[13px] text-[#9494a8] mb-6">
          Record a video using the generated script, then upload it here.
        </div>

        <button
          onClick={() => fileRef.current.click()}
          className="rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#1c1c28] px-6 py-3 text-[13px] text-[#e8e8f0] hover:border-[#7c5cfc] transition"
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