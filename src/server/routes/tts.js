import express from "express";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import {
  supabaseAdmin, openai, requireAuth, deductCredits, addCredits,
  TEMP_DIR,
} from "../middleware/shared.js";
import { moderateInput } from "../middleware/moderateInput.js";

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
  const userId = req.user.id;
  let creditAmount = 0;
  try {
    const { script, voice = "female_warm", speed = 1.0, projectId } = req.body;
    if (!script?.trim()) return res.status(400).json({ error: "No script provided" });
    const { flagged } = await moderateInput(script);
    if (flagged) return res.status(400).json({ error: "Your prompt was flagged as inappropriate. Please try a different topic.", code: "CONTENT_FLAGGED" });
    const deduction = await deductCredits(userId, 5, "tts_generation", "TTS voiceover", projectId);
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    creditAmount = 5;

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
      res.json({ url });
    }
  } catch (err) {
    if (creditAmount > 0) addCredits(userId, creditAmount, "refund", "ai_failure_refund", "Refund: TTS generation failed").catch(() => {});
    console.error("[TTS] Error:", err?.message || err);
    res.status(500).json({ error: "Generation failed. Your credits have been refunded.", code: "AI_FAILURE" });
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
  // One list call to find all pre-generated samples
  const { data: existing } = await supabaseAdmin.storage
    .from("user-assets")
    .list("tts/samples");
  const existingSet = new Set((existing || []).map(f => f.name));

  const result = await Promise.all(VOICE_CATALOG.map(async (voice) => {
    const fileName   = `${voice.id}.mp3`;
    const storageKey = `tts/samples/${fileName}`;
    const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(storageKey);

    if (existingSet.has(fileName)) return { ...voice, sampleUrl: publicUrl };

    try {
      const mp3 = await openai.audio.speech.create({
        model: "tts-1-hd", voice: voice.id, input: TTS_SAMPLE_TEXT, speed: 1.0,
      });
      const buffer = Buffer.from(await mp3.arrayBuffer());
      await supabaseAdmin.storage.from("user-assets").upload(storageKey, buffer, { contentType: "audio/mpeg", upsert: true });
      return { ...voice, sampleUrl: publicUrl };
    } catch {
      return { ...voice, sampleUrl: null };
    }
  }));
  res.json({ voices: result });
});

router.get("/elevenlabs/voices", requireAuth, async (_req, res) => {
  try {
    const elRes = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
    });
    const body = await elRes.text();
    if (!elRes.ok) {
      return res.json({ voices: [], error: `ElevenLabs ${elRes.status}: ${body.slice(0, 200)}` });
    }
    const data = JSON.parse(body);
    res.json({ voices: data.voices || [] });
  } catch (err) {
    console.error("[ElevenLabs voices]", err.message);
    res.json({ voices: [], error: err.message });
  }
});

router.get("/tts/history", requireAuth, async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit)  || 50, 100);
  const offset = Math.max(parseInt(req.query.offset) || 0,  0);
  const { data, error } = await supabaseAdmin
    .from("tts_generations")
    .select("*")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ history: data || [] });
});

router.post("/generate-tts-elevenlabs", requireAuth, async (req, res) => {
  const userId = req.user.id;
  let creditAmount = 0;
  try {
    const { script, voiceId, language, projectId } = req.body;
    if (!script?.trim()) return res.status(400).json({ error: "No script provided" });
    if (!voiceId)        return res.status(400).json({ error: "No voiceId provided" });
    const { flagged } = await moderateInput(script);
    if (flagged) return res.status(400).json({ error: "Your prompt was flagged as inappropriate. Please try a different topic.", code: "CONTENT_FLAGGED" });

    const deduction = await deductCredits(userId, 5, "tts_generation", "ElevenLabs TTS voiceover", projectId);
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    creditAmount = 5;

    const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method:  "POST",
      headers: {
        "xi-api-key":   process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept":       "audio/mpeg",
      },
      body: JSON.stringify({
        text:       script.trim(),
        model_id:   "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!elRes.ok) {
      const errText = await elRes.text().catch(() => "");
      throw new Error(`ElevenLabs API error ${elRes.status}: ${errText.slice(0, 200)}`);
    }

    const arrayBuf = await elRes.arrayBuffer();
    const buffer   = Buffer.from(arrayBuf);

    const filename   = `tts-elevenlabs-${Date.now()}.mp3`;
    const storageKey = `tts/${req.user.id}/${filename}`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from("user-assets")
      .upload(storageKey, buffer, { contentType: "audio/mpeg", upsert: false });

    if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`);

    const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(storageKey);
    res.json({ url: publicUrl });
  } catch (err) {
    if (creditAmount > 0) addCredits(userId, creditAmount, "refund", "ai_failure_refund", "Refund: ElevenLabs TTS failed").catch(() => {});
    console.error("[ElevenLabs TTS] Error:", err?.message || err);
    res.status(500).json({ error: "Generation failed. Your credits have been refunded.", code: "AI_FAILURE" });
  }
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
