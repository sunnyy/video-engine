export function generateCaptionSegments(spoken, duration_sec) {
  if (!spoken) return [];

  const words = spoken.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const wordsPerSegment = 4;
  const segments = [];

  const totalSegments = Math.ceil(
    words.length / wordsPerSegment
  );

  const segmentDuration = duration_sec / totalSegments;

  for (let i = 0; i < totalSegments; i++) {
    const startWord = i * wordsPerSegment;
    const endWord = startWord + wordsPerSegment;

    const text = words.slice(startWord, endWord).join(" ");

    segments.push({
      text,
      start_offset: i * segmentDuration,
      duration: segmentDuration,
    });
  }

  return segments;
}