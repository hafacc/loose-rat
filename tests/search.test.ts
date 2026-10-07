import { describe, expect, test } from "bun:test";
import dialects from "../src/data/dialects.json" with { type: "json" };
import { buildSubstitution } from "../src/lib/dialects.ts";
import {
  buildIndex,
  MAX_RESULTS,
  parseWords,
  search,
  type Words,
} from "../src/lib/search.ts";

const NOISE = /['.]/u;

function find(
  words: Words,
  query: string,
  selected: readonly string[] = [],
): ReturnType<typeof search> {
  const index = buildIndex(words, buildSubstitution(selected, dialects));
  return search(words, index, query);
}

describe("parsing the word list", () => {
  test("ranks only the words before the blank line", () => {
    const { ipas, ranks } = parseWords(
      "the\tðə,ði\ncat\tkæt\n\nzyzzyva\tzɪzɪvə\n",
    );
    expect(ipas.get("the")).toEqual(["ðə", "ði"]);
    expect([...ranks]).toEqual([
      ["the", 0],
      ["cat", 1],
    ]);
    expect(ipas.has("zyzzyva")).toBe(true);
  });
});

describe("search on a small list", () => {
  const words = parseWords(
    [
      "a\tə",
      "log\tlɔɡ",
      "cat\tkæt",
      "catalog\tkætəlɔɡ",
      "tom\ttɑm",
      "tomcat\ttɑmkæt",
      "walk\twɔk",
      "catwalk\tkætwɔk",
      "kit\tkɪt",
      "kitwalk\tkɪtwɔk",
      "",
      "wok\twɔk",
      "catzzz\tkætzzz",
      "zzz\tzzz",
    ].join("\n"),
  );

  test("finds words that start with the query", () => {
    const { results } = find(words, "cat");
    expect(results.map(({ word }) => word)).toContain("catwalk");
  });

  test("finds words that end with the query", () => {
    const { results } = find(words, "cat");
    const tomcat = results.find(({ word }) => word === "tomcat");
    expect(tomcat?.other).toEqual(["tom"]);
  });

  test("needs the rest of the longer word to be a word", () => {
    const { results } = find(words, "cat");
    expect(results.map(({ word }) => word)).not.toContain("catalog");
  });

  test("lists only common remainders when there are any", () => {
    const { results } = find(words, "cat");
    const catwalk = results.find(({ word }) => word === "catwalk");
    expect(catwalk?.other).toEqual(["walk"]);
  });

  test("orders matches by the rarer of their two halves", () => {
    const { results } = find(words, "cat");
    expect(results.map(({ word }) => word).slice(0, 2)).toEqual([
      "tomcat",
      "catwalk",
    ]);
  });

  test("puts matches with only uncommon remainders last", () => {
    const { results } = find(words, "cat");
    expect(results.at(-1)).toEqual({
      word: "catzzz",
      ipa: "kætzzz",
      side: "start",
      cut: 3,
      other: ["zzz"],
    });
  });

  test("matches a phrase as if said together", () => {
    const { results, ipa } = find(words, "cat a");
    expect(ipa).toBe("kætə");
    expect(results.map(({ word }) => word)).toEqual(["catalog"]);
  });

  test("ignores case and surrounding space", () => {
    expect(find(words, "  CAT ").ipa).toBe("kæt");
  });

  test("reports typed words missing from the list", () => {
    const { results, unknown } = find(words, "cat qwerty");
    expect(results).toEqual([]);
    expect(unknown).toEqual(["qwerty"]);
  });

  test("returns nothing for an empty query", () => {
    expect(find(words, " ")).toEqual({ results: [], ipa: "", unknown: [] });
  });

  test("matches across pronunciations a dialect treats alike", () => {
    const loose = find(words, "cat", ["AmE : AAVE : Non-Rhotic"]);
    expect(loose.results.map(({ word }) => word)).toContain("kitwalk");
  });

  test("puts matches the dialects had to bend after ones they did not", () => {
    const loose = find(words, "cat", ["AmE : AAVE : Non-Rhotic"]);
    const order = loose.results.map(({ word }) => word);
    expect(order.indexOf("catwalk")).toBeLessThan(order.indexOf("kitwalk"));
  });

  test("marks the letters that sound like the query", () => {
    const { results } = find(words, "cat");
    const tomcat = results.find(({ word }) => word === "tomcat");
    expect(tomcat?.cut).toBe(3);
  });
});

describe("search on the real list", async () => {
  const words = parseWords(await Bun.file("src/data/words.txt").text());

  test("has no possessives or abbreviations", () => {
    expect([...words.ipas.keys()].filter((word) => NOISE.test(word))).toEqual(
      [],
    );
  });

  test("puts everyday compounds first", () => {
    const { results } = find(words, "cat");
    const top = results.slice(0, 15).map(({ word }) => word);
    expect(top).toContain("catfish");
    expect(top).toContain("wildcat");
  });

  test("caps the number of matches", () => {
    expect(find(words, "a").results).toHaveLength(MAX_RESULTS);
  });
});
