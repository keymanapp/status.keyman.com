exports.queryString = function(sprint) {
  let search = '';
  if(sprint != 'current') {
    // GH search appears to have a bug where it returns issues from another milestone if we don't include 'is:closed'...
    // we can probably safely assume is:closed because we are always looking at past milestones
    search = `
    milestoneDueOn: search(first: 1, type:ISSUE, query:"is:issue is:closed org:keymanapp repo:keyman milestone:${sprint}") {
      edges {
        node {
          ... on Issue {
            title
            number
            milestone {
              title
              dueOn
            }
          }
        }
      }
    }
    `;
  }

  return `
{
  ${search}

  keyboards: repository(owner: "keymanapp", name: "keyboards") {
    issues(filterBy: {states: OPEN}) {
      totalCount
    }
    pullRequests(states: OPEN) {
      totalCount
    }
  }

  lexicalModels: repository(owner: "keymanapp", name: "lexical-models") {
    issues(filterBy: {states: OPEN}) {
      totalCount
    }
    pullRequests(states: OPEN) {
      totalCount
    }
  }

  repository(owner: "keymanapp", name: "keyman") {

    refs(first:100, refPrefix: "refs/heads/") {
      nodes {
        name
      }
    }
    issuesWithNoMilestone: issues(first: 1, filterBy: {milestone: null, states: OPEN}) {
      totalCount
    }
    issuesByLabelAndMilestone: labels(first: 10, query: "windows web developer mac ios android linux common") {
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

          isDraft # requires application/vnd.github.shadow-cat-preview+json

          author {
            avatarUrl
            login
            url
          }

          reviews(last:100) {
            nodes {
              author { login }
              updatedAt
              state
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
              isDraft # requires application/vnd.github.shadow-cat-preview+json
              milestone {
                title
              }
              author {
                avatarUrl
                login
                url
              }

              reviews(last:100) {
                nodes {
                  author { login }
                  updatedAt
                  state
                }
              }

              labels(first: 25) {
                edges {
                  node {
                    name
                  }
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