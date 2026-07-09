"""
Real Keyword Clustering — Section 4.1.1.
Groups keywords into topical clusters using Jaccard similarity on word sets.
This is a genuine, deterministic algorithm — not as semantically rich as an
embedding-based approach (which the blueprint's production version uses,
Section 7.2.1 step 4), but real, free, and doesn't require any paid API or
model. Good enough to group "office chair" with "ergonomic office chair"
and "best office chair" while keeping "dining table" separate.
"""
import re
from typing import List, Dict


STOPWORDS = {"a", "an", "the", "for", "with", "of", "in", "on", "to", "and", "best", "top"}


def _tokenize(keyword: str) -> set:
    words = re.findall(r"[a-z0-9]+", keyword.lower())
    return {w for w in words if w not in STOPWORDS}


def _jaccard_similarity(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    intersection = len(a & b)
    union = len(a | b)
    return intersection / union if union else 0.0


def cluster_keywords(keywords: List[str], similarity_threshold: float = 0.3) -> List[Dict]:
    """
    Groups keywords sharing enough overlapping significant words into the
    same cluster. Returns a list of {clusterName, keywords} dicts.
    """
    token_sets = {kw: _tokenize(kw) for kw in keywords}
    assigned = set()
    clusters = []

    for kw in keywords:
        if kw in assigned:
            continue
        cluster = [kw]
        assigned.add(kw)
        for other in keywords:
            if other in assigned:
                continue
            if _jaccard_similarity(token_sets[kw], token_sets[other]) >= similarity_threshold:
                cluster.append(other)
                assigned.add(other)

        # Name the cluster after the most common significant word across its members
        word_counts: Dict[str, int] = {}
        for member in cluster:
            for word in token_sets[member]:
                word_counts[word] = word_counts.get(word, 0) + 1
        cluster_name = max(word_counts, key=word_counts.get).title() if word_counts else cluster[0]

        clusters.append({"clusterName": cluster_name, "keywords": cluster})

    return clusters
