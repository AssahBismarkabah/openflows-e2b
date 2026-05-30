#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [ -f "${ROOT_DIR}/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/.env.local"
  set +a
fi

if [ -z "${OPENFLOWS_REPO:-}" ]; then
  for candidate in "${ROOT_DIR}/../openflows" "${ROOT_DIR}/../OpenFlows" "${ROOT_DIR}/../AgentFlow"; do
    if [ -d "${candidate}" ]; then
      OPENFLOWS_REPO="${candidate}"
      break
    fi
  done
fi

if [ -z "${OPENFLOWS_REPO:-}" ]; then
  echo "OPENFLOWS_REPO is not set and no sibling OpenFlows checkout was found." >&2
  echo "Set OPENFLOWS_REPO in .env.local, for example: OPENFLOWS_REPO=../openflows" >&2
  exit 1
fi

case "${OPENFLOWS_REPO}" in
  /*) ;;
  *) OPENFLOWS_REPO="${ROOT_DIR}/${OPENFLOWS_REPO}" ;;
esac

OPENFLOWS_REPO="$(cd "${OPENFLOWS_REPO}" && pwd)"
CONTEXT_DIR="${ROOT_DIR}/.build/context"

if [ ! -d "${OPENFLOWS_REPO}" ]; then
  echo "OpenFlows repo not found: ${OPENFLOWS_REPO}" >&2
  exit 1
fi

if ! command -v rsync >/dev/null 2>&1; then
  echo "rsync is required to prepare the E2B build context." >&2
  exit 1
fi

rm -rf "${CONTEXT_DIR}"
mkdir -p "${CONTEXT_DIR}/openflows" "${CONTEXT_DIR}/e2b-config"

rsync -a --delete \
  --exclude '.git/' \
  --exclude '.codex' \
  --exclude '.idea/' \
  --exclude '.vscode/' \
  --exclude 'target/' \
  --exclude 'node_modules/' \
  --exclude 'dist/' \
  --exclude 'build/' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude '*.log' \
  --exclude 'snif.json' \
  "${OPENFLOWS_REPO}/" "${CONTEXT_DIR}/openflows/"

rsync -a --delete \
  --exclude '.build/' \
  --exclude '.git/' \
  --exclude '.codex' \
  --exclude '.idea/' \
  --exclude '.vscode/' \
  --exclude 'node_modules/' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '.env.*' \
  --include 'env/*.example.env' \
  --exclude 'env/*.env' \
  --exclude '*.log' \
  "${ROOT_DIR}/" "${CONTEXT_DIR}/e2b-config/"

cp "${ROOT_DIR}/templates/codex-openai/e2b.Dockerfile" "${CONTEXT_DIR}/e2b.Dockerfile"

echo "Prepared E2B build context:"
echo "  ${CONTEXT_DIR}"
