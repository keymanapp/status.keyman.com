const url = require('url');
const express = require('express');
const https = require('https');

const app = express();

const isProduction = process.env['NODE_ENV'] == 'production';

const port=isProduction ? 80 : 3000;
const teamcity_token=process.env['KEYMANSTATUS_TEAMCITY_TOKEN'];
const github_token=process.env['KEYMANSTATUS_GITHUB_TOKEN'];

const REFRESH_INTERVAL = 60000; //msec
let lastRefreshTime = 0;
let teamCityData = null;
let keymanVersionData = null;
let githubPullsData = null;

app.use('/', express.static('public/dist/public'));

app.get('/status', (request, response) => {
  let cb = () => {
    let headers = {"Content-Type": "text/html"};
    if(!isProduction) {
      // Allow requests from ng-served host in development
      headers["Access-Control-Allow-Origin"] = '*';
    }
    response.writeHead(200, headers);
    response.write(JSON.stringify({teamCity: teamCityData, keyman: keymanVersionData, github: githubPullsData}));
    response.end();
  };

  if(teamCityData == null || Date.now()-lastRefreshTime > REFRESH_INTERVAL) {
    refreshStatus(cb);
  } else {
    cb();
  }
});


function refreshStatus(callback) {
  Promise.all([
    httpget(
      'build.palaso.org',
      '/app/rest/buildTypes?locator=affectedProject:(id:Keyman)&fields=buildType(id,name,builds($locator(running:false,canceled:false),'+
        'build(id,number,status,statusText)))',
      {
        Authorization: ` Bearer ${teamcity_token}`,
        Accept: 'application/json'
      }
    ),
    httpget('downloads.keyman.com', '/api/version/2.0'),
    httppost('api.github.com', '/graphql',
      {
        Authorization: ` Bearer ${github_token}`,
        Accept: 'application/vnd.github.antiope-preview'
      },

      // Lists all open pull requests in keyman repos
      // and all open pull requests + status for keymanapp repo

      // Current rate limit cost is 30 points. We have 5000 points/hour.
      // https://developer.github.com/v4/guides/resource-limitations/

      JSON.stringify({query: `
      {
        repository(owner: "keymanapp", name: "keyman") {
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
                  `})
    )
  ]).then(data => {

    teamCityData = transformTeamCityResponse(JSON.parse(data[0]));
    keymanVersionData = JSON.parse(data[1]);//inputKeymanVersionData);
    githubPullsData = JSON.parse(data[2]);
    lastRefreshTime = Date.now();
    if(callback) callback();
  });
}

function httpget(hostname, path, headers) {
  return new Promise(resolve => {
    const options = {
      hostname: hostname,
      port: 443,
      path: path,
      method: 'GET'
    }

    if(headers) options.headers = headers;

    let chunk = '';

    const req = https.request(options, res => {
      if(res.statusCode != 200) {
        console.error(`statusCode for ${hostname}${path}: ${res.statusCode}`);
      }

      res.on('data', d => {
        chunk += d;
        });

      res.on('end', () => {
        resolve(chunk);
      });
    });

    req.on('error', error => {
      console.error(error);
    });

    req.end();
  });
};

function httppost(hostname, path, headers, data) {
  return new Promise(resolve => {
    const options = {
      hostname: hostname,
      port: 443,
      path: path,
      method: 'POST',
      headers: headers
    }

    headers['User-Agent'] = 'Keyman Status App/1.0';
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = data.length;

    let chunk = '';

    const req = https.request(options, res => {
      if(res.statusCode != 200) {
        console.error(`statusCode for ${hostname}${path}: ${res.statusCode}`);
      }

      res.on('data', d => {
        chunk += d;
        });

      res.on('end', () => {
        //console.log(chunk);
        resolve(chunk);
      });
    });

    req.on('error', error => {
      console.error(error);
    });

    req.write(data);
    req.end();
  });
};

refreshStatus();

console.log(`Starting app listening on ${port}`);
app.listen(port);

function transformTeamCityResponse(data) {
  let t = data;
  t.buildType.forEach((value) => {
    data[value.id] = value;
    // Remove a level of indirection
    value.builds = value.builds ? value.builds.build : null;
  });

  data.buildType = {};
  return data;
}
