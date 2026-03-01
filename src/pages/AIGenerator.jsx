import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { generateStructuredShort } from "../services/ai/generateStructuredShort";
import { buildSafeProject } from "../normalize/normalizeProject";
import { createProject } from "../services/projects/projectService";

export default function AIGenerator() {
  const navigate = useNavigate();

  const [name, setName] = useState("T20 World Cup");
  const [topic, setTopic] = useState("India unbeaten in t20 world cup so far");
  const [videoType, setVideoType] = useState("faceless");
  const [orientation, setOrientation] = useState("9:16");
  const [durationCategory, setDurationCategory] = useState("short");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!name || !topic) return;

    setLoading(true);

    try {
      const aiResult = await generateStructuredShort({
        topic,
        mode: videoType,
        orientation,
        durationCategory,
      });

      const safeProject = buildSafeProject({
        meta: {
          orientation,
          mode: videoType,
        },

        script: {
          text: aiResult.script,
          structured_lines: aiResult.beats,
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
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="w-[500px] space-y-6 rounded bg-white p-8 shadow">
        <h2 className="text-xl font-semibold">
          Create New Project
        </h2>

        <div>
          <label className="text-sm text-gray-600">
            Project Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">
            Video Type
          </label>
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
          <label className="text-sm text-gray-600">
            Orientation
          </label>
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
          <label className="text-sm text-gray-600">
            Duration
          </label>
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
          <label className="text-sm text-gray-600">
            Topic
          </label>
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