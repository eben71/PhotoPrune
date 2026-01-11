#!/usr/bin/env node
const fs = require("fs/promises");
const path = require("path");
const { buildClusters, pairKey } = require("./cluster");
const { writeReport } = require("./report");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--") {
      continue;
    }
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        args[key] = true;
      } else {
        args[key] = next;
        i += 1;
      }
    }
  }
  return args;
}

async function readNdjson(filePath) {
  const content = await fs.readFile(filePath, "utf8");
  return content
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

function pickItemMetadata(item) {
  const mediaFile = item.mediaFile || {};
  const metadata = mediaFile.mediaFileMetadata || {};
  return {
    id: item.id || mediaFile.id,
    baseUrl: mediaFile.baseUrl || item.baseUrl || null,
    filename: mediaFile.filename || item.filename || null,
    createTime: item.createTime || mediaFile.createTime || null,
    dimensions:
      metadata.width && metadata.height
        ? `${metadata.width}x${metadata.height}`
        : null,
  };
}

function normalizePair(raw, hashBitsFallback) {
  const idA = raw.id_a || raw.a;
  const idB = raw.id_b || raw.b;
  const similarity = raw.similarity_percent ?? raw.similarity;
  const distance = raw.hamming_distance ?? raw.distance;
  if (!idA || !idB) {
    return null;
  }
  return {
    id_a: idA,
    id_b: idB,
    similarity_percent: Number(similarity),
    hamming_distance: Number(distance),
    hash_bits: raw.hash_bits ?? hashBitsFallback ?? 64,
  };
}

function inferRunId(runPath, runJson) {
  if (runJson && runJson.run_id) {
    return runJson.run_id;
  }
  const basename = path.basename(runPath);
  return basename.replace(/-run\.json$/, "").replace(/\.json$/, "");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const itemsPath = args.items;
  const similarityPath = args.similarity;
  const runPath = args.run;
  const threshold = Number(args.threshold ?? 70);
  const topPairs = Number(args.topPairs ?? 100);
  const includeSingles = Boolean(args.includeSingles);
  const outputDir = args.out || "experiments/phase1b/reports";

  if (!itemsPath || !similarityPath || !runPath) {
    throw new Error(
      "Usage: node tools/phase1b-report/cli.js --items <items.ndjson> --similarity <similarity.ndjson> --run <run.json> --out <dir> [--threshold 70] [--topPairs 100] [--includeSingles]",
    );
  }

  const runJson = JSON.parse(await fs.readFile(runPath, "utf8"));
  const runId = args.runId || inferRunId(runPath, runJson);
  const items = await readNdjson(itemsPath);
  const similarityRows = await readNdjson(similarityPath);
  const hashBitsFallback =
    runJson.similarity_probe?.hash_bits || runJson.similarity_probe?.hashBits;

  const itemsById = new Map();
  items.forEach((item) => {
    const picked = pickItemMetadata(item);
    if (picked.id) {
      itemsById.set(picked.id, picked);
    }
  });

  const pairs = similarityRows
    .map((row) => normalizePair(row, hashBitsFallback))
    .filter(Boolean)
    .sort((a, b) => b.similarity_percent - a.similarity_percent);

  const ids = Array.from(itemsById.keys());
  const clusters = buildClusters({
    ids,
    pairs,
    threshold,
    topPairs,
    includeSingles,
  });

  const outDir = path.join(outputDir, runId, "report");
  await writeReport({
    outputDir: outDir,
    runId,
    itemsById,
    clusters,
    pairs,
    threshold,
    topPairsCount: topPairs,
  });

  const clusterOutputPath = path.join(outputDir, runId, "clusters.json");
  await fs.writeFile(clusterOutputPath, JSON.stringify(clusters, null, 2));

  console.log(`[phase1b] report: wrote ${outDir}`);
  console.log(`[phase1b] clusters: wrote ${clusterOutputPath}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
