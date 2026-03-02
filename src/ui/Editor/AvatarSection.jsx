import React from "react";
import { useProjectStore } from "../../store/useProjectStore";

export default function AvatarSection() {
  const project = useProjectStore((s) => s.project);
  const updateProjectMeta =
    useProjectStore((s) => s.updateProjectMeta);

  if (!project) return null;

  const avatar = project.avatar || {
    src: null,
    object_fit: "cover",
  };

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);

    updateProjectMeta({
      avatar: {
        ...avatar,
        src: url,
      },
    });
  };

  const removeAvatar = () => {
    if (avatar?.src) {
      URL.revokeObjectURL(avatar.src);
    }

    updateProjectMeta({
      avatar: {
        ...avatar,
        src: null,
      },
    });
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
    <div className="w-[50%] min-w-[320px] overflow-y-auto border-r border-gray-200 bg-white px-6 py-4 rounded-xl">
      <h3 className="mb-6 text-lg font-semibold">
        Talking Head Video
      </h3>

      <input
        type="file"
        accept="video/*"
        onChange={handleUpload}
        className="mb-6"
      />

      {avatar.src && (
        <>
          {/* Preview */}
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

          {/* Object Fit */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-600 uppercase mb-2">
              Object Fit
            </h4>

            <select
              value={avatar.object_fit || "cover"}
              onChange={(e) =>
                updateFit(e.target.value)
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="cover">
                Cover
              </option>
              <option value="contain">
                Contain
              </option>
            </select>
          </div>

          <button
            onClick={removeAvatar}
            className="text-sm text-red-600"
          >
            Remove Avatar
          </button>
        </>
      )}
    </div>
  );
}