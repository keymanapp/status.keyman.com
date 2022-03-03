require('source-map-support').install();

export enum Environment {
  Development = 'development',
  Production = 'production',
  Staging = 'staging'
};
export const environment: Environment =
  process.env['NODE_ENV'] == 'production' ? Environment.Production :
  process.env['NODE_ENV'] == 'staging' ? Environment.Staging :
  Environment.Development;

const Sentry = require("@sentry/node");
Sentry.init({
  dsn: "https://4ed13a2db1294bb695765ebe2f98171d@o1005580.ingest.sentry.io/5983526",
  environment: environment
});

import { StatusSource } from '../shared/status-source';

const express = require('express');
const app = express();
const ws = require('ws');
const keymanAppTestBotMiddleware = require('./keymanapp-test-bot/keymanapp-test-bot-middleware');
const currentSprint = require('./current-sprint');

import { statusData } from './data/status-data';
import { slackLGTM } from './services/slack/slack';
import { DataChangeTimingManager } from './util/DataChangeTimingManager';

const debugTestBot = false;

const port = environment == Environment.Development ? 3000 : 80;
const REFRESH_INTERVAL = environment == Environment.Development ? 180000 : 60000;

const timingManager = new DataChangeTimingManager();

/* Deployment Endpoints */

const STATUS_SOURCES: StatusSource[] = [
  StatusSource.ITunesKeyman,
  StatusSource.ITunesFirstVoices,
  StatusSource.PlayStoreKeyman,
  StatusSource.PlayStoreFirstVoices,
  StatusSource.LaunchPadAlpha,
  StatusSource.LaunchPadBeta,
  StatusSource.LaunchPadStable,
  StatusSource.NpmLexicalModelCompiler,
  StatusSource.NpmModelsTypes,
  StatusSource.SKeymanCom,
  StatusSource.PackagesSilOrg,
  StatusSource.LinuxLsdevSilOrgAlpha,
  StatusSource.LinuxLsdevSilOrgBeta,
  StatusSource.LinuxLsdevSilOrgStable
];

initialLoad();

function initialLoad() {

  if(debugTestBot) return;

  respondCodeOwnersDataChange();
  respondGitHubDataChange();
  respondKeymanDataChange();
  respondTeamcityDataChange();
  respondSentryDataChange();
  // We have a bunch of deploy endpoints
  respondPolledEndpoints();
};

/* Interval triggers */

setInterval(() => {

  if(debugTestBot) return;

  respondKeymanDataChange();
  respondPolledEndpoints();
  if(environment != Environment.Production || true) {
    // NOTE: using polling in production as webhook stopped working on 6 July 2021?
    // We have a webhook running on production so no need to poll the server
    respondTeamcityDataChange();
    // NOTE: adding sentry polling here as we don't get events on errors on our
    // current plan with sentry.io
    respondSentryDataChange();
  }
}, REFRESH_INTERVAL);

/******************************************
 * Web endpoints
 ******************************************/

/* Web Sockets */

// Set up a headless websocket server that prints any
// events that come in.
const wsServer = new ws.Server({ noServer: true });
wsServer.on('connection', socket => {
  socket.on('message', message => {
    console.log(message);
    if(message == 'ping')
      socket.send('pong');
  });
  sendInitialRefreshMessages(socket);
});

function reportError(error) {
  console.error(error);
  Sentry.captureMessage(error);
}

function respondKeymanDataChange() {
  return statusData.refreshKeymanVersionData()
    .then(hasChanged => sendWsAlert(hasChanged, 'keyman'))
    .catch(error => reportError(error));
}

function respondGitHubDataChange() {
  if(timingManager.isTooSoon('github', 5000, respondGitHubDataChange)) {
    return;
  }

  timingManager.start('github');

  return statusData.refreshGitHubStatusData('current')
    .then(hasChanged => sendWsAlert(hasChanged, 'github'))
    .then(respondGitHubContributionsDataChange)
    .then(respondGitHubIssuesDataChange)
    .catch(error => reportError(error))
    .finally(() => timingManager.finish('github'));
}

function respondCodeOwnersDataChange() {
  return statusData.refreshCodeOwnersData()
    .then(hasChanged => sendWsAlert(hasChanged, 'code-owners'))
    .catch(error => reportError(error));
}

function respondGitHubIssuesDataChange() {
  return statusData.refreshGitHubIssuesData()
    .then(hasChanged => sendWsAlert(hasChanged, 'github-issues'))
    .catch(error => reportError(error));
}

function respondGitHubContributionsDataChange() {
  return statusData.refreshGitHubContributionsData('current')
    .then(hasChanged => sendWsAlert(hasChanged, 'github-contributions'))
    .catch(error => reportError(error));
}

function respondTeamcityDataChange() {
  if(timingManager.isTooSoon('teamcity', 10000, respondTeamcityDataChange)) {
    return;
  }

  timingManager.start('teamcity');
  return statusData.refreshTeamcityData()
    .then(hasChanged => sendWsAlert(hasChanged, 'teamcity'))
    .catch(error => reportError(error))
    .finally(() => timingManager.finish('teamcity'));
}

function respondSentryDataChange() {
  if(timingManager.isTooSoon('sentry', 15000, respondSentryDataChange)) {
    return;
  }

  timingManager.start('sentry');

  return statusData.refreshSentryIssuesData()
    .then(hasChanged => sendWsAlert(hasChanged, 'sentry-issues'))
    .catch(error => reportError(error))
    .finally(() => timingManager.finish('sentry'));
}

function respondPolledEndpoints() {
  for(let s of STATUS_SOURCES) {
    statusData.refreshEndpointData(s).then(hasChanged => sendWsAlert(hasChanged, s));
  }
}

function sendInitialRefreshMessages(socket) {
  const sprint = statusData.cache.sprints['current'];
  if(sprint) {
    if(sprint.contributions) socket.send('github-contributions');
    if(sprint.github) socket.send('github');
  }
  if(statusData.cache.codeOwners) socket.send('code-owners');
  if(statusData.cache.sentryIssues) socket.send('sentry-issues');
  if(statusData.cache.issues) socket.send('github-issues');
  if(statusData.cache.teamCity && statusData.cache.teamCityRunning) socket.send('teamcity');
  if(statusData.cache.keymanVersion) socket.send('keyman');
  // Deployment refreshes
  for(let s of STATUS_SOURCES) {
    if(statusData.cache.deployment[s]) socket.send(s);
  }
}

/* Static Endpoints */

app.use(express.json()); // for parsing application/json

app.use('/', express.static((environment == Environment.Development ? '' : '../') + '../../public/dist/public'));

/* Web hooks */

app.post('/webhook/github', (request, response) => {
  (async () => {
    respondGitHubDataChange();
    slackLGTM(request.body);
  })();
  response.send('ok');
});

app.post('/webhook/teamcity', (request, response) => {
  (async () => {
    respondTeamcityDataChange();
  })();
  response.send('ok');
});

app.post('/webhook/sentry', (request, response) => {
  // TODO: use the webhook data returned from sentry to refresh only the
  //       affected project, as returned in request.body.data.issue.project.
  //       This will be easier to implement if we refactor the sentry data to
  //       group by project instead of by environment. (History, we grouped) by
  //       environment originally because we were able to do 1 query per env
  //       rather than per-project, but on sentry.io we don't have perms to do
  //       the org-wide query at this time.
  //console.log('webhook sentry project='+request.body?.data?.issue?.project?.id);
  (async () => {
    respondSentryDataChange();
  })();
  response.send('ok');
});

app.use('/webhook/keymanapp-test-bot', keymanAppTestBotMiddleware);

function sendWsAlert(hasChanged: boolean, message: string): boolean {
  if(hasChanged) {
    wsServer.clients.forEach((client) => {
      if(client.readState === wsServer.OPEN) {
        client.send(message);
      }
    });
  }
  return hasChanged;
}

/* App Service */

function statusHead(request, response) {
  const sprint = request.query.sprint ? request.query.sprint : 'current';
  let headers = {"Content-Type": "application/json"};
  if(environment == Environment.Development) {
    // Allow requests from ng-served host in development
    headers["Access-Control-Allow-Origin"] = '*';
  }
  response.writeHead(200, headers);
  return sprint;
}

app.get('/status/teamcity', (request, response) => {
  console.log('GET /status/teamcity');
  const sprint = statusHead(request, response);
  response.write(JSON.stringify({
    currentSprint: currentSprint.getCurrentSprint(statusData.cache.sprints[sprint]?.github?.data),
    teamCity: statusData.cache.teamCity,
    teamCityRunning: statusData.cache.teamCityRunning
  }));
  response.end();
});

app.get('/status/keyman', (request, response) => {
  console.log('GET /status/keyman');
  const sprint = statusHead(request, response);
  response.write(JSON.stringify({
    currentSprint: currentSprint.getCurrentSprint(statusData.cache.sprints[sprint]?.github?.data),
    keyman: statusData.cache.keymanVersion
  }));
  response.end();
});

app.get('/status/github', (request, response) => {
  console.log('GET /status/github');
  const sprint = statusHead(request, response);
  response.write(JSON.stringify({
    currentSprint: currentSprint.getCurrentSprint(statusData.cache.sprints[sprint]?.github?.data),
    github: statusData.cache.sprints[sprint].github
  }));
  response.end();
});

app.get('/status/github-issues', (request, response) => {
  console.log('GET /status/github-issues');
  const sprint = statusHead(request, response);
  response.write(JSON.stringify({
    currentSprint: currentSprint.getCurrentSprint(statusData.cache.sprints[sprint]?.github?.data),
    issues: statusData.cache.issues
  }));
  response.end();
});

app.get('/status/github-contributions', (request, response) => {
  console.log('GET /status/github-contributions');
  const sprint = statusHead(request, response);
  response.write(JSON.stringify({
    currentSprint: currentSprint.getCurrentSprint(statusData.cache.sprints[sprint]?.github?.data),
    contributions: statusData.cache.sprints[sprint].contributions
  }));
  response.end();
});

app.get('/status/sentry-issues', (request, response) => {
  console.log('GET /status/sentry-issues');
  const sprint = statusHead(request, response);
  response.write(JSON.stringify({
    currentSprint: currentSprint.getCurrentSprint(statusData.cache.sprints[sprint]?.github?.data),
    sentryIssues: statusData.cache.sentryIssues
  }));
  response.end();
});

app.get('/status/code-owners', (request, response) => {
  console.log('GET /status/code-owners');
  const sprint = statusHead(request, response);
  response.write(JSON.stringify({
    currentSprint: currentSprint.getCurrentSprint(statusData.cache.sprints[sprint]?.github?.data),
    codeOwners: statusData.cache.codeOwners
  }));
  response.end();
});

/* Deployment endpoints */

function addEndpoint(id, dataSource) {
  app.get('/status/'+id, (request, response) => {
    console.log('GET /status/'+id);
    const sprint = statusHead(request, response);
    const data = {
      currentSprint: currentSprint.getCurrentSprint(statusData.cache.sprints[sprint]?.github?.data),
      data: dataSource()
    };
    response.write(JSON.stringify(data));
    response.end();
  });
}

for(let s of STATUS_SOURCES) {
  addEndpoint(s, () => statusData.cache.deployment[s]);
}

console.log(`Starting app listening on ${port}`);
const server = app.listen(port);

/* Upgrade any websocket connections */

server.on('upgrade', (request, socket, head) => {
  wsServer.handleUpgrade(request, socket, head, socket => {
    wsServer.emit('connection', socket, request);
  });
});

