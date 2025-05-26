import { performance } from 'node:perf_hooks';

import * as sms from 'source-map-support';

import { Environment } from './environment.js';
import * as Sentry from '@sentry/node';
import express from 'express';
// import * as Tracing from "@sentry/tracing";

import { StatusSource } from '../shared/status-source.js';
import { SprintCache } from './data/sprint-cache.js';

import ws from 'ws';
// const ws = require('ws');
import keymanAppTestBotMiddleware from './keymanapp-test-bot/keymanapp-test-bot-middleware.js';
import * as currentSprint from './current-sprint.js';

import { statusData } from './data/status-data.js';
import { slackLGTM } from './services/slack/slack.js';
import { DataChangeTimingManager } from './util/DataChangeTimingManager.js';

import githubContributionsService from "./services/github/github-contributions.js";
import discourseService from "./services/discourse/discourse.js";
import githubTestContributionsService from "./services/github/github-test-contributions.js";
import gitHubMilestonesService from './services/github/github-milestones.js';

import { testUserTestComment } from './keymanapp-test-bot/test-user-test-results-comment.js';
import { performanceLog } from './performance-log.js';

sms.install();

export const environment: Environment =
  process.env['NODE_ENV'] == 'production' ? Environment.Production :
  process.env['NODE_ENV'] == 'staging' ? Environment.Staging :
  Environment.Development;

console.log(`Running in ${environment} environment`);


const sprintCache = new SprintCache(environment);


const app = express();

// Issue #420: We currently have a GitHub rate cost of 139 per refresh. We have
// a limit of 5000 req/hour, so if we ensure that we don't refresh more
// frequently than 36 times an hour, we will be okay for now. This is not an
// ideal fix -- we need to start caching data instead but that will take a major
// refactor.
//
// GH cost breakdown:
//
    // status-organization: 32
    // test-contributions: 18
    // issues: 10
    // status-repository: 5
    // contributions: 3
    // status-keyboards: 1
    // status-lexicalModels: 1
    // status-unlabeledIssues: 1

const GitHubMaxCostPerRefresh = 71;
// Note, we can reduce the refresh to the calculation above, but starting by reducing
// the cost of status-organization from 100 to 32
const GitHubRefreshRate = 5000; // Math.round(60 /*minutes*/ / (60/GitHubMaxCostPerRefresh) /* requests/hour */ * 60 /*sec*/ * 1000 /* msec */);

Sentry.init({
  dsn: "https://4ed13a2db1294bb695765ebe2f98171d@o1005580.ingest.sentry.io/5983526",
  environment: environment,
  integrations: [
    // enable HTTP calls tracing
    Sentry.httpIntegration(),
    Sentry.captureConsoleIntegration({levels:['warn','error','debug','assert']}),
  ],

  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 0.2,
});


// RequestHandler creates a separate execution context using domains, so that every
// transaction/span/breadcrumb is attached to its own Hub instance
// app.use(Sentry.Handlers.requestHandler());
// TracingHandler creates a trace for every incoming request
// app.use(Sentry.Handlers.tracingHandler());

const debugTestBot = false;

if(debugTestBot) {
  testUserTestComment();
}

const port = environment == Environment.Development ? 3000 : 80;
const REFRESH_INTERVAL = environment == Environment.Development ? 180000 : 60000;

const timingManager = new DataChangeTimingManager();

/* Logging all requests and responses */

const requestLoggerMiddleware = ({ logger }) => (req, res, next) => {
  let dt = performance.now();
  // dt.valueOf();
  // let tm = Date.now();
  // logger(`RECV ${new Date().toISOString()} <<<`, req.method, req.url, req.hostname);
  res.on("finish", () => {
    performanceLog(dt, `<<< ${req.method} ${req.url} >>> ${res.statusCode}`);
  });
  next();
};

app.use(requestLoggerMiddleware({ logger: console.log }));

/* Deployment Endpoints */

const STATUS_SOURCES: StatusSource[] = [
  StatusSource.ITunesKeyman,
  StatusSource.ITunesFirstVoices,
  StatusSource.PlayStoreKeyman,
  StatusSource.PlayStoreFirstVoices,
  StatusSource.LaunchPadAlpha,
  StatusSource.LaunchPadBeta,
  StatusSource.LaunchPadStable,
  StatusSource.DebianBeta,
  StatusSource.DebianStable,
  StatusSource.NpmKeymanCompiler,
  StatusSource.NpmCommonTypes,
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
  respondSiteLivelinessDataChange();
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
  respondSiteLivelinessDataChange();
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
  if(timingManager.isTooSoon('github', GitHubRefreshRate, respondGitHubDataChange)) {
    return;
  }

  timingManager.start('github');

  return statusData.refreshGitHubStatusData('current')
    .then(hasChanged => sendWsAlert(hasChanged, 'github'))
    .then(doDiscourseDataChange)
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

function respondSiteLivelinessDataChange() {
  return statusData.refreshSiteLivelinessData()
    .then(hasChanged => sendWsAlert(hasChanged, 'site-liveliness'))
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

function doDiscourseDataChange(user?) {
  //if(!statusData.cache.communitySite) {
    return statusData.refreshCommunitySiteData('current')
      .then(hasChanged => sendWsAlert(hasChanged, 'community-site'))
      .catch(error => reportError(error));
  /*} else {
    return statusData.refreshCommunitySiteData('current', user)
      .then(hasChanged => sendWsAlert(hasChanged, 'community-site'))
      .catch(error => reportError(error));
  }*/
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
  doDiscourseDataChange();
}

function sendInitialRefreshMessages(socket) {
  const sprint = statusData.cache.sprints['current'];
  if(sprint) {
    if(statusData.cache.communitySite) socket.send(StatusSource.CommunitySite);
    if(sprint.contributions) socket.send('github-contributions');
    if(sprint.github) socket.send('github');
  }
  if(statusData.cache.codeOwners) socket.send('code-owners');
  if(statusData.cache.siteLiveliness) socket.send('site-liveliness');
  if(statusData.cache.sentryIssues) socket.send('sentry-issues');
  if(statusData.cache.issues) socket.send('github-issues');
  if(statusData.cache.teamCity && statusData.cache.teamCityRunning && statusData.cache.teamCityAgents && statusData.cache.teamCityQueue) socket.send('teamcity');
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

app.post('/webhook/discourse', (request, response) => {
  // TODO: use webhook data to refresh only affected user
  (async () => {
    doDiscourseDataChange(undefined);
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
  // console.log('GET /status/teamcity');
  const sprint = statusHead(request, response);
  response.write(JSON.stringify({
    currentSprint: currentSprint.getCurrentSprint(statusData.cache.sprints[sprint]?.github?.data),
    teamCity: statusData.cache.teamCity,
    teamCityRunning: statusData.cache.teamCityRunning,
    teamCityAgents: statusData.cache.teamCityAgents,
    teamCityQueue: statusData.cache.teamCityQueue,
  }));
  response.end();
});

app.get('/status/keyman', (request, response) => {
  // console.log('GET /status/keyman');
  const sprint = statusHead(request, response);
  response.write(JSON.stringify({
    currentSprint: currentSprint.getCurrentSprint(statusData.cache.sprints[sprint]?.github?.data),
    keyman: statusData.cache.keymanVersion
  }));
  response.end();
});

app.get('/status/github', (request, response) => {
  // console.log('GET /status/github');
  const sprint = statusHead(request, response);
  response.write(JSON.stringify({
    currentSprint: currentSprint.getCurrentSprint(statusData.cache.sprints[sprint]?.github?.data),
    github: statusData.cache.sprints[sprint]?.github
  }));
  response.end();
});

app.get('/status/github-issues', (request, response) => {
  // console.log('GET /status/github-issues');
  const sprint = statusHead(request, response);
  response.write(JSON.stringify({
    currentSprint: currentSprint.getCurrentSprint(statusData.cache.sprints[sprint]?.github?.data),
    issues: statusData.cache.issues
  }));
  response.end();
});

app.get('/status/github-contributions', async (request, response) => {
  // console.log('GET /status/github-contributions');
  const sprint = statusHead(request, response);
  if(sprint != 'current') {
    // load the data for the sprint
    let data = sprintCache.getFileFromCache(sprint, 'contributions');
    if(data) {
      response.write(data);
    } else {
      let sprintStartDateTime = new Date(request.query.sprintStartDate as string);
      let contributions = null;
      try {
        contributions = await githubContributionsService.get(sprintStartDateTime.toISOString());
      } catch(e) {
        console.debug(e);
        Sentry.addBreadcrumb({
          category: "Request",
          message: JSON.stringify(request.query)
        });
        Sentry.captureException(e);
      }

      for(let node of contributions?.data?.repository?.contributions?.nodes) {
        node.contributions.tests = {nodes: await githubTestContributionsService.get(null, [], sprintStartDateTime.toISOString(), node.login)};
      }

      const json = JSON.stringify({
        contributions: contributions
      });

      if(sprintCache.shouldCache(sprintStartDateTime)) {
        sprintCache.saveToCache(sprint, 'contributions', json);
      }

      response.write(json);
    }
  } else {
    response.write(JSON.stringify({
      currentSprint: currentSprint.getCurrentSprint(statusData.cache.sprints[sprint]?.github?.data),
      contributions: statusData.cache.sprints[sprint].contributions
    }));
  }
  response.end();
});

app.get('/status/community-site', async (request, response) => {
  // console.log('GET /status/community-site');
  const sprint = statusHead(request, response);
  if(sprint != 'current') {
    // load the data for the sprint
    let data = sprintCache.getFileFromCache(sprint, 'community-site');
    if(data) {
      response.write(data);
    } else {
      let sprintStartDateTime = new Date(request.query.sprintStartDate as string);
      let contributions = await discourseService.get(sprintStartDateTime);

      const json = JSON.stringify({
        // currentSprint: currentSprint.getCurrentSprint(statusData.cache.sprints[sprint]?.github?.data),
        contributions: contributions
      });

      if(sprintCache.shouldCache(sprintStartDateTime)) {
        sprintCache.saveToCache(sprint, 'community-site', json);
      }

      response.write(json);
    }
  } else {
    response.write(JSON.stringify({
      currentSprint: currentSprint.getCurrentSprint(statusData.cache.sprints[sprint]?.github?.data),
      communitySite: statusData.cache.communitySite
    }));
  }
  response.end();
});

app.get('/status/github-milestones', async (request, response) => {
  // console.log('GET /status/github-milestones');
  statusHead(request, response);
  const milestones = await gitHubMilestonesService.get();
  response.write(JSON.stringify({
    milestones: milestones
  }));
  response.end();
});

app.get('/status/sentry-issues', (request, response) => {
  // console.log('GET /status/sentry-issues');
  const sprint = statusHead(request, response);
  response.write(JSON.stringify({
    currentSprint: currentSprint.getCurrentSprint(statusData.cache.sprints[sprint]?.github?.data),
    sentryIssues: statusData.cache.sentryIssues
  }));
  response.end();
});

app.get('/status/code-owners', (request, response) => {
  // console.log('GET /status/code-owners');
  const sprint = statusHead(request, response);
  response.write(JSON.stringify({
    currentSprint: currentSprint.getCurrentSprint(statusData.cache.sprints[sprint]?.github?.data),
    codeOwners: statusData.cache.codeOwners
  }));
  response.end();
});

app.get('/status/site-liveliness', (request, response) => {
  // console.log('GET /status/code-owners');
  const sprint = statusHead(request, response);
  response.write(JSON.stringify({
    currentSprint: currentSprint.getCurrentSprint(statusData.cache.sprints[sprint]?.github?.data),
    siteLiveliness: statusData.cache.siteLiveliness
  }));
  response.end();
});

if(environment == Environment.Development) {
  // Allow CORS for POST
  app.options('/refresh', (request, response) => {
    // console.log('OPTIONS /refresh');
    response.writeHead(200, {
      "Access-Control-Allow-Origin": '*',
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Max-Age": "1000",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    response.end();
  });
}

app.post('/refresh', (request, response) => {
  // console.log('POST /refresh');
  statusHead(request, response);
  timingManager.reset();
  (async () => {
    initialLoad();
  })();
  response.write(JSON.stringify({"status":"ok"}));
  response.end();
});

/* Deployment endpoints */

function addEndpoint(id, dataSource) {
  app.get('/status/'+id, (request, response) => {
    // console.log('GET /status/'+id);
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

// Sentry debug endpoint
app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});

app.all('/{*splat}', (request, response) => {
  response.status(200).sendFile('/public/dist/public/index.html', {root: environment == Environment.Development ? '../' : '../../../'});
});


// The error handler must be before any other error middleware and after all controllers
// app.use(Sentry.Handlers.errorHandler());

if(!debugTestBot) {
  console.log(`Starting app listening on ${port}`);
  const server = app.listen(port);

  /* Upgrade any websocket connections */

  server.on('upgrade', (request, socket, head) => {
    wsServer.handleUpgrade(request, socket, head, socket => {
      wsServer.emit('connection', socket, request);
    });
  });
}