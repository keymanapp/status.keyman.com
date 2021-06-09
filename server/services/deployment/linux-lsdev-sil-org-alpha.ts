/*
 Service to collect version info from linux.lsdev.sil.org (LLSO)
 for the current ALPHA version.
 This endpoint returns text which we will skim for specific text:

```
Package: keyman
Source: keyman-config (14.0.273-1)
Version: 14.0.273-1+focal1
```

*/

import httpget from "../../util/httpget";
import DataService from "../data-service";

// http://linux.lsdev.sil.org/ubuntu/dists/focal-experimental/main/binary-amd64/Packages
const HOST ='linux.lsdev.sil.org';
const PATH='/ubuntu/dists/focal-experimental/main/binary-amd64/Packages';

const service: DataService = {
   get: function() {
    return httpget(HOST, PATH).then((data) => {
      const results = data.data.match(/^Package: keyman\s*\nSource:\s*keyman-config \((\d+\.\d+\.\d+)-\d+\)/m);
      if(results) {
        return { version: results[1] };
      }

      return null;
    });
  }
};

export default service;

