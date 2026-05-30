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

if ! command -v e2b >/dev/null 2>&1; then
  echo "e2b CLI not found. Install it with: npm install -g @e2b/cli" >&2
  exit 1
fi

AUTH_INFO="$(e2b auth info 2>/dev/null || true)"
if [ -z "${E2B_ACCESS_TOKEN:-}" ] && ! printf '%s\n' "${AUTH_INFO}" | grep -q "You are logged in"; then
  echo "E2B CLI is not authenticated. Run 'e2b auth login' or add E2B_ACCESS_TOKEN to ${ROOT_DIR}/.env.local." >&2
  exit 1
fi

echo "Creating interactive E2B sandbox from '${TEMPLATE_NAME}'"
e2b sandbox create "${TEMPLATE_NAME}"
