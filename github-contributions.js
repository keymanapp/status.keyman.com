exports.queryString = function(startDate) { return `
{
  repository(owner: "keymanapp", name: "keyman") {

    # Collect contributions

    contributions: assignableUsers(first:100) {
      nodes {
        login
        avatarUrl
        contributions: contributionsCollection(from: "${startDate}",  organizationID: "MDEyOk9yZ2FuaXphdGlvbjEyNDAyOTI2") {
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
` };