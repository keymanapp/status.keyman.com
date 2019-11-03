const url = require('url');
const express = require('express');
const https = require('https');

const app = express();

const githubContributions = require('./github-contributions');
const githubStatus = require('./github-status');
const currentSprint = require('./current-sprint');

const isProduction = process.env['NODE_ENV'] == 'production';

const port=isProduction ? 80 : 3000;
const teamcity_token=process.env['KEYMANSTATUS_TEAMCITY_TOKEN'];
const github_token=process.env['KEYMANSTATUS_GITHUB_TOKEN'];

const REFRESH_INTERVAL = 60000; //msec
let lastRefreshTime = 0;
let teamCityData = null;
let teamCityRunningData = null;
let keymanVersionData = null;
let githubPullsData = null;
let githubContributionsData = null;

app.use('/', express.static('public/dist/public'));

app.get('/status', (request, response) => {
  let cb = () => {
    let headers = {"Content-Type": "text/html"};
    if(!isProduction) {
      // Allow requests from ng-served host in development
      headers["Access-Control-Allow-Origin"] = '*';
    }
    response.writeHead(200, headers);
    response.write(JSON.stringify({
      teamCity: teamCityData,
      teamCityRunning: teamCityRunningData,
      keyman: keymanVersionData,
      github: githubPullsData,
      contributions: githubContributionsData,
      currentSprint: currentSprint.getCurrentSprint(githubPullsData.data)
    }));
    response.end();
  };

  if(teamCityData == null || Date.now()-lastRefreshTime > REFRESH_INTERVAL) {
    refreshStatus(cb);
  } else {
    cb();
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

function refreshStatus(callback) {

  let SprintStartDateTime = getSprintStart().toISOString();

  const ghStatusQuery = githubStatus.queryString();

  Promise.all([
    httpget(
      'build.palaso.org',
      '/app/rest/buildTypes?locator=affectedProject:(id:Keyman)&fields=buildType(id,name,builds($locator(canceled:false,branch:default:any),'+
        'build(id,number,status,statusText)))',
      {
        Authorization: ` Bearer ${teamcity_token}`,
        Accept: 'application/json'
      }
    ),
    httpget(
      'build.palaso.org',
      '/app/rest/buildTypes?locator=affectedProject:(id:Keyman)&fields=buildType(id,name,builds($locator(running:true,canceled:false,branch:default:any),'+
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
        Accept: 'application/vnd.github.antiope-preview',
        Accept: 'application/vnd.github.shadow-cat-preview+json'
      },

      // Lists all open pull requests in keyman repos
      // and all open pull requests + status for keymanapp repo
      // Gather the contributions for each recent user

      // Current rate limit cost is 31 points. We have 5000 points/hour.
      // https://developer.github.com/v4/guides/resource-limitations/

      JSON.stringify({query: ghStatusQuery})
    )
  ]).then(data => {
    // Get the current sprint from the GitHub data
    // We actually get data from the Saturday before the 'official' sprint start
    const phase = currentSprint.getCurrentSprint(JSON.parse(data[3]).data);
    const ghContributionsQuery = githubContributions.queryString(phase ? new Date(phase.start-2).toISOString() : SprintStartDateTime);

    httppost('api.github.com', '/graphql',
      {
        Authorization: ` Bearer ${github_token}`,
        Accept: 'application/vnd.github.antiope-preview',
        Accept: 'application/vnd.github.shadow-cat-preview+json'
      },

      // Gather the contributions for each recent user

      JSON.stringify({query: ghContributionsQuery})
    ).then(contributions => {
      teamCityData = transformTeamCityResponse(JSON.parse(data[0]));
      teamCityRunningData = transformTeamCityResponse(JSON.parse(data[1]));
      keymanVersionData = JSON.parse(data[2]);//inputKeymanVersionData);
      githubPullsData = JSON.parse(data[3]);
      githubContributionsData = JSON.parse(contributions);
      lastRefreshTime = Date.now();
      if(callback) callback();
    });
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
