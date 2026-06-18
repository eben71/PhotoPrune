#!/usr/bin/env python3
"""Check exact Python dependency pins are reflected in committed lock files."""

from __future__ import annotations

import re
import sys
import tomllib
from pathlib import Path

SERVICES = (Path("apps/api"), Path("apps/worker"))
PIN_RE = re.compile(r"^([A-Za-z0-9_.-]+)==([^;\s]+)")
LOCK_PACKAGE_RE = re.compile(
    r'^name = "(?P<name>[^"]+)"\nversion = "(?P<version>[^"]+)"', re.MULTILINE
)
REQ_RE = re.compile(r"^(?P<name>[A-Za-z0-9_.-]+)==(?P<version>[^;\s]+)", re.MULTILINE)


def normalize(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).lower()


def exact_pins(pyproject: Path) -> dict[str, str]:
    data = tomllib.loads(pyproject.read_text())
    pins: dict[str, str] = {}
    dependencies = list(data.get("project", {}).get("dependencies", []))
    for group in data.get("dependency-groups", {}).values():
        dependencies.extend(group)
    for dependency in dependencies:
        match = PIN_RE.match(dependency)
        if match:
            pins[normalize(match.group(1))] = match.group(2)
    return pins


def uv_versions(lock: Path) -> dict[str, str]:
    return {
        normalize(match.group("name")): match.group("version")
        for match in LOCK_PACKAGE_RE.finditer(lock.read_text())
    }


def requirements_versions(lock: Path) -> dict[str, str]:
    return {
        normalize(match.group("name")): match.group("version")
        for match in REQ_RE.finditer(lock.read_text())
    }


def main() -> int:
    errors: list[str] = []
    for service in SERVICES:
        pins = exact_pins(service / "pyproject.toml")
        uv = uv_versions(service / "uv.lock")
        requirements_dev = requirements_versions(service / "requirements-dev.lock")
        for name, version in sorted(pins.items()):
            uv_version = uv.get(name)
            if uv_version != version:
                errors.append(
                    f"{service}/uv.lock has {name}=={uv_version or '<missing>'}; pyproject.toml pins {name}=={version}"
                )
            req_version = requirements_dev.get(name)
            if req_version != version:
                errors.append(
                    f"{service}/requirements-dev.lock has {name}=={req_version or '<missing>'}; pyproject.toml pins {name}=={version}"
                )
    if errors:
        print("Python lock pin check failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        print(
            "Run `make python-locks` to synchronize Python lock files.", file=sys.stderr
        )
        return 1
    print("Python exact dependency pins match uv.lock and requirements-dev.lock.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
