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

TEMPLATE_NAME="${E2B_TEMPLATE_NAME:-openflows-codex-openai}"
CPU_COUNT="${E2B_CPU_COUNT:-4}"
MEMORY_MB="${E2B_MEMORY_MB:-8192}"
CONTEXT_DIR="${ROOT_DIR}/.build/context"
DOCKERFILE="${CONTEXT_DIR}/e2b.Dockerfile"

if ! command -v e2b >/dev/null 2>&1; then
  echo "e2b CLI not found. Install it with: npm install -g @e2b/cli" >&2
  exit 1
fi

if [ -z "${E2B_API_KEY:-}" ]; then
  echo "E2B_API_KEY is not set. Export it or create ${ROOT_DIR}/.env.local." >&2
  exit 1
fi

echo "Preparing minimized build context..."
"${SCRIPT_DIR}/prepare-context.sh"

echo "Building E2B template '${TEMPLATE_NAME}'"
echo "  path:       ${CONTEXT_DIR}"
echo "  dockerfile: ${DOCKERFILE}"
echo "  cpu:        ${CPU_COUNT}"
echo "  memory:     ${MEMORY_MB} MB"

e2b template create "${TEMPLATE_NAME}" \
  --path "${CONTEXT_DIR}" \
  --dockerfile "${DOCKERFILE}" \
  --cpu-count "${CPU_COUNT}" \
  --memory-mb "${MEMORY_MB}"
