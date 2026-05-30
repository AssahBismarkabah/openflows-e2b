import { fail, loadLocalEnv } from './lib/config.js';
import { connectManagedSandbox, printSandboxSummary } from './lib/sandbox.js';
import { provisionOpenFlowsRuntime, readRuntimeEnv, startOpenFlows } from './lib/openflows.js';

loadLocalEnv();

const sandboxId = process.argv[2];
if (!sandboxId) {
  fail('Usage: npm run openflows:start -- <sandbox-id>');
}

const runtimeEnv = readRuntimeEnv();
const { sandbox, runtime } = await connectManagedSandbox(sandboxId);

await provisionOpenFlowsRuntime(sandbox, runtimeEnv);
const startOutput = await startOpenFlows(sandbox);

await printSandboxSummary(sandbox, runtime);
console.log('OpenFlows runtime: started');
if (startOutput) console.log(startOutput);
