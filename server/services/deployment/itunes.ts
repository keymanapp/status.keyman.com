/*
 Service to collect version info from App Store
*/

import httpget from "../../util/httpget";
import DataService from "../data-service";

//https://itunes.apple.com/lookup?bundleId=Tavultesoft.Keyman
const KEYMAN_APP_BUNDLE_ID='Tavultesoft.Keyman';
const FIRSTVOICES_APP_BUNDLE_ID='com.firstvoices.keyboards';
const ITUNES_HOST='itunes.apple.com';
const ITUNES_PATH_PREFIX='/lookup?bundleId=';

const service = {
  get: function(bundleId) {
    return httpget(ITUNES_HOST, ITUNES_PATH_PREFIX + bundleId).then((data) => {
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
}

class ServiceClass implements DataService {
  constructor(private readonly bundleId: string) {
  }

  get = () => service.get(this.bundleId);
}

export const keymaniTunesService: DataService = new ServiceClass(KEYMAN_APP_BUNDLE_ID);
export const firstVoicesiTunesService: DataService = new ServiceClass(FIRSTVOICES_APP_BUNDLE_ID);
