import React from "react";
import { useProjectStore } from "../../store/useProjectStore";

export default function MusicSection() {
  const project = useProjectStore((s) => s.project);
  const updateProjectMeta = useProjectStore(
    (s) => s.updateProjectMeta
  );

  if (!project) return null;

  const music = project.music || {
    src: null,
    volume: 0.8,
  };

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);

    updateProjectMeta({
      music: {
        ...music,
        src: url,
      },
    });
  };

  const removeMusic = () => {
    updateProjectMeta({
      music: {
        ...music,
        src: null,
      },
    });
  };

  return (
    <div className="w-[50%] min-w-[320px] overflow-y-auto border-r border-gray-200 bg-white px-6 py-4 rounded-xl">
      <h3 className="mb-6 text-lg font-semibold">
        Background Music
      </h3>

      <input
        type="file"
        accept="audio/*"
        onChange={handleUpload}
        className="mb-4"
      />

      {music.src && (
        <>
          <div className="mb-2 text-xs text-gray-500">
            Volume
          </div>

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={music.volume}
            onChange={(e) =>
              updateProjectMeta({
                music: {
                  ...music,
                  volume: Number(e.target.value),
                },
              })
            }
            className="w-full mb-4"
          />

          <button
            onClick={removeMusic}
            className="text-sm text-red-600"
          >
            Remove Music
          </button>
        </>
      )}
    </div>
  );
}