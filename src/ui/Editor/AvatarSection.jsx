import React, { useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { uploadUserAsset } from "../../services/assets/uploadUserAsset";

export default function AvatarSection() {
  const project = useProjectStore((s) => s.project);
  const updateProjectMeta = useProjectStore((s) => s.updateProjectMeta);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!project) return null;

  const avatar = project.avatar;

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("video", file);

    const compressedRes = await fetch("http://localhost:5000/api/compress", {
      method: "POST",
      body: formData,
    });

    const blob = await compressedRes.blob();

    const compressedFile = new File([blob], "compressed.mp4", {
      type: "video/mp4",
    });

    const uploaded = await uploadUserAsset(
      compressedFile,
      "avatar",
      (percent) => {
        setProgress(percent);
      }
    );

    updateProjectMeta({
      avatar: {
        src: uploaded.url,
        object_fit: avatar?.object_fit || "cover",
      },
    });

    setUploading(false);
    e.target.value = "";
  };

  const removeAvatar = () => {
    updateProjectMeta({ avatar: null });
  };

  const updateFit = (fit) => {
    updateProjectMeta({
      avatar: {
        ...avatar,
        object_fit: fit,
      },
    });
  };

  return (
    <div className="w-full min-w-[320px] overflow-y-auto border-r border-gray-200 bg-white px-6 py-4 rounded-xl">
      <h3 className="mb-6 text-lg font-semibold">Talking Head Video</h3>

      <input type="file" accept="video/*" onChange={handleUpload} className="mb-3" />

      {uploading && (
        <div className="w-full bg-gray-200 h-2 rounded mb-6">
          <div
            className="h-2 bg-indigo-600 rounded transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {avatar?.src && (
        <>
          <div className="mb-6">
            <video
              src={avatar.src}
              controls
              className="w-full rounded-lg bg-black"
              style={{
                objectFit: avatar.object_fit || "cover",
                maxHeight: 500,
              }}
            />
          </div>

          <select
            value={avatar.object_fit || "cover"}
            onChange={(e) => updateFit(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mb-3"
          >
            <option value="cover">Cover</option>
            <option value="contain">Contain</option>
          </select>

          <button onClick={removeAvatar} className="text-sm text-red-600">
            Remove Avatar
          </button>
        </>
      )}
    </div>
  );
}