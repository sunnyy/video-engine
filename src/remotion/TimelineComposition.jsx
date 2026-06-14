import { AbsoluteFill, useCurrentFrame, useVideoConfig, Video, Audio, Img, Sequence, delayRender, continueRender } from "remotion";
import { loadSFXLibrary, getSFXPreviewUrl, getSFXDuration } from "../core/registries/sfxRegistry";
import { useMemo, useEffect } from "react";
import * as LucideIcons from "lucide-react";

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
    const timeout = new Promise(resolve => setTimeout(resolve, 5000));
    Promise.all([Promise.race([document.fonts.ready, timeout]), loadSFXLibrary()]).then(() => continueRender(fontHandle));
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
              <Audio src={l.sfx.src ?? getSFXPreviewUrl(l.sfx.key)} volume={l.sfx.volume ?? 1} />
            </Sequence>
          );
        })}
    </AbsoluteFill>
  );
}

const easeOutQuart  = (t) => 1 - Math.pow(1 - t, 4);
const easeInQuart   = (t) => t * t * t * t;
const easeInOutQuart = (t) => t < 0.5 ? 8*t*t*t*t : 1 - Math.pow(-2*t+2, 4)/2;

function buildEntranceEffect(type, p, intensity = 1) {
  const e = easeOutQuart(p);
  const ef = easeInOutQuart(p);
  const i = Math.max(0, Math.min(1, intensity));
  switch (type) {
    case "crossfade":
    case "fade":        return { opacity: 1 - i*(1-ef), tX: 0,            tY: 0,             scale: 1 };
    case "dissolve":    return { opacity: 1 - i*(1-ef), tX: 0,            tY: 0,             scale: 1 };
    case "slide-left":  return { opacity: 1,            tX: (1-e)*100*i,  tY: 0,             scale: 1 };
    case "slide-right": return { opacity: 1,            tX: -(1-e)*100*i, tY: 0,             scale: 1 };
    case "slide-up":    return { opacity: 1,            tX: 0,            tY: (1-e)*100*i,   scale: 1 };
    case "slide-down":  return { opacity: 1,            tX: 0,            tY: -(1-e)*100*i,  scale: 1 };
    case "zoom-in":
    case "zoom":        return { opacity: 1 - i*(1-ef), tX: 0,            tY: 0,             scale: 1 - i*0.2*(1-e) };
    default:            return { opacity: 1,            tX: 0,            tY: 0,             scale: 1 };
  }
}

function buildExitEffect(type, p, intensity = 1) {
  const e = easeInQuart(p);
  const ef = easeInOutQuart(p);
  const i = Math.max(0, Math.min(1, intensity));
  switch (type) {
    case "crossfade":
    case "fade":        return { opacity: (1-i) + i*ef,  tX: 0,             tY: 0,             scale: 1 };
    case "dissolve":    return { opacity: (1-i) + i*ef,  tX: 0,             tY: 0,             scale: 1 };
    case "slide-left":  return { opacity: 1,             tX: -(1-e)*100*i,  tY: 0,             scale: 1 };
    case "slide-right": return { opacity: 1,             tX: (1-e)*100*i,   tY: 0,             scale: 1 };
    case "slide-up":    return { opacity: 1,             tX: 0,             tY: -(1-e)*100*i,  scale: 1 };
    case "slide-down":  return { opacity: 1,             tX: 0,             tY: (1-e)*100*i,   scale: 1 };
    case "zoom-in":
    case "zoom":        return { opacity: (1-i) + i*ef,  tX: 0,             tY: 0,             scale: 1 - i*0.2*(1-e) };
    default:            return { opacity: 1,             tX: 0,             tY: 0,             scale: 1 };
  }
}

function getTransitionStyle(layer, currentTime) {
  const inCfg  = layer.transition?.in  ?? (layer.transition?.type ? layer.transition : null);
  const outCfg = layer.transition?.out ?? null;
  const inType      = inCfg?.type      ?? "none";
  const inDur       = inCfg?.duration  ?? 0.5;
  const inIntensity = inCfg?.intensity ?? 1;
  const outType      = outCfg?.type      ?? "none";
  const outDur       = outCfg?.duration  ?? 0.5;
  const outIntensity = outCfg?.intensity ?? 1;

  if (outType !== "none" && outDur > 0) {
    const exitStart = layer.end - outDur;
    if (currentTime >= exitStart && currentTime < layer.end) {
      return buildExitEffect(outType, Math.max(0, Math.min(1, 1 - (currentTime - exitStart) / outDur)), outIntensity);
    }
  }
  if (inType !== "none" && inDur > 0) {
    const entranceEnd = layer.start + inDur;
    if (currentTime >= layer.start && currentTime < entranceEnd) {
      return buildEntranceEffect(inType, Math.max(0, Math.min(1, (currentTime - layer.start) / inDur)), inIntensity);
    }
  }
  return { opacity: 1, tX: 0, tY: 0, scale: 1 };
}

function TimelineLayer({ layer, currentTime, fps }) {
  if (currentTime < layer.start || currentTime >= layer.end) return null;

  const tr = getInterpolatedTransform(layer, currentTime);
  const ts = getTransitionStyle(layer, currentTime);
  const startFrame = Math.round(layer.start * fps);
  const durationFrames = Math.max(1, Math.round((layer.end - layer.start) * fps));

  const CANVAS_W = 1080;
  const CANVAS_H = 1920;
  const baseStyle = {
    position: "absolute",
    left: tr.x,
    top: tr.y,
    width: tr.width,
    height: tr.height,
    opacity: tr.opacity * ts.opacity,
    transform: `${ts.tX ? `translateX(${ts.tX}%) ` : ""}${ts.tY ? `translateY(${ts.tY}%) ` : ""}rotate(${tr.rotation}deg) scale(${tr.scale * ts.scale})`,
    filter: [tr.blur > 0 ? `blur(${tr.blur}px)` : "", layer.filter || ""].filter(Boolean).join(" ") || undefined,
    backdropFilter: layer.backdropFilter || undefined,
    mixBlendMode: layer.mixBlendMode || layer.blendMode || undefined,
    borderRadius: (layer.transform?.borderRadius ?? layer.borderRadius) ? `${layer.transform?.borderRadius ?? layer.borderRadius}px` : undefined,
    border: layer.borderWidth ? `${layer.borderWidth}px solid ${layer.borderColor ?? "#ffffff"}` : undefined,
    boxShadow: layer.boxShadow || undefined,
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
    if (!layer.src) return null;
    return (
      <Sequence from={startFrame} durationInFrames={durationFrames}>
        <Img
          src={layer.src}
          style={{ ...baseStyle, position: "absolute", objectFit: layer.objectFit || "cover", objectPosition: layer.objectPosition || undefined }}
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
            fontStyle: s.fontStyle || "normal",
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
            whiteSpace: s.whiteSpace ?? "pre-wrap",
            wordBreak: s.wordBreak ?? "normal",
            overflow: "visible",
          }}
        >
          {s.accentWord && s.accentColor
            ? <span style={{ wordBreak: "break-word" }}>
                {(layer.content || "").split(" ").map((word, i, arr) => (
                  <span key={i} style={{ color: word === s.accentWord ? s.accentColor : s.color }}>
                    {word}{i < arr.length - 1 ? " " : ""}
                  </span>
                ))}
              </span>
            : layer.content
          }
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
          playbackRate={layer.playbackRate ?? 1}
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

  if (layer.type === "icon") {
    const IconComponent = LucideIcons[layer.iconName];
    if (IconComponent) {
      return (
        <Sequence from={startFrame} durationInFrames={durationFrames}>
          <AbsoluteFill style={{ ...baseStyle, position: "absolute", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IconComponent
              size={Math.min(layer.transform?.width ?? 120, layer.transform?.height ?? 120)}
              color={layer.style?.color || "#ffffff"}
              strokeWidth={1.5}
            />
          </AbsoluteFill>
        </Sequence>
      );
    }
    // fall back to gradient box if icon name not found in lucide-react
    return (
      <Sequence from={startFrame} durationInFrames={durationFrames}>
        <div style={{ ...baseStyle, position: "absolute", background: layer.gradient || layer.background || "#ffffff26" }} />
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
