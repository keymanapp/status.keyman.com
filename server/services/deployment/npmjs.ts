/*
 Service to collect version info from npmjs

{
  "name": "@keymanapp/lexical-model-compiler",
  "dist-tags": {
    "dev": "0.0.0",
    "latest": "14.0.273",
    "alpha": "15.0.36-alpha",
    "beta": "14.0.268-beta"
  },

*/

import httpget from "../../util/httpget";
import DataService from "../data-service";

// curl -H "Accept: application/vnd.npm.install-v1+json" https://registry.npmjs.org/@keymanapp/lexical-model-compiler
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
          if(d.latest && d.alpha && d.beta) {
            return { etag: etag, data: { stable: d.latest, beta: d.beta, alpha: d.alpha } };
          }
        }
        return null;
      });
    });
  }
};

const LMC_PATH='/@keymanapp/lexical-model-compiler';
const MT_PATH='/@keymanapp/models-types';

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

export const lmcService: DataService = new ServiceClass(LMC_PATH);
export const mtService: DataService = new ServiceClass(MT_PATH);
