# Video Clipping — MVP Spec (planning only, not built)

**One-liner:** User uploads a long video (podcast / talk / interview / stream); we transcribe it,
GPT-4.1 intelligently selects the best self-contained moments, and we return several vertical,
captioned, editor-ready short clips. *Repurpose existing content* — the inverse of the rest of the
suite, which *generates* new video.

**Positioning:** Win as a feature of the all-in-one tool ("clip *and* create in one place, clips
land in the same editor you already use"), not as a standalone OpusClip competitor.

**Build philosophy:** Server-first, maximum reuse. The only genuinely new pieces are the GPT clip-
selection contract and the multi-clip output UX. Validate selection quality with real users before
optimizing storage/bandwidth.

---

## 1. User flow (MVP)

1. New service tile → `/video-clipping` (or similar).
2. User uploads a video (cap for v1: **≤ ~45 min / ≤ ~1 GB**; show the cap up front).
3. (Optional) light controls: target clip length range (e.g. 20–60s), language, caption style,
   number of clips ("auto" by default — let GPT decide).
4. Submit → charged by source duration → async job (existing queue + "notify when done").
5. On completion: a set of clips, each a normal **editable timeline project** (open, tweak captions,
   trim, re-render, publish like any other service output).

> UX model note: this uses the **async job + notification** pattern (like AutoPilot/render jobs),
> NOT a live SSE wait. Long videos take minutes; user shouldn't be forced to stare at a spinner.

---

## 2. Pipeline stages (server-first)

```
upload → extract audio → transcribe (timestamps) → GPT-4.1 select clips
       → per clip: cut + reframe 9:16 + burn captions → save as editable project
       → delete source file → notify user
```

1. **Upload** — accept the file; store transiently (NOT long-term).
2. **Extract audio** — ffmpeg, audio-only (small) for transcription.
3. **Transcribe** — Speech-to-Text/Whisper → **word- or segment-level timestamps** (required so GPT
   can point at exact ranges).
4. **Select clips (GPT-4.1)** — timestamped transcript in → ranked clip list out (contract below).
5. **Render each clip** — cut the segment from source → reframe to 9:16 with subject tracking
   (reuse Talking Head reframe) → burn captions (reuse Auto Captions / TH caption pipeline).
6. **Persist** — each clip → a `projects` row that opens in the timeline editor.
7. **Cleanup** — **delete the uploaded source immediately** after processing; keep only the clips.
   (This is what defuses the storage concern without needing the blob/client-side approach.)
8. **Notify** — in-app + email "your clips are ready."

---

## 3. Reuse map

| Capability                     | Status   | Source |
|--------------------------------|----------|--------|
| Transcription (+ timestamps)   | Reuse    | Speech-to-Text service |
| Reframe 16:9 → 9:16 + tracking | Reuse    | Talking Head reframe |
| Caption burn + styles          | Reuse    | Auto Captions / TH captions |
| Async long jobs + notify       | Reuse    | AutoPilot job/queue + notifications |
| Editable output                | Reuse    | Timeline editor (clips = projects) |
| Duration-based pricing         | Reuse    | creditCosts / VIDEO_DURATION_BANDS |
| **Clip-selection intelligence**| **NEW**  | GPT-4.1 contract (§5) |
| **Multi-clip output UX**       | **NEW**  | upload page + "clips ready" set view |

≈70% of the plumbing already exists. New surface area is small and well-contained.

---

## 4. Make-or-break

The entire value is **moment selection**. A random slicer is worthless. The bar:
- **Selection quality** — clips must be self-contained, hook-first, insight/emotion-dense.
- **Reframe quality** — subject stays in frame; no janky cropping.
If both are good, it sells itself. Everything else is secondary.

---

## 5. GPT-4.1 clip-selection contract

**Input:** full timestamped transcript (segments with start/end + text), plus light params
(target length range, max clips or "auto", language). Follows the "nothing rigid" rule — no fixed
count, GPT decides how many good moments exist.

**Output (per clip):**
- `start` / `end` (seconds, from transcript timestamps)
- `title` (short, hooky — for the clip name / potential caption)
- `hook_reason` (one line: why this works — used internally / for the user-facing "why")
- `transcript_excerpt` (the spoken text in range, for caption alignment)
- optional `score` (relative strength, for ordering — NOT shown as a fake "virality %")

**Rules to encode:** prefer complete thoughts (don't cut mid-sentence), start on a strong hook,
respect the length range, avoid overlap, skip filler/intros/dead air.

---

## 6. Pricing

Duration-based on **source length** (longer input = more transcription + render work). Slot into the
existing credit model alongside the other video services. Exact band: TBD.

---

## 7. Data model notes

- Each clip = a `projects` row with a new `source` value, e.g. **`video_clip`** (so it gets its own
  filter pill on /projects and its own catalog entry).
- Add a `serviceCatalog.js` entry (tier 2, likely `beta: true` at launch).
- Add a `/projects` filter pill (label "Video Clipping" or "Clips").
- Source files are transient — no long-term storage row needed for the original.

---

## 8. Scope

**In (MVP):**
- Upload (capped) → transcribe → GPT select → cut + reframe 9:16 + captions → editable clips.
- Async job + notify. Duration pricing. Source auto-deleted after processing.

**Out (deferred):**
- Phase 2: **blob/client-side optimization** — keep full file local in browser, upload *only audio*
  for analysis + *only selected short segments* for finishing (cuts bandwidth/storage to near-zero).
  Take this on only after the feature is validated; it brings ffmpeg.wasm/WebCodecs complexity,
  browser variance, and session-bound-file UX tradeoffs.
- Phase 3: AI titles/hooks polish, emoji/animated captions, virality ranking, multiple aspect
  ratios (1:1, 4:5, 16:9), brand kit, b-roll insertion.

---

## 9. Open decisions / risks

1. **v1 caps** — confirm max duration / file size (proposed ≤45 min / ≤1 GB).
2. **Transcription cost/limits** — long audio cost per job; any provider duration ceiling?
3. **Worker load** — reframe/render of several clips per job; lean on the queue, watch the known
   Railway worker scaling limits (cap concurrent clip renders per job).
4. **Selection prompt iteration** — budget time to tune the GPT contract on real podcasts; this is
   the quality lever.
5. **Phase-2 trigger** — what volume/storage cost justifies building the blob path.

---

## 10. Recommended sequencing

1. **Phase 1 MVP** as above → validate selection quality with a handful of real users.
2. **Phase 2** blob/bandwidth optimization once proven.
3. **Phase 3** feature polish only where users pull for it.
