#!/usr/bin/env bash
set -euo pipefail

staged_files=$(git diff --cached --name-only)

if [[ -z "${staged_files}" ]]; then
  exit 0
fi

matcher='(\.tokens/|token)'

if command -v rg >/dev/null 2>&1; then
  matches=$(echo "${staged_files}" | rg -i "${matcher}" || true)
else
  matches=$(echo "${staged_files}" | grep -Ei "${matcher}" || true)
fi

if [[ -n "${matches}" ]]; then
  echo "Blocked: staged paths contain '.tokens' or 'token'. Remove sensitive files before commit." >&2
  exit 1
fi
