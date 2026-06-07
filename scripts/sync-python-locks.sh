#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/sync-python-locks.sh [--upgrade]

Synchronize Python lock files for both Python services.

Without --upgrade, uv preserves existing pins where possible and only rewrites
lock files needed to match pyproject.toml. With --upgrade, uv refreshes allowed
versions, which is intended for scheduled dependency-maintenance PRs.
USAGE
}

upgrade=0
if [[ "${1:-}" == "--upgrade" ]]; then
  upgrade=1
  shift
fi
if [[ $# -ne 0 ]]; then
  usage >&2
  exit 2
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
uv_bin="${UV:-uv}"
services=("apps/api" "apps/worker")

for service in "${services[@]}"; do
  echo "Synchronizing Python locks for ${service}"
  pushd "${repo_root}/${service}" >/dev/null

  if [[ "${upgrade}" -eq 1 ]]; then
    "${uv_bin}" lock --upgrade
    "${uv_bin}" pip compile --upgrade pyproject.toml -o requirements.lock
    "${uv_bin}" pip compile --upgrade pyproject.toml --group dev -o requirements-dev.lock
  else
    "${uv_bin}" lock
    "${uv_bin}" pip compile pyproject.toml -o requirements.lock
    "${uv_bin}" pip compile pyproject.toml --group dev -o requirements-dev.lock
  fi

  popd >/dev/null
done
