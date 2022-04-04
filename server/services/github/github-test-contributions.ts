
import httppost from '../../util/httppost';
import { github_token } from '../../identity/github';

export default {

  get: function(cursor, issues, startDate, user): Promise<Array<any>> {
    const ghIssuesQuery = this.queryString(cursor, user);
    return httppost('api.github.com', '/graphql',  //4
      {
        Authorization: ` Bearer ${github_token}`,
        Accept: 'application/vnd.github.antiope-preview+json, application/vnd.github.shadow-cat-preview+json'
      },

      // Lists recent issue comments in Keyman repos, cost 1 point per page
      JSON.stringify({query: ghIssuesQuery})
    ).then(data => {
      let obj = JSON.parse(data);
      if(!obj.data || !obj.data.user) return [];

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
      return (result.body ?? '').match(/^[\*\s-]*TEST_[A-Z0-9_]+[\*\s:\(]*(PASS|PASSED|FAIL|FAILED|BLOCKED|OPEN)/gm)
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
    {
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
    }
    `
  }
};