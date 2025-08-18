/*
 * Keyman is copyright (C) SIL Global. MIT License.
 *
 * Created by mcdurdin on 2025-08-17
 *
 * Returns a single issue in the same format as github-issues
 */

import httppost from '../../util/httppost.js';
import { github_token } from '../../identity/github.js';
import { logGitHubRateLimit } from '../../util/github-rate-limit.js';

export interface KSGitHubIssue {
  repository: { name: string },
  state: string,
  assignees: { nodes: { login: string, avatarUrl: string, url: string }[] },
  author: { login: string, avatarUrl: string, url: string },
  title: string,
  number: number,
  url: string,
  labels: { nodes: { color: string, name: string }[] },
  timelineItems: { nodes: { __typename: string, willCloseTarget: boolean, subject: { number: number, url: string } }[] },
  milestone: { title: string },
};

export default {
  get: function(repo: string, issueNumber: number): Promise<KSGitHubIssue | null> {
    const ghIssueQuery = this.queryString(repo, issueNumber);
    return httppost('api.github.com', '/graphql',  //4
      {
        Authorization: ` Bearer ${github_token}`,
        Accept: 'application/vnd.github.antiope-preview+json, application/vnd.github.shadow-cat-preview+json'
      },

      // Returns single issue from a Keyman repo
      JSON.stringify({query: ghIssueQuery})
    ).then(data => {
      let obj = JSON.parse(data);

      logGitHubRateLimit(obj?.data?.rateLimit, 'github-issue');
      const issue = obj?.data?.repository?.issue ?? null;
      if(!issue) {
        console.dir(obj);
        console.error(`Failed to retrieve issue keymanapp/${repo}#${issueNumber}:`);
      }
      return issue;
    });
  },

  queryString: function(repo, issueNumber) {
    repo = JSON.stringify(repo);
    return `
    {
      repository(owner: "keymanapp", name: ${repo}) {
        issue(number: ${issueNumber}) {
          repository {
            name
          }
          state
          assignees(first: 10) {
            nodes {
              login
              avatarUrl
              url
            }
          }
          author {
            login
            avatarUrl
            url
          }
          title
          number
          url
          labels(first: 20) {
            nodes {
              color
              name
            }
          }
          timelineItems(
            itemTypes: [CROSS_REFERENCED_EVENT, CONNECTED_EVENT, DISCONNECTED_EVENT]
            first: 10
          ) {
            nodes {
              ... on CrossReferencedEvent {
                __typename
                willCloseTarget
                subject: source {
                  ... on PullRequest {
                    number
                    url
                  }
                  ... on Issue {
                    number
                    url
                  }
                }
              }
              ... on ConnectedEvent {
                __typename
                subject {
                  ... on PullRequest {
                    number
                    url
                  }
                }
              }
              ... on DisconnectedEvent {
                __typename
                subject {
                  ... on PullRequest {
                    number
                  }
                }
              }
            }
          }
          milestone {
            title
          }
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

/*

Example return:

{
  "data": {
    "repository": {
      "issue": {
        "repository": {
          "name": "keyman"
        },
        "assignees": {
          "nodes": [
            {
              "login": "mcdurdin",
              "avatarUrl": "https://avatars.githubusercontent.com/u/4498365?v=4",
              "url": "https://github.com/mcdurdin"
            }
          ]
        },
        "author": {
          "login": "mcdurdin",
          "avatarUrl": "https://avatars.githubusercontent.com/u/4498365?v=4",
          "url": "https://github.com/mcdurdin"
        },
        "title": "chore(developer): remove support for compile targets",
        "number": 12688,
        "url": "https://github.com/keymanapp/keyman/issues/12688",
        "labels": {
          "nodes": [
            {
              "color": "f9d0c4",
              "name": "developer/"
            },
            {
              "color": "eaa15d",
              "name": "chore"
            },
            {
              "color": "801392",
              "name": "m:kmn"
            }
          ]
        },
        "timelineItems": {
          "nodes": [
            {
              "__typename": "CrossReferencedEvent",
              "willCloseTarget": false,
              "subject": {
                "number": 13349,
                "url": "https://github.com/keymanapp/keyman/issues/13349"
              }
            },
            {
              "__typename": "CrossReferencedEvent",
              "willCloseTarget": false,
              "subject": {
                "number": 2077,
                "url": "https://github.com/keymanapp/help.keyman.com/pull/2077"
              }
            }
          ]
        },
        "milestone": {
          "title": "19.0"
        }
      }
    },
    "rateLimit": {
      "limit": 5000,
      "cost": 1,
      "remaining": 4983,
      "resetAt": "2025-08-17T06:15:31Z"
    }
  }
}

*/
