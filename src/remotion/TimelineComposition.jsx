import { AbsoluteFill, useCurrentFrame, useVideoConfig, Video, Audio, Img, Sequence, delayRender, continueRender, staticFile, interpolate } from "remotion";
import { loadSFXLibrary, getSFXPreviewUrl, getSFXDuration } from "../core/registries/sfxRegistry";
import { getClipPathCSS } from "../core/registries/shapeRegistry";
import assetShineRegistry from "../core/registries/assetShineRegistry";
import { useMemo, useEffect } from "react";
import * as LucideIcons from "lucide-react";

export default function TimelineComposition({ project }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
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

  // Load SELF-HOSTED fonts before any frame renders. The render runs in headless
  // Chrome with no access to fonts.googleapis.com, so we serve fonts locally from
  // public/fonts (run `npm run fetch-fonts` to populate). Loading the exact
  // families used, from local files, is deterministic across Remotion's parallel
  // render tabs → no font-swap flicker.
  const fontHandle = useMemo(() => delayRender("Loading fonts"), []);
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = staticFile("fonts/fonts.css"); // resolves to /public/fonts/... in the render bundle
    document.head.appendChild(link);

    // Explicitly resolve each used family/weight (the @font-face are lazy).
    const loads = fontFamilies.flatMap((family) =>
      [400, 700, 800].map((w) => document.fonts.load(`${w} 40px "${family}"`).catch(() => {}))
    );
    const ready   = Promise.all(loads).then(() => document.fonts.ready);
    const timeout = new Promise((resolve) => setTimeout(resolve, 8000));
    Promise.all([Promise.race([ready, timeout]), loadSFXLibrary()]).then(() => continueRender(fontHandle));

    return () => link.remove();
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

      {/* Free-plan watermark — added only at export time (render.js sets
          meta.showWatermark); never shown in the editor preview. */}
      {project?.meta?.showWatermark && <Watermark width={width} height={height} />}
    </AbsoluteFill>
  );
}

function Watermark({ width = 1080, height = 1920 }) {
  const base     = Math.min(width, height);
  const fontSize = Math.round(base * 0.026);
  const padV     = Math.round(fontSize * 0.5);
  const padH     = Math.round(fontSize * 0.75);
  const margin   = Math.round(base * 0.03);
  return (
    <div
      style={{
        position: "absolute",
        right: margin,
        bottom: margin,
        zIndex: 2147483647,
        opacity: 0.5,
        padding: `${padV}px ${padH}px`,
        background: "rgba(0,0,0,0.42)",
        borderRadius: Math.round(fontSize * 0.55),
        fontFamily: "Outfit, sans-serif",
        fontSize,
        fontWeight: 700,
        lineHeight: 1,
        color: "rgba(255,255,255,0.96)",
        letterSpacing: 0.2,
        textShadow: "0 1px 3px rgba(0,0,0,0.55)",
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}
    >
      Created on Vidquence.com
    </div>
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
    clipPath: layer.maskShape ? (getClipPathCSS(layer.maskShape) || undefined) : undefined,
    border: (layer.borderWidth ?? layer.transform?.borderWidth)
      ? `${layer.borderWidth ?? layer.transform?.borderWidth}px solid ${layer.borderColor ?? layer.transform?.borderColor ?? "#ffffff"}`
      : undefined,
    boxShadow: layer.boxShadow || undefined,
    zIndex: layer.zIndex,
  };

  // One-shot shine/flash overlay — a sibling div mirroring the asset's box, so the media
  // element is untouched. Frame is relative to the layer's start; the layer only renders
  // within its time window (guard above), so f >= 0 here.
  const shineEntry = layer.shineEffect ? assetShineRegistry[layer.shineEffect] : null;
  const shineNode = shineEntry ? (
    <div style={{ ...baseStyle, position: "absolute", overflow: "hidden" }}>
      {shineEntry.render(frame - startFrame, Math.max(1, Math.round(shineEntry.durationFrames * (fps / 25))), interpolate)}
    </div>
  ) : null;

  if (layer.type === "video") {
    return (
      <>
        <Sequence from={startFrame} durationInFrames={durationFrames}>
          <Video
            src={layer.src}
            style={{ ...baseStyle, position: "absolute", objectFit: layer.objectFit || "cover" }}
            startFrom={Math.round((layer.trimStart || 0) * fps)}
            volume={layer.muted ? 0 : (layer.volume ?? 1)}
            playbackRate={layer.playbackRate || 1}
          />
        </Sequence>
        {shineNode}
      </>
    );
  }

  if (layer.type === "image" || layer.type === "sticker") {
    if (!layer.src) return null;
    return (
      <>
        <Sequence from={startFrame} durationInFrames={durationFrames}>
          <Img
            src={layer.src}
            style={{ ...baseStyle, position: "absolute", objectFit: layer.objectFit || "cover", objectPosition: layer.objectPosition || undefined }}
          />
        </Sequence>
        {shineNode}
      </>
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
              (s.textAlign === "left" || s.textAlign === "start") ? "flex-start"
              : (s.textAlign === "right" || s.textAlign === "end") ? "flex-end" : "center",
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
        <div style={{ ...baseStyle, position: "absolute", background: layer.gradient || "transparent" }} />
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
