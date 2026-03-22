export function debugProject(project) {
  if (!project) {
    console.error("Project missing");
    return;
  }

  if (!Array.isArray(project.beats)) {
    console.error("Beats missing");
  }

  project.beats.forEach((beat, i) => {
    if (!beat.layout) {
      console.warn("Beat missing layout", i);
    }

    if (!beat.duration_sec) {
      console.warn("Beat missing duration", i);
    }

    if (!beat.zones) {
      console.warn("Beat missing zones", i);
    }

    if (!beat.start_sec && beat.start_sec !== 0) {
      console.warn("Beat missing start_sec", i);
    }

    if (!beat.end_sec && beat.end_sec !== 0) {
      console.warn("Beat missing end_sec", i);
    }
  });
}