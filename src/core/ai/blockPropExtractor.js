export async function extractBlockProps(beats = []) {

  const beatsWithBlocks = beats.filter(b => b.block_candidate);

  if (!beatsWithBlocks.length) return beats;

  const prompt = `
You extract block properties for a short-form video engine.

For each beat you MUST return an object with:

index: beat index
props: block properties object

Rules:

Stat
props = { value: string | number, label: string }

ListReveal
props = { items: string[] }

Comparison
props = { left: string, right: string }

Quote
props = { text: string }

Hook
props = { text: string }

IMPORTANT RULES

1. If you cannot extract correct props → return props:null
2. NEVER copy the entire sentence into value.
3. Use the spoken text language exactly (do not translate).
4. Always return valid JSON.

Return format:

[
 { "index":0, "props":{...} },
 { "index":1, "props":null }
]
`;

  const payload = {
    beats: beatsWithBlocks.map((b, i) => ({
      index: i,
      spoken: b.spoken,
      block: b.block_candidate
    }))
  };

  const response = await fetch("http://localhost:5000/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: prompt + "\n\nINPUT:\n" + JSON.stringify(payload, null, 2)
    })
  });

  let results = [];

  try {
    results = await response.json();
  } catch {
    results = [];
  }

  return beats.map((beat, i) => {

    if (!beat.block_candidate) return beat;

    const r = results.find(x => x.index === beatsWithBlocks.indexOf(beat));

    return {
      ...beat,
      block_props: r?.props || null
    };

  });

}