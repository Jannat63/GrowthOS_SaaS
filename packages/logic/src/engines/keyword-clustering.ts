/**
 * Real keyword clustering (SEO extras — restored from legacy/services/seo-service).
 *
 * Groups keywords into topical clusters using Jaccard similarity on their significant word sets.
 * Not as semantically rich as an embedding-based approach, but a genuine, deterministic algorithm
 * — real, free, and needs no third-party API or model. Good enough to group "office chair" with
 * "ergonomic office chair" and "best office chair" while keeping "dining table" separate.
 *
 * Pure and synchronous on purpose: unlike the site-audit crawler (real I/O, so it runs as a
 * background worker job), this only touches an in-memory list of strings, so it runs directly in
 * the API request — no job/poll round trip needed for something that completes in milliseconds.
 */

const STOPWORDS = new Set([
  'a', 'an', 'the', 'for', 'with', 'of', 'in', 'on', 'to', 'and', 'best', 'top',
]);

function tokenize(keyword: string): Set<string> {
  const words = keyword.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return new Set(words.filter((w) => !STOPWORDS.has(w)));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const w of a) if (b.has(w)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export interface KeywordCluster {
  clusterName: string;
  keywords: string[];
}

/** Groups keywords sharing enough overlapping significant words into the same cluster. */
export function clusterKeywords(
  keywords: string[],
  similarityThreshold = 0.3
): KeywordCluster[] {
  const tokenSets = new Map(keywords.map((kw) => [kw, tokenize(kw)] as const));
  const assigned = new Set<string>();
  const clusters: KeywordCluster[] = [];

  for (const kw of keywords) {
    if (assigned.has(kw)) continue;
    const cluster = [kw];
    assigned.add(kw);
    for (const other of keywords) {
      if (assigned.has(other)) continue;
      if (jaccardSimilarity(tokenSets.get(kw)!, tokenSets.get(other)!) >= similarityThreshold) {
        cluster.push(other);
        assigned.add(other);
      }
    }

    // Name the cluster after the most common significant word across its members.
    const wordCounts = new Map<string, number>();
    for (const member of cluster) {
      for (const word of tokenSets.get(member)!) {
        wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
      }
    }
    let clusterName = cluster[0]!;
    let topCount = 0;
    for (const [word, n] of wordCounts) {
      if (n > topCount) {
        topCount = n;
        clusterName = word[0]!.toUpperCase() + word.slice(1);
      }
    }

    clusters.push({ clusterName, keywords: cluster });
  }

  return clusters;
}
