# Codex + OpenAI E2B Template

This template builds OpenFlows for an E2B sandbox using the direct OpenAI path:

- CLI backend: `codex`
- Model provider: OpenAI
- Target repo: supplied at runtime through `GITHUB_REPOSITORY`
- GitHub token: supplied at runtime through `GITHUB_PERSONAL_ACCESS_TOKEN`

The image replaces OpenFlows' checked-in Fireworks-oriented registry with
`config/registry.codex-openai.json` and applies the E2B-local startup guard
patch so `OPENAI_API_KEY` is enough for `DEFAULT_CLI=codex`.

## Why This Template Exists

The OpenFlows repo already has a Dockerfile, but it currently installs Claude
Code while the checked-in registry defaults to Codex. This template is explicit:
it installs Codex and builds the `agentflow` binary used by the real
orchestration path.

## Build

From this configuration repo root:

```bash
./scripts/build-template.sh
```

Or directly:

```bash
./scripts/prepare-context.sh
e2b template create openflows-codex-openai \
  --path .build/context \
  --dockerfile e2b.Dockerfile \
  --cpu-count 4 \
  --memory-mb 8192
```

## Runtime

Use the TypeScript operator scripts from the configuration repo root. They
create or connect to a sandbox, upload `env/openflows.runtime.env` to
`/opt/openflows/.env`, and start `agentflow` in the background:

```bash
npm run openflows:launch
npm run openflows:status -- <sandbox-id>
npm run openflows:start -- <sandbox-id>
```

Manual shell startup is still possible for debugging, but it should not be the
normal operating path because runtime secrets should be injected after sandbox
creation, not baked into the template.
