import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function moderateInput(text) {
  if (!text || text.trim().length === 0) return { flagged: false };
  try {
    const response = await openai.moderations.create({ input: text.trim() });
    const result = response.results[0];
    return { flagged: result.flagged, categories: result.categories };
  } catch (err) {
    console.error("[moderation] API error:", err.message);
    return { flagged: false }; // fail open — don't block on moderation error
  }
}
