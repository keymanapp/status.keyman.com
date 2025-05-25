/*
 Service to collect version info from Google Play Store.

 The Play Store, amazingly enough, does not offer an API to
 query this kind of information. There are 3rd party APIs but
 they cost significant money each month. Ridiculous!
*/

import httpget from "../../util/httpget.js";
import DataService from "../data-service.js";

const KEYMAN_APP_ID='com.tavultesoft.kmapro';
const FIRSTVOICES_APP_ID='com.firstvoices.keyboards';
const PLAYSTORE_HOST='play.google.com';
const PLAYSTORE_PATH='/store/apps/details?id=';

// const CurrentVersionRE = /Current Version<\/div><span class="[^"]+"><div class="[^"]+"><span class="[^"]+">(.+?)<\/span>/;
//<div class="BgcNfc">Current Version</div><span class="htlgb"><div class="IQ1z0d"><span class="htlgb">14.0.273</span></div>
// const AF_initDataCallbackRE = /<script class="ds:5".+?>AF_initDataCallback\((.+?)\);<\/script>/;
// Based on obscure data embedded in the page, we can find a current release number here, e.g. [["18.0.235"]]
// at time of writing this, there was only 1 reference that matched this pattern:
const ReallyHackyCurrentVersionRE = /\[\["(\d+\.\d+\.\d+)"\]\]/;

const service = {
   get: function(appId) {
    return httpget(PLAYSTORE_HOST, PLAYSTORE_PATH + appId).then((data) => {
      const results = ReallyHackyCurrentVersionRE.exec(data.data);
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
