import fs from 'node:fs';
import path from 'node:path';

const REQUIRED_MARKERS = [
  path.join('.github', 'workflows', 'ci.yml'),
  'package.json',
];

export function findRepoRoot(startDir = process.cwd()) {
  let current = path.resolve(startDir);
  const { root } = path.parse(current);

  while (true) {
    const hasMarkers = REQUIRED_MARKERS.every((marker) =>
      fs.existsSync(path.join(current, marker))
    );

    if (hasMarkers) {
      return current;
    }

    if (current === root) {
      return null;
    }

    current = path.dirname(current);
  }
}
