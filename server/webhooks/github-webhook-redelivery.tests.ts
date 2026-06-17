import { triggerGitHookRedeliveryWorkflow } from './github-webhook-redelivery.js';

async function run() {
  return await triggerGitHookRedeliveryWorkflow();
}

await run();