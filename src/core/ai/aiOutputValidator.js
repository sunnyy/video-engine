import blockRegistry from "../blockRegistry";

function hasNumber(text = "") {
  return /\d/.test(text);
}

export function validateAIOutputs(beats = []) {

  return beats.map((beat) => {

    let block = beat.block_candidate || null;

    if (block && !blockRegistry[block]) {
      block = null;
    }

    if (block === "Hook") {
      const words = (beat.spoken || "").trim().split(/\s+/).length;
      if (words > 6) block = null;
    }

    if (block === "Stat") {
      if (!hasNumber(beat.spoken)) block = null;
    }

    if (block === "ListReveal") {
      if (beat.role !== "list_intro") block = null;
    }

    if (block === "Comparison") {
      if (!/vs|versus|compared/i.test(beat.spoken)) block = null;
    }

    if (!block) {
      return {
        ...beat,
        block_candidate: null,
        block_props: null
      };
    }

    return {
      ...beat,
      block_candidate: block
    };

  });

}