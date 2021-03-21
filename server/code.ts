require('source-map-support').install();
const express = require('express');
const app = express();

const currentSprint = require('./current-sprint');

import versionService from "./services/downloads.keyman.com/version";
import teamcityService from "./services/teamcity/teamcity";
import githubStatusService from "./services/github/github-status";
import githubIssuesService from "./services/github/github-issues";
import githubContributionsService from "./services/github/github-contributions";
import sentryService from "./services/sentry/sentry";

const isProduction = process.env['NODE_ENV'] == 'production';

const port=isProduction ? 80 : 3000;
const REFRESH_INTERVAL = isProduction ? 60000 : 60000 * 60; //msec


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

interface StatusDataCache {
  teamCity?: any;
  teamCityRunning?: any;
  keymanVersion?: any;
  issues?: any;
  sprints: {
    current: {
      github?: any;
      contributions?: any;
      currentSprint?: any;
      sentry?: any;
    };
  };
};

class StatusData {
  cache: StatusDataCache;

  constructor() {
    this.cache = { sprints: { current: { } } };
  };

  refreshKeymanVersionData = async () => {
    console.log('refreshKeymanVersion starting');
    this.cache.keymanVersion = await versionService.get();
    console.log('refreshKeymanVersion finished');
  };

  refreshTeamcityData = async () => {
    console.log('refreshTeamcityData starting');
    const data = await teamcityService.get();
    this.cache.teamCity = data[0];
    this.cache.teamCityRunning = data[1];
    console.log('refreshTeamcityData finished');
  };

  refreshGitHubIssuesData = async () => {
    console.log('refreshGitHubIssuesData starting');
    this.cache.issues = await githubIssuesService.get(null, []);
    console.log('refreshGitHubIssuesData finished');
  };

  refreshGitHubStatusData = async (sprintName) => {
    console.log('refreshGitHubStatusData starting');
    const data = await githubStatusService.get(sprintName);
    this.cache.sprints[sprintName].github = data.github;
    this.cache.sprints[sprintName].phase = data.phase;

    if(this.cache.sprints[sprintName].adjustedStart !== data.adjustedStart) {
      this.cache.sprints[sprintName].adjustedStart = data.adjustedStart;

      // Once GitHub status data has been refreshed, we get
      // sprint dates and we can pass that to other date-based
      // services.

      // We only need to do this if we have a change in
      // the date range (i.e. usually only if the current sprint
      // changes)
      await Promise.all([
        this.refreshGitHubContributionsData(sprintName),
        this.refreshSentryData(sprintName)
      ]);
    }
    console.log('refreshGitHubStatusData finished');
  };

  refreshGitHubContributionsData = async (sprintName) => {
    console.log('refreshGitHubContributionsData starting');
    const sprint = this.cache.sprints[sprintName];
    if(!sprint || !sprint.phase) return;
    const sprintStartDateTime = sprint.phase ? new Date(sprint.adjustedStart).toISOString() : getSprintStart().toISOString();
    sprint.contributions = await githubContributionsService.get(sprintStartDateTime);
    console.log('refreshGitHubContributionsData finished');
  };

  refreshSentryData = async (sprintName) => {
    console.log('refreshSentryData starting');
    const sprint = this.cache.sprints[sprintName];
    if(!sprint || !sprint.phase) return;
    sprint.sentry = await sentryService.get(sprint.adjustedStart);
    console.log('refreshSentryData finished');
  };

  initialLoad() {
    this.refreshKeymanVersionData();
    this.refreshTeamcityData();
    this.refreshGitHubIssuesData();
    this.refreshGitHubStatusData('current');
  };
};

const statusData = new StatusData();
statusData.initialLoad();

/* Interval triggers */

setInterval(statusData.refreshKeymanVersionData, REFRESH_INTERVAL);

/******************************************
 * Web endpoints
 ******************************************/

/* Static Endpoints */

app.use('/', express.static('../../public/dist/public'));

/* Web hooks */

app.get('/webhook/github', (request, response) => {
  statusData.refreshGitHubIssuesData();
  statusData.refreshGitHubStatusData('current');
  response.send('ok');
});

app.get('/webhook/teamcity', (request, response) => {
  statusData.refreshTeamcityData();
  response.send('ok');
});

app.get('/webhook/sentry', (request, response) => {
  statusData.refreshSentryData('current');
  response.send('ok');
});

/* App Service */

app.get('/status/', (request, response) => {
  console.log('GET /status');
  const sprint = request.query.sprint ? request.query.sprint : 'current';
  let headers = {"Content-Type": "application/json"};
  if(!isProduction) {
    // Allow requests from ng-served host in development
    headers["Access-Control-Allow-Origin"] = '*';
  }
  response.writeHead(200, headers);
  response.write(JSON.stringify({
    teamCity: statusData.cache.teamCity,
    teamCityRunning: statusData.cache.teamCityRunning,
    keyman: statusData.cache.keymanVersion,
    github: statusData.cache.sprints[sprint].github,
    issues: statusData.cache.issues,
    contributions: statusData.cache.sprints[sprint].contributions,
    currentSprint: currentSprint.getCurrentSprint(statusData.cache.sprints[sprint]?.github?.data),
    sentry: statusData.cache.sprints[sprint].sentry
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

console.log(`Starting app listening on ${port}`);
app.listen(port);

