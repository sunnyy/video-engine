import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useTimelineStore } from "../store/useTimelineStore";
import { uploadUserAsset } from "../services/assets/uploadUserAsset";
import TimelineEditor from "../ui/TimelineEditor";

function createEmptyProject(name = "Untitled Video") {
  return {
    version: "2.0",
    id: crypto.randomUUID(),
    name,
    format: { width: 1080, height: 1920, fps: 30, duration: 30 },
    layers: [],
    meta: {
      thumbnail: null,
      source: "scratch",
      editor_version: "timeline",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

export default function VideoEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const setProject = useTimelineStore((s) => s.setProject);
  const setProjectId = useTimelineStore((s) => s.setProjectId);
  const project = useTimelineStore((s) => s.project);
  const projectId = useTimelineStore((s) => s.projectId);

  const saveTimer = useRef(null);
  const initialLoad = useRef(true);
  const isSaving = useRef(false);

  useEffect(() => {
    async function load() {
      try {
        if (id === "new") {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          const emptyProject = createEmptyProject();
          const { data, error: insertError } = await supabase
            .from("projects")
            .insert([
              {
                user_id: user.id,
                name: emptyProject.name,
                safe_project_json: emptyProject,
                orientation: "9:16",
                mode: "timeline",
                source: "scratch",
                editor_version: "timeline",
              },
            ])
            .select()
            .single();
          if (insertError) throw insertError;
          setProjectId(data.id);
          setProject(emptyProject);
          navigate(`/video-editor/${data.id}`, { replace: true });
        } else {
          const { data, error: fetchError } = await supabase
            .from("projects")
            .select("*")
            .eq("id", id)
            .single();
          if (fetchError) throw fetchError;
          setProjectId(data.id);
          setProject(data.safe_project_json);
        }
      } catch (err) {
        console.error("[VideoEditor] Load error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
        initialLoad.current = false;
      }
    }
    load();

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [id]);

  // Debounced autosave — uploads any pending blob files first, then saves JSON
  useEffect(() => {
    if (!project || !projectId || initialLoad.current || isSaving.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      isSaving.current = true;
      try {
        const store = useTimelineStore.getState();
        const pending = Object.entries(store.pendingFiles);
        for (const [layerId, file] of pending) {
          try {
            const asset = await uploadUserAsset(file);
            store.updateLayerSilent(layerId, { src: asset.url });
            store.clearPendingFile(layerId);
          } catch (err) {
            console.error("[VideoEditor] Upload failed for layer", layerId, err);
          }
        }
        const latest = useTimelineStore.getState().project;
        await supabase
          .from("projects")
          .update({ safe_project_json: latest, name: latest.name })
          .eq("id", projectId);
      } finally {
        isSaving.current = false;
      }
    }, 2000);
  }, [project, projectId]);

  if (loading) {
    return (
      <div
        style={{
          background: "#0d0d18",
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "#7c5cfc", fontSize: 14 }}>Loading editor…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background: "#0d0d18",
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ color: "#ff4f4f", fontSize: 14 }}>
          Failed to load project
        </div>
        <div style={{ color: "#77777f", fontSize: 12 }}>{error}</div>
      </div>
    );
  }

  return <TimelineEditor />;
}
