/**
 * generateStructuredShort.js
 *
 * Orchestrator — calls the 4-step pipeline then hands off to the beat pipeline.
 * Steps: classify → expand pattern → research → generate content → validate
 *
 * Supports: Hindi, English, Hinglish, and any other language.
 */

import { buildBeatsFromScript } from "../../core/buildBeatsFromScript";
import { serverFetch } from "../serverApi";
import { pickAutoMusic, MUSIC_PREVIEW_URLS } from "../../core/registries/musicRegistry";
import { generateZoneImage } from "../../server/assets/falService";
import { getLayoutDef, refreshCache } from "../../core/registries/layoutRegistry";
import { measureAudioDuration, syncBeatsToTTS } from "../../core/syncBeatsToTTs";
import { generateVideoDNA } from "../../core/videoDNA";
import { generateZoneContent } from "./generateZoneContent";
import { pickMotion } from "../../core/visualPlanner";
import { classifyTopic } from "./classifier";
import { getPattern, expandPattern } from "./patterns";
import { generateContent } from "./contentGenerator";
import { validateContent } from "./qualityValidator";

/* ─────────────────────────────────────────────────────────────
   TOPIC RESEARCH — fetches context before content generation
───────────────────────────────────────────────────────────── */
async function researchTopic({ topic, videoType, audience, language }) {
  try {
    const res = await serverFetch("/api/research-topic", {
      method: "POST",
      body:   JSON.stringify({ topic, videoType, audience, language }),
    });
    if (!res.ok) throw new Error(`Research endpoint returned ${res.status}`);
    const d = await res.json();

    const keyFacts   = Array.isArray(d.key_facts)         ? d.key_facts.join("\n")         : "";
    const hookIdeas  = Array.isArray(d.hook_ideas)        ? d.hook_ideas.join("\n")         : "";
    const entities   = Array.isArray(d.specific_entities) ? d.specific_entities.join(", ") : "";
    const angle      = d.counterintuitive_angle  || "";
    const nowContext = d.current_context          || "";
    const emotion    = d.emotional_angle          || "";

    const formatted = [
      keyFacts   && `KEY FACTS:\n${keyFacts}`,
      angle      && `COUNTERINTUITIVE ANGLE: ${angle}`,
      hookIdeas  && `HOOK IDEAS:\n${hookIdeas}`,
      entities   && `SPECIFIC ENTITIES: ${entities}`,
      nowContext && `CURRENT CONTEXT: ${nowContext}`,
      emotion    && `EMOTIONAL ANGLE: ${emotion}`,
    ].filter(Boolean).join("\n");

    console.log("[research] Topic researched:", topic);
    return formatted;
  } catch (err) {
    console.warn("[research] Research failed, continuing without context:", err.message);
    return "";
  }
}

/* ─────────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────────── */
export async function generateStructuredShort({
  topic,
  mode             = "faceless",
  orientation      = "9:16",
  generateImages   = false,
  generateTTS      = false,
  ttsVoice         = "female_warm",
  language         = "english",
  videoType        = "viral",
  context          = "",
  brandColor       = null,
  audience         = "general",
  tone             = "bold",
  projectId        = null,
  talkingHead      = null,
  onProgress       = null,
}) {
  const report = (step) => { if (onProgress) onProgress(step); };

  // Always refresh layout registry before generation so newly-added Supabase layouts are visible
  await refreshCache();

  let parsedScript;
  let detectedNiche = null; // hoisted so it's accessible after the if/else for generateVideoDNA

  /* ── Transcript path (Upload Video option) — focused Claude call for beat splitting + intent ── */
  if (talkingHead?.type === "upload" && talkingHead.segments?.length) {
    report("transcript");

    const rawSegments = talkingHead.segments;

    // Single focused OpenAI call — processes transcript into beats with intent + energy
    const segmentsForPrompt = rawSegments.map(s => ({
      start: s.start,
      end:   s.end,
      text:  s.text?.trim() || "",
    }));

    let aiBeats = null;
    try {
      const beatRes = await serverFetch("/api/process-beats", {
        method: "POST",
        body:   JSON.stringify({ segments: segmentsForPrompt }),
      });
      if (beatRes.ok) {
        const beatData = await beatRes.json();
        if (Array.isArray(beatData.beats) && beatData.beats.length > 0) {
          aiBeats = beatData.beats;
        }
      }
    } catch (e) {
      console.warn("[transcript beats] OpenAI call failed, using raw segments:", e.message);
    }

    // Fallback: if Claude call failed, do a simple 2s merge pass
    if (!aiBeats) {
      const merged = [];
      let pending  = null;
      for (const seg of rawSegments) {
        if (!pending) {
          pending = { ...seg };
        } else {
          pending.text = (pending.text || "") + " " + (seg.text || "");
          pending.end  = seg.end;
        }
        const dur = (pending.end ?? 0) - (pending.start ?? 0);
        if (dur >= 2.0) { merged.push(pending); pending = null; }
      }
      if (pending) merged.push(pending);

      const total = merged.length;
      aiBeats = merged.map((seg, i) => {
        const pos = total <= 1 ? 0.5 : i / (total - 1);
        let intent, energy;
        if      (i === 0)         { intent = "curiosity"; energy = 0.8; }
        else if (i === total - 1) { intent = "urgency";   energy = 0.75; }
        else if (pos < 0.35)      { intent = "shock";       energy = 0.7; }
        else if (pos < 0.65)      { intent = "explanation"; energy = 0.5; }
        else                      { intent = "reveal";       energy = 0.6; }
        return { spoken: seg.text?.trim() || "", start_sec: seg.start ?? null, end_sec: seg.end ?? null, intent, energy, showAvatar: true, asset_hint: null };
      });
    }

    const validIntentsSet = new Set(["shock","curiosity","proof","irony","reveal","empathy","urgency","explanation","contrast","punchline"]);
    parsedScript = {
      videoType,
      language,
      niche:        null,
      emotionalArc: "Viewer follows the spoken content",
      beats: aiBeats
        .filter(b => b.spoken?.trim())
        .map((b, i) => ({
          order:          i,
          spoken:         b.spoken.trim(),
          intent:         validIntentsSet.has(b.intent) ? b.intent : "explanation",
          energy:         typeof b.energy === "number" ? Math.min(1, Math.max(0, b.energy)) : 0.5,
          visual_hint:    b.showAvatar === false ? "product" : "faces",
          emphasis_words: [],
          showAvatar:     b.showAvatar !== false,
          asset_hint:     b.showAvatar === false && b.asset_hint ? {
            keywords:     Array.isArray(b.asset_hint.keywords) ? b.asset_hint.keywords : [],
            prompt:       b.asset_hint.prompt || null,
            visual_type:  ["entity","abstract","scene"].includes(b.asset_hint.visual_type) ? b.asset_hint.visual_type : "abstract",
            search_query: b.asset_hint.search_query || null,
          } : null,
          start_sec: b.start_sec ?? null,
          end_sec:   b.end_sec   ?? null,
        })),
    };
  } else {
    /* ── Standard path — 4-step pipeline ── */

    // STEP 1 — Classify topic into a pattern
    report("classifying");
    const classification = await classifyTopic({ topic, language, audience });
    const patternKey     = classification.pattern || "viral";
    const listCount      = classification.listCount || null;
    detectedNiche  = classification.niche || null;
    console.log("[pipeline] pattern:", patternKey, "listCount:", listCount, "niche:", detectedNiche);

    // STEP 2 — Expand pattern into concrete beat sequence
    const pattern          = getPattern(patternKey);
    const expandedSequence = expandPattern(pattern, listCount);
    console.log("[pipeline] sequence:", expandedSequence);

    // STEP 3 — Research context
    let researchContext = context;
    if (!researchContext) {
      report("research");
      try {
        researchContext = await researchTopic({ topic, videoType: patternKey, audience, language });
      } catch (e) {
        console.warn("[research] failed, continuing without context:", e.message);
        researchContext = "";
      }
    }

    // STEP 4 — Generate content with pattern-aware prompt
    report("script");
    const rawBeats = await generateContent({
      topic, pattern: patternKey, expandedSequence, listCount,
      niche: detectedNiche, language, audience,
      researchContext,
    });

    // STEP 5 — Validate and fix locally
    const { beats: validatedBeats } = await validateContent({
      beats: rawBeats, pattern: patternKey, expandedSequence, listCount, topic,
    });

    // Map to parsedScript shape that buildBeatsFromScript expects
    parsedScript = {
      videoType:    patternKey,
      language,
      niche:        detectedNiche,
      emotionalArc: "",
      patternKey,
      expandedSequence,
      beats: validatedBeats.map((b, i) => {
        console.log("[mapping] beat", i, "stat:", b.stat, "cta:", b.cta, "label:", b.label, "beatType:", b.beatType, "→ seq:", expandedSequence[i]);
        return {
          order:              i,
          spoken:             String(b.spoken || "").trim(),
          intent:             b.intent       || "explanation",
          energy:             typeof b.energy === "number" ? Math.min(1, Math.max(0, b.energy)) : 0.5,
          visual_hint:        b.visual_hint  || "none",
          text_density:       b.text_density || "medium",
          image_count_needed: b.image_count_needed ?? 1,
          emphasis_words:     b.emphasis_words || [],
          headline:           b.headline  || null,
          subtext:            b.subtext   || null,
          label:              b.label ? b.label.toUpperCase() : null,
          stat:               b.stat      || null,
          tagline:            b.tagline   || null,
          quote:              b.quote     || null,
          cta:                b.cta ? b.cta.toUpperCase() : null,
          asset_hint:         b.asset_hint || null,
          beatType:           b.beatType  || expandedSequence[i] || null,
        };
      }),
    };
  }

  // Compute average energy across beats for palette selection
  const avgEnergy = parsedScript.beats.length
    ? parsedScript.beats.reduce((s, b) => s + (b.energy ?? 0.5), 0) / parsedScript.beats.length
    : 0.7;

  console.log("[dna] niche from classifier:", detectedNiche, "niche from script:", parsedScript.niche);
  const dna = generateVideoDNA({
    videoType,
    tone,
    niche:      detectedNiche || parsedScript.niche || null,
    energy:     avgEnergy,
    brandColor: brandColor || null,
    language,
  });

  let beats = await buildBeatsFromScript({
    structuredBeats: parsedScript.beats,
    mode, videoType, orientation,
    language, topic, brandColor, audience, tone,
    assetSource: "none",
    dna,
  });

  console.log("[CLIENT] beat layouts:", beats.map(b => ({ order: b.order, beatType: b.beatType, layout: b.layout })));

  // Attach asset_hint to each beat for editor display.
  parsedScript.beats.forEach((src, i) => {
    if (!beats[i] || !src.asset_hint) return;
    const hint = { ...src.asset_hint };
    const spoken = (beats[i].spoken || "").trim().toLowerCase();
    if (hint.prompt && hint.prompt.trim().toLowerCase() === spoken) {
      hint.prompt = null;
    }
    beats[i].asset_hint = hint;
  });

  /* ── Phase 3a: Direct seed injection — bypass AI for seeded roles ── */
  beats.forEach(beat => {
    const layoutDef = getLayoutDef(beat.layout);
    if (!layoutDef) return;

    const seedMap = {
      headline: beat.headline || null,
      subtext:  beat.subtext  || null,
      label:    beat.label    || null,
      stat:     beat.stat     || null,
      tagline:  beat.tagline  || null,
      quote:    beat.quote    || null,
      cta:      beat.cta      || null,
    };

    const filledRoles = new Set();

    layoutDef.zones
      .filter(z => z.type === "text")
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .forEach(zoneDef => {
        const seed = seedMap[zoneDef.role];
        if (!seed || filledRoles.has(zoneDef.role)) return;

        const beatZoneLocked = beat.zones?.[zoneDef.id]?.locked === true;
        if (zoneDef.locked === true || zoneDef.static === true || beatZoneLocked) return;

        const existing = beat.zones[zoneDef.id];
        const hasContent = existing?.content?.text?.trim();
        if (hasContent) return;

        beat.zones[zoneDef.id] = {
          ...(existing || {}),
          role: zoneDef.role,
          content: { kind: "text", text: seed },
        };
        filledRoles.add(zoneDef.role);
      });

    layoutDef.zones
      .filter(z => z.type === "text")
      .forEach(zoneDef => {
        if (!beat.zones[zoneDef.id]) return;
        beat.zones[zoneDef.id] = {
          ...beat.zones[zoneDef.id],
          role: zoneDef.role,
        };
      });
  });

  /* ── Phase 3: AI zone content — fills text zones intelligently ── */
  report("content");
  try {
    const beatsWithUnfilled = beats.filter(beat => {
      const def = getLayoutDef(beat.layout);
      if (!def) return false;
      return def.zones
        .filter(z => z.type === "text")
        .some(z => !beat.zones[z.id]?.content?.text?.trim());
    });

    console.log("[pipeline] generateZoneContent: total beats", beats.length, "→ unfilled", beatsWithUnfilled.length);

    const beatById = Object.fromEntries(beats.map(b => [b.id, b]));

    let zoneContentArr = [];
    if (beatsWithUnfilled.length > 0) {
      const unfilledDefs = beatsWithUnfilled.map(b => getLayoutDef(b.layout));
      zoneContentArr = await generateZoneContent({ beats: beatsWithUnfilled, layoutDefs: unfilledDefs, topic, videoDNA: dna });
    }

    zoneContentArr.forEach(({ beatIndex, beatId, zones: zc }) => {
      const beat = (beatId && beatById[beatId]) || beatsWithUnfilled[beatIndex];
      if (!beat) return;
      const beatDef = getLayoutDef(beat.layout);

      for (const [zoneId, filled] of Object.entries(zc)) {
        if (!filled?.text || filled.text.trim() === "") continue;
        if (beat.zones[zoneId]?.content?.text?.trim()) continue;

        const defZoneType = beatDef?.zones?.find(z => z.id === zoneId)?.type;
        if (defZoneType && defZoneType !== "text") {
          console.warn(`[zoneContent] zone ${zoneId}: skipping — def type "${defZoneType}" not text`);
          continue;
        }

        if (!beat.zones[zoneId]) beat.zones[zoneId] = {};
        beat.zones[zoneId] = {
          ...beat.zones[zoneId],
          role: beatDef?.zones?.find(z => z.id === zoneId)?.role || beat.zones[zoneId]?.role,
          content: { kind: "text", text: filled.text },
        };
      }
    });

    beats.forEach((beat, beatIndex) => {
      if (beat.layout !== "f46f2091-91d9-4718-bef9-99b65cef32d9") return;
      const emptyZones = ["z6","z9"].filter(id => !beat.zones[id]?.content?.text?.trim());
      if (emptyZones.length > 0) {
        const returned = zoneContentArr.find(b => b.beatIndex === beatIndex);
        console.warn(`[f46f2091 debug] beat ${beatIndex} empty zones: [${emptyZones.join(",")}] | AI returned:`, JSON.stringify(returned?.zones || {}));
      }
    });
  } catch (e) {
    console.warn("[generateZoneContent] failed, using spoken text fallback:", e.message);
  }

  /* ── Stat zone fallback — fill empty stat zones so they never render blank ── */
  beats.forEach(beat => {
    const layoutDef = getLayoutDef(beat.layout);
    if (!layoutDef) return;

    const statZones = layoutDef.zones.filter(z =>
      z.type === "text" && z.role === "stat" && !z.locked && !z.static
      && !beat.zones?.[z.id]?.locked
    );
    if (!statZones.length) return;

    const spoken = beat.spoken || "";
    const statTokenMatch = spoken.match(
      /\b(\$[\d,]+(?:[KMB])?|\d+(?:[.,]\d+)?[KMBk+]?%?(?:\+| percent| million| billion| thousand)?)\b/i
    );
    const spokenStat = statTokenMatch ? statTokenMatch[1].trim() : null;

    statZones.forEach(zoneDef => {
      const existing = beat.zones[zoneDef.id];
      if (existing?.content?.text?.trim()) return;

      const fallback = beat.stat || spokenStat;
      if (!fallback) return;

      beat.zones[zoneDef.id] = {
        ...(existing || {}),
        role: "stat",
        content: { kind: "text", text: String(fallback).trim() },
      };
      console.log(`[stat fallback] beat ${beat.id} zone ${zoneDef.id} → "${fallback}"`);
    });
  });

  // Image processing
  report("images");
  const processBeat = async (beat, beatIndex) => {
    const hint     = parsedScript.beats[beatIndex]?.asset_hint || null;
    const isEntity = hint?.visual_type === "entity" && !!hint.search_query;

    const def = getLayoutDef(beat.layout);
    const hasZoneEntityOverride = (def?.zones || []).some(
      z => z.type === "asset" && z.visual_type === "entity"
    );

    if (!isEntity && !hasZoneEntityOverride && !generateImages) return;

    let defAssetZones = (def?.zones || [])
      .filter(z => z.type === "asset")   // only image-type zones; avatar-typed zones are never image targets
      .filter(z => beat.zones[z.id]?.content?.kind !== "block")
      .filter(z => !beat.zones[z.id]?.content?.asset?.src)
      .filter(z => z.id !== beat.avatarZone);

    // Never inject a background asset zone — if the layout has no asset zones, respect that.
    const injectedBgZoneId = null;

    if (!defAssetZones.length) return;

    const isLogo    = isEntity && /logo|icon/i.test(hint.search_query);
    const objectFit = isLogo ? "contain" : "cover";
    const motion    = pickMotion(beat.energy ?? 0.5, beatIndex, null, dna?.motionStyle);

    try {
      let entityImgUrl = null;
      if (isEntity) {
        console.log(`[img] Beat ${beatIndex}: entity search — "${hint.search_query}"`);
        try {
          const searchRes = await serverFetch("/api/search-image", {
            method: "POST",
            body:   JSON.stringify({ query: hint.search_query }),
          });
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            entityImgUrl = searchData.url || null;
            if (entityImgUrl) console.log(`[img] Beat ${beatIndex}: entity → ${entityImgUrl}`);
          }
        } catch (e) {
          console.warn(`[img] Beat ${beatIndex}: entity search failed —`, e.message);
        }
      }

      const usedUrlsInBeat = new Set();

      await Promise.allSettled(defAssetZones.map(async (assetZone, zoneIdx) => {
        const zoneVisualType = assetZone.visual_type || "abstract";
        const zoneIsEntity   = zoneVisualType === "entity" && !!hint?.search_query;
        const isEntityZone   = (isEntity || zoneIsEntity) && zoneIdx === 0;
        let imgUrl = isEntityZone ? entityImgUrl : null;

        const needsAI = !isEntityZone || !imgUrl;
        if (!imgUrl && needsAI && generateImages) {
          const zonePrompt = injectedBgZoneId
            ? null
            : beat.zones[assetZone.id]?._assetPrompt || null;
          const basePrompt = zonePrompt || hint?.prompt || null;
          const variationSuffix = zoneIdx > 0
            ? `, different scene, different angle, variation ${zoneIdx + 1}`
            : "";
          const genPrompt = basePrompt ? basePrompt + variationSuffix : null;

          if (genPrompt) {
            console.log(`[img] Beat ${beatIndex} zone ${zoneIdx}: AI gen — "${genPrompt.slice(0, 60)}..."`);
            const img = await generateZoneImage({
              spoken: beat.spoken, intent: beat.intent,
              visual_hint: beat.visual_hint, topic, orientation,
              beatIndex, zoneIndex: zoneIdx, promptOverride: genPrompt,
              projectId, assetHint: hint, dna, beat,
            });
            imgUrl = img?.url || null;
          }

          if (!imgUrl) {
            console.log(`[img] Beat ${beatIndex} zone ${zoneIdx}: fallback from spoken text`);
            const img = await generateZoneImage({
              spoken: beat.spoken, intent: beat.intent,
              visual_hint: beat.visual_hint, topic, orientation,
              beatIndex, zoneIndex: zoneIdx,
              projectId, assetHint: hint, dna, beat,
            });
            imgUrl = img?.url || null;
          }
        }

        if (imgUrl && usedUrlsInBeat.has(imgUrl)) {
          console.warn(`[img] Beat ${beatIndex} zone ${zoneIdx}: duplicate URL skipped — ${imgUrl.slice(-40)}`);
          imgUrl = null;
        }
        if (imgUrl) usedUrlsInBeat.add(imgUrl);

        if (!imgUrl) return;

        if (assetZone.id === injectedBgZoneId) {
          beat.zones[injectedBgZoneId] = {
            type:    "asset",
            x: 0, y: 0, width: 100, height: 100,
            zIndex:  0,
            start:   0, end: null,
            enterAnimation: "fadeIn", exitAnimation: "none",
            content: { kind: "asset", asset: { src: imgUrl, type: "image", objectFit: "cover", motion } },
            style:   { opacity: 1, borderRadius: 0 },
            background: {},
          };
        } else {
          beat.zones[assetZone.id] = {
            ...(beat.zones[assetZone.id] || {}),
            content: { kind: "asset", asset: { src: imgUrl, type: "image", objectFit, motion } },
            ...(isLogo ? { background: { kind: "color", color: "#0d0d14" }, style: { ...(beat.zones[assetZone.id]?.style || {}), borderRadius: 16, contentPadding: 16 } } : {}),
          };
        }
      }));
    } catch (e) {
      console.warn(`[img gen] beat ${beatIndex} failed:`, e.message);
    }
  };

  for (let i = 0; i < beats.length; i += 4) {
    await Promise.allSettled([
      processBeat(beats[i],     i),
      i + 1 < beats.length ? processBeat(beats[i + 1], i + 1) : Promise.resolve(),
      i + 2 < beats.length ? processBeat(beats[i + 2], i + 2) : Promise.resolve(),
      i + 3 < beats.length ? processBeat(beats[i + 3], i + 3) : Promise.resolve(),
    ]);
  }

  // Clean up orphan asset zones
  beats.forEach(beat => {
    const layoutDef = getLayoutDef(beat.layout);
    const layoutZoneIds = new Set((layoutDef?.zones || []).map(z => z.id));
    const cleaned = {};
    for (const [id, zone] of Object.entries(beat.zones || {})) {
      const isOrphanAsset = !layoutZoneIds.has(id)
        && (zone?.type === "asset" || zone?.content?.kind === "asset")
        && !zone?.content?.asset?.src;
      if (!isOrphanAsset) cleaned[id] = zone;
    }
    beat.zones = cleaned;
  });

  const script = parsedScript.beats.map(b => b.spoken).join(" ");

  let ttsAudio = null;
  if (generateTTS && script.trim()) {
    report("voiceover");
    try {
      const ttsRes = await serverFetch("/api/generate-tts", {
        method: "POST",
        body:   JSON.stringify({ script, voice: ttsVoice, speed: 1.0 }),
      });
      if (ttsRes.ok) {
        const ttsData = await ttsRes.json();
        const audioUrl = ttsData.url;
        const duration = await measureAudioDuration(audioUrl);
        beats = syncBeatsToTTS(beats, duration);
        ttsAudio = { src: audioUrl, volume: 1, generated: true, voice: ttsVoice };
      }
    } catch (e) {
      console.warn("[TTS gen] failed:", e.message);
    }
  }

  const autoMusicKey = pickAutoMusic(videoType, tone);

  return {
    script, beats,
    meta: { videoType: parsedScript.videoType, language: parsedScript.language, emotionalArc: parsedScript.emotionalArc, brandColor, audience, tone, dna },
    audio: { tts: ttsAudio, music: autoMusicKey ? { musicKey: autoMusicKey, src: MUSIC_PREVIEW_URLS[autoMusicKey], volume: 0.12 } : null },
    talkingHead: talkingHead ? { type: talkingHead.type, videoFileName: talkingHead.videoFileName || null } : null,
  };
}
