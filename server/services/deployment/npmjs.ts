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
//const PATH='/@keymanapp/lexical-model-compiler';

const service = {
   get: function(path) {
    return httpget(HOST, path, {Accept: 'application/vnd.npm.install-v1+json'}).then((data) => {
      const results = JSON.parse(data.data);
      if(results && typeof results['dist-tags'] == 'object') {
        // We only want three fields from the results
        const d = results['dist-tags'];
        if(d.latest && d.alpha && d.beta) {
          return { stable: d.latest, beta: d.beta, alpha: d.alpha };
        }
      }
      return null;
    });
  }
};

const LMC_PATH='/@keymanapp/lexical-model-compiler';
const MT_PATH='/@keymanapp/models-types';

export const lmcService: DataService = {
  get: function() {
    return service.get(LMC_PATH);
  }
};

export const mtService: DataService = {
  get: function() {
    return service.get(MT_PATH);
  }
};
