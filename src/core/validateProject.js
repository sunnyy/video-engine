import { layoutRegistry } from "./registries/layoutRegistry.js";

export default function validateProject(project) {

  const errors = [];

  if (!project) {
    return { valid: false, errors: ["Project missing"] };
  }

  const { beats, meta, avatar, music } = project;

  if (!beats || !Array.isArray(beats) || beats.length === 0) {
    errors.push("No beats in project");
  }

  if (!meta) {
    errors.push("Project meta missing");
  }

  beats?.forEach((beat, index) => {

    if (!beat.layout) {
      errors.push(`Beat ${index + 1}: Missing layout`);
    }

    if (!beat.zones) {
      errors.push(`Beat ${index + 1}: Missing zones`);
    }

    if (beat.start_sec == null || beat.end_sec == null) {
      errors.push(`Beat ${index + 1}: Missing timing`);
      return;
    }

    if (beat.start_sec >= beat.end_sec) {
      errors.push(`Beat ${index + 1}: start_sec must be less than end_sec`);
    }

    // Only validate zones that belong to the current layout
    const layoutDef    = layoutRegistry[beat.layout];
    const layoutZones  = layoutDef?.zones || Object.keys(beat.zones || {});
    const zonesToCheck = layoutZones.map(key => ({ key, zone: beat.zones?.[key] }));

    if (!zonesToCheck.length) {
      errors.push(`Beat ${index + 1}: No zones defined`);
    }

    zonesToCheck.forEach(({ key, zone }, zIndex) => {

      const contentKind = zone?.content?.kind;

      // Skip zones with no content — renderer handles empty zones gracefully
      if (!contentKind) return;

      if (contentKind === "asset") {
        const src = zone?.content?.asset?.src || zone?.content?.asset?.url || zone?.content?.src;
        // Avatar zones have src=null intentionally — the avatar video is supplied at runtime.
        const isAvatarZone = beat.avatarZone === key
          || zone?.type === "avatar"
          || zone?.content?.kind === "avatar";
        if (!src && !isAvatarZone) {
          errors.push(`Beat ${index + 1} Zone ${key}: Asset missing src`);
        }
      }

      if (contentKind === "block" && !zone?.content?.block) {
        errors.push(`Beat ${index + 1} Zone ${key}: Block missing definition`);
      }

    });

  });

  if (meta?.mode === "talking_head" && !avatar?.src) {
    errors.push("Talking head mode requires avatar");
  }

  if (music?.src && typeof music.volume !== "number") {
    errors.push("Music volume invalid");
  }

  return {
    valid: errors.length === 0,
    errors,
  };

}