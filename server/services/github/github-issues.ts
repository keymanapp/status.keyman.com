
import httppost from '../../util/httppost';
import { github_token } from '../../identity/github';
// import { getCurrentSprint } from '../../current-sprint';

export default {

  get: function(cursor, issues): Promise<Array<any>> {
    const ghIssuesQuery = this.queryString(cursor);
    return httppost('api.github.com', '/graphql',  //4
      {
        Authorization: ` Bearer ${github_token}`,
        Accept: 'application/vnd.github.antiope-preview+json, application/vnd.github.shadow-cat-preview+json'
      },

      // Lists all open issues in Keyman repos, cost 1 point per page
      JSON.stringify({query: ghIssuesQuery})
    ).then(data => {
      let obj = JSON.parse(data);
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

            timelineItems(itemTypes: [CROSS_REFERENCED_EVENT, CONNECTED_EVENT, DISCONNECTED_EVENT], first: 10) {
              nodes {
                ... on CrossReferencedEvent {
                  __typename
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
        cost
      }
    }
    `
  }
};