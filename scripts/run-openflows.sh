#!/usr/bin/env bash
set -euo pipefail

OPENFLOWS_HOME="${OPENFLOWS_HOME:-/opt/openflows}"
RUNTIME_ENV="${1:-${OPENFLOWS_HOME}/.env}"

if [ ! -d "${OPENFLOWS_HOME}" ]; then
  echo "OpenFlows directory not found: ${OPENFLOWS_HOME}" >&2
  exit 1
fi

if [ ! -f "${RUNTIME_ENV}" ]; then
  echo "Runtime env file not found: ${RUNTIME_ENV}" >&2
  echo "Copy /opt/e2b-config/env/openflows.runtime.example.env to ${OPENFLOWS_HOME}/.env and fill it." >&2
  exit 1
fi

cd "${OPENFLOWS_HOME}"
set -a
# shellcheck disable=SC1090
source "${RUNTIME_ENV}"
set +a

exec ./target/release/agentflow
