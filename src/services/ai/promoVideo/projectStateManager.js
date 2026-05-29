import { PROJECT_STATUS, SCENE_STATUS } from "./projectSchema.js";

const VALID_TRANSITIONS = {
  [PROJECT_STATUS.DRAFT]:            [PROJECT_STATUS.SCRIPT_GENERATED],
  [PROJECT_STATUS.SCRIPT_GENERATED]: [PROJECT_STATUS.WAITING_ASSETS],
  [PROJECT_STATUS.WAITING_ASSETS]:   [PROJECT_STATUS.ASSETS_READY],
  [PROJECT_STATUS.ASSETS_READY]:     [PROJECT_STATUS.READY_FOR_RENDER],
  [PROJECT_STATUS.READY_FOR_RENDER]: [PROJECT_STATUS.RENDERING],
  [PROJECT_STATUS.RENDERING]:        [PROJECT_STATUS.RENDERED, PROJECT_STATUS.FAILED],
  [PROJECT_STATUS.FAILED]:           [PROJECT_STATUS.READY_FOR_RENDER],
};

export function transitionProjectStatus(project, newStatus) {
  if (newStatus === PROJECT_STATUS.DRAFT) {
    return { ...project, status: PROJECT_STATUS.DRAFT, updated_at: new Date().toISOString() };
  }

  const allowed = VALID_TRANSITIONS[project.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid status transition: "${project.status}" → "${newStatus}". Allowed from "${project.status}": ${allowed.length ? allowed.join(", ") : "none (reset to draft only)"}`
    );
  }

  return { ...project, status: newStatus, updated_at: new Date().toISOString() };
}

export function updateSceneStatus(project, scene_id, newStatus) {
  return {
    ...project,
    updated_at: new Date().toISOString(),
    scenes: project.scenes.map(scene =>
      scene.scene_id === scene_id ? { ...scene, status: newStatus } : scene
    ),
  };
}

export function markProjectApproved(project, creditsCharged) {
  const now = new Date().toISOString();
  let p = { ...project, credits_charged: creditsCharged, approved_at: now };

  // Walk through all intermediate states unconditionally — the user clicking
  // "Generate Video" is the decision. Skipped assets are intentional, not missing.
  if (p.status !== PROJECT_STATUS.WAITING_ASSETS) {
    p = transitionProjectStatus(p, PROJECT_STATUS.WAITING_ASSETS);
  }
  p = transitionProjectStatus(p, PROJECT_STATUS.ASSETS_READY);
  p = transitionProjectStatus(p, PROJECT_STATUS.READY_FOR_RENDER);

  return { ...p, updated_at: now };
}

export function isReadyForRender(project) {
  if (project.status !== PROJECT_STATUS.READY_FOR_RENDER) return false;
  return project.scenes.every(
    scene => scene.status === SCENE_STATUS.ASSET_READY || scene.status === SCENE_STATUS.PENDING
  );
}

export function getProjectSummary(project) {
  const scenes_ready          = project.scenes.filter(s => s.status === SCENE_STATUS.ASSET_READY).length;
  const scenes_missing_assets = project.scenes.filter(s => s.status === SCENE_STATUS.ASSET_MISSING).length;

  return {
    id:                     project.id,
    status:                 project.status,
    video_goal:             project.video_goal,
    product_name:           project.product_name,
    duration_seconds:       project.duration_seconds,
    total_scenes:           project.scenes.length,
    scenes_ready,
    scenes_missing_assets,
    credits_charged:        project.credits_charged,
    approved_at:            project.approved_at,
    created_at:             project.created_at,
  };
}
