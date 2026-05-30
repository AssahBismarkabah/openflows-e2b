import { Sandbox } from 'e2b';
import {
  fail,
  formatDate,
  loadLocalEnv,
  minutesToMs,
  parseBoolean,
  parsePositiveInt,
  parseTimeoutAction,
  requireE2BCredentials,
} from './lib/config.js';

loadLocalEnv();

const templateName = process.env.E2B_TEMPLATE_NAME ?? 'openflows-codex-openai';
const timeoutMinutes = parsePositiveInt(
  process.env.E2B_SANDBOX_TIMEOUT_MINUTES ?? '60',
  'E2B_SANDBOX_TIMEOUT_MINUTES',
);
const onTimeout = parseTimeoutAction(process.env.E2B_SANDBOX_ON_TIMEOUT ?? 'pause');
const autoResume = parseBoolean(process.env.E2B_SANDBOX_AUTO_RESUME ?? 'true');

requireE2BCredentials();

const sandbox = await Sandbox.create(templateName, {
  timeoutMs: minutesToMs(timeoutMinutes),
  lifecycle: {
    onTimeout,
    autoResume: onTimeout === 'pause' ? autoResume : false,
  },
  metadata: {
    project: 'openflows-e2b',
    template: templateName,
  },
});

const info = await sandbox.getInfo();

console.log(`Sandbox created: ${sandbox.sandboxId}`);
console.log(`Template: ${templateName}`);
console.log(`State: ${info.state}`);
console.log(`End at: ${formatDate(info.endAt)}`);
console.log(`Lifecycle: onTimeout=${onTimeout}, autoResume=${onTimeout === 'pause' ? autoResume : false}`);
console.log(`Inspect: https://e2b.dev/dashboard/inspect/sandbox/${sandbox.sandboxId}`);
