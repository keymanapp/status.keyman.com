
import { fetchFromGitHubGraphQlWithRetry } from '../../util/httppost.js';
import { logGitHubRateLimit } from '../../util/github-rate-limit.js';
import { KSGitHubIssue } from './github-issue.js';
// import { getCurrentSprint } from '../../current-sprint.js';

export default {

  get: function(cursor, issues): Promise<Array<KSGitHubIssue[]>> {
    const ghIssuesQuery = this.queryString(cursor);
    return fetchFromGitHubGraphQlWithRetry(ghIssuesQuery, 'issues').then(obj => {
      logGitHubRateLimit(obj?.data?.rateLimit, 'github-issues');
      //console.log(data);
      if(!obj.data || !obj.data.search) return [];
      const newIssues = [].concat(issues, obj.data.search.nodes);
      if(obj.data.search.pageInfo.hasNextPage) {
        return this.get(obj.data.search.pageInfo.endCursor, newIssues);
      }
      return newIssues;
    });
  },

  queryString: function(after) {
    after = JSON.stringify(after);
    return `
      search(first: 100, after:${after} type: ISSUE, query:"org:keymanapp is:open is:issue -repo:keymanapp/legacy-issues") {
        issueCount
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          ... on Issue {
            repository {
              name
            }
            state
            assignees(first:10) {
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

            labels(first:20) {
              nodes {
                color
                name
              }
            }

            timelineItems(itemTypes: [CROSS_REFERENCED_EVENT, CONNECTED_EVENT, DISCONNECTED_EVENT], first: 10) {
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
      }

      rateLimit {
        limit
        cost
        remaining
        resetAt
      }
    `
  }
};