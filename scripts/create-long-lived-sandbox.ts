import {
  createManagedSandbox,
  printSandboxSummary,
} from './lib/sandbox.js';
import {
  loadLocalEnv,
} from './lib/config.js';

loadLocalEnv();

const created = await createManagedSandbox();
await printSandboxSummary(created.sandbox, created.runtime);
