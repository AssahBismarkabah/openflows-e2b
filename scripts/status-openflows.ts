import { fail, loadLocalEnv, parsePositiveInt } from './lib/config.js';
import { connectManagedSandbox, printSandboxSummary } from './lib/sandbox.js';
import { getOpenFlowsStatus } from './lib/openflows.js';

loadLocalEnv();

const sandboxId = process.argv[2];
if (!sandboxId) {
  fail('Usage: npm run openflows:status -- <sandbox-id> [tail-lines]');
}

const tailLines = parsePositiveInt(process.argv[3] ?? '80', 'tail lines');
const { sandbox, runtime } = await connectManagedSandbox(sandboxId);
const status = await getOpenFlowsStatus(sandbox, tailLines);

await printSandboxSummary(sandbox, runtime);
console.log(status);
