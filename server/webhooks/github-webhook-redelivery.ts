import { Octokit } from '@octokit/rest';

import { github_token } from '../identity/github.js';
import { consoleLog } from '../util/console-log.js';

export async function triggerGitHookRedeliveryWorkflow() {
  consoleLog('github_webhook', null, `Starting workflow_dispatch`);

  const octokit = new Octokit({
    auth: github_token
  });

  const result = await octokit.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', {
    owner: 'keymanapp',
    repo: 'status.keyman.com',
    workflow_id: 'redeliver-failed-deliveries.yml',
    ref: 'master',
    headers: {
      'X-GitHub-Api-Version': '2026-03-10'
    }
  });

  consoleLog('github_webhook', null, `Posted workflow_dispatch with result ${result?.status}, ${(<any>result?.data)?.run_url}`);
}

