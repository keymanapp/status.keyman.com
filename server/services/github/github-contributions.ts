
import httppost from '../../util/httppost.js';
import { github_token } from '../../identity/github.js';
import { logGitHubRateLimit } from '../../util/github-rate-limit.js';

export default {

  get: function(startDateTime) {
    return httppost('api.github.com', '/graphql',
      {
        Authorization: ` Bearer ${github_token}`,
        Accept: 'application/vnd.github.antiope-preview, application/vnd.github.shadow-cat-preview+json'
      },
      // Gather the contributions for each recent user

      JSON.stringify({query: this.queryString(startDateTime)}),
    ).then(data => {
      const result = JSON.parse(data);
      logGitHubRateLimit(result?.data?.rateLimit, 'github-contributions');
      return result;
    });
  },

  queryString: function(startDate) {
    let d = new Date(startDate);
    d.setDate(d.getDate()+14);  // Unofficial start date is the Sat before the start of sprint (which is a Monday)
    let endDate = d.toISOString();
    return `
    {
      rateLimit {
        limit
        cost
        remaining
        resetAt
      }

      repository(owner: "keymanapp", name: "keyman") {

        # Collect contributions

        contributions: assignableUsers(first:100) {
          nodes {
            login
            avatarUrl
            contributions: contributionsCollection(from: "${startDate}", to: "${endDate}" organizationID: "MDEyOk9yZ2FuaXphdGlvbjEyNDAyOTI2") {
              pullRequests: pullRequestContributions(first: 100, orderBy: {direction: DESC}) {
                nodes {
                  occurredAt
                  pullRequest {
                    number
                    url
                    title
                  }
                }
              }
              reviews: pullRequestReviewContributions(first: 100, orderBy: {direction: DESC}) {
                nodes {
                  occurredAt
                  pullRequest {
                    number
                    url
                    title
                  }
                }
              }
              issues: issueContributions(first: 100, orderBy: {direction: DESC}) {
                nodes {
                  occurredAt
                  issue {
                    number
                    url
                    title
                  }
                }
              }
            }
          }
        }
      }
    }
    `
  }
};