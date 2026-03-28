function normalizeDuration(duration) {
  const MIN = 1.2;
  const MAX = 4.5;

  let d = duration;

  if (d < MIN) d = MIN;
  if (d > MAX) d = MAX;

  return Math.round(d * 10) / 10;
}

function calculateBeatTiming(beats) {
  let currentTime = 0;

  return beats.map((beat, index) => {

    const normalizedDuration = normalizeDuration(beat.duration_sec);

    const start_sec = currentTime;
    const end_sec = start_sec + normalizedDuration;

    currentTime = end_sec;

    return {
      ...beat,
      order: index,
      duration_sec: normalizedDuration,
      start_sec,
      end_sec
    };

  });
}

function calculateTotalDuration(beats) {
  if (!beats.length) return 0;
  return beats[beats.length - 1].end_sec;
}

export function calculateTimeline(project) {

  const timedBeats = calculateBeatTiming(project.beats);
  const totalDuration = calculateTotalDuration(timedBeats);

  return {
    ...project,
    beats: timedBeats,
    duration_sec: totalDuration
  };

}