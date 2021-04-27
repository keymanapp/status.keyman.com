/*
 Service to collect version info from Launchpad
*/

import httpget from "../../util/httpget";
import DataService from "../data-service";

// https://api.launchpad.net/1.0/~keymanapp/+archive/ubuntu/keyman?ws.op=getPublishedBinaries&ws.size=1&order_by_date=true
const HOST='api.launchpad.net';
const PATH='/1.0/~keymanapp/+archive/ubuntu/keyman?ws.op=getPublishedBinaries&ws.size=1&order_by_date=true';

const service: DataService = {
   get: function() {
    return httpget(HOST, PATH).then((data) => {
      const results = JSON.parse(data.data);
      // We only want two fields from the results
      if(results && typeof results.entries == 'object' && results.entries.length > 0) {
        const d = results.entries[0];
        if(typeof d == 'object' && d.date_published && d.binary_package_version) {
          // The binary_package_version will be a string like 14.0.273-1~sil1~bionic
          const version = d.binary_package_version.split('-')[0];
          return { date_published: d.date_published, version: version };
        }
      }
      return null;
    });
  }
};

export default service;

