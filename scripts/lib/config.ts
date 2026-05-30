import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type TimeoutAction = 'pause' | 'kill';

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function loadLocalEnv(): void {
  const filePath = path.join(rootDir, '.env.local');
  if (!fs.existsSync(filePath)) return;

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    const value = stripOptionalQuotes(line.slice(eq + 1).trim());
    process.env[key] ??= value;
  }
}

export function requireE2BCredentials(): void {
  if (!process.env.E2B_API_KEY && !process.env.E2B_ACCESS_TOKEN) {
    fail('Set E2B_API_KEY or E2B_ACCESS_TOKEN in .env.local before using the SDK.');
  }
}

export function parseTimeoutAction(value: string): TimeoutAction {
  if (value === 'pause' || value === 'kill') return value;
  fail('E2B_SANDBOX_ON_TIMEOUT must be "pause" or "kill".');
}

export function parsePositiveInt(value: string, name: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    fail(`${name} must be a positive integer.`);
  }
  return parsed;
}

export function parseBoolean(value: string): boolean {
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export function minutesToMs(minutes: number): number {
  return minutes * 60 * 1000;
}

export function formatDate(value: Date | string | undefined): string {
  if (!value) return '<unknown>';
  return value instanceof Date ? value.toISOString() : value;
}

export function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function stripOptionalQuotes(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}
