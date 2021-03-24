/*
 Service to collect stats from sentry.keyman.com
*/

import httpget from "../../util/httpget";

const sentry_token=process.env['KEYMANSTATUS_SENTRY_TOKEN'];

export default {
   get: function(phaseStart) {
    const phaseStartDateInSeconds = new Date(phaseStart).valueOf() / 1000;

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

    return Promise.all(sentryQueryPromises).then(phaseData =>
        sentryPlatforms.reduce((obj,item,index) => { obj[item] = JSON.parse(phaseData[index]); return obj; }, {})
      );
  }
};