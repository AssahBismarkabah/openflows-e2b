import { Sandbox } from 'e2b';
import {
  formatDate,
  minutesToMs,
  parseBoolean,
  parsePositiveInt,
  parseTimeoutAction,
  requireE2BCredentials,
  type TimeoutAction,
} from './config.js';

export type SandboxRuntime = {
  templateName: string;
  timeoutMinutes: number;
  onTimeout: TimeoutAction;
  autoResume: boolean;
};

export type ManagedSandbox = {
  sandbox: Sandbox;
  runtime: SandboxRuntime;
};

export function readSandboxRuntime(): SandboxRuntime {
  const templateName = process.env.E2B_TEMPLATE_NAME ?? 'openflows-codex-openai';
  const timeoutMinutes = parsePositiveInt(
    process.env.E2B_SANDBOX_TIMEOUT_MINUTES ?? '60',
    'E2B_SANDBOX_TIMEOUT_MINUTES',
  );
  const onTimeout = parseTimeoutAction(process.env.E2B_SANDBOX_ON_TIMEOUT ?? 'pause');
  const autoResume = parseBoolean(process.env.E2B_SANDBOX_AUTO_RESUME ?? 'true');

  return { templateName, timeoutMinutes, onTimeout, autoResume };
}

export async function createManagedSandbox(): Promise<ManagedSandbox> {
  requireE2BCredentials();
  const runtime = readSandboxRuntime();
  const sandbox = await Sandbox.create(runtime.templateName, {
    timeoutMs: minutesToMs(runtime.timeoutMinutes),
    lifecycle: {
      onTimeout: runtime.onTimeout,
      autoResume: runtime.onTimeout === 'pause' ? runtime.autoResume : false,
    },
    metadata: {
      project: 'openflows-e2b',
      template: runtime.templateName,
    },
  });

  return { sandbox, runtime };
}

export async function connectManagedSandbox(sandboxId: string): Promise<ManagedSandbox> {
  requireE2BCredentials();
  const runtime = readSandboxRuntime();
  const sandbox = await Sandbox.connect(sandboxId, {
    timeoutMs: minutesToMs(runtime.timeoutMinutes),
  });

  return { sandbox, runtime };
}

export async function printSandboxSummary(sandbox: Sandbox, runtime: SandboxRuntime): Promise<void> {
  const info = await sandbox.getInfo();

  console.log(`Sandbox: ${sandbox.sandboxId}`);
  console.log(`Template: ${runtime.templateName}`);
  console.log(`State: ${info.state}`);
  console.log(`End at: ${formatDate(info.endAt)}`);
  console.log(`Lifecycle: onTimeout=${runtime.onTimeout}, autoResume=${runtime.onTimeout === 'pause' ? runtime.autoResume : false}`);
  console.log(`Inspect: https://e2b.dev/dashboard/inspect/sandbox/${sandbox.sandboxId}`);
}
