#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/sync-python-locks.sh [--check|--upgrade]

Synchronize Python lock files for both Python services.

Without flags, uv preserves existing pins where possible and rewrites lock files
needed to match pyproject.toml. With --upgrade, uv refreshes allowed versions,
which is intended for scheduled dependency-maintenance PRs. With --check, the
script verifies lock-file consistency without modifying the working tree or
upgrading the committed pins.
USAGE
}

mode="sync"
case "${1:-}" in
  --check)
    mode="check"
    shift
    ;;
  --upgrade)
    mode="upgrade"
    shift
    ;;
  "")
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac
if [[ $# -ne 0 ]]; then
  usage >&2
  exit 2
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ "${mode}" == "check" ]]; then
  python3 "${repo_root}/scripts/check-python-lock-pins.py"
fi
uv_bin="${UV:-uv}"
services=("apps/api" "apps/worker")

check_service() {
  local tmpdir
  tmpdir="$(mktemp -d)"
  trap 'rm -rf "${tmpdir}"' RETURN

  cp requirements.lock "${tmpdir}/requirements.lock"
  cp requirements-dev.lock "${tmpdir}/requirements-dev.lock"

  "${uv_bin}" lock --locked
  "${uv_bin}" pip compile pyproject.toml \
    -o "${tmpdir}/requirements.lock" \
    --custom-compile-command "uv pip compile pyproject.toml -o requirements.lock" \
    >/dev/null
  "${uv_bin}" pip compile pyproject.toml --group dev \
    -o "${tmpdir}/requirements-dev.lock" \
    --custom-compile-command "uv pip compile pyproject.toml --group dev -o requirements-dev.lock" \
    >/dev/null

  diff -u requirements.lock "${tmpdir}/requirements.lock"
  diff -u requirements-dev.lock "${tmpdir}/requirements-dev.lock"
}

for service in "${services[@]}"; do
  if [[ "${mode}" == "check" ]]; then
    echo "Checking Python locks for ${service}"
  else
    echo "Synchronizing Python locks for ${service}"
  fi
  pushd "${repo_root}/${service}" >/dev/null

  case "${mode}" in
    upgrade)
      "${uv_bin}" lock --upgrade
      "${uv_bin}" pip compile --upgrade pyproject.toml -o requirements.lock
      "${uv_bin}" pip compile --upgrade pyproject.toml --group dev -o requirements-dev.lock
      ;;
    check)
      check_service
      ;;
    sync)
      "${uv_bin}" lock
      "${uv_bin}" pip compile pyproject.toml -o requirements.lock
      "${uv_bin}" pip compile pyproject.toml --group dev -o requirements-dev.lock
      ;;
  esac

  popd >/dev/null
done
