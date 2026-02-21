import React, { useState } from "react";
import { useProjectStore } from "../store/useProjectStore";
import { generateStructuredShort } from "../services/ai/generateStructuredShort";

export default function AIGenerator() {
  const setProject = useProjectStore((s) => s.setProject);

  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  
  // ongoing t20 cricket worldup, Indian goes into final without any loss so far

  const handleGenerate = async () => {
    if (!topic) return;

    setLoading(true);

    try {
      const aiResult = await generateStructuredShort({
        topic,
        mode: "faceless",
      });

      setProject(aiResult);
    } catch (err) {
      console.error(err);
      alert("Generation failed");
    }

    setLoading(false);
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-semibold">
        Structured Shorts Builder
      </h1>

      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Enter topic..."
        className="w-96 rounded border border-gray-300 px-4 py-3"
      />

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="rounded bg-black px-6 py-3 text-white disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate"}
      </button>
    </div>
  );
}