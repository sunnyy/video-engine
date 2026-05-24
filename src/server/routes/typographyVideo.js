import express from "express";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import {
  supabaseAdmin, openai, requireAuth, deductCredits, addCredits, TEMP_DIR,
} from "../middleware/shared.js";

export const router = express.Router();
ffmpeg.setFfmpegPath(ffmpegPath);

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

const SYSTEM_PROMPT = `You are a high-energy motion typography director. Return only valid JSON.

Create a kinetic lyric-style typography video. The script is broken into short sentences. Each sentence is revealed one phrase at a time, in sync with the voiceover audio. The background stays constant for the full sentence, then instantly cuts to the next color on sentence change.

━━━ OUTPUT FORMAT ━━━
{
  "projectName": "string",
  "palette": ["#hex", "#hex", "#hex"],
  "voiceoverScript": "full spoken text, natural speech",
  "sentences": [
    {
      "text": "Are you struggling to grow online?",
      "phrases": ["Are you", "STRUGGLING", "to grow online?"],
      "backgroundColorIndex": 0,
      "emphasis": ["STRUGGLING"],
      "emphasisColor": "#FF2F2F"
    }
  ]
}

━━━ PALETTE ━━━
- Exactly 3 colors for the entire video. Bold, high-contrast only:
  • #000000 + #FF2F2F + #FFFFFF  (black/red/white)
  • #000000 + #FFD400 + #FFFFFF  (black/yellow/white)
  • #0a0a2e + #FFE500 + #FFFFFF  (navy/yellow/white)
  • #1a0533 + #a855f7 + #FFFFFF  (dark-purple/violet/white)
  • #000000 + #00FF41 + #FFFFFF  (black/neon-green/white)
  • #ffffff + #FF176B + #000000  (white/pink/black)
- palette[0] = primary dark background color
- palette[1] = accent/emphasis color
- palette[2] = secondary light background color

━━━ SENTENCES ━━━
- 5–10 sentences total
- Each sentence: 3–8 words, broken into 2–4 short phrases (1–3 words each)
- backgroundColorIndex: cycles 0 → 2 → 0 → 2 (alternate dark/light) — NEVER same index twice in a row
- emphasis: 1–2 key punchy words per sentence that receive accent color + punch animation
- emphasisColor: always palette[1]
- voiceoverScript: all phrases in speakIndex order across all sentences, written as natural flowing speech

━━━ RULES ━━━
- Keep phrases short: 1–3 words max each
- emphasis words must exactly match words present in the phrases array (same spelling, case-insensitive OK)
- NEVER output x, y, fontSize, rotation, scale, or any positioning data`;

// Maps phrase texts to Whisper word timestamps via sequential pointer
function mapPhrasesToTimings(sentences, whisperWords) {
  const norm = (s) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim().split(/\s+/).filter(Boolean);
  const wSeq = whisperWords.map((w) => ({ ...w, norm: norm(w.word)[0] || "" }));
  let wi = 0;
  let lastKnownEnd = 0; // tracks last valid timestamp so we never fall back to 0

  return sentences.map((sentence) => {
    const phrases = (sentence.phrases || []).map((phraseText) => {
      const phraseWords = norm(phraseText);
      const WPS = 2.5;

      if (!phraseWords.length) {
        const t = wi < wSeq.length ? (wSeq[wi]?.start ?? lastKnownEnd) : lastKnownEnd;
        const end = t + 0.3;
        lastKnownEnd = end;
        return { text: phraseText, phraseStart: t, phraseEnd: end };
      }

      // If Whisper is exhausted, estimate forward from last known time
      if (wi >= wSeq.length) {
        const dur = Math.max(0.3, phraseWords.length / WPS);
        const phraseStart = lastKnownEnd;
        const phraseEnd   = phraseStart + dur;
        lastKnownEnd = phraseEnd;
        return { text: phraseText, phraseStart, phraseEnd };
      }

      let found = wi;
      for (let i = wi; i < Math.min(wi + 20, wSeq.length); i++) {
        if (wSeq[i]?.norm === phraseWords[0]) { found = i; break; }
      }
      wi = found;
      const phraseStart = wSeq[wi]?.start ?? lastKnownEnd;
      wi = Math.min(wi + phraseWords.length, wSeq.length);
      const phraseEnd = wSeq[Math.min(wi - 1, wSeq.length - 1)]?.end ?? phraseStart + 0.4;
      lastKnownEnd = phraseEnd;

      return { text: phraseText, phraseStart, phraseEnd };
    });

    return { ...sentence, phrases };
  });
}

// Fallback: distribute phrase timings at 2.5 WPS when Whisper is unavailable
function estimateTimings(sentences) {
  const WPS = 2.5;
  let t = 0;

  return sentences.map((sentence) => {
    const phrases = (sentence.phrases || []).map((phraseText) => {
      const wordCount = Math.max(1, phraseText.split(/\s+/).length);
      const dur = Math.max(0.3, wordCount / WPS);
      const phraseStart = t;
      const phraseEnd = t + dur;
      t += dur;
      return { text: phraseText, phraseStart, phraseEnd };
    });
    t += 0.25;
    return { ...sentence, phrases };
  });
}

router.post("/generate", requireAuth, async (req, res) => {
  const userId = req.user.id;
  let creditAmount = 0;
  let rawPath = null, normPath = null;

  try {
    const { input, inputType = "topic", style = "Bold & Minimal", projectId } = req.body;
    if (!input?.trim()) return res.status(400).json({ error: "input is required" });

    const deduction = await deductCredits(userId, 15, "typography_video", "Typography video generation", projectId || null);
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    creditAmount = 15;

    // Step 1: GPT — sentences, phrases, palette, emphasis
    const userMessage = inputType === "script"
      ? `Organize this script into a kinetic lyric-style typography video. Style: ${style}.\n\nScript:\n${input.trim()}`
      : `Create a kinetic lyric-style typography video about: "${input.trim()}". Style: ${style}.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      max_completion_tokens: 4000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userMessage },
      ],
    });
    const aiOutput = JSON.parse(completion.choices[0].message.content);

    const sentences = aiOutput.sentences || [];
    const palette   = aiOutput.palette   || ["#000000", "#FF2F2F", "#FFFFFF"];
    const script    = aiOutput.voiceoverScript?.trim() || "";

    let sentencesWithTimings = estimateTimings(sentences);
    let audioUrl = null;

    // Step 2: TTS → Step 3: Whisper word-level timestamps
    if (script) {
      try {
        const mp3 = await openai.audio.speech.create({
          model: "tts-1-hd",
          voice: "nova",
          input: script,
          speed: 1,
        });

        const rawBuffer = Buffer.from(await mp3.arrayBuffer());
        const ts    = Date.now();
        rawPath  = path.join(TEMP_DIR, `typo-raw-${ts}.mp3`);
        normPath = path.join(TEMP_DIR, `typo-${ts}.mp3`);
        fs.writeFileSync(rawPath, rawBuffer);

        const transcription = await openai.audio.transcriptions.create({
          file:                    fs.createReadStream(rawPath),
          model:                   "whisper-1",
          response_format:         "verbose_json",
          timestamp_granularities: ["word"],
        });

        const whisperWords = transcription.words || [];
        if (whisperWords.length > 0) {
          sentencesWithTimings = mapPhrasesToTimings(sentences, whisperWords);
        }

        await normalizeTTS(rawPath, normPath);
        try { fs.unlinkSync(rawPath); } catch {} rawPath = null;

        const normBuffer = fs.readFileSync(normPath);
        const storageKey = `tts/${userId}/typo-${ts}.mp3`;
        const { error: uploadErr } = await supabaseAdmin.storage
          .from("user-assets")
          .upload(storageKey, normBuffer, { contentType: "audio/mpeg", upsert: false });

        try { fs.unlinkSync(normPath); } catch {} normPath = null;

        if (!uploadErr) {
          const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(storageKey);
          audioUrl = publicUrl;
        }
      } catch (ttsErr) {
        console.warn("[typography-video] TTS/Whisper failed, using estimated timings:", ttsErr.message);
        if (rawPath)  { try { fs.unlinkSync(rawPath);  } catch {} }
        if (normPath) { try { fs.unlinkSync(normPath); } catch {} }
      }
    }

    res.json({
      projectName: aiOutput.projectName || "Typography Video",
      palette,
      sentences: sentencesWithTimings,
      audioUrl,
    });

  } catch (err) {
    if (creditAmount > 0) addCredits(userId, creditAmount, "refund", "ai_failure_refund", "Refund: Typography video failed").catch(() => {});
    if (rawPath)  { try { fs.unlinkSync(rawPath);  } catch {} }
    if (normPath) { try { fs.unlinkSync(normPath); } catch {} }
    console.error("[typography-video/generate]", err);
    res.status(500).json({ error: err.message });
  }
});
