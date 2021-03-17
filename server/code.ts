const url = require('url');
const express = require('express');
const https = require('https');

const app = express();

const githubContributions = require('./services/github/github-contributions');
const githubStatus = require('./services/github/github-status');
const githubIssues = require('./services/github/github-issues');
const currentSprint = require('./current-sprint');

import httpget from "./util/httpget";
import httppost from "./util/httppost";

import versionGet from "./services/downloads.keyman.com/version";

const isProduction = process.env['NODE_ENV'] == 'production';

const port=isProduction ? 80 : 3000;
const teamcity_token=process.env['KEYMANSTATUS_TEAMCITY_TOKEN'];
const github_token=process.env['KEYMANSTATUS_GITHUB_TOKEN'];
const sentry_token=process.env['KEYMANSTATUS_SENTRY_TOKEN'];

const REFRESH_INTERVAL = isProduction ? 60000 : 60000 * 60; //msec
let lastRefreshTime = 0;

let cachedData = {};

app.use('/', express.static('../../public/dist/public'));

/* TODO: web hook based refresh of GitHub with worker threads to collect data,
         one for each data source. This data will then be cached for main http
         server thread to respond with. We can probably also use web hooks for
         Sentry and TeamCity. In future, may also be able to do similar for
         api.keyman.com/downloads.keyman.com/api

if(!isProduction) {
  app.get('/github-refresh', () => {
    githubDirty = true;
  });
} else {
  app.post('/github-refresh', (request, response) => {
    let body = JSON.parse(request.body);
    githubDirty = true;
  });
}
*/

let cache = {
  teamCity: null,
  teamCityRunning: null,
  keymanVersionData: null,
  github: null,
  issues: null,
  contributions: null,
  currentSprint: null,
  sentry: null
};

function refreshKeymanVersionData() {
  versionGet.get().then(data => cache.keymanVersionData = data);
}

setInterval(refreshKeymanVersionData, 60000);
refreshKeymanVersionData();


app.get('/status/', (request, response) => {

  let sprint = request.query.sprint ? request.query.sprint : 'current';
  let cacheInvalid = cachedData[sprint] ? Date.now()-cachedData[sprint].lastRefreshTime > REFRESH_INTERVAL : true;

  let cb = (data) => {
    let headers = {"Content-Type": "text/html"};
    if(!isProduction) {
      // Allow requests from ng-served host in development
      headers["Access-Control-Allow-Origin"] = '*';
    }
    response.writeHead(200, headers);
    response.write(JSON.stringify({
      teamCity: data.teamCityData,
      teamCityRunning: data.teamCityRunningData,
      keyman: cache.keymanVersionData,
      github: data.githubPullsData,
      issues: data.githubIssuesData,
      contributions: data.githubContributionsData,
      currentSprint: currentSprint.getCurrentSprint(data.githubPullsData.data),
      sentry: data.sentry
    }));
    response.end();
  };

  if(cacheInvalid || !cachedData[sprint] || !cachedData[sprint].lastRefreshTime) {
    refreshStatus(sprint, cb);
  } else {
    cb(cachedData[sprint]);
  }
});

function getSprintStart() {
  // Get the start of sprint. Messy but probably works okay for now
  let Current = new Date();
  Current.setUTCHours(0);
  Current.setUTCMinutes(0);
  Current.setUTCSeconds(0);
  Current.setUTCMilliseconds(0);
  let diff = Current.getDate() -  Current.getDay();
  let StartOfWeek = new Date(Current.setDate(diff));
  //console.log("StartOfWeek: "+StartOfWeek.toDateString());
  let sec = (StartOfWeek.getTime() - Date.UTC(2019, 9, 6)) / 1000;
  //console.log(StartOfWeek.getTime());
  //console.log(Date.UTC(2019, 9, 6));
  let days = sec / 60 / 60 / 24;
  //console.log(days % 14);
  if(days % 14 > 6)
    StartOfWeek.setDate(StartOfWeek.getDate() - 7);

  return StartOfWeek;
}

function refreshStatus(sprint, callback?) {
  cachedData[sprint] = {lastRefreshTime: 0};

  let SprintStartDateTime = getSprintStart().toISOString();

  const ghStatusQuery = githubStatus.queryString(sprint);

  Promise.all([
    httpget(  //0
      'build.palaso.org',
      '/app/rest/buildTypes?locator=affectedProject:(id:Keyman)&fields=buildType(id,name,builds($locator(canceled:false,branch:default:any),'+
        'build(id,number,branchName,status,statusText)))',
      {
        Authorization: ` Bearer ${teamcity_token}`,
        Accept: 'application/json'
      }
    ),
    httpget(  //1
      'build.palaso.org',
      '/app/rest/buildTypes?locator=affectedProject:(id:Keyman)&fields=buildType(id,name,builds($locator(running:true,canceled:false,branch:default:any),'+
        'build(id,number,branchName,status,statusText)))',
      {
        Authorization: ` Bearer ${teamcity_token}`,
        Accept: 'application/json'
      }
    ),
    Promise.resolve(), // versionGet.get(), //    httpget('downloads.keyman.com', '/api/version/2.0'),  //2
    getGitHubStatus(ghStatusQuery), // 3
    getGitHubIssues(null, []), //4
  ]).then(data => {
    // Get the current sprint from the GitHub data
    // We actually get data from the Saturday before the 'official' sprint start

    //console.log(data);

    //data = data as string[];

    let githubIssuesData = data[4];

    let githubPullsData = JSON.parse(data[3]);
    const phase = currentSprint.getCurrentSprint(githubPullsData.data);

    let adjustedStart = new Date(phase.start-2);

    // adjust for when we are before the official start-of-sprint which causes all sorts of havoc
    if(adjustedStart > new Date()) adjustedStart = new Date()

    const ghContributionsQuery = githubContributions.queryString(phase ? new Date(adjustedStart).toISOString() : SprintStartDateTime);
    const phaseStartDateInSeconds = new Date(adjustedStart).valueOf() / 1000;

    // Build a list of sentry queries per platform; TODO refactor into shared source
    let sentryPlatforms = ['android','ios','linux','mac','web','windows','developer',
      'api.keyman.com', 'developer.keyman.com', 'donate.keyman.com', 'downloads.keyman.com',
      'help.keyman.com', 'keyman.com', 'keymanweb.com', 's.keyman.com', 'status.keyman.com'
    ];
    let sentryQueryPromises = sentryPlatforms.map(platform => httpget('sentry.keyman.com',
      `/api/0/projects/keyman/${platform.indexOf('.')<0? "keyman-":""}${platform.replace(/\./g,'-')}/stats/?stats=received&since=${phaseStartDateInSeconds}&resolution=1d`,
      {
        Authorization: ` Bearer ${sentry_token}`,
        Accept: 'application/json'
      }
    ));

    // Run the queries!

    Promise.all([
      getGitHubContributions(ghContributionsQuery)
      ].concat(sentryQueryPromises)
    ).then(phaseData => {
      let contributions = phaseData.shift();

      cachedData[sprint].teamCityData = transformTeamCityResponse(JSON.parse(data[0]));
      cachedData[sprint].teamCityRunningData = transformTeamCityResponse(JSON.parse(data[1]));
      //cachedData[sprint].keymanVersionData = transformKeymanResponse(JSON.parse(data[2]));
      cachedData[sprint].githubPullsData = githubPullsData;
      cachedData[sprint].githubContributionsData = JSON.parse(contributions);
      cachedData[sprint].lastRefreshTime = Date.now();
      cachedData[sprint].sentry = sentryPlatforms.reduce((obj,item,index) => { obj[item] = JSON.parse(phaseData[index]); return obj; }, {});
      cachedData[sprint].githubIssuesData = githubIssuesData;
      if(callback) callback(cachedData[sprint]);
    });
  });
}

function getGitHubStatus(ghStatusQuery): Promise<string> {
  return httppost('api.github.com', '/graphql',  //3
    {
      Authorization: ` Bearer ${github_token}`,
      Accept: 'application/vnd.github.antiope-preview+json, application/vnd.github.shadow-cat-preview+json'
    },

    // Lists all open pull requests in keyman repos
    // and all open pull requests + status for keymanapp repo
    // Gather the contributions for each recent user

    // Current rate limit cost is 60 points. We have 5000 points/hour.
    // https://developer.github.com/v4/guides/resource-limitations/

    JSON.stringify({query: ghStatusQuery})
  );
}

function getGitHubIssues(cursor, issues): Promise<Array<any>> {
  const ghIssuesQuery = githubIssues.queryString(cursor);
  const promise = httppost('api.github.com', '/graphql',  //4
    {
      Authorization: ` Bearer ${github_token}`,
      Accept: 'application/vnd.github.antiope-preview+json, application/vnd.github.shadow-cat-preview+json'
    },

    // Lists all open issues in Keyman repos, cost 1 point per page
    JSON.stringify({query: ghIssuesQuery})
  );

  return promise.then(data => {
    let obj = JSON.parse(data);
    //console.log(data);
    if(!obj.data || !obj.data.search) return [];
    const newIssues = [].concat(issues, obj.data.search.nodes);
    if(obj.data.search.pageInfo.hasNextPage) {
      return getGitHubIssues(obj.data.search.pageInfo.endCursor, newIssues);
    }
    return newIssues;
  });
}

function getGitHubContributions(ghContributionsQuery) {
  return httppost('api.github.com', '/graphql',
    {
      Authorization: ` Bearer ${github_token}`,
      Accept: 'application/vnd.github.antiope-preview, application/vnd.github.shadow-cat-preview+json'
    },
    // Gather the contributions for each recent user

    JSON.stringify({query: ghContributionsQuery}),
  );
}

refreshStatus('current');

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

