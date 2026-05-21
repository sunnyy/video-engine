import { AbsoluteFill, useCurrentFrame, useVideoConfig, Video, Audio, Img, Sequence, delayRender, continueRender } from "remotion";
import { loadSFXLibrary, getSFXPreviewUrl, getSFXDuration } from "../core/registries/sfxRegistry";
import { useMemo, useEffect } from "react";

export default function TimelineComposition({ project }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  const layers = [...(project?.layers || [])]
    .filter((l) => l.type === "audio" || l.visible !== false)
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  // Collect unique font families from text/caption layers
  const fontFamilies = useMemo(() => {
    const families = new Set(["Outfit"]);
    for (const l of project?.layers || []) {
      const f = l.style?.fontFamily || l.captionStyle?.fontFamily;
      if (f) families.add(f);
    }
    return [...families];
  }, [project]);

  // Load Google Fonts before any frame renders
  const fontHandle = useMemo(() => delayRender("Loading fonts"), []);
  useEffect(() => {
    const links = fontFamilies.map((family) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@100;300;400;500;600;700;800;900&display=swap`;
      document.head.appendChild(link);
      return link;
    });
    Promise.all([document.fonts.ready, loadSFXLibrary()]).then(() => continueRender(fontHandle));
    return () => links.forEach((l) => l.remove());
  }, [fontHandle]);


  return (
    <AbsoluteFill style={{ background: project?.format?.background || "#000" }}>
      {layers.map((layer) => (
        <TimelineLayer key={layer.id} layer={layer} currentTime={currentTime} fps={fps} />
      ))}
      {layers
        .filter((l) => l.sfx?.key)
        .map((l) => {
          const sfxStart = Math.round((l.start + (l.sfx.delay ?? 0)) * fps);
          const sfxDur = Math.max(1, Math.round(getSFXDuration(l.sfx.key) * fps));
          return (
            <Sequence key={`sfx-${l.id}`} from={sfxStart} durationInFrames={sfxDur}>
              <Audio src={getSFXPreviewUrl(l.sfx.key)} volume={l.sfx.volume ?? 1} />
            </Sequence>
          );
        })}
    </AbsoluteFill>
  );
}

function getTransitionOpacity(layer, currentTime) {
  const inCfg  = layer.transition?.in  ?? (layer.transition?.type ? layer.transition : null);
  const outCfg = layer.transition?.out ?? null;
  const inType  = inCfg?.type  ?? "none";
  const inDur   = inCfg?.duration ?? 0.5;
  const outType = outCfg?.type ?? "none";
  const outDur  = outCfg?.duration ?? 0.5;

  if (outType !== "none" && outDur > 0) {
    const exitStart = layer.end - outDur;
    if (currentTime >= exitStart && currentTime < layer.end) {
      return Math.max(0, 1 - (currentTime - exitStart) / outDur);
    }
  }

  if (inType !== "none" && inDur > 0) {
    const entranceEnd = layer.start + inDur;
    if (currentTime >= layer.start && currentTime < entranceEnd) {
      return Math.max(0, Math.min(1, (currentTime - layer.start) / inDur));
    }
  }

  return 1;
}

function TimelineLayer({ layer, currentTime, fps }) {
  if (currentTime < layer.start || currentTime >= layer.end) return null;

  const tr = getInterpolatedTransform(layer, currentTime);
  const tOpacity = getTransitionOpacity(layer, currentTime);
  const startFrame = Math.round(layer.start * fps);
  const durationFrames = Math.max(1, Math.round((layer.end - layer.start) * fps));

  const CANVAS_W = 1080;
  const CANVAS_H = 1920;
  const baseStyle = {
    position: "absolute",
    left: CANVAS_W / 2 + tr.x - tr.width / 2,
    top: CANVAS_H / 2 + tr.y - tr.height / 2,
    width: tr.width,
    height: tr.height,
    opacity: tr.opacity * tOpacity,
    transform: `rotate(${tr.rotation}deg) scale(${tr.scale})`,
    filter: tr.blur > 0 ? `blur(${tr.blur}px)` : undefined,
    zIndex: layer.zIndex,
  };

  if (layer.type === "video") {
    return (
      <Sequence from={startFrame} durationInFrames={durationFrames}>
        <Video
          src={layer.src}
          style={{ ...baseStyle, position: "absolute", objectFit: layer.objectFit || "cover" }}
          startFrom={Math.round((layer.trimStart || 0) * fps)}
          volume={layer.muted ? 0 : (layer.volume ?? 1)}
          playbackRate={layer.playbackRate || 1}
        />
      </Sequence>
    );
  }

  if (layer.type === "image" || layer.type === "sticker") {
    return (
      <Sequence from={startFrame} durationInFrames={durationFrames}>
        <Img
          src={layer.src}
          style={{ ...baseStyle, position: "absolute", objectFit: layer.objectFit || "cover" }}
        />
      </Sequence>
    );
  }

  if (layer.type === "text") {
    const s = layer.style || {};
    return (
      <Sequence from={startFrame} durationInFrames={durationFrames}>
        <div
          style={{
            ...baseStyle,
            position: "absolute",
            fontFamily: s.fontFamily || "Outfit",
            fontSize: s.fontSize || 48,
            fontWeight: s.fontWeight || 700,
            color: s.color || "#ffffff",
            textAlign: s.textAlign || "center",
            lineHeight: s.lineHeight || 1.2,
            letterSpacing: s.letterSpacing || 0,
            textTransform: s.textTransform || "none",
            background: s.background || undefined,
            borderRadius: s.borderRadius || 0,
            padding: s.padding || 0,
            textShadow: s.textShadow || undefined,
            display: "flex",
            alignItems: "center",
            justifyContent:
              s.textAlign === "left" ? "flex-start" : s.textAlign === "right" ? "flex-end" : "center",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            overflow: "hidden",
          }}
        >
          {layer.content}
        </div>
      </Sequence>
    );
  }

  if (layer.type === "audio") {
    return (
      <Sequence from={startFrame} durationInFrames={durationFrames}>
        <Audio
          src={layer.src}
          volume={layer.muted ? 0 : (layer.volume ?? 1)}
          startFrom={Math.round((layer.trimStart || 0) * fps)}
        />
      </Sequence>
    );
  }

  if (layer.type === "captions") {
    const activeSegment = (layer.segments || []).find(
      (seg) => currentTime >= seg.start && currentTime < seg.end
    );
    if (!activeSegment) return null;
    const cs = layer.captionStyle || {};
    return (
      <Sequence from={startFrame} durationInFrames={durationFrames}>
        <div
          style={{
            ...baseStyle,
            position: "absolute",
            fontFamily: cs.fontFamily || "Outfit",
            fontSize: cs.fontSize || 48,
            fontWeight: cs.fontWeight || 700,
            color: cs.color || "#ffffff",
            textAlign: cs.textAlign || "center",
            background: cs.background || "rgba(0,0,0,0.5)",
            borderRadius: cs.borderRadius || 8,
            padding: cs.padding || 8,
          }}
        >
          {activeSegment.text}
        </div>
      </Sequence>
    );
  }

  if (layer.type === "gradient") {
    return (
      <Sequence from={startFrame} durationInFrames={durationFrames}>
        <div style={{ ...baseStyle, position: "absolute", background: layer.gradient || "#000000" }} />
      </Sequence>
    );
  }

  return null;
}

function getInterpolatedTransform(layer, currentTime) {
  const t = layer.transform || {};
  const kf = layer.keyframes || {};
  const localTime = currentTime - layer.start;

  const interpolate = (property, defaultVal) => {
    const frames = kf[property];
    if (!frames || frames.length === 0) return t[property] ?? defaultVal;
    if (frames.length === 1) return frames[0].value;
    const sorted = [...frames].sort((a, b) => a.time - b.time);
    if (localTime <= sorted[0].time) return sorted[0].value;
    if (localTime >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value;
    const nextIdx = sorted.findIndex((k) => k.time > localTime);
    const prev = sorted[nextIdx - 1];
    const next = sorted[nextIdx];
    const progress = (localTime - prev.time) / (next.time - prev.time);
    return prev.value + (next.value - prev.value) * progress;
  };

  return {
    x: interpolate("x", 0),
    y: interpolate("y", 0),
    width: interpolate("width", t.width ?? 1080),
    height: interpolate("height", t.height ?? 1920),
    rotation: interpolate("rotation", 0),
    scale: interpolate("scale", 1),
    opacity: interpolate("opacity", 1),
    blur: interpolate("blur", 0),
  };
}
