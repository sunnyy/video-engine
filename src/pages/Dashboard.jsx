import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserProjects } from "../services/projects/projectService";

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getUserProjects();
        setProjects(data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your Projects</h1>

        <button
          onClick={() => navigate("/new")}
          className="rounded bg-black px-4 py-2 text-white"
        >
          New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-gray-500">
          No projects yet.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/editor/${p.id}`)}
              className="cursor-pointer rounded-lg bg-white p-4 shadow hover:shadow-md transition"
            >
              <div className="text-lg font-medium">
                {p.name}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Updated:{" "}
                {new Date(p.updated_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}