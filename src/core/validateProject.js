export default function validateProject(project) {
  const errors = [];

  if (!project) {
    return { valid: false, errors: ["Project missing"] };
  }

  const { beats, meta, avatar, music, duration_sec } = project;

  if (!beats || beats.length === 0) {
    errors.push("No beats in project");
  }

  if (!duration_sec || duration_sec <= 0) {
    errors.push("Invalid total duration");
  }

  beats?.forEach((beat, index) => {
    if (beat.start_sec == null || beat.end_sec == null) {
      errors.push(`Beat ${index + 1}: Missing timing`);
      return;
    }

    if (beat.start_sec >= beat.end_sec) {
      errors.push(`Beat ${index + 1}: start_sec must be less than end_sec`);
    }

    const beatDuration = beat.end_sec - beat.start_sec;

    if (
      beat.transition?.duration &&
      beat.transition.duration > beatDuration
    ) {
      errors.push(
        `Beat ${index + 1}: Transition longer than beat duration`
      );
    }

    const layout = beat.visual_mode || "full";
    const contentType = beat.content_type || "asset";

    const hasMain = !!beat.assets?.main?.url;
    const hasSecondary = !!beat.assets?.secondary?.url;
    const hasAvatar = !!avatar?.src;

    // 🔹 FULL LAYOUT
    if (layout === "full") {
      if (contentType === "avatar") {
        if (!hasAvatar) {
          errors.push(`Beat ${index + 1}: Avatar missing`);
        }
      } else {
        if (!hasMain) {
          errors.push(`Beat ${index + 1}: Main asset missing`);
        }
      }
    }

    // 🔹 SPLIT LAYOUT
    if (layout === "split") {
      if (!hasMain) {
        errors.push(`Beat ${index + 1}: Split requires main asset`);
      }

      if (meta.mode === "talking_head" && !hasAvatar) {
        errors.push(`Beat ${index + 1}: Split requires avatar`);
      }
    }

    // 🔹 DUAL LAYOUT
    if (layout === "dual") {
      if (!hasMain || !hasSecondary) {
        errors.push(
          `Beat ${index + 1}: Dual layout requires two assets`
        );
      }
    }

    // 🔹 FLOATING LAYOUT
    if (layout === "floating") {
      if (!hasMain) {
        errors.push(`Beat ${index + 1}: Floating requires main asset`);
      }

      if (meta.mode === "talking_head" && !hasAvatar) {
        errors.push(`Beat ${index + 1}: Floating requires avatar`);
      }
    }
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