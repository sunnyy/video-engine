import { useState } from "react";
import { Mic } from "lucide-react";
import { FieldChip, FieldModal, THEME } from "./Field.jsx";
import { LanguageVoicePicker } from "../LanguageVoicePicker.jsx";

/**
 * Voice + Language — ONE combined field (per product decision). Wraps the existing
 * LanguageVoicePicker (which already handles language + voice together). Language
 * is a first-class value here, present for every voice-bearing service.
 *
 * Value contract: { language, voiceId } via onLanguageChange / onVoiceChange.
 */

export const LANGUAGE_LABELS = { en: "English", hinglish: "Hinglish", es: "Spanish" };

export const meta = {
  id: "voiceLanguage",
  apiKeys: { language: "language", voiceId: "voiceId" },
  label: "Voice",
  icon: "🎙️",
  defaults: { language: "en", voiceId: null },
};

export function VoiceLanguageField({ language = "en", onLanguageChange, voiceId = null, onVoiceChange, accent = THEME.accent }) {
  const [open, setOpen] = useState(false);
  const langLabel = LANGUAGE_LABELS[language] ?? language;
  return (
    <>
      <FieldChip
        icon={<Mic size={16} />}
        label="Voice"
        value={langLabel}
        onClick={() => setOpen(true)}
        accent={accent}
      />
      {open && (
        <FieldModal title="Language & voice" onClose={() => setOpen(false)} width={600}>
          <LanguageVoicePicker
            language={language}
            onLanguageChange={onLanguageChange}
            voiceId={voiceId}
            onVoiceChange={onVoiceChange}
            disabled={false}
            accentColor={accent}
            border={THEME.border}
          />
          <button
            onClick={() => setOpen(false)}
            style={{ marginTop: 18, width: "100%", padding: "11px", borderRadius: 10, border: "none", background: accent, color: "black", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
          >
            Select
          </button>
        </FieldModal>
      )}
    </>
  );
}
