/**
 * AvatarSection.jsx
 * src/ui/Editor/AvatarSection.jsx
 *
 * Upload and manage the talking head video. Nothing else.
 */
import React, { useState, useRef, useCallback } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { uploadUserAsset } from "../../services/assets/uploadUserAsset";

function Label({ children }) {
  return (
    <div className="text-[10px] font-bold tracking-widest uppercase text-[#7070a0] mb-[6px]"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {children}
    </div>
  );
}

function PillBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-[7px] rounded-[7px] text-[12px] font-bold border cursor-pointer transition-all"
      style={active
        ? { background: "rgba(124,92,252,0.18)", borderColor: "#7c5cfc", color: "#c4b5fd" }
        : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)", color: "#7070a0" }}
    >
      {children}
    </button>
  );
}

export default function AvatarSection() {
  const project           = useProjectStore((s) => s.project);
  const updateProjectMeta = useProjectStore((s) => s.updateProjectMeta);

  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [error,     setError]     = useState("");
  const [dragging,  setDragging]  = useState(false);

  const fileInputRef = useRef();

  if (!project) return null;

  const avatar = project.avatar || null;
  const mode   = project.meta?.mode || "faceless";

  const doUpload = useCallback(async (file) => {
    if (!file || !file.type.startsWith("video/")) {
      setError("Please select a video file.");
      return;
    }
    setError("");
    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("video", file);
      const compressedRes = await fetch("http://localhost:5000/api/compress", {
        method: "POST", body: formData,
      });
      if (!compressedRes.ok) throw new Error("Compression failed");
      const blob = await compressedRes.blob();
      const compressedFile = new File([blob], "avatar.mp4", { type: "video/mp4" });

      const uploaded = await uploadUserAsset(compressedFile, "avatar", (pct) => setProgress(pct));
      updateProjectMeta({
        avatar: { src: uploaded.url, objectFit: avatar?.objectFit || "cover" },
      });
    } catch (e) {
      setError(e.message || "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [avatar, updateProjectMeta]);

  const handleFileChange = (e) => doUpload(e.target.files?.[0]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    doUpload(e.dataTransfer.files?.[0]);
  }, [doUpload]);

  const removeAvatar  = () => updateProjectMeta({ avatar: null });
  const updateFit     = (fit) => updateProjectMeta({ avatar: { ...avatar, objectFit: fit } });

  return (
    <div className="flex flex-col gap-5 p-4 overflow-y-auto h-full">

      {/* Header */}
      <div>
        <div className="text-[15px] font-bold text-[#e8e8f0] mb-[2px]"
          style={{ fontFamily: "'Syne', sans-serif" }}>
          Talking Head
        </div>
        <div className="text-[12px] text-[#55556a]">
          Upload your video · Switch zones per-beat in the zone editor
        </div>
      </div>

      {/* Mode notice */}
      {mode !== "talking_head" && (
        <div className="flex items-start gap-2 px-3 py-[10px] rounded-[8px]"
          style={{ background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.2)" }}>
          <span className="text-[13px] shrink-0 mt-px">⚠</span>
          <div>
            <div className="text-[12px] font-semibold text-[#fb923c] mb-[2px]">Mode is set to Faceless</div>
            <div className="text-[11px] text-[#9494a8] leading-relaxed">
              Switch to Talking Head in Branding → Settings to activate the avatar video.
            </div>
          </div>
        </div>
      )}

      {/* Drop zone / upload */}
      {!avatar?.src ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          className="flex flex-col items-center justify-center gap-3 rounded-[12px] cursor-pointer transition-all select-none"
          style={{
            border: `1.5px dashed ${dragging ? "#7c5cfc" : "rgba(255,255,255,0.12)"}`,
            background: dragging ? "rgba(124,92,252,0.06)" : "rgba(255,255,255,0.02)",
            padding: "36px 20px",
          }}
        >
          <div className="w-[48px] h-[48px] rounded-full flex items-center justify-center"
            style={{ background: "rgba(124,92,252,0.12)", border: "1px solid rgba(124,92,252,0.25)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
                stroke="#7c5cfc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="text-center">
            <div className="text-[13px] font-semibold text-[#e8e8f0] mb-[2px]">
              {dragging ? "Drop to upload" : "Upload talking head video"}
            </div>
            <div className="text-[11px] text-[#55556a]">MP4, MOV, WebM · auto-compressed on upload</div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Preview */}
          <div className="relative rounded-[10px] overflow-hidden"
            style={{ background: "#000", border: "1px solid rgba(255,255,255,0.08)" }}>
            <video
              src={avatar.src}
              controls
              playsInline
              style={{ width: "100%", maxHeight: 260, objectFit: avatar.objectFit || "cover", display: "block" }}
            />
            <button
              onClick={removeAvatar}
              title="Remove video"
              className="absolute top-2 right-2 w-[26px] h-[26px] rounded-full flex items-center justify-center border-0 cursor-pointer transition-all text-[12px]"
              style={{ background: "rgba(0,0,0,0.75)", color: "#f87171" }}
            >
              ✕
            </button>
          </div>

          {/* Fit */}
          <div>
            <Label>Fit in zone</Label>
            <div className="flex gap-[5px]">
              <PillBtn active={avatar.objectFit === "cover"}   onClick={() => updateFit("cover")}>Cover</PillBtn>
              <PillBtn active={avatar.objectFit === "contain"} onClick={() => updateFit("contain")}>Contain</PillBtn>
              <PillBtn active={avatar.objectFit === "fill"}    onClick={() => updateFit("fill")}>Fill</PillBtn>
            </div>
          </div>

          {/* Replace link */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-[11px] font-mono text-[#7070a0] hover:text-[#a78bfa] bg-transparent border-0 cursor-pointer text-left transition-colors"
          >
            ↑ Replace video
          </button>
        </div>
      )}

      {/* Progress */}
      {uploading && (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <span className="text-[11px] font-mono text-[#7070a0]">Uploading…</span>
            <span className="text-[11px] font-mono text-[#7c5cfc]">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-[3px] rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: "#7c5cfc" }} />
          </div>
        </div>
      )}

      {error && (
        <div className="text-[12px] text-[#f87171] px-3 py-2 rounded-[6px]"
          style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
          {error}
        </div>
      )}

      {/* Hint when video is uploaded */}
      {avatar?.src && (
        <div className="text-[11px] font-mono text-[#55556a] leading-relaxed px-1">
          Select an asset zone in the canvas, then switch it to <span className="text-[#a78bfa]">Avatar</span> in the zone editor to show your face on that beat.
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
    </div>
  );
}
