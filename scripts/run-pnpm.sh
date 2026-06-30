#!/bin/sh
set -eu

pnpm_version="$(sed -n 's/.*"packageManager"[[:space:]]*:[[:space:]]*"pnpm@\([0-9][0-9.]*\).*/\1/p' package.json | head -n 1)"

if [ -z "$pnpm_version" ]; then
  echo "Could not read pnpm version from package.json packageManager." >&2
  exit 1
fi

if command -v pnpm >/dev/null 2>&1; then
  exec pnpm "$@"
fi

if command -v corepack >/dev/null 2>&1; then
  exec corepack "pnpm@$pnpm_version" "$@"
fi

if command -v corepack.cmd >/dev/null 2>&1; then
  exec corepack.cmd "pnpm@$pnpm_version" "$@"
fi

if [ -x "/c/Program Files/nodejs/corepack.cmd" ]; then
  exec "/c/Program Files/nodejs/corepack.cmd" "pnpm@$pnpm_version" "$@"
fi

if [ -x "/mnt/c/Program Files/nodejs/corepack.cmd" ]; then
  exec "/mnt/c/Program Files/nodejs/corepack.cmd" "pnpm@$pnpm_version" "$@"
fi

echo "pnpm is required. Install pnpm, enable Corepack, or install Node with Corepack available." >&2
exit 127
