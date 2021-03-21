require('source-map-support').install();
const express = require('express');
const app = express();
const ws = require('ws');

const currentSprint = require('./current-sprint');

import { StatusData } from './data/status-data';

const isProduction = process.env['NODE_ENV'] == 'production';

const port=isProduction ? 80 : 3000;
const REFRESH_INTERVAL = isProduction ? 60000 : 60000 * 60; //msec

const statusData = new StatusData();
statusData.initialLoad();

/* Interval triggers */

setInterval(statusData.refreshKeymanVersionData, REFRESH_INTERVAL);

/******************************************
 * Web endpoints
 ******************************************/

/* Web Sockets */

// Set up a headless websocket server that prints any
// events that come in.
const wsServer = new ws.Server({ noServer: true });
wsServer.on('connection', socket => {
  socket.on('message', message => console.log(message));
});

/* Static Endpoints */

app.use('/', express.static('../../public/dist/public'));

/* Web hooks */

app.get('/webhook/github', (request, response) => {
  Promise.all([
    statusData.refreshGitHubIssuesData(),
    statusData.refreshGitHubStatusData('current')
  ]).then(() => sendWsAlert('github'));

  response.send('ok');
});

app.get('/webhook/teamcity', (request, response) => {
  statusData.refreshTeamcityData().then(() => sendWsAlert('teamcity'));
  response.send('ok');
});

app.get('/webhook/sentry', (request, response) => {
  statusData.refreshSentryData('current').then(() => sendWsAlert('sentry'));
  response.send('ok');
});

function sendWsAlert(message) {
  wsServer.clients.forEach((client) => {
    if(client.readState === wsServer.OPEN) {
      client.send(message);
    }
  });
}


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

console.log(`Starting app listening on ${port}`);
const server = app.listen(port);

/* Upgrade any websocket connections */

server.on('upgrade', (request, socket, head) => {
  wsServer.handleUpgrade(request, socket, head, socket => {
    wsServer.emit('connection', socket, request);
  });
});

