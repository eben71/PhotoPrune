SHELL := /bin/bash

PNPM_VERSION ?= $(shell \
	sed -n 's/.*"packageManager"[[:space:]]*:[[:space:]]*"pnpm@\([0-9][0-9.]*\)".*/\1/p' package.json | head -n 1)

PNPM ?= $(shell \
	if [ -n "$$PNPM_HOME" ] && [ -x "$$PNPM_HOME/pnpm" ]; then printf '%s' "$$PNPM_HOME/pnpm"; \
	elif command -v pnpm >/dev/null 2>&1; then printf '%s' 'pnpm'; \
	elif command -v corepack >/dev/null 2>&1; then printf '%s' 'corepack pnpm'; \
	elif command -v npx >/dev/null 2>&1 && [ -n "$(PNPM_VERSION)" ]; then printf '%s' 'npx -y pnpm@$(PNPM_VERSION)'; \
	fi)

ifeq ($(PNPM),)
$(error pnpm is required. Install pnpm (https://pnpm.io/installation), or install Node and use Corepack ("corepack enable") / npx)
endif

DOCKER ?= $(shell \
	if command -v docker >/dev/null 2>&1; then command -v docker; \
	elif [ -x "/Applications/Docker.app/Contents/Resources/bin/docker" ]; then printf '%s' "/Applications/Docker.app/Contents/Resources/bin/docker"; \
	elif [ -x "/usr/local/bin/docker" ]; then printf '%s' "/usr/local/bin/docker"; \
	elif [ -x "/opt/homebrew/bin/docker" ]; then printf '%s' "/opt/homebrew/bin/docker"; \
	fi)

ifdef DOCKER
DOCKER_BIN_DIR := $(dir $(DOCKER))
# Quote docker path so Windows Git Bash paths with spaces (e.g. /c/Program Files/...) work.
DOCKER_RUN := PATH="$(DOCKER_BIN_DIR):$$PATH" "$(DOCKER)"
else
DOCKER_RUN := docker
endif
# Resolve uv from PATH, falling back to common install locations
UV ?= $(shell \
	if command -v uv >/dev/null 2>&1; then command -v uv; \
	elif [ -x "$(HOME)/.local/bin/uv" ]; then printf '%s' "$(HOME)/.local/bin/uv"; \
	elif [ -x "/opt/homebrew/bin/uv" ]; then printf '%s' "/opt/homebrew/bin/uv"; \
	fi)

ifeq ($(UV),)
$(error uv is required. Install via "brew install uv" or "curl -LsSf https://astral.sh/uv/install.sh | sh", ensure it is on PATH, or set UV=/full/path/to/uv)
endif

.PHONY: setup dev lint format format-check typecheck test build hooks fixture-server agent-%

_dev_compose := $(DOCKER_RUN) compose -f docker-compose.yml -p photoprune

setup:
	$(PNPM) install
	cd apps/api && $(UV) venv && $(UV) pip install -r requirements-dev.lock
	cd apps/worker && $(UV) venv && $(UV) pip install -r requirements-dev.lock

dev:
	@if [ -z "$(DOCKER)" ]; then \
		echo "docker is required for local dev. Install Docker Desktop for Mac (https://www.docker.com/products/docker-desktop/) and ensure the 'docker' CLI is on PATH." >&2; \
		exit 1; \
	fi
	@$(DOCKER_RUN) image inspect postgres:16-alpine >/dev/null 2>&1 || $(DOCKER_RUN) pull postgres:16-alpine
	@$(DOCKER_RUN) image inspect redis:7-alpine >/dev/null 2>&1 || $(DOCKER_RUN) pull redis:7-alpine
	@$(DOCKER_RUN) image inspect python:3.12-slim >/dev/null 2>&1 || $(DOCKER_RUN) pull python:3.12-slim
	@$(DOCKER_RUN) image inspect node:20-slim >/dev/null 2>&1 || $(DOCKER_RUN) pull node:20-slim
	$(_dev_compose) up --build --pull never

lint:
	$(PNPM) lint
	cd apps/api && $(UV) run ruff check app tests
	cd apps/worker && $(UV) run ruff check app tests

format:
	$(PNPM) format
	cd apps/api && $(UV) run black app tests
	cd apps/worker && $(UV) run black app tests

format-check:
	$(PNPM) format:check
	cd apps/api && $(UV) run black --check app tests
	cd apps/worker && $(UV) run black --check app tests

typecheck:
	$(PNPM) typecheck
	cd apps/api && $(UV) run mypy app
	cd apps/worker && $(UV) run mypy app

test:
	$(PNPM) test
	cd apps/api && $(UV) run pytest
	cd apps/worker && $(UV) run pytest

build:
	$(PNPM) build
	cd apps/api && $(UV) run python -m compileall app
	cd apps/worker && $(UV) run python -m compileall app

hooks:
	$(PNPM) lefthook install

fixture-server:
	cd apps/api && $(UV) venv && $(UV) pip install -r requirements-dev.lock
	cd apps/api && $(UV) run python ../../scripts/fixture_media_server.py

agent-%:
	node skills/agent-$*/agent-$*.mjs $(filter-out $@,$(MAKECMDGOALS))

--%:
	@:
