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
const sentry_token=process.env['KEYMANSTATUS_SENTRY_TOKEN'];

const REFRESH_INTERVAL = 60000; //msec
let lastRefreshTime = 0;

let cachedData = {};

app.use('/', express.static('public/dist/public'));

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
      keyman: data.keymanVersionData,
      github: data.githubPullsData,
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

function refreshStatus(sprint, callback) {
  cachedData[sprint] = {lastRefreshTime: 0};

  let SprintStartDateTime = getSprintStart().toISOString();

  const ghStatusQuery = githubStatus.queryString(sprint);

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
    ),


  ]).then(data => {
    // Get the current sprint from the GitHub data
    // We actually get data from the Saturday before the 'official' sprint start

    let githubPullsData = JSON.parse(data[3]);
    const phase = currentSprint.getCurrentSprint(githubPullsData.data);
    const ghContributionsQuery = githubContributions.queryString(phase ? new Date(phase.start-2).toISOString() : SprintStartDateTime);
    const phaseStartDateInSeconds = new Date(phase.start - 2).valueOf() / 1000;

    // Build a list of sentry queries per platform
    let sentryPlatforms = ['android','ios','linux','mac','web','windows','developer'];
    let sentryQueryPromises = sentryPlatforms.map(platform => httpget('sentry.keyman.com',
      `/api/0/projects/keyman/keyman-${platform}/stats/?stats=received&since=${phaseStartDateInSeconds}&resolution=1d`,
      {
        Authorization: ` Bearer ${sentry_token}`,
        Accept: 'application/json'
      }
    ));

    // Run the queries!

    Promise.all([
      httppost('api.github.com', '/graphql',
        {
          Authorization: ` Bearer ${github_token}`,
          Accept: 'application/vnd.github.antiope-preview',
          Accept: 'application/vnd.github.shadow-cat-preview+json'
        },
        // Gather the contributions for each recent user

        JSON.stringify({query: ghContributionsQuery}),
      )].concat(sentryQueryPromises)
    ).then(phaseData => {
      let contributions = phaseData.shift();

      cachedData[sprint].teamCityData = transformTeamCityResponse(JSON.parse(data[0]));
      cachedData[sprint].teamCityRunningData = transformTeamCityResponse(JSON.parse(data[1]));
      cachedData[sprint].keymanVersionData = transformKeymanResponse(JSON.parse(data[2]));
      cachedData[sprint].githubPullsData = githubPullsData;
      cachedData[sprint].githubContributionsData = JSON.parse(contributions);
      cachedData[sprint].lastRefreshTime = Date.now();
      cachedData[sprint].sentry = sentryPlatforms.reduce((obj,item,index) => { obj[item] = JSON.parse(phaseData[index]); return obj; }, {});
      if(callback) callback(cachedData[sprint]);
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

function transformKeymanResponse(data) {
  Object.keys(data).forEach(platform => {
    Object.keys(data[platform]).forEach(tier => {
      const version = data[platform][tier].version;
      const prefix = `https://downloads.keyman.com/${platform}/${tier}/${version}`;
      switch(platform) {
        case 'android':   data[platform][tier].downloadUrl = `${prefix}/keyman-${version}.apk`; break;
        case 'ios':       data[platform][tier].downloadUrl = `${prefix}/keyman-ios-${version}.ipa`; break;
        case 'linux':     data[platform][tier].downloadUrl = `${prefix}/`; break;
        case 'mac':       data[platform][tier].downloadUrl = `${prefix}/keyman-${version}.dmg`; break;
        case 'web':       data[platform][tier].downloadUrl = `https://keymanweb.com?version=${version}`; break;
        case 'windows':   data[platform][tier].downloadUrl = `${prefix}/keymandesktop-${version}.exe`; break;
        case 'developer': data[platform][tier].downloadUrl = `${prefix}/keymandeveloper-${version}.exe`; break;
      }
    });
  });
  return data;
}
