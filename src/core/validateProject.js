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

    if (beat.transition?.duration && beat.transition.duration > beatDuration) {
      errors.push(`Beat ${index + 1}: Transition longer than beat duration`);
    }

    const contentType =
      beat.content_type ||
      (meta?.mode === "talking_head" ? "avatar" : "asset");

    if (contentType === "asset") {
      if (!beat.assets?.main?.src) {
        errors.push(`Beat ${index + 1}: Missing main asset`);
      }
    }
  });

  if (meta?.mode === "talking_head") {
    if (!avatar?.src) {
      errors.push("Talking head mode requires avatar");
    }
  }

  if (music?.src && typeof music.volume !== "number") {
    errors.push("Music volume invalid");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}