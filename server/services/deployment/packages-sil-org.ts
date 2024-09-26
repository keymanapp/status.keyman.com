/*
 Service to collect version info from packages.sil.org (PSO).
 This endpoint returns text which we will skim for specific text:

```
Package: keyman
Source: keyman-config (14.0.273-1)
Version: 14.0.273-1+focal1
```

or:

```
Package: keyman
Version: 17.0.330-1+noble1
```

*/

import httpget from "../../util/httpget";
import DataService from "../data-service";

// https://packages.sil.org/ubuntu/dists/noble/main/binary-amd64/Packages
const HOST='packages.sil.org';
const PATH='/ubuntu/dists/noble/main/binary-amd64/Packages';

const service: DataService = {
   get: function() {
    return httpget(HOST, PATH).then((data) => {
      const results = data.data.match(/^Package: keyman\s*\n(Source:\s*keyman[^\n]*\n)?Version: (\d+\.\d+\.\d+)-\d+/m);
      if(results) {
        return { version: results[2] };
      }

      return null;
    });
  }
};

export default service;

