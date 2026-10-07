/**
 * Rebuild `src/data/words.txt` from its upstream sources.
 *
 * Pronunciations come from ipa-dict's American English list (itself derived
 * from CMUdict) with stress marks removed, and word order from Peter Norvig's
 * web unigram counts. Each line is `word<TAB>ipa,ipa`; words run from most to
 * least common, then a blank line, then the words with no count alphabetically.
 */

const IPA_URL =
  "https://raw.githubusercontent.com/open-dict-data/ipa-dict/master/data/en_US.txt";
const COUNT_URL = "https://norvig.com/ngrams/count_1w.txt";
const OUTPUT = new URL("../src/data/words.txt", import.meta.url);

// possessives, contractions and spelled-out abbreviations
const NOISE = /['.]/u;
// slashes around a transcription and its stress marks
const MARKS = /[/ˈˌ]/gu;

async function fetchLines(url: string): Promise<string[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url}: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  return text.split("\n").filter((line) => line.length > 0);
}

const [ipaLines, countLines] = await Promise.all([
  fetchLines(IPA_URL),
  fetchLines(COUNT_URL),
]);

const pronunciations = new Map<string, string>();
for (const line of ipaLines) {
  const [word, transcriptions] = line.split("\t");
  if (word && transcriptions && !NOISE.test(word)) {
    const ipas = transcriptions
      .split(",")
      .map((ipa) => ipa.trim().replaceAll(MARKS, ""));
    pronunciations.set(word, [...new Set(ipas)].join(","));
  }
}

const ranked: string[] = [];
for (const line of countLines) {
  const [word] = line.split("\t");
  const ipas = word === undefined ? undefined : pronunciations.get(word);
  if (word !== undefined && ipas !== undefined) {
    ranked.push(`${word}\t${ipas}`);
    pronunciations.delete(word);
  }
}
const unranked = [...pronunciations]
  .map(([word, ipas]) => `${word}\t${ipas}`)
  .sort((left, right) => left.localeCompare(right));

await Bun.write(OUTPUT, `${ranked.join("\n")}\n\n${unranked.join("\n")}\n`);
