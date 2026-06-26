/**
 * @vidquence/render — composer.js
 *
 * Turns a Vidquence timeline (project.layers) into ONE self-contained HTML document whose
 * in-page script can paint the exact frame for any time `t` via window.__seekTo(t). The
 * frameDriver loads this page once, then steps t = frame/fps and screenshots each frame.
 *
 * The per-layer style / transition / transform math is ported from the project's own
 * TimelineComposition (our code) so the output matches the current Remotion render during
 * the shadow-diff. This is a clean-room reimplementation against our timeline format — it
 * does NOT use Remotion's renderer/player internals.
 *
 * Phase 0/1 scope: text, image/sticker, gradient, captions, icon (box), watermark, plus
 * transforms, keyframes and in/out transitions, and audio extraction for the stitcher.
 * Embedded VIDEO layers are recognised but not yet painted (Phase 3) — their audio is still
 * collected so voiceover/music are correct.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as LucideIcons from "lucide-react";
import { getClipPathCSS } from "../core/registries/shapeRegistry.js";
import { durationToFrames } from "./timeModel.js";

/**
 * Render a Lucide icon to a static SVG string (server-side) so headless Chrome paints the
 * exact same glyph as the editor/Remotion path, which uses the same lucide-react components.
 * Mirrors TimelineComposition: size = min(width,height), color from style, strokeWidth 1.5.
 */
function iconToSvg(iconName, size, color) {
  const Comp = iconName && LucideIcons[iconName];
  if (!Comp) return null;
  try {
    return renderToStaticMarkup(createElement(Comp, { size, color: color || "#ffffff", strokeWidth: 1.5 }));
  } catch { return null; }
}

const FONTS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../public/fonts");
let _localFontCss;
/** Inline the bundled woff2 as data-URI @font-face so headless Chrome needs no font CDN. */
function localFontsCss() {
  if (_localFontCss !== undefined) return _localFontCss;
  try {
    const css = fs.readFileSync(path.join(FONTS_DIR, "fonts.css"), "utf8");
    _localFontCss = css.replace(/url\(['"]?\.\/([^'")]+)['"]?\)/g, (m, file) => {
      try {
        const buf = fs.readFileSync(path.join(FONTS_DIR, file));
        // Replace ONLY the url() — the original rule keeps its trailing format('woff2'),
        // so appending another here would create an invalid double-format src descriptor
        // (Chrome then drops the @font-face → text silently falls back to a serif).
        return `url(data:font/woff2;base64,${buf.toString("base64")})`;
      } catch { return m; }
    });
  } catch { _localFontCss = ""; }
  return _localFontCss;
}

/** Audio-ish layers the stitcher must mux. Times are in seconds (timeline space). */
function extractAudio(layers) {
  const out = [];
  for (const l of layers) {
    if (l.type === "audio" && l.src && !l.muted) {
      out.push({ src: l.src, start: l.start || 0, end: l.end ?? null, trimStart: l.trimStart || 0, volume: l.volume ?? 1, playbackRate: l.playbackRate ?? 1 });
    }
    // Per-layer SFX that already carries a resolved src (registry-only SFX → Phase 1+).
    if (l.sfx?.src) {
      out.push({ src: l.sfx.src, start: (l.start || 0) + (l.sfx.delay || 0), end: null, trimStart: 0, volume: l.sfx.volume ?? 1, playbackRate: 1 });
    }
    // TODO Phase 3: non-muted embedded video layers contribute their own audio track.
  }
  return out;
}

/**
 * compose(project, { width, height, fps }) → { html, durationInFrames, fps, width, height, audio }
 * width/height are the composition (base) coordinate space; the frameDriver upscales via
 * deviceScaleFactor for 4k, so the page itself always lays out in base coordinates.
 */
export function compose(project, { width = 1080, height = 1920, fps = 30 } = {}) {
  const allLayers = [...(project?.layers || [])]
    .filter((l) => l.type === "audio" || l.visible !== false)
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  const visualLayers = allLayers.filter((l) => l.type !== "audio");
  const audio = extractAudio(allLayers);
  // Video layers (Phase 3): frames are extracted by ffmpeg and injected per-frame by the
  // frameDriver into the <img id="vqv-{i}"> the composer renders. `i` is the index in the
  // page's layer array (= pageLayers order), so the driver can target the right element.
  const videoLayers = [];

  const durationSec = project?.format?.duration || 30;
  const durationInFrames = durationToFrames(durationSec, fps);
  const background = project?.format?.background || "#000";
  const showWatermark = !!project?.meta?.showWatermark;

  // Only serialisable, render-relevant fields cross into the page.
  const pageLayers = visualLayers.map((l) => ({
    type: l.type, start: l.start, end: l.end, zIndex: l.zIndex ?? 0,
    transform: l.transform || {}, keyframes: l.keyframes || {}, transition: l.transition || null,
    content: l.content ?? null, style: l.style || {}, src: l.src ?? null, objectFit: l.objectFit ?? null,
    objectPosition: l.objectPosition ?? null, gradient: l.gradient ?? null, iconName: l.iconName ?? null,
    trimStart: l.trimStart ?? 0, playbackRate: l.playbackRate ?? 1,
    iconSvg: l.type === "icon" ? iconToSvg(l.iconName, Math.min(l.transform?.width ?? 120, l.transform?.height ?? 120), l.style?.color) : null,
    clipPath: l.maskShape ? getClipPathCSS(l.maskShape) : (l.clipPath ?? null),
    captionStyle: l.captionStyle || {}, segments: l.segments || null,
    filter: l.filter ?? null, backdropFilter: l.backdropFilter ?? null,
    mixBlendMode: l.mixBlendMode ?? l.blendMode ?? null,
    borderRadius: l.transform?.borderRadius ?? l.borderRadius ?? null,
    borderWidth: l.borderWidth ?? l.transform?.borderWidth ?? null,
    borderColor: l.borderColor ?? l.transform?.borderColor ?? "#ffffff",
    boxShadow: l.boxShadow ?? null,
  }));

  pageLayers.forEach((pl, i) => {
    if (pl.type === "video" && pl.src) videoLayers.push({ i, src: pl.src, start: pl.start, end: pl.end, trimStart: pl.trimStart || 0, playbackRate: pl.playbackRate || 1 });
  });

  const html = pageHtml({ width, height, fps, background, showWatermark, layers: pageLayers, fontCss: localFontsCss() });
  return { html, durationInFrames, fps, width, height, audio, videoLayers };
}

/** The full HTML document, including the in-page render runtime. */
function pageHtml({ width, height, fps, background, showWatermark, layers, fontCss }) {
  const wmFont = Math.round(Math.min(width, height) * 0.026);
  const wmMargin = Math.round(Math.min(width, height) * 0.03);
  return `<!doctype html><html><head><meta charset="utf-8">
<style>
  ${fontCss}
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:${width}px; height:${height}px; overflow:hidden; background:${background}; }
  #stage { position:relative; width:${width}px; height:${height}px; overflow:hidden; background:${background}; }
  .vq-layer { position:absolute; will-change:transform,opacity; }
</style></head>
<body><div id="stage"></div>
${showWatermark ? `<div id="vq-watermark" style="position:absolute;right:${wmMargin}px;bottom:${wmMargin}px;z-index:2147483647;opacity:.5;padding:${Math.round(wmFont*0.5)}px ${Math.round(wmFont*0.75)}px;background:rgba(0,0,0,.42);border-radius:${Math.round(wmFont*0.55)}px;font-family:Outfit,sans-serif;font-size:${wmFont}px;font-weight:700;line-height:1;color:rgba(255,255,255,.96);letter-spacing:.2px;text-shadow:0 1px 3px rgba(0,0,0,.55);white-space:nowrap;pointer-events:none;">Created on Vidquence.com</div>` : ""}
<script>
const FPS = ${fps};
const LAYERS = ${JSON.stringify(layers)};
const stage = document.getElementById("stage");

// ── Easing (ported from TimelineComposition) ──
const easeOutQuart   = (t)=>1-Math.pow(1-t,4);
const easeInQuart    = (t)=>t*t*t*t;
const easeInOutQuart = (t)=>t<0.5?8*t*t*t*t:1-Math.pow(-2*t+2,4)/2;
const clamp01 = (x)=>Math.max(0,Math.min(1,x));

function buildEntrance(type,p,i){ i=clamp01(i==null?1:i); const e=easeOutQuart(p),ef=easeInOutQuart(p);
  switch(type){
    case "crossfade": case "fade": case "dissolve": return {opacity:1-i*(1-ef),tX:0,tY:0,scale:1};
    case "slide-left":  return {opacity:1,tX:(1-e)*100*i,tY:0,scale:1};
    case "slide-right": return {opacity:1,tX:-(1-e)*100*i,tY:0,scale:1};
    case "slide-up":    return {opacity:1,tX:0,tY:(1-e)*100*i,scale:1};
    case "slide-down":  return {opacity:1,tX:0,tY:-(1-e)*100*i,scale:1};
    case "zoom-in": case "zoom": return {opacity:1-i*(1-ef),tX:0,tY:0,scale:1-i*0.2*(1-e)};
    default: return {opacity:1,tX:0,tY:0,scale:1};
  }}
function buildExit(type,p,i){ i=clamp01(i==null?1:i); const e=easeInQuart(p),ef=easeInOutQuart(p);
  switch(type){
    case "crossfade": case "fade": case "dissolve": return {opacity:(1-i)+i*ef,tX:0,tY:0,scale:1};
    case "slide-left":  return {opacity:1,tX:-(1-e)*100*i,tY:0,scale:1};
    case "slide-right": return {opacity:1,tX:(1-e)*100*i,tY:0,scale:1};
    case "slide-up":    return {opacity:1,tX:0,tY:-(1-e)*100*i,scale:1};
    case "slide-down":  return {opacity:1,tX:0,tY:(1-e)*100*i,scale:1};
    case "zoom-in": case "zoom": return {opacity:(1-i)+i*ef,tX:0,tY:0,scale:1-i*0.2*(1-e)};
    default: return {opacity:1,tX:0,tY:0,scale:1};
  }}
function transitionStyle(L,t){
  const inCfg=L.transition?.in ?? (L.transition?.type?L.transition:null);
  const outCfg=L.transition?.out ?? null;
  const outType=outCfg?.type??"none", outDur=outCfg?.duration??0.5, outI=outCfg?.intensity??1;
  const inType=inCfg?.type??"none", inDur=inCfg?.duration??0.5, inI=inCfg?.intensity??1;
  if(outType!=="none"&&outDur>0){ const s=L.end-outDur; if(t>=s&&t<L.end) return buildExit(outType,clamp01(1-(t-s)/outDur),outI); }
  if(inType!=="none"&&inDur>0){ const e=L.start+inDur; if(t>=L.start&&t<e) return buildEntrance(inType,clamp01((t-L.start)/inDur),inI); }
  return {opacity:1,tX:0,tY:0,scale:1};
}
function interpTransform(L,t){
  const tf=L.transform||{}, kf=L.keyframes||{}, lt=t-L.start;
  const I=(prop,def)=>{ const f=kf[prop]; if(!f||!f.length) return tf[prop]??def; if(f.length===1) return f[0].value;
    const s=[...f].sort((a,b)=>a.time-b.time);
    if(lt<=s[0].time) return s[0].value; if(lt>=s[s.length-1].time) return s[s.length-1].value;
    const ni=s.findIndex(k=>k.time>lt), pv=s[ni-1], nx=s[ni], pr=(lt-pv.time)/(nx.time-pv.time);
    return pv.value+(nx.value-pv.value)*pr; };
  return { x:I("x",0), y:I("y",0), width:I("width",tf.width??1080), height:I("height",tf.height??1920),
    rotation:I("rotation",0), scale:I("scale",1), opacity:I("opacity",1), blur:I("blur",0) };
}

// ── Build DOM once ──
const nodes = LAYERS.map((L,i)=>{
  const el=document.createElement("div"); el.className="vq-layer"; el.style.zIndex=L.zIndex;
  if(L.type==="text"){
    const s=L.style||{};
    Object.assign(el.style,{fontFamily:s.fontFamily||"Outfit",fontSize:(s.fontSize||48)+"px",fontWeight:s.fontWeight||700,
      fontStyle:s.fontStyle||"normal",color:s.color||"#fff",textAlign:s.textAlign||"center",lineHeight:s.lineHeight||1.2,
      letterSpacing:(s.letterSpacing||0)+"px",textTransform:s.textTransform||"none",background:s.background||"",
      borderRadius:(s.borderRadius||0)+"px",padding:(s.padding||0)+"px",textShadow:s.textShadow||"",
      display:"flex",alignItems:"center",
      justifyContent:(s.textAlign==="left"||s.textAlign==="start")?"flex-start":(s.textAlign==="right"||s.textAlign==="end")?"flex-end":"center",
      whiteSpace:s.whiteSpace??"pre-wrap",wordBreak:s.wordBreak??"normal",overflow:"visible"});
    if(s.accentWord&&s.accentColor){ const wrap=document.createElement("span"); wrap.style.wordBreak="break-word";
      (L.content||"").split(" ").forEach((w,i,arr)=>{ const sp=document.createElement("span");
        sp.style.color=(w===s.accentWord)?s.accentColor:(s.color||"#fff"); sp.textContent=w+(i<arr.length-1?" ":""); wrap.appendChild(sp);});
      el.appendChild(wrap);
    } else el.textContent=L.content||"";
  } else if(L.type==="image"||L.type==="sticker"){
    if(L.src){ const img=document.createElement("img"); img.src=L.src;
      Object.assign(img.style,{width:"100%",height:"100%",objectFit:L.objectFit||"cover",objectPosition:L.objectPosition||""}); el.appendChild(img); }
  } else if(L.type==="gradient"){ el.style.background=L.gradient||"transparent";
  } else if(L.type==="captions"){ /* content set per-frame */ const s=L.captionStyle||{};
    Object.assign(el.style,{fontFamily:s.fontFamily||"Outfit",fontSize:(s.fontSize||48)+"px",fontWeight:s.fontWeight||700,
      color:s.color||"#fff",textAlign:s.textAlign||"center",background:s.background||"rgba(0,0,0,0.5)",
      borderRadius:(s.borderRadius||8)+"px",padding:(s.padding||8)+"px"});
  } else if(L.type==="icon"){
    if(L.iconSvg){ el.style.alignItems="center"; el.style.justifyContent="center"; el.innerHTML=L.iconSvg; }
    else { el.style.background=L.gradient||"rgba(255,255,255,0.15)"; el.style.borderRadius="12px"; } // fallback if icon name unknown
  } else if(L.type==="video"){ // Phase 3: frameDriver injects ffmpeg-extracted frames into this img
    const v=document.createElement("img"); v.id="vqv-"+i;
    Object.assign(v.style,{width:"100%",height:"100%",objectFit:L.objectFit||"cover",objectPosition:L.objectPosition||""});
    el.appendChild(v);
  }
  // Common box styling
  if(L.borderRadius) el.style.borderRadius=(typeof L.borderRadius==="number"?L.borderRadius+"px":L.borderRadius);
  if(L.borderWidth) el.style.border=L.borderWidth+"px solid "+(L.borderColor||"#fff");
  if(L.boxShadow) el.style.boxShadow=L.boxShadow;
  if(L.backdropFilter) el.style.backdropFilter=L.backdropFilter;
  if(L.mixBlendMode) el.style.mixBlendMode=L.mixBlendMode;
  if(L.clipPath) el.style.clipPath=L.clipPath; // maskShape (e.g. pentagon) → CSS clip-path
  el.style.display="none";
  stage.appendChild(el);
  return {el,L};
});

window.__seekTo = function(t){
  for(const {el,L} of nodes){
    if(t<L.start||t>=L.end){ el.style.display="none"; continue; }
    const tr=interpTransform(L,t), ts=transitionStyle(L,t);
    el.style.display = (L.type==="text"||L.type==="captions"||L.type==="icon")?"flex":"block";
    el.style.left=tr.x+"px"; el.style.top=tr.y+"px"; el.style.width=tr.width+"px"; el.style.height=tr.height+"px";
    el.style.opacity=tr.opacity*ts.opacity;
    el.style.transform=(ts.tX?("translateX("+ts.tX+"%) "):"")+(ts.tY?("translateY("+ts.tY+"%) "):"")+"rotate("+tr.rotation+"deg) scale("+(tr.scale*ts.scale)+")";
    const blur=tr.blur>0?("blur("+tr.blur+"px)"):""; const f=[blur,L.filter||""].filter(Boolean).join(" ");
    el.style.filter=f||"";
    if(L.type==="captions"){ const seg=(L.segments||[]).find(s=>t>=s.start&&t<s.end); if(!seg){ el.style.display="none"; } else el.textContent=seg.text; }
  }
};
window.__ready = true;
window.__seekTo(0);
</script></body></html>`;
}
