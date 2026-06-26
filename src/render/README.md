# @vidquence/render

Vidquence's own **timeline → MP4** engine. Internal module (no published/public API yet).
It is the in-house alternative to Remotion, built clean-room around our own timeline format so
we own the render path outright — no third-party render license, no per-render fee, no
dependency risk as we scale.

> **Clean-room rule:** this engine is derived from our *own* code (`TimelineComposition.jsx`,
> `htmlMeasure.js`) and public concepts only. Do **not** copy from Remotion's source. Keeping
> the implementation independent is exactly what makes it legally safe.

## Why this exists

Remotion is free for ≤3-person companies, but it owns the single most critical step in the
product (rendering) and would require an Enterprise license once we grow / embed it for
end-users. Because Remotion is render-only in our stack (timeline, layers, motion, transitions,
JSON format and the editor preview are all already ours), replacing it means replacing **one
step** — and that's all this module is.

## Architecture

```
project (timeline JSON)
   │
   ├─ composer.js     → one self-contained HTML page with a deterministic window.__seekTo(t)
   │                    (ports our layer/transition/transform math; inlines local fonts)
   │
   ├─ frameDriver.js  → headless Chrome: load page once, step t = frame/fps, screenshot each
   │                    frame (reuses the container-hardened launch flags from htmlMeasure)
   │
   └─ stitcher.js     → ffmpeg: JPEG frames → h264 MP4, then mix + mux the audio layers
                        (ffmpeg-static / fluent-ffmpeg — already in the project)

index.js  → renderToFile(project, opts) orchestrates the above into a local MP4.
timeModel.js → the determinism backbone: everything is a pure function of an integer frame.
```

The **deterministic frame model** is the core correctness property: frame N is identical on
every machine and every run (no wall-clock, no requestAnimationFrame), so renders are
reproducible and can be chunked/parallelised later.

## How it's wired in

`src/server/services/renderService.js` reads `RENDER_ENGINE`:

- `RENDER_ENGINE=remotion` (default) → the proven Remotion path. **No behavior change.**
- `RENDER_ENGINE=vidquence` → this engine produces the MP4; renderService still owns upload +
  DB recording, so persistence is identical for both engines.

We flip a single service to `vidquence` only once it passes the shadow-diff; Remotion stays the
fallback until then.

## Validating: the shadow-diff

```
npm run shadow                                   # built-in sample timeline
npm run shadow -- --project path/to/timeline.json
```

Renders the same timeline through **both** engines and prints an **SSIM** score (1.0 =
identical). We point it at the hardest real projects (AI Video / Product video) and grow the
engine until SSIM ≥ ~0.98. Outputs land in `.shadow-out/` for eyeballing.

## Build phases (capability roadmap)

- **Phase 1 (current foundation):** text, gradient, image/sticker, captions, watermark +
  transforms, keyframes, in/out transitions, and audio mux. Targets Typography / Social.
- **Phase 2:** parity polish on images/scrims/overlays; real Lucide icon SVGs (currently a
  placeholder box).
- **Phase 3 (the hard 20%):** embedded **video** layers — seek source video to the frame,
  composite it, and include its audio. Gates AI Video / Product video modes.
- **Phase 4:** parallel frame-chunking for throughput (same concurrency discipline as the
  measure step), then full cutover per service.

## Known TODOs / not-yet-supported

- Embedded video layers are recognised but **not painted** yet (audio is still muxed).
- `icon` layers render as a placeholder box (real Lucide SVG pending).
- `maskShape` / clip-path and registry-only SFX (no resolved `src`) are not yet handled.
