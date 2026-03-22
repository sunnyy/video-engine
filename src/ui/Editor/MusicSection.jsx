import React, { useRef, useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { uploadUserAsset } from "../../services/assets/uploadUserAsset";

export default function MusicSection() {
  const project = useProjectStore((s) => s.project);
  const updateProjectMeta = useProjectStore((s) => s.updateProjectMeta);

  const musicRef = useRef(null);
  const ttsRef = useRef(null);

  const [progress, setProgress] = useState({
    tts: 0,
    music: 0,
  });

  const [uploading, setUploading] = useState({
    tts: false,
    music: false,
  });

  if (!project) return null;

  const audio = project.audio || { tts: null, music: null };

  const uploadAudio = async (file, type) => {
    if (!file) return;

    setUploading((p) => ({ ...p, [type]: true }));
    setProgress((p) => ({ ...p, [type]: 0 }));

    const formData = new FormData();
    formData.append("audio", file);

    const compressedRes = await fetch(
      "http://localhost:5000/api/compress-audio",
      {
        method: "POST",
        body: formData,
      }
    );

    const blob = await compressedRes.blob();

    const compressedFile = new File([blob], "compressed.m4a", {
      type: "audio/mp4",
    });

    const uploaded = await uploadUserAsset(
      compressedFile,
      null,
      (percent) => {
        setProgress((p) => ({
          ...p,
          [type]: percent,
        }));
      }
    );

    const updatedAudio = {
      ...audio,
      [type]: {
        src: uploaded.url,
        volume: type === "music" ? 0.8 : 1,
      },
    };

    updateProjectMeta({
      audio: updatedAudio,
    });

    setUploading((p) => ({ ...p, [type]: false }));
  };

  const removeAudio = (type) => {
    const updatedAudio = {
      ...audio,
      [type]: null,
    };

    updateProjectMeta({ audio: updatedAudio });

    if (type === "music" && musicRef.current) musicRef.current.value = "";
    if (type === "tts" && ttsRef.current) ttsRef.current.value = "";
  };

  const renderProgress = (type) => {
    if (!uploading[type]) return null;

    return (
      <div className="w-full bg-gray-200 h-2 rounded mb-3">
        <div
          className="h-2 bg-indigo-600 rounded transition-all"
          style={{ width: `${progress[type]}%` }}
        />
      </div>
    );
  };

  return (
    <div className="w-[50%] overflow-y-auto border-r border-gray-200 bg-white px-6 py-4 rounded-xl">
      <h3 className="mb-6 text-lg font-semibold">Video Audio</h3>

      {/* TTS */}
      <div className="mb-8">
        <h4 className="text-sm font-semibold mb-2">Voice / TTS</h4>

        <input
          ref={ttsRef}
          type="file"
          accept="audio/*"
          onChange={(e) => uploadAudio(e.target.files?.[0], "tts")}
          className="mb-2"
        />

        {renderProgress("tts")}

        {audio?.tts?.src && (
          <>
            <div className="text-xs text-gray-500 mb-1">Volume</div>

            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={audio.tts.volume}
              onChange={(e) =>
                updateProjectMeta({
                  audio: {
                    ...audio,
                    tts: {
                      ...audio.tts,
                      volume: Number(e.target.value),
                    },
                  },
                })
              }
              className="w-full mb-3"
            />

            <button
              onClick={() => removeAudio("tts")}
              className="text-sm text-red-600"
            >
              Remove Voice
            </button>
          </>
        )}
      </div>

      {/* MUSIC */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Background Music</h4>

        <input
          ref={musicRef}
          type="file"
          accept="audio/*"
          onChange={(e) => uploadAudio(e.target.files?.[0], "music")}
          className="mb-2"
        />

        {renderProgress("music")}

        {audio?.music?.src && (
          <>
            <div className="text-xs text-gray-500 mb-1">Volume</div>

            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={audio.music.volume}
              onChange={(e) =>
                updateProjectMeta({
                  audio: {
                    ...audio,
                    music: {
                      ...audio.music,
                      volume: Number(e.target.value),
                    },
                  },
                })
              }
              className="w-full mb-3"
            />

            <button
              onClick={() => removeAudio("music")}
              className="text-sm text-red-600"
            >
              Remove Music
            </button>
          </>
        )}
      </div>
    </div>
  );
}