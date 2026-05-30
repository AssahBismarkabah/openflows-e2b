# OpenFlows on E2B

This repository is the local control plane for running OpenFlows inside an E2B
sandbox. It stays separate from the OpenFlows source checkout so template build
files, local operator settings, runtime secrets, and sandbox helper scripts do
not get mixed into product code.

## Operating Model

The intended flow is:

1. Build an E2B template from a local OpenFlows checkout.
2. Keep real secrets only in ignored local env files.
3. Launch a long-lived E2B sandbox from the template.
4. Upload runtime env into the sandbox at `/opt/openflows/.env`.
5. Start `agentflow` as a background process.
6. Give the system work by opening GitHub issues in `GITHUB_REPOSITORY`.
7. Observe progress from the sandbox log and GitHub branches/PRs.

OpenFlows is not started during template build because it needs runtime secrets.
The template contains code and binaries only. The TypeScript scripts create or
connect to sandboxes, provision env, start OpenFlows, and read status.

## Directory Layout

- `config/`: OpenFlows runtime config that is safe to bake into the template,
  such as the Codex/OpenAI agent registry.
- `env/`: Example env files plus ignored filled env files. A real
  `env/openflows.runtime.env` stays local and is copied into the sandbox at
  launch time.
- `patches/`: E2B-only source patches applied inside the temporary build
  context before compiling OpenFlows.
- `scripts/`: Local operator scripts for preparing the build context, building
  the template, creating sandboxes, starting OpenFlows, and checking status.
- `scripts/lib/`: Shared TypeScript helpers for env loading, sandbox lifecycle,
  runtime provisioning, and OpenFlows process control.
- `templates/`: E2B template definitions. The active template is
  `templates/codex-openai/e2b.Dockerfile`.
- `.build/`: Generated build context. It is ignored and can be recreated.

## Local Files

Create local env files from the examples:

```bash
cp env/e2b.local.example.env .env.local
cp env/openflows.runtime.example.env env/openflows.runtime.env
```

Fill `.env.local` with E2B settings:

```env
E2B_API_KEY=e2b_...
E2B_TEMPLATE_NAME=openflows-codex-openai
E2B_SANDBOX_TIMEOUT_MINUTES=60
E2B_SANDBOX_ON_TIMEOUT=pause
E2B_SANDBOX_AUTO_RESUME=true
```

Fill `env/openflows.runtime.env` with the target repo and runtime credentials:

```env
DEFAULT_CLI=codex
CODEX_PROVIDER=openai
CODEX_PATH=codex
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
GITHUB_REPOSITORY=owner/repo
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_...
```

`GITHUB_REPOSITORY` is the repo the agents should work on. It does not have to
be this configuration repository.

Ignored files are excluded from git, and filled `env/*.env` files are also
excluded from the generated E2B build context. Secrets stay runtime-only.

## Install

Install dependencies once:

```bash
npm install
```

Install and authenticate the E2B CLI:

```bash
npm install -g @e2b/cli
e2b auth login
```

The CLI can use browser login. The TypeScript SDK scripts use `E2B_API_KEY` or
`E2B_ACCESS_TOKEN` from `.env.local`.

## Build Template

Build the E2B template:

```bash
./scripts/build-template.sh
```

The build script creates `.build/context/`, copies in the OpenFlows checkout,
applies `patches/agentflow-openai-startup-guard.patch`, compiles `agentflow`,
and registers the template with E2B.

By default, the OpenFlows checkout is discovered at `../openflows`. Override it
with `OPENFLOWS_REPO=../path-to-openflows` in `.env.local` if needed.

## Run OpenFlows

Create a new long-lived sandbox, provision runtime env, and start OpenFlows:

```bash
npm run openflows:launch
```

The command prints the sandbox ID and inspect URL. Keep the sandbox ID; it is
the handle for status and restarts.

Check process state and log tail:

```bash
npm run openflows:status -- <sandbox-id>
```

Re-provision env and start OpenFlows in an existing sandbox:

```bash
npm run openflows:start -- <sandbox-id>
```

Create a long-lived sandbox without starting OpenFlows:

```bash
npm run sandbox:create-long
```

Extend an existing sandbox timeout:

```bash
npm run sandbox:extend -- <sandbox-id> 60
```

Extending timeout does not convert an older kill-on-timeout sandbox into
pause-on-timeout. Use `openflows:launch` or `sandbox:create-long` to create the
preferred `onTimeout=pause`, `autoResume=true` lifecycle.

## Sandbox Runtime Paths

Inside E2B:

- OpenFlows checkout and binary: `/opt/openflows`
- Runtime env uploaded by scripts: `/opt/openflows/.env`
- Process log: `/opt/openflows/logs/agentflow.log`
- Process pid: `/opt/openflows/runtime/agentflow.pid`
- Config repo snapshot: `/opt/e2b-config`

The OpenFlows process runs as the E2B `user` account. Workspaces are created
under that user's home directory.

## Giving Work To Agents

OpenFlows syncs open GitHub issues from `GITHUB_REPOSITORY`. To give agents a
task, create a clear issue in that repo with the expected behavior and
acceptance criteria. Nexus assigns work, Forge/Sentinel implement and review,
Vessel watches CI and merge state, and Lore updates docs after deployment.

Use GitHub to inspect branches and PRs, and use:

```bash
npm run openflows:status -- <sandbox-id> 120
```

to inspect recent agent logs.

## Local Docker Check

The same Dockerfile can be validated locally:

```bash
./scripts/prepare-context.sh
docker build -f .build/context/e2b.Dockerfile \
  -t e2b-config-image:codex-openai .build/context
```

## Notes

- Direct OpenAI mode does not need `OPENAI_BASE_URL`.
- OpenFlows currently initializes `SharedStore::new_in_memory()` in
  `binary/src/bin/agentflow.rs`. GitHub state survives, but in-memory flow state
  does not survive a process restart.
- Rebuild the E2B template after changing `templates/`, `config/`, `patches/`,
  or OpenFlows source code.
