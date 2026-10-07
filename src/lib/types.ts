/** A search request sent to the worker. */
export interface Query {
  /** position in the sequence of queries, echoed back to spot stale replies */
  id: number;
  /** selected dialect names */
  dialects: readonly string[];
  /** typed word or phrase */
  query: string;
}

/** A longer word that splits into the query and another word. */
export interface EntryData {
  /** the longer word */
  word: string;
  /** pronunciation of the longer word */
  ipa: string;
  /** end of the longer word that sounds like the query */
  side: "start" | "end";
  /** number of letters before the point where the query's sound starts or stops */
  cut: number;
  /** words that sound like the rest of the longer word, most common first */
  other: readonly string[];
}

/** Everything found for one query. */
export interface Matches {
  /** matches, best first */
  results: EntryData[];
  /** pronunciations of the query */
  ipa: string;
  /** typed words missing from the word list */
  unknown: readonly string[];
}

/** The worker's reply to a query. */
export interface Result extends Query, Matches {
  /** failure message when the search could not run */
  error?: string;
}
