export function pickFile(accept) {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = (e) => resolve(e.target.files?.[0] ?? null);
    input.click();
  });
}

export function getFileDuration(file) {
  return new Promise((resolve) => {
    const tag = file.type.startsWith("video") ? "video" : "audio";
    const el = document.createElement(tag);
    el.preload = "metadata";
    const url = URL.createObjectURL(file);
    el.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(isFinite(el.duration) ? el.duration : null); };
    el.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    el.src = url;
  });
}

export function makeLayerAt(type, project, start, duration, opts = {}) {
  const w = project?.format?.width  ?? 1080;
  const h = project?.format?.height ?? 1920;
  const id = crypto.randomUUID();
  const end = start + duration;

  const base = {
    id, trackId: id, type,
    name: opts.name || (type.charAt(0).toUpperCase() + type.slice(1)),
    visible: true, locked: false, start, end,
    zIndex: (project?.layers?.length ?? 0) + 1,
    objectFit: "cover",
    transform: { x: 0, y: 0, width: w, height: h, rotation: 0, scale: 1, opacity: 1, blur: 0 },
    keyframes: {},
  };

  if (type === "text") {
    const s = opts.style ?? {};
    return {
      ...base,
      content: "Text",
      transform: { ...base.transform, height: 200 },
      style: {
        fontFamily: "Outfit",
        fontSize: s.fontSize ?? 72, fontWeight: s.fontWeight ?? 800,
        color: s.color ?? "#ffffff", textAlign: s.textAlign ?? "center",
        lineHeight: 1.2, letterSpacing: 0,
        textShadow: null, background: null, borderRadius: 0, padding: 0,
      },
    };
  }
  if (type === "audio") {
    return { ...base, src: opts.src ?? null, volume: 1, muted: false, fadeIn: 0, fadeOut: 0, audioType: "music", trimStart: 0, trimEnd: duration };
  }
  if (type === "video") {
    return { ...base, src: opts.src ?? null, trimStart: 0, trimEnd: duration, playbackRate: 1, volume: 1, muted: false };
  }
  if (type === "image") return { ...base, src: opts.src ?? null };
  if (type === "sticker") {
    return { ...base, src: opts.src ?? null, transform: { ...base.transform, width: 300, height: 300 } };
  }
  return base;
}
