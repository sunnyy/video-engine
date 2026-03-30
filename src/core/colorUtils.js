/**
 * colorUtils.js
 * Place at: src/core/colorUtils.js
 *
 * Shared by every block renderer.
 * Import: import { deriveColors, BLOCK_FONTS, makeGlow } from "../../core/colorUtils";
 */

/* ─── Font stacks ─────────────────────────────────────────── */
export const BLOCK_FONTS = {
  bebas:     "'Bebas Neue', sans-serif",
  syne:      "'Syne', sans-serif",
  outfit:    "'Outfit', sans-serif",
  playfair:  "'Playfair Display', serif",
  mono:      "'JetBrains Mono', monospace",
  dm:        "'DM Sans', sans-serif",
  barlow:    "'Barlow Condensed', sans-serif",
  unbounded: "'Unbounded', sans-serif",
};

/* ─── Hex → HSL ───────────────────────────────────────────── */
function hexToHsl(hex) {
  const r = parseInt(hex.slice(1,3),16)/255;
  const g = parseInt(hex.slice(3,5),16)/255;
  const b = parseInt(hex.slice(5,7),16)/255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  let h,s,l=(max+min)/2;
  if(max===min){h=s=0;}
  else{
    const d=max-min;
    s=l>0.5?d/(2-max-min):d/(max+min);
    switch(max){
      case r:h=((g-b)/d+(g<b?6:0))/6;break;
      case g:h=((b-r)/d+2)/6;break;
      case b:h=((r-g)/d+4)/6;break;
    }
  }
  return[h*360,s*100,l*100];
}

/* ─── HSL → Hex ───────────────────────────────────────────── */
function hslToHex(h,s,l){
  h/=360;s/=100;l/=100;
  const hue2rgb=(p,q,t)=>{
    if(t<0)t+=1;if(t>1)t-=1;
    if(t<1/6)return p+(q-p)*6*t;
    if(t<1/2)return q;
    if(t<2/3)return p+(q-p)*(2/3-t)*6;
    return p;
  };
  let r,g,b;
  if(s===0){r=g=b=l;}
  else{
    const q=l<0.5?l*(1+s):l+s-l*s;
    const p=2*l-q;
    r=hue2rgb(p,q,h+1/3);
    g=hue2rgb(p,q,h);
    b=hue2rgb(p,q,h-1/3);
  }
  return"#"+[r,g,b].map(x=>Math.round(x*255).toString(16).padStart(2,"0")).join("");
}

/**
 * Derive a full color palette from one brand/accent hex.
 *
 * @param {string} accent  - hex color e.g. "#6c47ff"
 * @param {string} treatment - "dark" | "neon" | "light" | "glass" | "gold"
 * @returns {object} palette
 *
 * Common keys on every palette:
 *   bg, bg2, bg3      - background shades
 *   text, textDim, textGhost
 *   border
 *   accent, dim
 *   glow40, glow60, glow80
 *   glowShadow        - ready-made CSS text-shadow / box-shadow glow string
 *   complement        - opposite hue
 *   analogous         - adjacent hue
 */
export function deriveColors(accent="#f0e040", treatment="dark"){
  const safe=/^#[0-9a-fA-F]{6}$/.test(accent)?accent:"#f0e040";
  const[h,s,l]=hexToHsl(safe);

  const dim       = safe+"28";
  const glow40    = safe+"40";
  const glow60    = safe+"60";
  const glow80    = safe+"80";
  const glowShadow= `0 0 40px ${glow60}, 0 0 80px ${glow40}`;
  const complement= hslToHex((h+180)%360,s,l);
  const analogous = hslToHex((h+30)%360,s,l);

  const base={accent:safe,dim,glow40,glow60,glow80,glowShadow,complement,analogous};

  const palettes={
    dark:{
      ...base,
      bg:"#0b0b10",bg2:"#111118",bg3:"#1c1c28",
      text:"#ffffff",
      textDim:"rgba(255,255,255,0.55)",
      textGhost:"rgba(255,255,255,0.18)",
      border:"rgba(255,255,255,0.07)",
      border2:"rgba(255,255,255,0.12)",
    },
    neon:{
      ...base,
      bg:"#04040a",bg2:"#0a0a14",bg3:"#111120",
      text:safe,
      textDim:glow80,
      textGhost:glow40,
      border:glow40,
      border2:glow60,
      glowShadow:`0 0 20px ${safe}, 0 0 60px ${glow60}`,
    },
    light:{
      ...base,
      bg:"#f5f3ee",bg2:"#eceae3",bg3:"#e0ddd4",
      text:"#111111",
      textDim:"rgba(17,17,17,0.55)",
      textGhost:"rgba(17,17,17,0.20)",
      border:"rgba(17,17,17,0.10)",
      border2:"rgba(17,17,17,0.18)",
    },
    glass:{
      ...base,
      bg:"rgba(255,255,255,0.05)",
      bg2:"rgba(255,255,255,0.08)",
      bg3:"rgba(255,255,255,0.14)",
      text:"#ffffff",
      textDim:"rgba(255,255,255,0.60)",
      textGhost:"rgba(255,255,255,0.25)",
      border:"rgba(255,255,255,0.12)",
      border2:"rgba(255,255,255,0.20)",
      blur:24,
    },
    gold:{
      ...base,
      accent:"#ffd700",
      dim:"#ffd70028",
      glow40:"#ffd70040",
      glow60:"#ffd70060",
      glow80:"#ffd70080",
      glowShadow:"0 0 30px rgba(255,215,0,0.5)",
      bg:"#080600",bg2:"#100e00",bg3:"#1a1800",
      text:"#f5e6b3",
      textDim:"#c9a84c",
      textGhost:"rgba(201,168,76,0.30)",
      border:"rgba(201,168,76,0.20)",
      border2:"rgba(201,168,76,0.35)",
    },
  };

  return palettes[treatment]||palettes.dark;
}

/**
 * Generate a CSS box-shadow / text-shadow glow string.
 * @param {string} color   - hex
 * @param {number} layers  - 1–4, more = wider glow
 */
export function makeGlow(color,layers=2){
  const hex=/^#[0-9a-fA-F]{6}$/.test(color)?color:"#ffffff";
  return Array.from({length:layers},(_,i)=>{
    const r=20*(i+1);
    const op=Math.max(70-i*22,18).toString(16).padStart(2,"0");
    return `0 0 ${r}px ${hex}${op}`;
  }).join(", ");
}