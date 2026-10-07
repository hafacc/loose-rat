import { describe, expect, test } from "bun:test";
import dialects from "../src/data/dialects.json" with { type: "json" };
import { buildSubstitution } from "../src/lib/dialects.ts";

describe("dialect canonicalization", () => {
  test("merges phonemes connected through a dialect's rules", () => {
    // AAVE Non-Rhotic asserts æ~ɛ and ɛ~ɪ, so cat and kit land in one class
    const substitute = buildSubstitution(["AmE : AAVE : Non-Rhotic"], dialects);
    expect(substitute("kæt")).toBe(substitute("kɪt"));
  });

  test("leaves transcriptions unchanged when no dialect is selected", () => {
    const substitute = buildSubstitution([], dialects);
    expect(substitute("kæt")).toBe("kæt");
  });

  test("does not merge phonemes that are in no shared class", () => {
    // p and b are never named in the rules, so they stay distinct
    const substitute = buildSubstitution(["AmE : AAVE : Non-Rhotic"], dialects);
    expect(substitute("pɪn")).not.toBe(substitute("bɪn"));
  });

  test("drops r after a vowel only in accents that do", () => {
    const dropping = buildSubstitution(["AmE : AAVE : Non-Rhotic"], dialects);
    expect(dropping("kɑɹ")).toBe(dropping("kɑ"));
    const keeping = buildSubstitution(["AmE : AAVE : Rhotic"], dialects);
    expect(keeping("kɑɹ")).not.toBe(keeping("kɑ"));
  });

  test("merges consonants an accent says alike", () => {
    // General American taps both t and d between vowels
    const tapping = buildSubstitution(["AmE : General American"], dialects);
    expect(tapping("bæt")).toBe(tapping("bæd"));
    expect(tapping("bæt")).not.toBe(tapping("bæk"));
    const distinct = buildSubstitution(["EnE : RP : Conservative"], dialects);
    expect(distinct("bæt")).not.toBe(distinct("bæd"));
  });
});
