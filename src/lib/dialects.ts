/**
 * Dialect canonicalization.
 *
 * A dialect's rules declare sets of phonemes pronounced alike. Two words are
 * loose rhymes when their pronunciations can coincide under those swaps. Rather
 * than expand every pronunciation, we canonicalize: union-find every phoneme
 * connected through a rule into one class and rewrite each to its class
 * representative, so words rhyme iff their canonical forms are equal — a fast,
 * order-independent equivalent of the full (transitive) expansion.
 */

/** Each dialect's phonemes and the sounds they may be pronounced as. */
export type DialectRules = Record<string, Record<string, string[]>>;

function find(parent: Map<string, string>, segment: string): string {
  let root = segment;
  let next = parent.get(root);
  while (next !== undefined && next !== root) {
    root = next;
    next = parent.get(root);
  }
  parent.set(segment, root);
  return root;
}

/** Map every phoneme to the most common member of its class. */
function canonicalize(
  parent: Map<string, string>,
  frequency: Map<string, number>,
): Map<string, string> {
  // ties don't matter, the class collapses regardless
  const representative = new Map<string, string>();
  for (const segment of parent.keys()) {
    const root = find(parent, segment);
    const current = representative.get(root);
    if (
      current === undefined ||
      (frequency.get(segment) ?? 0) > (frequency.get(current) ?? 0)
    ) {
      representative.set(root, segment);
    }
  }
  const canonical = new Map<string, string>();
  for (const segment of parent.keys()) {
    canonical.set(
      segment,
      representative.get(find(parent, segment)) ?? segment,
    );
  }
  return canonical;
}

/** Build the function that rewrites a pronunciation to its canonical form. */
export function buildSubstitution(
  selectedDialects: readonly string[],
  dialectRules: DialectRules,
): (ipa: string) => string {
  const parent = new Map<string, string>();
  const frequency = new Map<string, number>();
  function touch(segment: string): void {
    if (!parent.has(segment)) {
      parent.set(segment, segment);
    }
    frequency.set(segment, (frequency.get(segment) ?? 0) + 1);
  }
  for (const dialect of selectedDialects) {
    for (const [phoneme, variants] of Object.entries(
      dialectRules[dialect] ?? {},
    )) {
      touch(phoneme);
      for (const variant of variants) {
        touch(variant);
        parent.set(find(parent, phoneme), find(parent, variant));
      }
    }
  }
  if (parent.size === 0) {
    return (ipa) => ipa;
  }

  // reps stay in the pattern so longest-match protects multi-char segments
  const canonical = canonicalize(parent, frequency);
  const segments = [...canonical.keys()].sort(
    (left, right) => right.length - left.length,
  );
  const regex = new RegExp(segments.join("|"), "gu");
  return (ipa) =>
    ipa.replaceAll(regex, (match) => canonical.get(match) ?? match);
}
