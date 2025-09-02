/*
 Service to collect version info from Launchpad
*/

import httpget from "../../util/httpget.js";
import DataService from "../data-service.js";

// https://api.launchpad.net/1.0/~keymanapp/+archive/ubuntu/keyman-alpha?ws.op=getPublishedBinaries&ws.size=1&order_by_date=true&exact_match=true&binary_name=keyman
// https://api.launchpad.net/1.0/~keymanapp/+archive/ubuntu/keyman-beta?ws.op=getPublishedBinaries&ws.size=1&order_by_date=true&exact_match=true&binary_name=keyman
// https://api.launchpad.net/1.0/~keymanapp/+archive/ubuntu/keyman?ws.op=getPublishedBinaries&ws.size=1&order_by_date=true&exact_match=true&binary_name=keyman
const HOST='api.launchpad.net';
const PATH_PREFIX='/1.0/~keymanapp/+archive/ubuntu/keyman';
const PATH_SUFFIX='?ws.op=getPublishedBinaries&ws.size=1&order_by_date=true&exact_match=true&binary_name=keyman';

const service = {
   get: function(tier) {
    return httpget(HOST, PATH_PREFIX+tier+PATH_SUFFIX).then((data) => {
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

class ServiceClass implements DataService {
  constructor(private readonly tier: string) {
  }

  get = () => service.get(this.tier);
};

export const launchPadAlphaService: DataService = new ServiceClass('-alpha');
export const launchPadBetaService: DataService = new ServiceClass('-beta');
export const launchPadStableService: DataService = new ServiceClass('');
