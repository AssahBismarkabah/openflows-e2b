import { Sandbox } from 'e2b';
import {
  fail,
  formatDate,
  loadLocalEnv,
  minutesToMs,
  parsePositiveInt,
  requireE2BCredentials,
} from './lib/config.js';

loadLocalEnv();

const sandboxId = process.argv[2];
const timeoutMinutes = parsePositiveInt(
  process.argv[3] ?? process.env.E2B_SANDBOX_TIMEOUT_MINUTES ?? '60',
  'timeout minutes',
);

if (!sandboxId) {
  fail('Usage: npm run sandbox:extend -- <sandbox-id> [timeout-minutes]');
}

requireE2BCredentials();

await Sandbox.setTimeout(sandboxId, minutesToMs(timeoutMinutes));
const info = await Sandbox.getInfo(sandboxId);

console.log(`Sandbox extended: ${sandboxId}`);
console.log(`State: ${info.state}`);
console.log(`End at: ${formatDate(info.endAt)}`);
console.log('Note: this changes timeout only. It does not convert a kill-on-timeout sandbox into pause-on-timeout.');
