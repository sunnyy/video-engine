export function validateBeats(beats) {
  if (!Array.isArray(beats)) return [];

  let currentTime = 0;

  return beats.map((beat, index) => {
    const duration =
      typeof beat.duration_sec === "number" &&
      beat.duration_sec > 0
        ? beat.duration_sec
        : 2;

    const start_sec = currentTime;
    const end_sec = start_sec + duration;

    currentTime = end_sec;

    return {
      ...beat,
      order: index,
      start_sec,
      end_sec,
      duration_sec: duration,
    };
  });
}