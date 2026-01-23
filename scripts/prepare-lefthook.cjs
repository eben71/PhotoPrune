const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

// In CI or Docker builds the repository may not include a .git directory.
// In that case, skip installing git hooks.
if (!fs.existsSync('.git')) {
  process.exit(0);
}

const result = spawnSync('lefthook', ['install'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
