/*
 Service to collect version info from App Store
*/

import httpget from "../../util/httpget";
import DataService from "../data-service";

//https://itunes.apple.com/lookup?id=933676545
const KEYMAN_APP_ID=933676545;
const ITUNES_HOST='itunes.apple.com';
const ITUNES_PATH='/lookup?id='+KEYMAN_APP_ID;

const service: DataService = {
   get: function() {
    return httpget(ITUNES_HOST, ITUNES_PATH).then((data) => {
      const results = JSON.parse(data.data);
      // We only want two fields from the results
      if(results && results.resultCount > 0 && typeof results.results == 'object' && results.results.length > 0) {
        const d = results.results[0];
        if(typeof d == 'object' && d.currentVersionReleaseDate && d.version) {
          return { releaseDate: d.currentVersionReleaseDate, version: d.version };
        }
      }
      return null;
    });
  }
};

export default service;
