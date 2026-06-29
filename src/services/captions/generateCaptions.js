import { serverFetch, SERVER } from "../serverApi";
import { supabase } from "../../lib/supabase";
import { createProject } from "../projects/projectService";
import { captionStylePresets } from "../../core/registries/captionTimelineRegistry.jsx";

/**
 * generateCaptions({ file, captionStyle, captionPos }, onProgress)
 * Client-orchestrated caption flow (mirrors VideoCaptions.jsx): upload the video →
 * transcribe → build a timeline (base video + styled caption layers) → save.
 * Resolves { projectId }. onProgress({ step }) maps to the chatbox status list.
 */

function chunkSegments(segments, wordsPerChunk = 3) {
  const result = [];
  for (const seg of segments) {
    const words = seg.text.trim().split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    const dur = Math.max(0.3, seg.end - seg.start);
    const timePerWord = dur / words.length;
    for (let i = 0; i < words.length; i += wordsPerChunk) {
      const count = Math.min(wordsPerChunk, words.length - i);
      result.push({
        text:  words.slice(i, i + count).join(" "),
        start: parseFloat((seg.start + i * timePerWord).toFixed(3)),
        end:   parseFloat((seg.start + (i + count) * timePerWord).toFixed(3)),
      });
    }
  }
  return result;
}

export async function generateCaptions({ file, captionStyle = "wordBlaze", captionPos = 80, language = "auto" }, onProgress) {
  if (!file) throw new Error("No video selected");

  // 1. Upload
  onProgress?.({ step: 0 });
  const form1 = new FormData(); form1.append("file", file);
  const uploadRes  = await serverFetch("/api/caption/upload-video", { method: "POST", body: form1 });
  const uploadData = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");
  const videoUrl = uploadData.url;

  // 2. Transcribe
  onProgress?.({ step: 1 });
  const form2 = new FormData(); form2.append("file", file); form2.append("language", language);
  const token = (await supabase.auth.getSession())?.data?.session?.access_token;
  const transRes  = await fetch(`${SERVER}/api/transcription/transcribe`, {
    method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form2,
  });
  const transData = await transRes.json().catch(() => ({}));
  if (!transRes.ok) throw new Error(transData.error || "Transcription failed");
  const segments = transData.segments || [];
  if (!segments.length) throw new Error("No speech found to caption");

  // 3. Build timeline + save
  onProgress?.({ step: 2 });
  const fps = 30, captionW = 980, captionH = 220, captionX = (1080 - captionW) / 2;
  const preset   = captionStylePresets[captionStyle] ?? captionStylePresets.wordBlaze;
  const yCenter  = (captionPos / 100) * 1920;
  const captionY = Math.max(0, Math.min(1920 - captionH, yCenter - captionH / 2));

  const chunks = chunkSegments(segments, 3);
  const captionLayers = chunks.map((chunk, i) => ({
    id: `caption_${i}`, trackId: `caption_${i}`, name: `Caption ${i + 1}`,
    type: "text", content: chunk.text,
    style: { ...preset.style, fontSize: Math.round((preset.style.fontSize || 52) * 1.4), _captionStyle: captionStyle }, captionStyle,
    start: chunk.start, end: chunk.end, zIndex: 10,
    visible: true, locked: false, sfx: null, animation: null,
    keyframes:  { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] },
    transition: preset.transition,
    transform:  { x: captionX, y: captionY, width: captionW, height: captionH, opacity: 1, rotation: 0, scale: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" },
  }));

  const totalDuration = (segments[segments.length - 1]?.end ?? 0) + 0.3;
  const fullText = segments.map(s => s.text.trim()).join(" ").trim();
  const name = fullText.split(/\s+/).slice(0, 8).join(" ") || file.name.replace(/\.[^.]+$/, "");

  const timelineProject = {
    version: "2.0",
    format:  { width: 1080, height: 1920, fps, duration: totalDuration },
    layers: [
      {
        id: "base_video", trackId: "track_base_video", name: "Video",
        type: "video", src: videoUrl, objectFit: "cover",
        start: 0, end: totalDuration, zIndex: 0,
        visible: true, locked: false, sfx: null, animation: null,
        volume: 1, muted: false, trimStart: 0, trimEnd: totalDuration, fadeIn: 0, fadeOut: 0,
        keyframes:  { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] },
        transition: { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } },
        transform:  { x: 0, y: 0, width: 1080, height: 1920, opacity: 1, rotation: 0, scale: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" },
      },
      ...captionLayers,
    ],
  };

  const saved = await createProject({
    name,
    rawAI:       { captionStyle, captionPos, segmentCount: segments.length },
    safeProject: timelineProject,
    source:      "caption_studio",
  });
  if (!saved?.id) throw new Error("Failed to create project");
  onProgress?.({ step: 3 });
  return { projectId: saved.id };
}
