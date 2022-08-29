
import httppost from '../../util/httppost';
import { github_token } from '../../identity/github';
import { getCurrentSprint } from '../../current-sprint';

const Sentry = require("@sentry/node");

const queryStrings = {

  keyboards: `
    keyboards: repository(owner: "keymanapp", name: "keyboards") {
      issues(filterBy: {states: OPEN}) {
        totalCount
      }
      pullRequests(states: OPEN) {
        totalCount
      }
    }
  `,

  lexicalModels: `
    lexicalModels: repository(owner: "keymanapp", name: "lexical-models") {
      issues(filterBy: {states: OPEN}) {
        totalCount
      }
      pullRequests(states: OPEN) {
        totalCount
      }
    }
  `,

  unlabeledIssues: `
    unlabeledIssues: search(type: ISSUE, first: 100, query: "repo:keymanapp/keyman is:issue is:open -label:windows/ -label:web/ -label:developer/ -label:mac/ -label:ios/ -label:android/ -label:linux/ -label:common/ -label:core/") {
      issueCount
      nodes {
        ... on Issue {
          author {
            login
            avatarUrl
            url
          }
          labels(first:5) {
            nodes {
              name
              color
            }
          }
          title
          number
          url
        }
      }
    }
  `,

  repository: `
    repository(owner: "keymanapp", name: "keyman") {
      refs(first:100, refPrefix: "refs/heads/") {
        nodes {
          name
        }
      }
      issuesWithNoMilestone: issues(first: 1, filterBy: {milestone: null, states: OPEN}) {
        totalCount
      }
      issuesByLabelAndMilestone: labels(first: 100, query: "windows/ web/ developer/ mac/ ios/ android/ linux/ common/ core/") {
        edges {
          node {
            name
            openIssues: issues(first: 100, filterBy: {states: [OPEN]}) {
              totalCount
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
      pullRequests(last: 100, states: OPEN) {
        edges {
          node {
            title
            milestone {
              title
            }

            isDraft # requires application/vnd.github.shadow-cat-preview+json

            additions
            deletions

            headRefName
            baseRefName

            author {
              avatarUrl
              login
              url
            }

            timelineItems(itemTypes: [CROSS_REFERENCED_EVENT, CONNECTED_EVENT, DISCONNECTED_EVENT], first: 10) {
              nodes {
                ... on CrossReferencedEvent {
                  __typename
                  subject: source {
                    ... on Issue {
                      number
                      url
                    }
                    ... on PullRequest {
                      number
                      url
                    }
                  }
                }
                ... on ConnectedEvent {
                  __typename
                  subject {
                    ... on Issue {
                      number
                      url
                    }
                  }
                }
                ... on DisconnectedEvent {
                  __typename
                  subject {
                    ... on Issue {
                      number
                    }
                  }
                }
              }
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
                    oid
                    status {
                      contexts {
                        description
                        context
                        state
                        targetUrl
                      }
                    }
                  }
                }
              }
            }
            labels(first: 25) {
              edges {
                node {
                  color
                  name
                }
              }
            }
          }
        }
      }
    }
   `,

   organization: `
    organization(login: "keymanapp") {
      repositories(first: 30) {
        nodes {
          name
          pullRequests(last: 50, states: OPEN) {
            edges {
              node {
                title
                number
                isDraft # requires application/vnd.github.shadow-cat-preview+json
                headRefName
                baseRefName

                additions
                deletions

                milestone {
                  title
                }
                author {
                  avatarUrl
                  login
                  url
                }

                commits(last: 1) {
                  nodes {
                    commit {
                      checkSuites(last: 10) {
                        nodes {
                          app { name }
                          conclusion
                          status
                        }
                      }
                    }
                  }
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
                      color
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
  `,

  rateLimit: `
    rateLimit {
      limit
      cost
      remaining
      resetAt
    }
  `
};

// Lists all open pull requests in keyman repos
// and all open pull requests + status for keymanapp repo
// Gather the contributions for each recent user

// Current rate limit cost is 60 points. We have 5000 points/hour.
// https://developer.github.com/v4/guides/resource-limitations/

function httppostgh(query) {
  return httppost('api.github.com', '/graphql',  //3
    {
      Authorization: ` Bearer ${github_token}`,
      Accept: 'application/vnd.github.antiope-preview+json, application/vnd.github.shadow-cat-preview+json'
    },
    JSON.stringify({query: '{' + query + '}'})
  );
}

export default {
  get: function(sprint): Promise<{github, phase, adjustedStart}> {
    const keys = Object.keys(queryStrings);
    return Promise.all( keys.map(v => httppostgh(queryStrings[v])) ).then(values => {
      try {
        let data = keys.reduce((pv, cv, ix) => {pv[cv] = JSON.parse(values[ix]).data[cv]; return pv}, {});
        let githubPullsData = { data: data };

        const phase = getCurrentSprint(githubPullsData.data);

        let d = new Date(phase.start);
        d.setDate(d.getDate()-2);
        let adjustedStart = d;

        // TODO: is this correct now?
        // adjust for when we are before the official start-of-sprint which causes all sorts of havoc
        if(adjustedStart > new Date()) adjustedStart = new Date();
        return {github: githubPullsData, phase: phase, adjustedStart: adjustedStart};
      } catch(e) {
        console.debug(e);
        Sentry.addBreadcrumb({
          category: "JSON",
          message: values
        });
        Sentry.captureException(e);
        return null;
      }
    });
  },
  queryString: function() {
    return `

  `
  }

};