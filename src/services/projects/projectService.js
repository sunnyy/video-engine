import { supabase } from "../../lib/supabase";

export async function createProject({ name, rawAI, safeProject = null, source = "ai_generated", stepsCompleted = null }) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("projects")
    .insert([
      {
        user_id: user.id,
        name,
        raw_ai_json: rawAI,
        safe_project_json: safeProject,
        orientation: safeProject?.meta?.orientation || "9:16",
        mode: safeProject?.meta?.mode || "faceless",
        source,
        steps_completed: stepsCompleted,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getProjectById(id) {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function getUserProjects() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, created_at, updated_at, source, safe_project_json")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getProductVideoProjects() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, updated_at, safe_project_json")
    .eq("user_id", user.id)
    .eq("source", "product_video")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getProductAdProjects() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, updated_at, steps_completed, raw_ai_json, safe_project_json")
    .eq("user_id", user.id)
    .eq("source", "product_ad")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateProject(id, safeProject, extra = {}) {
  const { raw_ai_json, ...restExtra } = extra;
  const { error } = await supabase
    .from("projects")
    .update({
      safe_project_json: safeProject,
      orientation: safeProject.meta.orientation,
      mode: safeProject.meta.mode,
      updated_at: new Date().toISOString(),
      ...(raw_ai_json !== undefined ? { raw_ai_json } : {}),
      ...restExtra,
    })
    .eq("id", id);

  if (error) throw error;
}

export async function updateProjectProgress(id, stepsCompleted, rawAI) {
  const updates = { steps_completed: stepsCompleted, updated_at: new Date().toISOString() };
  if (rawAI !== undefined) updates.raw_ai_json = rawAI;
  const { error } = await supabase.from("projects").update(updates).eq("id", id);
  if (error) throw error;
}

export async function renameProject(id, newName) {
  const { error } = await supabase
    .from("projects")
    .update({
      name: newName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteProject(id) {
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
/* ─────────────────────────────────────────────────────────────
   Renders history — per-project list from `renders` table
───────────────────────────────────────────────────────────── */
export async function getProjectRenders(projectId) {
  const { data, error } = await supabase
    .from("renders")
    .select("id, video_url, status, created_at, file_path")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/* ─────────────────────────────────────────────────────────────
   #22 — Save rendered video URL tied to project
───────────────────────────────────────────────────────────── */
export async function saveRenderedVideo(projectId, videoUrl) {
  const { error } = await supabase
    .from("projects")
    .update({
      rendered_video_url: videoUrl,
      last_rendered_at:   new Date().toISOString(),
      updated_at:         new Date().toISOString(),
    })
    .eq("id", projectId);

  if (error) throw error;
}

export async function getRenderedVideo(projectId) {
  const { data, error } = await supabase
    .from("projects")
    .select("rendered_video_url, last_rendered_at")
    .eq("id", projectId)
    .single();

  if (error) throw error;
  return data;
}

/* ─────────────────────────────────────────────────────────────
   #23 — Version history
   Each version is a snapshot of safe_project_json.
   Stored in project_versions table.
───────────────────────────────────────────────────────────── */
export async function saveProjectVersion(projectId, safeProject, label = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("project_versions")
    .insert([{
      project_id:        projectId,
      user_id:           user.id,
      safe_project_json: safeProject,
      label:             label || `Version ${new Date().toLocaleString()}`,
      created_at:        new Date().toISOString(),
    }]);

  if (error) throw error;
}

export async function getProjectVersions(projectId) {
  const { data, error } = await supabase
    .from("project_versions")
    .select("id, label, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return data || [];
}

export async function restoreProjectVersion(versionId) {
  const { data, error } = await supabase
    .from("project_versions")
    .select("safe_project_json")
    .eq("id", versionId)
    .single();

  if (error) throw error;
  return data.safe_project_json;
}