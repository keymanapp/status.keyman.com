/*
 * Keyman is copyright (C) SIL Global. MIT License.
 *
 * Created by mcdurdin on 2025-08-17
 *
 * Returns a single pull request in the same format as github status
 */

import httppost from '../../util/httppost.js';
import { github_token } from '../../identity/github.js';
import { logGitHubRateLimit } from '../../util/github-rate-limit.js';
import { pullRequestQuery } from './github-status.js';

export interface KSGitHubPullRequest {
  // TODO
  // repository: { name: string },
  // state: string,
  // assignees: { nodes: { login: string, avatarUrl: string, url: string }[] },
  // author: { login: string, avatarUrl: string, url: string },
  // title: string,
  // number: number,
  // url: string,
  // labels: { nodes: { color: string, name: string }[] },
  // timelineItems: { nodes: { __typename: string, willCloseTarget: boolean, subject: { number: number, url: string } }[] },
  // milestone: { title: string },
};

export default {
  get: function(repo: string, pullNumber: number): Promise<KSGitHubPullRequest | null> {
    const ghPullQuery = this.queryString(repo, pullNumber);
    return httppost('api.github.com', '/graphql',  //4
      {
        Authorization: ` Bearer ${github_token}`,
        Accept: 'application/vnd.github.antiope-preview+json, application/vnd.github.shadow-cat-preview+json'
      },

      // Returns single issue from a Keyman repo
      JSON.stringify({query: ghPullQuery})
    ).then(data => {
      let obj = JSON.parse(data);

      logGitHubRateLimit(obj?.data?.rateLimit, 'github-pull-request');
      const pullRequest = obj?.data?.repository?.pullRequest ?? null;
      if(!pullRequest) {
        console.dir(obj);
        console.error(`Failed to retrieve pull keymanapp/${repo}#${pullNumber}:`);
      }
      return pullRequest;
    });
  },

  queryString: function(repo, pullNumber) {
    repo = JSON.stringify(repo);
    return `
    {
      repository(owner: "keymanapp", name: ${repo}) {
        pullRequest(number: ${pullNumber}) {
          ${pullRequestQuery}
        }
      }
      rateLimit {
        limit
        cost
        remaining
        resetAt
      }
    }
    `;
  }
};
