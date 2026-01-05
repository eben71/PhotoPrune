#!/usr/bin/env bash
set -euo pipefail

staged_files=$(git diff --cached --name-only)

if [[ -z "${staged_files}" ]]; then
  exit 0
fi

if echo "${staged_files}" | rg -i '(\.tokens/|token)'; then
  echo "Blocked: staged paths contain '.tokens' or 'token'. Remove sensitive files before commit." >&2
  exit 1
fi
