export function generateCaptionText(spoken) {

  if (!spoken) return "";

  const cleaned = spoken
    .replace(/\s+/g, " ")
    .trim();

  return cleaned;

}