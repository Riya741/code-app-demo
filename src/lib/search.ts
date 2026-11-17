/** Customer search: query normalisation, ranking and the result cap (spec 001-customer-search, SRCH-RANK-001..004). */

export const MAX_RESULTS = 100;

/** Trimmed, lower-cased query (SRCH-RANK-001). */
export const normaliseQuery = (raw: string) => raw.trim().toLowerCase();

/** Unique whitespace-separated tokens of a normalised query (SRCH-RANK-001). */
export const tokenize = (query: string) => [...new Set(query.split(/\s+/).filter(Boolean))];

/**
 * Matches parent name or parent ID (the ID is never displayed). Lower is better; null = no match (SRCH-RANK-002/003).
 * 0 = name or ID equals the query · 1 = name starts with the query · 2 = every token starts a word of the name ·
 * 3 = other name match · 4 = ID-only match.
 */
export function score(name: string, id: string, query: string, tokens: string[]): number | null {
  if (id && id === query) return 0; // exact parent ID first, even when the name does not match (SRCH-T09)
  const n = name.toLowerCase();
  if (!tokens.every((t) => n.includes(t))) return id && id.includes(query) ? 4 : null;
  if (n === query) return 0;
  if (n.startsWith(query)) return 1;
  if (tokens.every((t) => n.split(/[\s\-_/.,()&]+/).some((w) => w.startsWith(t)))) return 2;
  return 3;
}

/** Scores every entry, sorts by score then name, and returns at most `max` rows plus the full match count. */
export function rankMatches<T>(
  index: { row: T; name: string; id: string }[],
  query: string,
  tokens: string[],
  max = MAX_RESULTS,
): { results: T[]; total: number } {
  if (!query) return { results: [], total: 0 };
  const scored: { row: T; s: number; name: string }[] = [];
  for (const { row, name, id } of index) {
    const s = score(name, id, query, tokens);
    if (s !== null) scored.push({ row, s, name });
  }
  scored.sort((a, b) => a.s - b.s || a.name.localeCompare(b.name));
  return { results: scored.slice(0, max).map((x) => x.row), total: scored.length };
}
