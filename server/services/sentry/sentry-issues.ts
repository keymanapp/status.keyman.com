/*
 Service to collect stats from sentry.io (formerly sentry.keyman.com)
*/

import httpget from "../../util/httpget";
import parseLinkHeader from "parse-link-header";

const sentry_token=process.env['KEYMANSTATUS_SENTRY_TOKEN'];

export default {
  get: async function() {
    let appEnvironments = ['alpha', 'beta', 'stable', /*'local'*/];
    let siteEnvironments = [/*'development',*/ 'production', /*'staging', 'test'*/];
    let result = {};
    for(let environment of appEnvironments) {
      result[environment] = await this.getEnvironment(true, environment);
    }
    for(let environment of siteEnvironments) {
      result[environment] = await this.getEnvironment(false, environment);
    }
    return result;
  },

  getEnvironment: async function(isApp, environment) {
    const appProjects = [
      5983532, // fv-android
      5983531, // kab-android
      5983525, // keyman-linux
      5983524, // keyman-web
      5983522, // keyman-mac
      5983521, // keyman-ios
      5983520, // keyman-android
      5983519, // keyman-developer
      5983518, // keyman-windows
    ];

    const siteProjects = [
      5983530, // s-keyman-com
      5983529, // downloads-keyman-com
      5983528, // donate-keyman-com
      5983527, // developer-keyman-com
      5983526, // status-keyman-com
      5983523, // keymanweb-com
      5983517, // api-keyman-com
      5983516, // keyman-com
      5983515, // help-keyman-com
    ];

    const projects = isApp ? appProjects : siteProjects;

    return projects.reduce((previousPromise, project) => {
      return previousPromise.then((results) => {
        // We cannot do more than 10 requests/second. Given we cannot do
        // cross-project requests on our current plan, nor get environment data
        // in the returned issue data, we have to issue multiple requests, one
        // per project per environment, and we'll delay each one by 125msec to
        // guarantee we don't exceed our quota. This means (9 app projects * 3 +
        // 9 site projects * 1 env) = 36 requests minimum, approximately 4.5
        // seconds of delay, plus response time. If we have >100 issues in any
        // given project, that will increase the response time as we delay
        // paginated responses also.
        return this.delay().then(() => {
          return this.getEnvironmentProject(environment, project).then(data => {
            return [].concat(results, data);
          });
        })
      })
    },
      Promise.resolve<[]>([])
    );
  },

  delay() {
    return new Promise<void>(function(resolve, reject) {
      setTimeout(resolve, 125);
    });
  },

  getEnvironmentProject: function(environment, project, cursor?, issues?) {

// https://sentry.io/api/0/organizations/keyman/issues/
// end=2021-03-24T12%3A59%3A59
// or statsPeriod=14d
// groupStatsPeriod=auto
// limit=100
// query=is%3Aunresolved
// shortIdLookup=1
// sort=freq
// start=2021-03-20T13%3A00%3A00
// utc=false

    const url =
      `/api/0/organizations/keyman/issues/`+
      `?statsPeriod=14d`+
      `&groupStatsPeriod=auto`+
      `&project=${project}`+
      `&shortIdLookup=1`+
      `&sort=freq`+
      `&utc=false`+
      `&limit=100`+
      `&query=is%3Aunresolved`+
      `+environment%3A${environment}`+ // note, it seems `&environment= doesn't work on sentry.io, but query=environment: does?
      (cursor ? `&cursor=${cursor}` : ``);
    const authOptions = {
      Authorization: ` Bearer ${sentry_token}`,
      Accept: 'application/json'
    };
    const host = 'sentry.io';

    let sentryQuery = httpget(host, url, authOptions);

    return sentryQuery.then((data) => {
      //console.log(data.data);
      let results = [].concat(issues, JSON.parse(data.data));
      if(data.res.headers.link) {
        const link = typeof data.res.headers.link == 'string' ? data.res.headers.link : data.res.headers.link[0];
        const links = parseLinkHeader(link);
        if(links && links.next && links.next.results == 'true') {
          return this.delay().then(() => this.getEnvironment(environment, project, links.next.cursor, results));
        }
      }
      return results;
    });
  }
};

