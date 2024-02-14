/*
 Service to collect site-liveliness from Keyman sites
*/

import httpget from "../../util/httpget";
import { sitesWithState } from "../../../shared/sites";

export default {
  get: async function() {
    let sites = sitesWithState.map(site => ({site, state: null}));
    for(let site of sites) {
      site.state = await this.getStateFromSite(site.site);
    }
    return sites;
  },

  async getStateFromSite(site) {
    try {
      const ready = await httpget(site, '/_control/ready');
      if(ready.res.statusCode == 200) {
        return 'ready';
      }
      const alive = await httpget(site, '/_control/alive');
      if(alive.res.statusCode == 200) {
        return 'alive';
      }
      return 'dead'
    } catch(e) {
      return 'error';
    }
  }
};