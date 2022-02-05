/*
 Service to collect version info from Google Play Store.

 The Play Store, amazingly enough, does not offer an API to
 query this kind of information. There are 3rd party APIs but
 they cost significant money each month. Ridiculous!
*/

import httpget from "../../util/httpget";
import DataService from "../data-service";

const KEYMAN_APP_ID='com.tavultesoft.kmapro';
const FIRSTVOICES_APP_ID='com.firstvoices.keyboards';
const PLAYSTORE_HOST='play.google.com';
const PLAYSTORE_PATH='/store/apps/details?id=';

const CurrentVersionRE = /Current Version<\/div><span class="[^"]+"><div class="[^"]+"><span class="[^"]+">(.+?)<\/span>/;
//<div class="BgcNfc">Current Version</div><span class="htlgb"><div class="IQ1z0d"><span class="htlgb">14.0.273</span></div>

const service = {
   get: function(appId) {
    return httpget(PLAYSTORE_HOST, PLAYSTORE_PATH + appId).then((data) => {
      const results = CurrentVersionRE.exec(data.data);
      if(results) {
        return { version: results[1] };
      }
      return null;
    });
  }
};

class ServiceClass implements DataService {
  constructor(private readonly appId: string) {
  }

  get = () => service.get(this.appId);
}

export const keymanPlayStoreService: DataService = new ServiceClass(KEYMAN_APP_ID);
export const firstVoicesPlayStoreService: DataService = new ServiceClass(FIRSTVOICES_APP_ID);
