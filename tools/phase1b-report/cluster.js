const crypto = require("crypto");

class DisjointSet {
  constructor(items) {
    this.parent = new Map();
    this.rank = new Map();
    items.forEach((item) => {
      this.parent.set(item, item);
      this.rank.set(item, 0);
    });
  }

  find(item) {
    const parent = this.parent.get(item);
    if (parent === item) {
      return item;
    }
    const root = this.find(parent);
    this.parent.set(item, root);
    return root;
  }

  union(a, b) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) {
      return;
    }
    const rankA = this.rank.get(rootA);
    const rankB = this.rank.get(rootB);
    if (rankA < rankB) {
      this.parent.set(rootA, rootB);
    } else if (rankA > rankB) {
      this.parent.set(rootB, rootA);
    } else {
      this.parent.set(rootB, rootA);
      this.rank.set(rootA, rankA + 1);
    }
  }
}

function pairKey(a, b) {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

function hashClusterId(ids) {
  const payload = ids.join("|");
  return crypto.createHash("sha1").update(payload).digest("hex").slice(0, 12);
}

function buildClusters({
  ids,
  pairs,
  threshold,
  topPairs,
  includeSingles,
}) {
  const sortedIds = Array.from(new Set(ids)).sort();
  const dsu = new DisjointSet(sortedIds);
  const similarityMap = new Map();

  pairs.forEach((pair) => {
    const key = pairKey(pair.id_a, pair.id_b);
    similarityMap.set(key, pair.similarity_percent);
  });

  pairs.forEach((pair, index) => {
    const isTopPair = index < topPairs;
    if (pair.similarity_percent >= threshold || isTopPair) {
      dsu.union(pair.id_a, pair.id_b);
    }
  });

  const clustersByRoot = new Map();
  sortedIds.forEach((id) => {
    const root = dsu.find(id);
    if (!clustersByRoot.has(root)) {
      clustersByRoot.set(root, []);
    }
    clustersByRoot.get(root).push(id);
  });

  const clusters = [];
  clustersByRoot.forEach((members) => {
    if (!includeSingles && members.length < 2) {
      return;
    }
    const sortedMembers = [...members].sort();
    const clusterId = hashClusterId(sortedMembers);

    const scoreTotals = new Map();
    sortedMembers.forEach((id) => scoreTotals.set(id, 0));
    for (let i = 0; i < sortedMembers.length; i += 1) {
      for (let j = i + 1; j < sortedMembers.length; j += 1) {
        const key = pairKey(sortedMembers[i], sortedMembers[j]);
        const score = similarityMap.get(key) ?? 0;
        scoreTotals.set(sortedMembers[i], scoreTotals.get(sortedMembers[i]) + score);
        scoreTotals.set(sortedMembers[j], scoreTotals.get(sortedMembers[j]) + score);
      }
    }

    let representativeId = sortedMembers[0];
    let bestScore = scoreTotals.get(representativeId) ?? 0;
    sortedMembers.forEach((id) => {
      const score = scoreTotals.get(id) ?? 0;
      if (score > bestScore) {
        bestScore = score;
        representativeId = id;
      }
    });

    clusters.push({
      cluster_id: clusterId,
      representative_id: representativeId,
      members: sortedMembers.map((id) => ({ id })),
    });
  });

  return clusters;
}

module.exports = {
  buildClusters,
  pairKey,
};
