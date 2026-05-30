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

export function readRuntimeEnv(): string {
  const filePath = path.join(rootDir, 'env/openflows.runtime.env');
  if (!fs.existsSync(filePath)) {
    fail(`Missing runtime env file: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  validateRuntimeEnv(content);
  return content.endsWith('\n') ? content : `${content}\n`;
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

  const result = await sandbox.commands.run(command, {
    cwd: openflowsHome,
    user: 'user',
    timeoutMs: 20_000,
  });

  return [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
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

  const result = await sandbox.commands.run(command, {
    cwd: openflowsHome,
    user: 'user',
    timeoutMs: 20_000,
  });

  return [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
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
