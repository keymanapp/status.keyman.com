exports.queryString = function() { return `
{
  repository(owner: "keymanapp", name: "keyman") {

    refs(first:100, refPrefix: "refs/heads/") {
      nodes {
        name
      }
    }
    issuesWithNoMilestone: issues(first: 1, filterBy: {milestone: null, states: OPEN}) {
      totalCount
    }
    issuesByLabelAndMilestone: labels(first: 10, query: "windows web developer mac ios android linux") {
      edges {
        node {
          name
          openIssues: issues(first: 100, filterBy: {states: [OPEN]}) {
            totalCount
            edges {
              node {
                milestone {
                  title
                }
              }
            }
          }
        }
      }
    }
    milestones(first: 10, orderBy: {direction: ASC, field: DUE_DATE}, states: OPEN) {
      edges {
        node {
          dueOn
          title
          openIssues: issues(first: 1, states: OPEN) {
            totalCount
          }
          closedIssues: issues(first: 1, states: CLOSED) {
            totalCount
          }
          openPullRequests: pullRequests(first: 1, states: OPEN) {
            totalCount
          }
          mergedPullRequests: pullRequests(first: 1, states: MERGED) {
            totalCount
          }
        }
      }
    }
    pullRequests(last: 50, states: OPEN) {
      edges {
        node {
          title
          milestone {
            title
          }
          author {
            avatarUrl
            login
            url
          }
          # Simplest way to get reviewed state is with the hovercard...
          hovercard(includeNotificationContexts:false) {
            contexts {
              message
              octicon
              __typename
            }
          }
          number
          url
          commits(last: 1) {
            edges {
              node {
                commit {
                  status {
                    contexts {
                      description
                      context
                      state
                    }
                  }
                }
              }
            }
          }
          labels(first: 25) {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    }
  }
  organization(login: "keymanapp") {
    repositories(first: 30) {
      nodes {
        name
        issuesByMilestone: issues(first: 100, filterBy: {states: [OPEN]}) {
          totalCount
          edges {
            node {
              milestone {
                title
              }
            }
          }
        }
        pullRequests(last: 50, states: OPEN) {
          edges {
            node {
              title
              number
              milestone {
                title
              }
              author {
                avatarUrl
                login
                url
              }
              # Simplest way to get reviewed state is with the hovercard...
              hovercard(includeNotificationContexts:false) {
                contexts {
                  message
                  octicon
                  __typename
                }
              }
              url
            }
          }
        }
      }
    }
  }
}
`};