import fs from 'node:fs';
import path from 'node:path';
import { Sandbox } from 'e2b';
import { fail, rootDir } from './config.js';

const openflowsHome = '/opt/openflows';
const logsDir = `${openflowsHome}/logs`;
const runtimeDir = `${openflowsHome}/runtime`;
const runtimeEnvPath = `${openflowsHome}/.env`;
const logPath = `${logsDir}/agentflow.log`;
const pidPath = `${runtimeDir}/agentflow.pid`;
const agentGithubTokenKeys = [
  'AGENT_NEXUS_GITHUB_TOKEN',
  'AGENT_FORGE_GITHUB_TOKEN',
  'AGENT_SENTINEL_GITHUB_TOKEN',
  'AGENT_VESSEL_GITHUB_TOKEN',
  'AGENT_LORE_GITHUB_TOKEN',
];

export function readRuntimeEnv(): string {
  const filePath = path.join(rootDir, 'env/openflows.runtime.env');
  if (!fs.existsSync(filePath)) {
    fail(`Missing runtime env file: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  validateRuntimeEnv(content);
  return withAgentGithubTokenFallbacks(content);
}

export async function provisionOpenFlowsRuntime(sandbox: Sandbox, runtimeEnv: string): Promise<void> {
  await sandbox.commands.run(`mkdir -p ${logsDir} ${runtimeDir} && chown -R user:user ${logsDir} ${runtimeDir}`, {
    user: 'root',
    timeoutMs: 10_000,
  });
  await sandbox.files.write(runtimeEnvPath, runtimeEnv, { user: 'root' });
  await sandbox.commands.run(`chmod 600 ${runtimeEnvPath} && chown user:user ${runtimeEnvPath}`, {
    user: 'root',
    timeoutMs: 10_000,
  });
}

export async function startOpenFlows(sandbox: Sandbox): Promise<string> {
  const command = [
    'set -euo pipefail',
    `mkdir -p ${logsDir} ${runtimeDir}`,
    `if [ -f ${pidPath} ] && kill -0 "$(cat ${pidPath})" 2>/dev/null; then`,
    `  echo "agentflow already running pid=$(cat ${pidPath})"`,
    '  exit 0',
    'fi',
    `nohup /opt/e2b-config/scripts/run-openflows.sh ${runtimeEnvPath} > ${logPath} 2>&1 &`,
    `echo $! > ${pidPath}`,
    'sleep 2',
    `if ! kill -0 "$(cat ${pidPath})" 2>/dev/null; then`,
    '  echo "agentflow failed to stay running"',
    `  tail -n 80 ${logPath} || true`,
    '  exit 1',
    'fi',
    `echo "agentflow started pid=$(cat ${pidPath})"`,
  ].join('\n');

  try {
    const result = await sandbox.commands.run(command, {
      cwd: openflowsHome,
      user: 'user',
      timeoutMs: 20_000,
    });

    return sanitizeOutput([result.stdout, result.stderr].filter(Boolean).join('\n').trim());
  } catch (error) {
    fail(formatCommandError('Failed to start OpenFlows', error));
  }
}

export async function getOpenFlowsStatus(sandbox: Sandbox, tailLines = 80): Promise<string> {
  const command = [
    'set -euo pipefail',
    `if [ -f ${pidPath} ] && kill -0 "$(cat ${pidPath})" 2>/dev/null; then`,
    `  echo "agentflow running pid=$(cat ${pidPath})"`,
    'else',
    '  echo "agentflow not running"',
    'fi',
    `echo "--- log: ${logPath} ---"`,
    `if [ -f ${logPath} ]; then tail -n ${tailLines} ${logPath}; else echo "no log file yet"; fi`,
  ].join('\n');

  try {
    const result = await sandbox.commands.run(command, {
      cwd: openflowsHome,
      user: 'user',
      timeoutMs: 20_000,
    });

    return sanitizeOutput([result.stdout, result.stderr].filter(Boolean).join('\n').trim());
  } catch (error) {
    fail(formatCommandError('Failed to read OpenFlows status', error));
  }
}

function validateRuntimeEnv(content: string): void {
  const env = parseEnv(content);
  const errors: string[] = [];

  requireValue(env, 'OPENAI_API_KEY', errors);
  requireValue(env, 'GITHUB_REPOSITORY', errors);
  requireValue(env, 'GITHUB_PERSONAL_ACCESS_TOKEN', errors);

  if (env.OPENAI_API_KEY?.startsWith('sk-your-')) errors.push('OPENAI_API_KEY still has the example placeholder.');
  if (env.GITHUB_REPOSITORY === 'owner/repo') errors.push('GITHUB_REPOSITORY still has the example placeholder.');
  if (env.GITHUB_PERSONAL_ACCESS_TOKEN?.startsWith('ghp-your-')) {
    errors.push('GITHUB_PERSONAL_ACCESS_TOKEN still has the example placeholder.');
  }

  if (errors.length > 0) {
    fail(`Runtime env is not ready:\n${errors.map((error) => `- ${error}`).join('\n')}`);
  }
}

function withAgentGithubTokenFallbacks(content: string): string {
  const env = parseEnv(content);
  const fallbackToken = env.GITHUB_PERSONAL_ACCESS_TOKEN;
  const additions = agentGithubTokenKeys
    .filter((key) => !env[key])
    .map((key) => `${key}=${shellQuote(fallbackToken)}`);

  const normalized = content.endsWith('\n') ? content : `${content}\n`;
  if (additions.length === 0) return normalized;

  return [
    normalized,
    '# Added by OpenFlows E2B launcher when per-agent GitHub tokens are not set.',
    ...additions,
    '',
  ].join('\n');
}

function requireValue(env: Record<string, string>, key: string, errors: string[]): void {
  if (!env[key]) errors.push(`${key} is missing or empty.`);
}

function parseEnv(content: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    env[line.slice(0, eq).trim()] = stripOptionalQuotes(line.slice(eq + 1).trim());
  }
  return env;
}

function stripOptionalQuotes(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function formatCommandError(prefix: string, error: unknown): string {
  const result = (error as { result?: { stdout?: string; stderr?: string; error?: string } }).result;
  if (!result) {
    return `${prefix}: ${error instanceof Error ? error.message : String(error)}`;
  }

  const output = sanitizeOutput([result.error, result.stdout, result.stderr].filter(Boolean).join('\n').trim());
  return `${prefix}:\n${output}`;
}

function sanitizeOutput(output: string): string {
  return output
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer <redacted>')
    .replace(/github_pat_[A-Za-z0-9_]+/g, '<github-token-redacted>')
    .replace(/gh[opusr]_[A-Za-z0-9_]+/g, '<github-token-redacted>')
    .replace(/sk-[A-Za-z0-9_-]+/g, '<openai-key-redacted>')
    .replace(/e2b_[A-Za-z0-9_-]+/g, '<e2b-key-redacted>');
}
