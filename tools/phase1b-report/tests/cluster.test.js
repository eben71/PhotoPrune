const test = require("node:test");
const assert = require("node:assert/strict");
const { buildClusters } = require("../cluster");

test("buildClusters groups connected components and excludes singles", () => {
  const ids = ["a", "b", "c", "d"];
  const pairs = [
    { id_a: "a", id_b: "b", similarity_percent: 80 },
    { id_a: "b", id_b: "c", similarity_percent: 75 },
  ];
  const clusters = buildClusters({
    ids,
    pairs,
    threshold: 70,
    topPairs: 0,
    includeSingles: false,
  });
  assert.equal(clusters.length, 1);
  const members = clusters[0].members.map((member) => member.id).sort();
  assert.deepEqual(members, ["a", "b", "c"]);
});

test("buildClusters includes singles when requested", () => {
  const ids = ["a", "b"];
  const clusters = buildClusters({
    ids,
    pairs: [],
    threshold: 70,
    topPairs: 0,
    includeSingles: true,
  });
  assert.equal(clusters.length, 2);
});
