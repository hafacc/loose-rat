import { describe, expect, test } from "bun:test";
import { spellingCut } from "../src/lib/align.ts";

describe("spelling cut", () => {
  test.each([
    ["catfish", "kætfɪʃ", 3, "cat"],
    ["tomcat", "tɑmkæt", 3, "tom"],
    ["cattle", "kætəɫ", 3, "catt"],
    ["kitchen", "kɪtʃən", 3, "kit"],
    ["namesake", "neɪmseɪk", 4, "name"],
    ["knightly", "naɪtɫi", 4, "knight"],
    ["sunshine", "sənʃaɪn", 3, "sun"],
    ["x-ray", "ɛksɹeɪ", 3, "x-"],
  ])("splits %s after %s sound %i", (word, ipa, split, start) => {
    expect(word.slice(0, spellingCut(word, ipa, split))).toBe(start);
  });

  test("puts everything before a cut at the end", () => {
    expect(spellingCut("cat", "kæt", 3)).toBe(3);
    expect(spellingCut("cat", "kæt", 0)).toBe(0);
  });
});
