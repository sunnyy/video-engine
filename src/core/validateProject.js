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

    const beatDuration = beat.end_sec - beat.start_sec;

    if (
      beat.transition?.duration &&
      beat.transition.duration > beatDuration
    ) {
      errors.push(
        `Beat ${index + 1}: Transition longer than beat duration`
      );
    }

    const zones = Object.values(beat.zones || {});

    if (!zones.length) {
      errors.push(`Beat ${index + 1}: No zones defined`);
    }

    zones.forEach((zone, zIndex) => {

      const contentKind = zone?.content?.kind;

      if (!contentKind) {
        errors.push(`Beat ${index + 1} Zone ${zIndex + 1}: Missing content kind`);
        return;
      }

      if (contentKind === "asset") {

        const src =
          zone?.content?.asset?.src ||
          zone?.content?.asset?.url ||
          zone?.content?.src;

        if (!src) {
          errors.push(
            `Beat ${index + 1} Zone ${zIndex + 1}: Asset missing src`
          );
        }

      }

      if (contentKind === "block" && !zone?.content?.block) {
        errors.push(
          `Beat ${index + 1} Zone ${zIndex + 1}: Block missing definition`
        );
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