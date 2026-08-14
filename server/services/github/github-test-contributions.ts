
import { fetchFromGitHubGraphQlWithRetry } from '../../util/httppost.js';
import { logGitHubRateLimit } from '../../util/github-rate-limit.js';

export const USER_TEST_RESULT_REGEX = /^[\*\s-]*TEST_[A-Z0-9_]+[\*\s:\(]*(PASS|PASSED|FAIL|FAILED|BLOCKED|OPEN)/gm;

export default {

  get: function(cursor, issues, startDate, user): Promise<Array<any>> {
    const ghIssuesQuery = this.queryString(cursor, user);
    return fetchFromGitHubGraphQlWithRetry(ghIssuesQuery, 'test-contributions').then(obj => {
      if(!obj.data || !obj.data.user) return [];

      logGitHubRateLimit(obj?.data?.rateLimit, 'github-test-contributions');

      let targetDate = new Date(startDate);
      let results = obj.data.user.issueComments.nodes.filter(result => new Date(result.createdAt) >= targetDate);
      const newIssues = [].concat(issues, this.filterTestResults(results));

      // If we haven't hit the edge of our search boundary, multipage terminate when outside date bounds
      if(results.length == obj.data.user.issueComments.nodes.length && obj.data.user.issueComments.pageInfo.hasNextPage) {
        return this.get(obj.data.user.issueComments.pageInfo.endCursor, newIssues, startDate, user);
      }

      // Finally, filter duplicates by issue/PR number
      let seen = {};
      return newIssues.filter(result => seen.hasOwnProperty(result.issue.number) ? false : (seen[result.issue.number] = true));
    });
  },

  filterTestResults: function(results) {
    // Only return comments that have valid TEST_XXX results
    return results.filter(result => {
      return (result.body ?? '').match(USER_TEST_RESULT_REGEX)
    }).map(result => { return {
        // strip body from results
        occurredAt: result.createdAt,
        issue: result.issue,
        url: result.url
      }
    });
  },

  queryString: function(after, user) {
    after = JSON.stringify(after);
    return `
      rateLimit {
        limit
        cost
        remaining
        resetAt
      }

      user(login: "${user}") {

        # Collect test result contributions

        issueComments(first: 100, after: ${after}, orderBy:{field:UPDATED_AT, direction:DESC}) {
          pageInfo {
            hasNextPage
            endCursor
          }

          nodes {
            body
            url
            createdAt
            issue {
              number
              title
            }
          }
        }
      }
    `
  }
};