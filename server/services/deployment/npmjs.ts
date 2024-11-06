/*
 Service to collect version info from npmjs

{
  "name": "@keymanapp/kmc",
  "dist-tags": {
    "dev": "0.0.0",
    "latest": "14.0.273",
    "alpha": "15.0.36-alpha",
    "beta": "14.0.268-beta"
  },

*/

import httpget from "../../util/httpget";
import DataService from "../data-service";

// curl -H "Accept: application/vnd.npm.install-v1+json" https://registry.npmjs.org/@keymanapp/kmc
const HOST='registry.npmjs.org';

const service = {
  get: function(path, etag) {
    const headers = {Accept: 'application/vnd.npm.install-v1+json'};
    return httpget(HOST, path, headers, true).then((data) => {
      // We'll check the head etag first to avoid downloading a large 1MB data chunk
      // If etag hasn't changed we can assume the data hasn't changed
      if(data.res.headers['etag'] == etag) return null;
      etag = data.res.headers['etag'];
      return httpget(HOST, path, {Accept: 'application/vnd.npm.install-v1+json'}).then((data) => {
        const results = JSON.parse(data.data);
        if(results && typeof results['dist-tags'] == 'object') {
          // We only want three fields from the results
          const d = results['dist-tags'];
          return { etag: etag, data: { stable: d.latest ?? null, beta: d.beta ?? null, alpha: d.alpha ?? null } };
        }
        return null;
      });
    });
  }
};

const KMC_PATH='/@keymanapp/kmc';
const CT_PATH='/@keymanapp/common-types';

class ServiceClass implements DataService {
  private etag = '';
  private cachedData = null;

  constructor(private readonly path: string) {
  }

  get = () => {
    return service.get(this.path, this.etag).then(data => {
      if(!data) return this.cachedData;
      this.etag = data.etag;
      this.cachedData = data.data;
      return data.data;
    });
  }
};

export const kmcService: DataService = new ServiceClass(KMC_PATH);
export const ctService: DataService = new ServiceClass(CT_PATH);
