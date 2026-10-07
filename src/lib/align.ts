/**
 * Rough alignment of a word's spelling to its pronunciation.
 *
 * English spelling is too irregular for rules, so this only knows which
 * letters are vowels, which letters commonly spell each consonant, and that a
 * sound is usually one or two letters. That is enough to say about where in
 * the spelling a point in the pronunciation falls.
 */

const VOWEL_LETTERS = new Set("aeiouy");
const VOWEL_SOUNDS = new Set("aeiouæɑɒɔəɛɜɝɪʊʌɐɘɵɤøœʉ");

// letters that commonly spell each consonant sound, where not the sound's own
const SPELLINGS = new Map([
  ["k", "ckqx"],
  ["ɡ", "gx"],
  ["f", "fp"],
  ["v", "vf"],
  ["θ", "t"],
  ["ð", "t"],
  ["s", "scxz"],
  ["z", "zsx"],
  ["ʃ", "sct"],
  ["ʒ", "sgjz"],
  ["ŋ", "n"],
  ["ɫ", "l"],
  ["ɹ", "r"],
  ["w", "wu"],
  ["j", "yiu"],
]);

// a consonant written with no letter of its own, as the glide in "cute"
const UNWRITTEN = 1;
// the second half of a vowel written with one letter, as in "name"
const GLIDE = 0.2;
// a letter that stands for no sound, as the e in "name"
const SILENT = 1.1;
// most letters one sound can take
const LONGEST = 3;

/** Whether a sound is a vowel. */
export function isVowel(sound: string): boolean {
  return VOWEL_SOUNDS.has(sound);
}

function fits(letter: string, sound: string): boolean {
  if (isVowel(sound)) {
    return VOWEL_LETTERS.has(letter) || (sound === "ɝ" && letter === "r");
  } else {
    return letter === "y" || !VOWEL_LETTERS.has(letter);
  }
}

function typical(letter: string, sound: string): boolean {
  return isVowel(sound) || (SPELLINGS.get(sound) ?? sound).includes(letter);
}

/** Cost of spelling one sound with a run of letters. */
function spellingCost(letters: string, sound: string): number {
  const [first = "", second] = letters;
  if (![...letters].every((letter) => fits(letter, sound))) {
    return 2 + letters.length / 2;
  } else if (letters.length === 1) {
    return typical(first, sound) ? 0 : 0.4;
  } else if (letters.length === 2 && !typical(first, sound)) {
    return 1.6;
  } else if (letters.length === 2) {
    return first === second || isVowel(sound) ? 0.5 : 0.9;
  } else {
    return 2;
  }
}

/** Cost of saying a sound that no letter stands for. */
function unwrittenCost(sound: string, before: string | undefined): number {
  return isVowel(sound) && before !== undefined && isVowel(before)
    ? GLIDE
    : UNWRITTEN;
}

interface Step {
  cost: number;
  // cell this one was reached from
  letters: number;
  sounds: number;
}

/** Every cell reachable in one move, by letters and sounds used so far. */
function* moves(
  word: string,
  sounds: readonly string[],
  { cost, letters, sounds: count }: Step,
): Generator<Step> {
  const letter = word[letters];
  if (letter !== undefined) {
    const silent = letter >= "a" && letter <= "z" ? SILENT : 0;
    yield { cost: cost + silent, letters: letters + 1, sounds: count };
  }
  const sound = sounds[count];
  if (sound !== undefined) {
    yield {
      cost: cost + unwrittenCost(sound, sounds[count - 1]),
      letters,
      sounds: count + 1,
    };
    for (let taken = 1; taken <= LONGEST; taken++) {
      const run = word.slice(letters, letters + taken);
      if (run.length === taken) {
        yield {
          cost: cost + spellingCost(run, sound),
          letters: letters + taken,
          sounds: count + 1,
        };
      }
    }
  }
}

/**
 * Find how many letters of a word spell its first `split` sounds.
 *
 * Silent letters at the boundary count toward the earlier part.
 */
export function spellingCut(word: string, ipa: string, split: number): number {
  const sounds = [...ipa];
  // cheapest way to reach each cell, as its cost and the cell it came from
  const table: Step[][] = Array.from({ length: word.length + 1 }, () =>
    Array.from({ length: sounds.length + 1 }, () => ({
      cost: Number.POSITIVE_INFINITY,
      letters: 0,
      sounds: 0,
    })),
  );
  const start = table[0]?.[0];
  if (start) {
    start.cost = 0;
  }
  for (const [letters, row] of table.entries()) {
    for (const [count, { cost }] of row.entries()) {
      for (const move of moves(word, sounds, {
        cost,
        letters,
        sounds: count,
      })) {
        const cell = table[move.letters]?.[move.sounds];
        if (cell && move.cost < cell.cost) {
          Object.assign(cell, { cost: move.cost, letters, sounds: count });
        }
      }
    }
  }

  // walk back from the end to the last cell that has `split` sounds
  let letters = word.length;
  let count = sounds.length;
  while (count > split) {
    ({ letters, sounds: count } = table[letters]?.[count] ?? {
      letters,
      sounds: split,
    });
  }
  return letters;
}
