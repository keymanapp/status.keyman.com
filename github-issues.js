exports.queryString = function(after) {
  after = JSON.stringify(after);
  return `
  {
    search(first: 100, after:${after} type: ISSUE, query:"org:keymanapp is:open is:issue") {
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

          timelineItems(itemTypes: [CONNECTED_EVENT, DISCONNECTED_EVENT], first: 10) {
            nodes {
              ... on ConnectedEvent {
                __typename
                subject {
                  ... on PullRequest {
                    number
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
      cost
    }
  }
  `
};