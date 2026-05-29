import { ASSET_SOURCE } from "./projectSchema.js";

export function generateAssetRequirements(project) {
  const user_required = [];
  const ai_generate   = [];
  const stock_fetch   = [];
  const placeholders  = [];

  for (const scene of project.scenes) {
    const { scene_id, scene_type, asset_source, asset_hint, visual_mode } = scene;

    // full_avatar and split_view need no user asset — talking head video is handled separately
    if (visual_mode === "full_avatar" || visual_mode === "split_view") {
      placeholders.push({ scene_id, scene_type });
      continue;
    }

    switch (asset_source) {
      case ASSET_SOURCE.USER_UPLOAD:
        // Only request upload when visual_mode explicitly requires a user asset
        if (visual_mode === "full_asset") {
          user_required.push({
            scene_id,
            // TH scenes that show a product screenshot have misleading asset_type=talking_head;
            // use a clearer label in the manifest
            scene_type: scene.th_url ? "ui_screenshot" : scene_type,
            asset_type: scene.asset_type || null,
            asset_hint: asset_hint || "Upload an asset for this scene.",
            status:     "pending",
            asset_url:  null,
          });
        } else {
          placeholders.push({ scene_id, scene_type });
        }
        break;

      case ASSET_SOURCE.AI_GENERATED:
        ai_generate.push({
          scene_id,
          asset_hint: asset_hint || "AI-generated visual for this scene.",
          status:     "pending",
          asset_url:  null,
        });
        break;

      case ASSET_SOURCE.STOCK:
        stock_fetch.push({
          scene_id,
          asset_hint: asset_hint || "Stock visual for this scene.",
          status:     "pending",
          asset_url:  null,
        });
        break;

      case ASSET_SOURCE.PLACEHOLDER:
      default:
        placeholders.push({ scene_id, scene_type });
        break;
    }
  }

  return {
    user_required,
    ai_generate,
    stock_fetch,
    placeholders,
    total_user_uploads_required: user_required.length,
    all_assets_provided: user_required.length === 0,
  };
}

export function updateAssetStatus(manifest, scene_id, status, asset_url = null) {
  const updated = { ...manifest };

  for (const list of ["user_required", "ai_generate", "stock_fetch"]) {
    updated[list] = manifest[list].map(item =>
      item.scene_id === scene_id
        ? { ...item, status, asset_url }
        : item
    );
  }

  updated.all_assets_provided = updated.user_required.every(
    item => item.status === "resolved"
  );

  return updated;
}

export function getUploadInstructions(manifest) {
  return manifest.user_required
    .filter(item => item.status === "pending")
    .map(item => ({
      scene_id:    item.scene_id,
      scene_type:  item.scene_type,
      instruction: item.asset_hint,
    }));
}
