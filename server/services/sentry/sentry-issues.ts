/*
 Service to collect stats from sentry.keyman.com
*/

import httpget from "../../util/httpget";
import parseLinkHeader from "parse-link-header";

const sentry_token=process.env['KEYMANSTATUS_SENTRY_TOKEN'];

export default {
   get: function(cursor?, issues?) {

    // Build a list of sentry queries per platform; TODO refactor into shared source
    let sentryPlatforms = ['android','ios','linux','mac','web','windows','developer',
      'api.keyman.com', 'developer.keyman.com', 'donate.keyman.com', 'downloads.keyman.com',
      'help.keyman.com', 'keyman.com', 'keymanweb.com', 's.keyman.com', 'status.keyman.com'
    ];

// https://sentry.keyman.com/api/0/organizations/keyman/issues/
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
      `/api/0/organizations/keyman/issues/?`+
      `statsPeriod=14d&`+
      `&groupStatsPeriod=auto&`+
      `limit=100&query=is%3Aunresolved&shortIdLookup=1&sort=freq&utc=false`+
      (cursor ? `&cursor=${cursor}` : ``);
    const authOptions = {
      Authorization: ` Bearer ${sentry_token}`,
      Accept: 'application/json'
    };
    const host = 'sentry.keyman.com';

    let sentryQuery = httpget(host, url, authOptions);

    return sentryQuery.then((data) => {
      let results = [].concat(issues, JSON.parse(data.data));
      if(data.res.headers.link) {
        const link = typeof data.res.headers.link == 'string' ? data.res.headers.link : data.res.headers.link[0];
        const links = parseLinkHeader(link);
        if(links && links.next && links.next.results == 'true') {
          return this.get(links.next.cursor, results);
        }
      }
      return results;
    });
  }
};

