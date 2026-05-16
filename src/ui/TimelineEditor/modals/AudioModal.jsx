import { useState, useEffect } from "react";
import { useTimelineStore } from "../../../store/useTimelineStore";
import { useAssetsStore } from "../../../store/useAssetsStore";
import { uploadUserAsset } from "../../../services/assets/uploadUserAsset";
import { showToast } from "../../Toast";
import EditorModal from "./EditorModal";
import { pickFile, getFileDuration, makeLayerAt } from "./helpers";

export default function AudioModal({ onClose }) {
  const project     = useTimelineStore((s) => s.project);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const projectId   = useTimelineStore((s) => s.projectId);
  const addLayer    = useTimelineStore((s) => s.addLayer);
  const addPendingFile   = useTimelineStore((s) => s.addPendingFile);
  const clearPendingFile = useTimelineStore((s) => s.clearPendingFile);

  const { myAssets, loadMyAssets } = useAssetsStore();
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if (projectId) loadMyAssets(projectId); }, [projectId]);

  const audioAssets = myAssets.filter((a) => a.type === "audio");

  const handleUpload = async () => {
    const file = await pickFile("audio/*");
    if (!file) return;

    const blobUrl = URL.createObjectURL(file);
    let dur = 10;
    const d = await getFileDuration(file);
    if (d) dur = d;

    const layer = makeLayerAt("audio", project, currentTime, dur, { src: blobUrl, name: file.name });
    addPendingFile(layer.id, file);
    addLayer(layer);
    onClose();

    setUploading(true);
    try {
      const asset = await uploadUserAsset(file, "audio", null, "project", projectId);
      useTimelineStore.getState().updateLayer(layer.id, { src: asset.url });
      useAssetsStore.getState().addMyAsset({
        id: asset.id, url: asset.url, file_path: asset.file_path,
        type: "audio", name: asset.name, size: asset.size ?? 0,
        scope: asset.scope ?? "project", project_id: asset.project_id ?? null,
        orientation: "any", source: "user",
      });
      clearPendingFile(layer.id);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      showToast("Upload failed: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const addAudioLayer = (asset) => {
    const layer = makeLayerAt("audio", project, currentTime, 10, { src: asset.url, name: asset.name });
    addLayer(layer);
    onClose();
  };

  return (
    <EditorModal title="Audio" onClose={onClose} width={500}>
      <button
        onClick={handleUpload}
        disabled={uploading}
        style={{
          width: "100%", marginBottom: 14,
          background: "rgba(124,92,252,0.18)", border: "1px solid rgba(124,92,252,0.4)",
          borderRadius: 7, color: "#c8aaff", fontSize: 13, fontWeight: 600,
          cursor: "pointer", padding: "10px 0", opacity: uploading ? 0.6 : 1,
        }}
      >
        {uploading ? "Uploading…" : "+ Upload Audio"}
      </button>

      {audioAssets.length === 0 ? (
        <div style={{ color: "#44445a", fontSize: 13, textAlign: "center", padding: "30px 0" }}>
          No audio uploaded yet
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {audioAssets.map((asset) => (
            <div
              key={asset.id}
              onClick={() => addAudioLayer(asset)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 10px", cursor: "pointer", borderRadius: 7,
                border: "1px solid transparent", userSelect: "none",
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
              onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
            >
              <div style={{
                width: 38, height: 38, flexShrink: 0, borderRadius: 6,
                background: "rgba(255,126,179,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, color: "#ff7eb3",
              }}>♪</div>
              <span style={{ fontSize: 13, color: "#c0c0d8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                {asset.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </EditorModal>
  );
}
