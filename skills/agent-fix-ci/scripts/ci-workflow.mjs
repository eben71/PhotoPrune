import fs from 'node:fs';
import path from 'node:path';

const RUN_KEY = /^\s+run:\s*(.*)$/;
const NAME_KEY = /^\s*-\s+name:\s*(.+)$/;
const WORKDIR_KEY = /^\s+working-directory:\s*(.+)$/;

export function loadCiWorkflowSteps(workflowPath) {
  const contents = fs.readFileSync(workflowPath, 'utf8');
  return parseRunSteps(contents);
}

export function selectCiCheckSteps(steps) {
  const excluded = /^(Checkout|Setup|Install)\b/i;
  return steps.filter((step) => !excluded.test(step.name));
}

function parseRunSteps(contents) {
  const lines = contents.split(/\r?\n/);
  const steps = [];
  let current = null;

  const flush = () => {
    if (current?.run) {
      steps.push(current);
    }
    current = null;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const nameMatch = line.match(NAME_KEY);
    if (nameMatch) {
      flush();
      current = {
        name: nameMatch[1].trim(),
        run: null,
        workingDirectory: null,
      };
      continue;
    }

    if (!current) {
      continue;
    }

    const workdirMatch = line.match(WORKDIR_KEY);
    if (workdirMatch) {
      current.workingDirectory = workdirMatch[1].trim();
      continue;
    }

    const runMatch = line.match(RUN_KEY);
    if (runMatch) {
      const remainder = runMatch[1].trim();
      if (remainder === '|' || remainder === '>' || remainder === '') {
        const runIndent = line.match(/^(\s*)/)[1].length;
        const blockLines = [];
        let cursor = index + 1;
        while (cursor < lines.length) {
          const next = lines[cursor];
          const indent = next.match(/^(\s*)/)[1].length;
          if (next.trim() !== '' && indent <= runIndent) {
            break;
          }
          if (next.trim() === '') {
            blockLines.push('');
          } else {
            blockLines.push(next.slice(runIndent + 2));
          }
          cursor += 1;
        }
        current.run = blockLines.join('\n').trim();
        index = cursor - 1;
      } else {
        current.run = remainder;
      }
    }
  }

  flush();
  return steps;
}
