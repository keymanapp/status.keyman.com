const url = require('url');
const express = require('express');
const https = require('https');

const app = express();

const githubContributions = require('./services/github/github-contributions');
//const githubStatus = require('./services/github/github-status');
const githubIssues = require('./services/github/github-issues');
const currentSprint = require('./current-sprint');

import httpget from "./util/httpget";
import httppost from "./util/httppost";

import versionService from "./services/downloads.keyman.com/version";
import teamcityService from "./services/teamcity/teamcity";
import githubStatusService from "./services/github/github-status";
import githubIssuesService from "./services/github/github-issues";

const isProduction = process.env['NODE_ENV'] == 'production';

const port=isProduction ? 80 : 3000;
//const teamcity_token=process.env['KEYMANSTATUS_TEAMCITY_TOKEN'];
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
  keymanVersion: null,
  issues: null,
  /*currentSprint: {
  },*/
  sprints: {
    current: {
      github: null,
      //issues: null,
      contributions: null,
      currentSprint: null,
      sentry: null
    }
  }
};

function refreshKeymanVersion() {
  console.log('refreshKeymanVersion');
  versionService.get().then(data => cache.keymanVersion = data);
  Promise.all(teamcityService.get()).then(data => {
    cache.teamCity = data[0];
    cache.teamCityRunning = data[1];
  });

  githubIssuesService.get(null, []).then(data => cache.issues = data);
  refreshGitHubStatus('current');
}

//refreshGitHubStatus('current');

function refreshGitHubStatus(sprintName) {
  console.log('refreshGitHubStatus');
  githubStatusService.get(sprintName).then(data => {
    cache.sprints[sprintName].github = data.github;
    cache.sprints[sprintName].phase = data.phase;
    cache.sprints[sprintName].adjustedStart = data.adjustedStart;
    refreshGitHubContributions(sprintName);
    refreshSentry(sprintName);
  })
}

function refreshGitHubContributions(sprintName) {
  console.log('refreshGitHubContributions');
  const sprint = cache.sprints[sprintName];
  if(!sprint || !sprint.phase) return;
  // TODO
  let SprintStartDateTime = getSprintStart().toISOString();
  const ghContributionsQuery = githubContributions.queryString(sprint.phase ? new Date(sprint.adjustedStart).toISOString() : SprintStartDateTime);
  getGitHubContributions(ghContributionsQuery).then(data => sprint.contributions = JSON.parse(data));
}

function refreshSentry(sprintName) {
  console.log('refreshSentry');
  const sprint = cache.sprints[sprintName];
  if(!sprint || !sprint.phase) return;
  // TODO
  const phaseStartDateInSeconds = new Date(sprint.adjustedStart).valueOf() / 1000;

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

  Promise.all(sentryQueryPromises).then(phaseData =>
    sprint.sentry = sentryPlatforms.reduce((obj,item,index) => { obj[item] = JSON.parse(phaseData[index]); return obj; }, {})
  );
}

setInterval(refreshKeymanVersion, 60000);
refreshKeymanVersion();

app.get('/status/', (request, response) => {
  console.log('GET /status');
  let sprint = request.query.sprint ? request.query.sprint : 'current';
  let headers = {"Content-Type": "application/json"}; //text/html"};
  if(!isProduction) {
    // Allow requests from ng-served host in development
    headers["Access-Control-Allow-Origin"] = '*';
  }
  response.writeHead(200, headers);
  response.write(JSON.stringify({
    teamCity: cache.teamCity,
    teamCityRunning: cache.teamCityRunning,
    keyman: cache.keymanVersion,
    github: cache.sprints[sprint].github,
    issues: cache.issues,
    contributions: cache.sprints[sprint].contributions,
    currentSprint: currentSprint.getCurrentSprint(cache.sprints[sprint].github.data),
    sentry: cache.sprints[sprint].sentry
  }));
  response.end();
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

console.log(`Starting app listening on ${port}`);
app.listen(port);

