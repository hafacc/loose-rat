import dialectRules from "../data/dialects.json" with { type: "json" };

// Dialect information from:
// https://en.wikipedia.org/wiki/Sound_correspondences_between_English_accents
const GROUP_NAMES = new Map([
  ["AmE", "American English"],
  ["AuE", "Australian English"],
  ["BahE", "Bahamian English"],
  ["BarE", "Barbadian English"],
  ["CIE", "Channel Island English"],
  ["CaE", "Canadian English"],
  ["EnE", "English English"],
  ["FiE", "Fiji English"],
  ["HKE", "Hong Kong English"],
  ["InE", "Indian English"],
  ["IrE", "Irish English"],
  ["NZE", "New Zealand English"],
  ["PaE", "Palauan English"],
  ["SAE", "South African English"],
  ["SIE", "Solomon Islands English"],
  ["SSE", "Standard Singapore English"],
  ["ScE", "Scottish English"],
  ["WaE", "Welsh English"],
]);

/** A dialect as listed in the menu. */
export interface Dialect {
  /** name within its group, empty when the group is a single dialect */
  name: string;
  /** key into the dialect rules */
  key: string;
}

/** Every dialect key. */
export const ALL_DIALECTS: readonly string[] = Object.keys(dialectRules);

/** Dialects by the full name of their group. */
export const DIALECT_GROUPS: ReadonlyMap<string, readonly Dialect[]> =
  Map.groupBy(
    ALL_DIALECTS.map((key) => {
      const [abbreviation = key, ...rest] = key.split(" : ");
      return {
        group: GROUP_NAMES.get(abbreviation) ?? abbreviation,
        name: rest.join(" > "),
        key,
      };
    }),
    ({ group }) => group,
  );
