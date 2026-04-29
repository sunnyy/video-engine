import express from "express";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import {
  supabaseAdmin, openai, requireAuth, deductCredits,
  TEMP_DIR,
} from "../middleware/shared.js";

export const router = express.Router();

ffmpeg.setFfmpegPath(ffmpegPath);

/* Normalize TTS audio to -14 LUFS — OpenAI tts-1 outputs ~-23 LUFS (very quiet) */
function normalizeTTS(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFilters("loudnorm=I=-9:TP=-1:LRA=7")
      .audioCodec("libmp3lame")
      .audioBitrate("192k")
      .output(outputPath)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });
}

router.post("/generate-tts", requireAuth, async (req, res) => {
  try {
    const { script, voice = "female_warm", speed = 1.0, projectId } = req.body;
    const deduction = await deductCredits(req.user.id, 5, "tts_generation", "TTS voiceover", projectId);
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    console.log("[TTS] Request:", { voice, speed, scriptLength: script?.length });
    if (!script?.trim()) return res.status(400).json({ error: "No script provided" });

    const validVoices = ["nova","shimmer","coral","alloy","sage","ash","onyx","echo","fable","verse","marin","cedar"];
    const resolvedVoice = validVoices.includes(voice) ? voice : "nova";
    const mp3 = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: resolvedVoice,
      input: script.trim(),
      speed: Math.min(4.0, Math.max(0.25, Number(speed))),
    });

    const buffer   = Buffer.from(await mp3.arrayBuffer());
    const rawName  = `tts-raw-${Date.now()}.mp3`;
    const normName = `tts-${Date.now()}.mp3`;
    const rawPath  = path.join(TEMP_DIR, rawName);
    const normPath = path.join(TEMP_DIR, normName);

    fs.writeFileSync(rawPath, buffer);
    await normalizeTTS(rawPath, normPath);
    fs.unlinkSync(rawPath);

    // Upload directly to Supabase so the URL is permanent across all environments
    const storageKey = `tts/${req.user.id}/${normName}`;
    const normBuffer = fs.readFileSync(normPath);
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("user-assets")
      .upload(storageKey, normBuffer, { contentType: "audio/mpeg", upsert: false });

    if (!uploadErr) {
      fs.unlinkSync(normPath);
      const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(storageKey);
      console.log("[TTS] Uploaded to Supabase:", publicUrl);
      try {
        await supabaseAdmin.from("tts_generations").insert({
          user_id:    req.user.id,
          voice_id:   resolvedVoice,
          script:     script.trim().slice(0, 500),
          audio_url:  publicUrl,
          char_count: script.trim().length,
          project_id: projectId || null,
        });
      } catch {}
      res.json({ url: publicUrl });
    } else {
      // Fallback: return localhost temp URL (only works in local dev)
      const url = `http://localhost:5000/renders/${normName}`;
      console.warn("[TTS] Supabase upload failed, using temp URL:", uploadErr.message);
      res.json({ url });
    }
  } catch (err) {
    console.error("[TTS] Error:", err?.message || err);
    res.status(500).json({ error: err?.message || "TTS generation failed" });
  }
});

/* ── TTS Voice Catalog + Sample Pre-generation ── */
const VOICE_CATALOG = [
  { id: "nova",    gender: "female",  tone: "warm",            label: "Nova",    desc: "Warm & friendly"      },
  { id: "shimmer", gender: "female",  tone: "clear",           label: "Shimmer", desc: "Clear & bright"       },
  { id: "coral",   gender: "female",  tone: "expressive",      label: "Coral",   desc: "Expressive & lively"  },
  { id: "alloy",   gender: "neutral", tone: "balanced",        label: "Alloy",   desc: "Balanced & versatile" },
  { id: "sage",    gender: "neutral", tone: "calm",            label: "Sage",    desc: "Calm & measured"      },
  { id: "ash",     gender: "neutral", tone: "conversational",  label: "Ash",     desc: "Conversational"       },
  { id: "onyx",    gender: "male",    tone: "deep",            label: "Onyx",    desc: "Deep & authoritative" },
  { id: "echo",    gender: "male",    tone: "neutral",         label: "Echo",    desc: "Clear & neutral"      },
  { id: "fable",   gender: "male",    tone: "storyteller",     label: "Fable",   desc: "Warm storyteller"     },
];
const TTS_SAMPLE_TEXT = "Hey, this is how I sound. I can narrate your videos with clarity and energy.";

router.get("/tts/voices", requireAuth, async (_req, res) => {
  const result = await Promise.all(VOICE_CATALOG.map(async (voice) => {
    const storageKey = `tts/samples/${voice.id}.mp3`;
    const { data: existing } = await supabaseAdmin.storage
      .from("user-assets")
      .list("tts/samples", { search: `${voice.id}.mp3` });
    if (existing?.length > 0) {
      const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(storageKey);
      return { ...voice, sampleUrl: publicUrl };
    }
    try {
      const mp3 = await openai.audio.speech.create({
        model: "tts-1-hd", voice: voice.id, input: TTS_SAMPLE_TEXT, speed: 1.0,
      });
      const buffer = Buffer.from(await mp3.arrayBuffer());
      await supabaseAdmin.storage.from("user-assets").upload(storageKey, buffer, { contentType: "audio/mpeg", upsert: true });
      const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(storageKey);
      return { ...voice, sampleUrl: publicUrl };
    } catch {
      return { ...voice, sampleUrl: null };
    }
  }));
  res.json({ voices: result });
});

router.get("/tts/history", requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("tts_generations")
    .select("*")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ history: data || [] });
});

router.delete("/tts/history/:id", requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin
    .from("tts_generations")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});
