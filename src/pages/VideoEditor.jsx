import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useTimelineStore } from "../store/useTimelineStore";
import { uploadUserAsset } from "../services/assets/uploadUserAsset";
import TimelineEditor from "../ui/TimelineEditor";

const DEFAULT_NAME = "Untitled Video";

function createEmptyProject(name = DEFAULT_NAME) {
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
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const setProject = useTimelineStore((s) => s.setProject);
  const setProjectId = useTimelineStore((s) => s.setProjectId);
  const project = useTimelineStore((s) => s.project);
  const projectId = useTimelineStore((s) => s.projectId);

  const saveTimer = useRef(null);
  const initialLoad = useRef(true);
  const isSaving = useRef(false);
  const creatingRef = useRef(false); // guards the lazy first-save insert from double-firing

  useEffect(() => {
    async function load() {
      try {
        if (id === "new") {
          // Lazy creation: hold an in-memory blank project but do NOT create a
          // DB row yet. The row is created on the first real edit (see autosave).
          // This way, opening Blank Canvas and clicking back never leaves an
          // orphaned empty project behind.
          setProjectId(null);
          setProject(createEmptyProject());
        } else {
          // Skip the fetch if this project is already in the store (e.g. we just
          // lazily created it and navigated here) — refetching would clobber any
          // edits made between the insert and now.
          const store = useTimelineStore.getState();
          if (store.projectId === id && store.project) {
            // already loaded in memory
          } else {
            const { data, error: fetchError } = await supabase
              .from("projects")
              .select("*")
              .eq("id", id)
              .maybeSingle();
            if (fetchError) throw fetchError;
            if (!data) { const e = new Error("not found"); e.code = "NOT_FOUND"; throw e; }
            setProjectId(data.id);
            // Backfill meta.source from the DB column so service detection (Publish button,
            // Back target) works even for projects saved before meta.source existed.
            const sp = data.safe_project_json || {};
            sp.meta = { ...(sp.meta || {}), source: sp.meta?.source || data.source };
            setProject(sp);
          }
        }
      } catch (err) {
        console.error("[VideoEditor] Load error:", err);
        // Show a friendly message — never surface raw DB/PostgREST errors (leaks the stack).
        const notFound = err.code === "NOT_FOUND" || err.code === "PGRST116";
        setError(notFound
          ? "This project no longer exists — it may have been deleted."
          : "We couldn't open this project. Please try again.");
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

  // Debounced autosave — uploads any pending blob files first, then saves JSON.
  // For a brand-new Blank Canvas (projectId === null) the DB row is created here
  // on the FIRST real edit, never on open.
  useEffect(() => {
    if (!project || initialLoad.current || isSaving.current || creatingRef.current) return;

    // An untouched blank canvas isn't worth a row yet — wait for a real edit
    // (a layer added, or the project renamed).
    const worthSaving = (project.layers?.length ?? 0) > 0 || (project.name && project.name !== DEFAULT_NAME);
    if (!projectId && !worthSaving) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (isSaving.current || creatingRef.current) return;
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
        const latest    = useTimelineStore.getState().project;
        const currentId = useTimelineStore.getState().projectId;

        if (!currentId) {
          // First real edit on a blank canvas → create the project row now.
          creatingRef.current = true;
          try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error: insertError } = await supabase
              .from("projects")
              .insert([
                {
                  user_id: user.id,
                  name: latest.name,
                  safe_project_json: latest,
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
            navigate(`/video-editor/${data.id}`, { replace: true, state: location.state });
          } finally {
            creatingRef.current = false;
          }
        } else {
          await supabase
            .from("projects")
            .update({ safe_project_json: latest, name: latest.name })
            .eq("id", currentId);
        }
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
