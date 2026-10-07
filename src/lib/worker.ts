import dialectRules from "../data/dialects.json" with { type: "json" };
import wordsUrl from "../data/words.txt?url";
import { buildSubstitution } from "./dialects.ts";
import {
  buildIndex,
  type Index,
  parseWords,
  search,
  type Words,
} from "./search.ts";
import type { Query, Result } from "./types.ts";

const CACHE_SIZE = 3;

async function load(): Promise<Words> {
  const response = await fetch(wordsUrl);
  if (!response.ok) {
    throw new Error(`word list: ${response.status} ${response.statusText}`);
  }
  return parseWords(await response.text());
}

const wordsPromise = load();

// most recently used last
const indexCache = new Map<string, Index>();

function getIndex(selectedDialects: readonly string[], words: Words): Index {
  const key = JSON.stringify(selectedDialects.toSorted());
  let index = indexCache.get(key);
  if (index) {
    indexCache.delete(key);
  } else {
    const [oldest] = indexCache.keys();
    if (indexCache.size === CACHE_SIZE && oldest !== undefined) {
      indexCache.delete(oldest);
    }
    index = buildIndex(
      words,
      buildSubstitution(selectedDialects, dialectRules),
    );
  }
  indexCache.set(key, index);
  return index;
}

addEventListener("message", async (event: MessageEvent<Query>) => {
  const { dialects, query } = event.data;
  let result: Result;
  try {
    const words = await wordsPromise;
    const matches = search(words, getIndex(dialects, words), query);
    result = { ...matches, ...event.data };
  } catch (err) {
    // surface the failure so the UI can stop waiting instead of spinning forever
    result = {
      results: [],
      ipa: "",
      unknown: [],
      ...event.data,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  postMessage(result);
});
