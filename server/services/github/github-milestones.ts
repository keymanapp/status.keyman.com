import { github_token } from '../../identity/github';
import { Octokit } from '@octokit/rest';

export default {
  get: async function(): Promise<any> {
    const octokit = new Octokit({
      auth: github_token
    })

    const data = await octokit.paginate(octokit.rest.issues.listMilestones, {
      owner: 'keymanapp',
      repo: 'keyman',
      state: 'all'
    });

    return data;
  }
};