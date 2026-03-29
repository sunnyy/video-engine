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
      <div className="w-full h-[4px] bg-[#1c1c28] rounded overflow-hidden mb-3">
        <div
          className="h-full bg-[#7c5cfc] transition-all"
          style={{ width: `${progress[type]}%` }}
        />
      </div>
    );

  };

  return (

    <div className="w-[50%] overflow-y-auto border-r border-[rgba(255,255,255,0.06)] bg-[#0b0b10] px-6 py-5">

      <h3
        className="mb-6 text-[15px] font-bold text-[#e8e8f0]"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        Video Audio
      </h3>

      {/* TTS */}

      <div className="mb-10">

        <h4 className="text-[12px] uppercase tracking-[0.08em] text-[#9494a8] mb-2">
          Voice / TTS
        </h4>

        <input
          ref={ttsRef}
          type="file"
          accept="audio/*"
          onChange={(e) => uploadAudio(e.target.files?.[0], "tts")}
          className="text-[12px] text-[#9494a8] mb-2"
        />

        {renderProgress("tts")}

        {audio?.tts?.src && (

          <>

            <div className="text-[11px] text-[#55556a] mb-1">
              Volume
            </div>

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
              className="text-[12px] text-[#f87171]"
            >
              Remove Voice
            </button>

          </>

        )}

      </div>

      {/* MUSIC */}

      <div>

        <h4 className="text-[12px] uppercase tracking-[0.08em] text-[#9494a8] mb-2">
          Background Music
        </h4>

        <input
          ref={musicRef}
          type="file"
          accept="audio/*"
          onChange={(e) => uploadAudio(e.target.files?.[0], "music")}
          className="text-[12px] text-[#9494a8] mb-2"
        />

        {renderProgress("music")}

        {audio?.music?.src && (

          <>

            <div className="text-[11px] text-[#55556a] mb-1">
              Volume
            </div>

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
              className="text-[12px] text-[#f87171]"
            >
              Remove Music
            </button>

          </>

        )}

      </div>

    </div>

  );

}