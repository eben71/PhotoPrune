const fs = require('fs');
const readline = require('readline');

function parseArgs(argv) {
  const options = { a: null, b: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--a':
        options.a = argv[i + 1];
        i += 1;
        break;
      case '--b':
        options.b = argv[i + 1];
        i += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.a || !options.b) {
    throw new Error('--a and --b are required');
  }

  return options;
}

async function readIds(filePath) {
  const stream = fs.createReadStream(filePath, 'utf8');
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const ids = new Set();

  for await (const line of rl) {
    if (!line.trim()) continue;
    const parsed = JSON.parse(line);
    if (parsed.id) {
      ids.add(parsed.id);
    }
  }

  return ids;
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const [idsA, idsB] = await Promise.all([
    readIds(options.a),
    readIds(options.b),
  ]);

  let newItems = 0;
  let deletedItems = 0;

  for (const id of idsB) {
    if (!idsA.has(id)) {
      newItems += 1;
    }
  }

  for (const id of idsA) {
    if (!idsB.has(id)) {
      deletedItems += 1;
    }
  }

  const unchanged = idsA.size - deletedItems;
  const summary = {
    baseline_a_count: idsA.size,
    baseline_b_count: idsB.size,
    new_items_count: newItems,
    deleted_items_count: deletedItems,
    unchanged_items_count: unchanged,
  };

  console.log(JSON.stringify(summary, null, 2));
}

run().catch((error) => {
  console.error('Baseline diff failed:', error.message);
  process.exitCode = 1;
});
