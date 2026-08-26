// Keyword clustering — Section 4.1.1. Groups a workspace's tracked keywords into topical clusters
// using Jaccard similarity over tokenised word sets. Ported from `/legacy`'s
// `seo-service/app/keyword_clustering.py`, with two determinism fixes (see below).
//
// WHAT THIS IS NOT. These are LEXICAL clusters, not intent-verified ones. Current practice ranks
// SERP overlap — how much two keywords' actual result pages have in common — above any text-based
// measure, because it reflects how the search engine itself groups intent. Text similarity is blind
// to intent that only appears in the results: "how to clean running shoes" and "best running shoes"
// share most of their significant words and serve completely different intents, and this engine
// will put them together.
//
// That blind spot is deliberate and gated, not an oversight. SERP data means DataForSEO, which is a
// paid credential this project does not have. The consensus hybrid is explicitly *pre-cluster, then
// SERP-validate*, so the free lexical pass is the first stage of that pipeline rather than a
// detour around it — hence the optional `validator`. Until one is supplied, callers must label the
// output as lexical rather than implying the search engine agreed with it.
//
// The blueprint and this repo's own plan both recorded clustering as needing Neon pgvector and a
// `vector(1536)` column. That was wrong: a vector column implies an embedding model, which implies a
// paid API, which contradicts D4. The working legacy implementation uses none of it.

/** Words carrying no topical signal. `best`/`top` are here because they are modifiers, not subjects. */
const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "for",
  "with",
  "of",
  "in",
  "on",
  "to",
  "and",
  "best",
  "top",
]);

export interface KeywordCluster {
  /** Title-cased label, taken from the most common significant token across the cluster's members. */
  clusterName: string;
  keywords: string[];
  /**
   * False until a SERP-overlap pass has confirmed the members share intent. Callers surface this —
   * presenting an unverified cluster as though the search engine agreed with it would be the same
   * class of error as showing seeded data as a customer's own numbers.
   */
  intentVerified: boolean;
}

/**
 * Splits a lexically-derived cluster into intent-consistent groups. Reserved for the SERP-overlap
 * pass when DataForSEO lands; returning the input unchanged is a valid no-op implementation.
 */
export type ClusterValidator = (keywords: string[]) => string[][];

export interface ClusterKeywordsOptions {
  /** Minimum Jaccard similarity for two keywords to share a cluster. */
  threshold?: number;
  validator?: ClusterValidator;
}

function tokenize(keyword: string): Set<string> {
  const words = keyword.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return new Set(words.filter((w) => !STOPWORDS.has(w)));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection++;
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Names a cluster after its most common significant token.
 *
 * Ties are broken explicitly — frequency, then longer token, then alphabetical. The legacy version
 * used Python's `max()`, which resolves ties by insertion order, so the same cluster could be named
 * differently depending on which member happened to come first.
 */
const titleCase = (token: string) => token.charAt(0).toUpperCase() + token.slice(1);

function nameCluster(
  members: string[],
  tokensByKeyword: Map<string, Set<string>>,
  taken: Set<string>,
): string {
  const counts = new Map<string, number>();
  for (const member of members) {
    for (const token of tokensByKeyword.get(member) ?? []) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  // Every member tokenised to stopwords only — there is no significant word to name it after.
  if (counts.size === 0) return members[0] ?? "";

  const ranked = [...counts.entries()]
    .sort(
      ([tokenA, countA], [tokenB, countB]) =>
        countB - countA || tokenB.length - tokenA.length || tokenA.localeCompare(tokenB),
    )
    .map(([token]) => token);

  // Names must be unique across the returned set. On the shipped seed keywords the top token alone
  // produced TWO clusters called "Office" — "best office chair for back pain" + "office chair
  // lumbar support" in one, and "home office ideas" alone in another. Two identically-labelled
  // groups side by side is unreadable, and it makes the label useless as an identifier for anything
  // downstream. Widening to the next-most-common token disambiguates while keeping the label
  // descriptive ("Office" and "Office ideas"), and the fallback keeps it total.
  const primary = titleCase(ranked[0]!);
  if (!taken.has(primary)) return primary;

  for (const token of ranked.slice(1)) {
    const widened = `${primary} ${token}`;
    if (!taken.has(widened)) return widened;
  }
  return members[0] ?? primary;
}

/**
 * Groups keywords that share enough significant words.
 *
 * `O(n^2)` in the number of keywords, which is the honest fit for the input: a workspace's tracked
 * keyword set is in the hundreds, capped at 10,000 by the Scale plan. Stated rather than engineered
 * around.
 *
 * Deterministic regardless of input order. The legacy version walked the input list and made the
 * first unassigned keyword a cluster seed, so shuffling the same keyword set produced different
 * clusters. Seeds here are taken in descending order of how many significant tokens a keyword has,
 * then alphabetically: the most specific keyword anchors the cluster, and the ordering is total, so
 * there is nothing left for input order to decide.
 */
export function clusterKeywords(
  keywords: string[],
  { threshold = 0.3, validator }: ClusterKeywordsOptions = {},
): KeywordCluster[] {
  // Duplicates would otherwise be compared against themselves at similarity 1 and pad a cluster.
  const unique = [...new Set(keywords)];
  const tokensByKeyword = new Map(unique.map((kw) => [kw, tokenize(kw)] as const));

  const seedOrder = [...unique].sort((a, b) => {
    const sizeDiff = (tokensByKeyword.get(b)?.size ?? 0) - (tokensByKeyword.get(a)?.size ?? 0);
    return sizeDiff !== 0 ? sizeDiff : a.localeCompare(b);
  });

  const assigned = new Set<string>();
  const takenNames = new Set<string>();
  const clusters: KeywordCluster[] = [];

  for (const seed of seedOrder) {
    if (assigned.has(seed)) continue;
    assigned.add(seed);

    const members = [seed];
    for (const candidate of seedOrder) {
      if (assigned.has(candidate)) continue;
      const similarity = jaccardSimilarity(
        tokensByKeyword.get(seed)!,
        tokensByKeyword.get(candidate)!,
      );
      if (similarity >= threshold) {
        members.push(candidate);
        assigned.add(candidate);
      }
    }

    // The validator splits one lexical cluster into several intent-consistent ones; only those are
    // marked verified. A validator that returns a single group is confirming the cluster, not
    // failing to split it.
    const groups = validator ? validator(members).filter((group) => group.length > 0) : [members];
    for (const group of groups) {
      const clusterName = nameCluster(group, tokensByKeyword, takenNames);
      takenNames.add(clusterName);
      clusters.push({ clusterName, keywords: group, intentVerified: Boolean(validator) });
    }
  }

  return clusters;
}
