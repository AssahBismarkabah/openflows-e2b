# OpenFlows on E2B

This directory contains E2B-specific configuration for running the OpenFlows
orchestrator in a sandbox. It intentionally lives outside the OpenFlows repo so
runtime secrets, E2B template metadata, and local operator scripts stay separate
from product source.


## Recommended Local/E2B Mode

Use the Codex CLI with your OpenAI API key:

```env
DEFAULT_CLI=codex
CODEX_PROVIDER=openai
CODEX_PATH=codex
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
GITHUB_REPOSITORY=owner/repo
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_...
```

Do not set `OPENAI_BASE_URL` for direct OpenAI usage.

## Build The Template

Install and authenticate the E2B CLI first:

```bash
npm install -g @e2b/cli
export E2B_ACCESS_TOKEN=e2b_...
```

For SDK/API-driven automation, also set `E2B_API_KEY`. The E2B CLI uses
`E2B_ACCESS_TOKEN` or `e2b auth login`.

Build the sandbox template:

```bash
cd path/to/this-repo
./scripts/build-template.sh
```

The default template name is `openflows-codex-openai`.

The build script prepares a minimized build context in `.build/context/` and
excludes local secrets, `.git`, `target/`, `node_modules/`, and other heavy
runtime artifacts.

The template also applies one E2B-local patch before compiling OpenFlows:
`patches/agentflow-openai-startup-guard.patch`. This fixes the current
`agentflow` startup guard so Codex + direct OpenAI is accepted without a
Fireworks key. The patch is isolated to the E2B build context; it does not edit
the OpenFlows checkout.

## Run Options

### 1. Interactive Sandbox

Create and attach to a shell:

```bash
./scripts/create-sandbox.sh
```

Inside the sandbox, create `/opt/openflows/.env` from the template and run:

```bash
cp /opt/e2b-config/env/openflows.runtime.example.env /opt/openflows/.env
# fill /opt/openflows/.env with runtime secrets
cd /opt/openflows
./target/release/agentflow
```

### 2. SDK/Command Driven Sandbox

Use E2B SDK or CLI to create the template, inject runtime env vars, then run:

```bash
cd /opt/openflows && ./target/release/agentflow
```

### 3. Plain Docker Compatibility

The same `e2b.Dockerfile` can be validated locally:

```bash
./scripts/prepare-context.sh
docker build -f .build/context/e2b.Dockerfile \
  -t e2b-config-image:codex-openai .build/context
```

## Runtime Notes

- The template bakes in code and binaries only. Secrets are runtime-only.
- `agentflow` currently uses an in-memory `SharedStore`; GitHub state survives,
  but orchestration memory does not. For long-running production use, wire the
  main `agentflow` binary to Redis before relying on restarts.
- E2B start commands run during template build and are snapshotted. OpenFlows
  needs runtime secrets, so the template does not start `agentflow` at build
  time. Start it after sandbox creation with runtime env vars.
