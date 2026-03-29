import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { generateStructuredShort } from "../services/ai/generateStructuredShort";
import { buildSafeProject } from "../normalize/normalizeProject";
import { createProject } from "../services/projects/projectService";
import { uploadUserAsset } from "../services/assets/uploadUserAsset";

export default function AIGenerator() {
  const navigate = useNavigate();

  const [name, setName] = useState("dhurandhar 2 movie success");
  const [topic, setTopic] = useState("dhurandhar 2 movie success");
  const [videoType, setVideoType] = useState("faceless");
  const [niche, setNiche] = useState("general");
  const [orientation, setOrientation] = useState("9:16");
  const [durationCategory, setDurationCategory] = useState("short");
  const [assetSource, setAssetSource] = useState("stock");

  const [uploadFiles, setUploadFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  const [loading, setLoading] = useState(false);

  function handleFiles(e) {
    const files = Array.from(e.target.files);

    const newPreviews = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setUploadFiles((prev) => [...prev, ...files]);
    setPreviews((prev) => [...prev, ...newPreviews]);
  }

  function removeFile(index) {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  const handleGenerate = async () => {
    if (!name || !topic) return;

    setLoading(true);

    try {
      let uploadedAssets = [];

      if (assetSource === "user" && uploadFiles.length > 0) {
        for (const file of uploadFiles) {
          const uploaded = await uploadUserAsset(file);
          uploadedAssets.push(uploaded);
        }
      }

      const aiResult = await generateStructuredShort({
        topic,
        mode: videoType,
        orientation,
        durationCategory,
        assetSource,
        uploadedAssets,
      });

      const safeProject = buildSafeProject({
        meta: {
          orientation,
          mode: videoType,
          niche,
          assetSource,
          uploadedAssets,
        },

        script: {
          text: aiResult.script,
        },

        beats: aiResult.beats,

        workflow: {
          script_completed: true,
          avatar_completed: false,
          beats_initialized: true,
        },
      });

      const saved = await createProject({
        name,
        rawAI: aiResult,
        safeProject,
      });

      navigate(`/editor/${saved.id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to generate");
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center bg-gray-50">
      <div className="w-[500px] space-y-6 rounded bg-white p-8 shadow">
        <h2 className="text-xl font-semibold">Create New Project</h2>

        <div>
          <label className="text-sm text-gray-600">Project Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Video Type</label>
          <select
            value={videoType}
            onChange={(e) => setVideoType(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          >
            <option value="faceless">Faceless</option>
            <option value="talking_head">Talking Head</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-600">Asset Source</label>
          <select
            value={assetSource}
            onChange={(e) => setAssetSource(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          >
            <option value="stock">Stock Library</option>
            <option value="user">Upload My Assets</option>
            <option value="internet">Auto-Find from Internet</option>
          </select>
        </div>

        {assetSource === "user" && (
          <>
            <div>
              <label className="text-sm text-gray-600">Upload Assets</label>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFiles}
                className="mt-1 w-full"
              />
            </div>

            {previews.length > 0 && (
              <div className="flex-1 flex flex-wrap gap-3">
                {previews.map((p, i) => (
                  <div key={i} className="relative w-[70px] h-[100px] rounded overflow-hidden border">
                    {p.file.type.startsWith("video") ? (
                      <video src={p.url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={p.url} className="w-full h-full object-cover" />
                    )}

                    <button
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 bg-black text-white text-xs w-5 h-5 rounded-full flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div>
          <label className="text-sm text-gray-600">Niche</label>

          <select
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          >
            <option value="general">General</option>
            <option value="news">News</option>
            <option value="explainer">Explainer</option>
            <option value="education">Education</option>
            <option value="reaction">Reaction</option>
            <option value="sports">Sports</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-600">Orientation</label>
          <select
            value={orientation}
            onChange={(e) => setOrientation(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          >
            <option value="9:16">9:16 (Vertical)</option>
            <option value="16:9">16:9 (Horizontal)</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-600">Duration</label>
          <select
            value={durationCategory}
            onChange={(e) => setDurationCategory(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          >
            <option value="short">30–40 sec</option>
            <option value="medium">1–2 min</option>
            <option value="long">3–5+ min</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-600">Topic</label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            rows={4}
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full rounded bg-black py-3 text-white"
        >
          {loading ? "Generating..." : "Generate Video"}
        </button>
      </div>
    </div>
  );
}