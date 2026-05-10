import { serverFetch } from "./serverApi";

export async function fetchElevenLabsVoices() {
  const res = await serverFetch("/api/elevenlabs/voices");
  if (!res.ok) throw new Error(`ElevenLabs voices fetch failed (${res.status})`);
  const data = await res.json();
  return data.voices || [];
}
