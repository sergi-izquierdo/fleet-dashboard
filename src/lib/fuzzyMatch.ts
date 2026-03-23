/**
 * Simple fuzzy matching: checks if all characters in the query
 * appear in order within the target string (case-insensitive).
 * Returns a score (lower = better match) or null if no match.
 */
export function fuzzyMatch(
  query: string,
  target: string,
): { score: number } | null {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  if (q.length === 0) return { score: 0 };

  let qi = 0;
  let score = 0;
  let lastMatchIndex = -1;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      // Bonus for consecutive matches
      score += ti === lastMatchIndex + 1 ? 0 : ti - (lastMatchIndex + 1);
      lastMatchIndex = ti;
      qi++;
    }
  }

  if (qi < q.length) return null; // not all characters matched
  return { score };
}
