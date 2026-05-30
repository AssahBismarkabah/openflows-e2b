import { loadLocalEnv } from './lib/config.js';
import { createManagedSandbox, printSandboxSummary } from './lib/sandbox.js';
import { provisionOpenFlowsRuntime, readRuntimeEnv, startOpenFlows } from './lib/openflows.js';

loadLocalEnv();

const runtimeEnv = readRuntimeEnv();
const { sandbox, runtime } = await createManagedSandbox();

await provisionOpenFlowsRuntime(sandbox, runtimeEnv);
const startOutput = await startOpenFlows(sandbox);

await printSandboxSummary(sandbox, runtime);
console.log('OpenFlows runtime: started');
if (startOutput) console.log(startOutput);
