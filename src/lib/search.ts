/**
 * Loose compound search.
 *
 * A match is a longer word whose pronunciation starts or ends with the query's
 * and whose remainder is itself the pronunciation of a word. Pronunciations are
 * compared after dialect canonicalization, see {@link buildSubstitution}.
 */

import { Trie } from "mnemonist";
import { isVowel, spellingCut } from "./align.ts";
import type { buildSubstitution } from "./dialects.ts";
import type { EntryData, Matches } from "./types.ts";

/** Most matches returned for one query. */
export const MAX_RESULTS = 1024;

// remainders less common than this are mostly surnames
const COMMON_WORDS = 30_000;

const WHITESPACE = /\s+/u;

/** The word list. */
export interface Words {
  /** word -> pronunciations */
  ipas: Map<string, readonly string[]>;
  /** word -> commonness position, zero being the most common */
  ranks: Map<string, number>;
}

/** Lookup tables for one dialect selection. */
export interface Index {
  /** word -> canonical pronunciations */
  wordToIpas: Map<string, readonly string[]>;
  /** canonical pronunciation -> words */
  ipaToWords: Map<string, string[]>;
  /** canonical pronunciations, for prefix lookups */
  ipaPrefix: Trie<string>;
  /** reversed canonical pronunciations, for suffix lookups */
  ipaSuffix: Trie<string>;
  /** whether any pronunciation was changed by the dialects */
  loose: boolean;
}

/** Parse the word list written by `scripts/build-data.ts`. */
export function parseWords(text: string): Words {
  const ipas = new Map<string, readonly string[]>();
  const ranks = new Map<string, number>();
  let ranked = true;
  for (const line of text.split("\n")) {
    const [word = "", transcriptions = ""] = line.split("\t");
    if (word === "" || transcriptions === "") {
      // the blank line ends the ranked words
      ranked = false;
    } else {
      ipas.set(word, transcriptions.split(","));
      if (ranked) {
        ranks.set(word, ranks.size);
      }
    }
  }
  return { ipas, ranks };
}

function reverse(ipa: string): string {
  return [...ipa].reverse().join("");
}

/** Build the lookup tables for one dialect substitution. */
export function buildIndex(
  words: Words,
  substitute: ReturnType<typeof buildSubstitution>,
): Index {
  const wordToIpas = new Map<string, readonly string[]>();
  const ipaToWords = new Map<string, string[]>();
  const ipaPrefix = new Trie<string>();
  const ipaSuffix = new Trie<string>();
  let loose = false;
  for (const [word, baseIpas] of words.ipas) {
    const ipas = [...new Set(baseIpas.map(substitute))];
    loose ||= ipas.some((ipa) => !baseIpas.includes(ipa));
    wordToIpas.set(word, ipas);
    for (const ipa of ipas) {
      const sameSound = ipaToWords.get(ipa);
      if (sameSound === undefined) {
        ipaToWords.set(ipa, [word]);
        ipaPrefix.add(ipa);
        ipaSuffix.add(reverse(ipa));
      } else {
        sameSound.push(word);
      }
    }
  }
  return { wordToIpas, ipaToWords, ipaPrefix, ipaSuffix, loose };
}

/** Every way to say the words one after another. */
function concatenations(choices: readonly (readonly string[])[]): string[] {
  let phrases = [""];
  for (const ipas of choices) {
    phrases = phrases.flatMap((phrase) => ipas.map((ipa) => phrase + ipa));
  }
  return phrases;
}

// sound pairs said as one, which a clean split does not come between
const UNITS = new Set(["tʃ", "dʒ", "aɪ", "eɪ", "oʊ", "aʊ", "ɔɪ"]);
// cost of a split inside one of those, or of a remainder with no vowel
const AWKWARD = 2;

/** Fewest single-sound edits that turn one pronunciation into another. */
function editDistance(from: string, to: string): number {
  let row = Array.from({ length: to.length + 1 }, (_, column) => column);
  for (const [index, sound] of [...from].entries()) {
    const next = [index + 1];
    for (const [column, other] of [...to].entries()) {
      next.push(
        Math.min(
          (row[column] ?? 0) + Number(sound !== other),
          (row[column + 1] ?? 0) + 1,
          (next[column] ?? 0) + 1,
        ),
      );
    }
    row = next;
  }
  return row.at(-1) ?? 0;
}

interface Scored {
  word: string;
  ipa: string;
  side: EntryData["side"];
  other: readonly string[];
  // canonical pronunciation and the sound the query starts or stops at
  longerIpa: string;
  split: number;
  // whether no remainder is a common word; these only pad out the common matches
  rare: boolean;
  // how far the match is from sounding like the two words said together
  roughness: number;
  // rank of the rarer half, so both halves have to be common to score well
  score: number;
  otherRank: number;
}

function compare(left: Scored, right: Scored): number {
  return (
    Number(left.rare) - Number(right.rare) ||
    left.roughness - right.roughness ||
    left.score - right.score ||
    left.otherRank - right.otherRank ||
    left.word.localeCompare(right.word)
  );
}

/** One way a longer pronunciation splits into the query and a remainder. */
interface Split {
  side: EntryData["side"];
  longerIpa: string;
  /** number of sounds before the split */
  split: number;
  remainder: string;
}

function* splits(index: Index, ipa: string): Generator<Split> {
  for (const longerIpa of index.ipaPrefix.find(ipa)) {
    yield {
      side: "start",
      longerIpa,
      split: ipa.length,
      remainder: longerIpa.slice(ipa.length),
    };
  }
  for (const reversed of index.ipaSuffix.find(reverse(ipa))) {
    const longerIpa = reverse(reversed);
    const split = longerIpa.length - ipa.length;
    yield {
      side: "end",
      longerIpa,
      split,
      remainder: longerIpa.slice(0, split),
    };
  }
}

/** What a search needs to score its matches. */
interface Context {
  words: Words;
  index: Index;
  /** every way to say the query, before dialects */
  queryIpas: readonly string[];
  found: Map<string, Scored>;
}

/** How awkwardly a split falls in the longer pronunciation. */
function awkwardness({ longerIpa, split, remainder }: Split): number {
  const straddled = longerIpa.slice(split - 1, split + 1);
  return (
    (UNITS.has(straddled) ? AWKWARD : 0) +
    ([...remainder].some(isVowel) ? 0 : AWKWARD)
  );
}

/** Fewest sound changes the dialects needed to make a match. */
function looseness(
  { words, index, queryIpas }: Context,
  side: EntryData["side"],
  longer: string,
  remainder: string,
): number {
  if (index.loose) {
    const together = queryIpas.flatMap((queryIpa) =>
      (words.ipas.get(remainder) ?? []).map((otherIpa) =>
        side === "start" ? queryIpa + otherIpa : otherIpa + queryIpa,
      ),
    );
    return Math.min(
      ...(words.ipas.get(longer) ?? []).flatMap((longerIpa) =>
        together.map((said) => editDistance(longerIpa, said)),
      ),
    );
  } else {
    return 0;
  }
}

/** Score the longer words of one split, keeping each word's best. */
function record(context: Context, split: Split): void {
  const { words, index, found } = context;
  const { side, longerIpa, remainder } = split;
  function rankOf(word: string): number {
    return words.ranks.get(word) ?? Number.POSITIVE_INFINITY;
  }
  const every = index.ipaToWords.get(remainder) ?? [];
  const common = every.filter((word) => rankOf(word) < COMMON_WORDS);
  const rare = common.length === 0;
  const awkward = awkwardness(split);
  for (const word of index.ipaToWords.get(longerIpa) ?? []) {
    // remainders that sound closest first, then the most common
    const [best, ...rest] = (rare ? every : common)
      .map((other) => ({
        other,
        loose: looseness(context, side, word, other),
        rank: rankOf(other),
      }))
      .sort(
        (left, right) => left.loose - right.loose || left.rank - right.rank,
      );
    if (best !== undefined) {
      const scored: Scored = {
        word,
        // TODO show the pronunciation that matched rather than the first
        ipa: side === "start" ? longerIpa : (words.ipas.get(word)?.[0] ?? ""),
        side,
        other: [best, ...rest].map(({ other }) => other),
        longerIpa,
        split: split.split,
        rare,
        roughness: awkward + best.loose,
        score: Math.max(rankOf(word), best.rank),
        otherRank: best.rank,
      };
      const previous = found.get(word);
      if (previous === undefined || compare(scored, previous) < 0) {
        found.set(word, scored);
      }
    }
  }
}

/**
 * Find the longer words that split into the query and another word.
 *
 * The query may be several words, which are matched as if said together.
 * Matches are ordered first by how well they sound like the two words said
 * together: ones the dialects had to bend less, that split between sounds
 * rather than inside one, and whose remainder has a vowel come first. Ties go
 * to the match whose rarer half is more common. Each match lists its
 * remainders the same way, closest in sound first. Matches whose remainder is
 * only an uncommon word come after all the others, so they show up when little
 * else does. At most {@link MAX_RESULTS} are returned.
 */
export function search(words: Words, index: Index, query: string): Matches {
  const typed = query
    .trim()
    .toLowerCase()
    .split(WHITESPACE)
    .filter((word) => word !== "");
  const unknown = typed.filter((word) => !index.wordToIpas.has(word));
  if (typed.length === 0 || unknown.length > 0) {
    return { results: [], ipa: "", unknown };
  }

  const queryIpas = concatenations(
    typed.map((word) => words.ipas.get(word) ?? []),
  );
  const context: Context = { words, index, queryIpas, found: new Map() };
  const canonical = typed.map((word) => index.wordToIpas.get(word) ?? []);
  for (const ipa of concatenations(canonical)) {
    for (const split of splits(index, ipa)) {
      if (split.remainder !== "") {
        record(context, split);
      }
    }
  }

  const results = [...context.found.values()]
    .sort(compare)
    .slice(0, MAX_RESULTS)
    .map(({ word, ipa, side, other, longerIpa, split }) => ({
      word,
      ipa,
      side,
      other,
      cut: spellingCut(word, longerIpa, split),
    }));
  return { results, ipa: queryIpas.join(" · "), unknown };
}
