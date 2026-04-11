import { serverFetch } from "../../services/serverApi";

export async function analyzeBeatRoles(beats = []) {

  const prompt = `
You are analyzing the narrative role of beats in a short-form video script.

Return JSON array with one object per beat.

Each object must contain:

role: hook | setup | stat | list_intro | list_item | question | payoff | statement

Rules:

hook → opening attention grabber  
stat → contains statistic or measurable claim  
list_intro → introduces a list ("3 reasons", "top 5", etc)  
list_item → individual item in a list  
question → asks a question  
setup → builds context  
payoff → conclusion or final reveal  
statement → regular informational sentence

Return ONLY JSON.
`;

  const payload = {
    beats: beats.map((b, i) => ({
      index: i,
      spoken: b.spoken
    }))
  };

  const response = await serverFetch("/api/generate", {
    method: "POST",
    body: JSON.stringify({
      prompt: prompt + "\n\nINPUT:\n" + JSON.stringify(payload, null, 2)
    }),
  });

  const roles = await response.json();

  return beats.map((beat, i) => ({
    ...beat,
    role: roles?.[i]?.role || "statement"
  }));

}