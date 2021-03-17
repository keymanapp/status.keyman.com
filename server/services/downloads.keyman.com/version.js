/*
 Service to collect stats from downloads.keyman.com
*/

import httpget from "../../util/httpget";

export default {
   get: function() {
      return httpget('downloads.keyman.com', '/api/version/2.0').then(data => this.transformKeymanResponse(JSON.parse(data)));
   },

   private transformKeymanResponse: function(data) {
      Object.keys(data).forEach(platform => {
        Object.keys(data[platform]).forEach(tier => {
          const version = data[platform][tier].version;
          const prefix = `https://downloads.keyman.com/${platform}/${tier}/${version}`;
          const winapp = parseInt(version,10) >= 14 ? 'keyman' : 'keymandesktop';
          switch(platform) {
            case 'android':   data[platform][tier].downloadUrl = `${prefix}/keyman-${version}.apk`; break;
            case 'ios':       data[platform][tier].downloadUrl = `${prefix}/keyman-ios-${version}.ipa`; break;
            case 'linux':     data[platform][tier].downloadUrl = `${prefix}/`; break;
            case 'mac':       data[platform][tier].downloadUrl = `${prefix}/keyman-${version}.dmg`; break;
            case 'web':       data[platform][tier].downloadUrl = `https://keymanweb.com?version=${version}`; break;
            case 'windows':   data[platform][tier].downloadUrl = `${prefix}/${winapp}-${version}.exe`; break;
            case 'developer': data[platform][tier].downloadUrl = `${prefix}/keymandeveloper-${version}.exe`; break;
          }
        });
      });
      return data;
    }

};