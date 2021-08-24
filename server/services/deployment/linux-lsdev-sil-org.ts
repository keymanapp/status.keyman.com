/*
 Service to collect version info from linux.lsdev.sil.org (LLSO)
 for the current version for each tier.
 This endpoint returns text which we will skim for specific text:

```
Package: keyman
Source: keyman-config (14.0.273-1)
Version: 14.0.273-1+focal1
```

or:

```
Package: keyman
Source: keyman-config
Version: 14.0.273-1+focal1
```

or:

```
Package: keyman
Version: 15.0.100-1+focal1
```

*/

import httpget from "../../util/httpget";
import DataService from "../data-service";

// http://linux.lsdev.sil.org/ubuntu/dists/focal<llsoTier>/main/binary-amd64/Packages
const HOST ='linux.lsdev.sil.org';
const PATH_PREFIX='/ubuntu/dists/focal';
const PATH_SUFFIX='/main/binary-amd64/Packages';

const service = {
   get: function(llsoTier: string) {
    return httpget(HOST, PATH_PREFIX+llsoTier+PATH_SUFFIX, null, false, true).then((data) => {
      const results = data.data.match(/^Package: keyman\s*\n(Source:\s*keyman[^\n]*\n)?Version: (\d+\.\d+\.\d+)-\d+/m);
      if(results) {
        return { version: results[2] };
      }

      return null;
    });
  }
};

class ServiceClass implements DataService {
  constructor(private readonly llsoTier: string) {
  }

  get = () => service.get(this.llsoTier);
};

export const linuxLsdevSilOrgAlphaService: DataService = new ServiceClass('-experimental');
export const linuxLsdevSilOrgBetaService: DataService = new ServiceClass('-proposed');
export const linuxLsdevSilOrgStableService: DataService = new ServiceClass('');
