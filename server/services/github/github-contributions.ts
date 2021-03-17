exports.queryString = function(startDate) { 
  let d = new Date(startDate);
  d.setDate(d.getDate()+14);  // Unofficial start date is the Sat before the start of sprint (which is a Monday)
  let endDate = d.toISOString();
  return `
{
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
` };