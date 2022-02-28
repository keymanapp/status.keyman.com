/*
 Service to collect CODEOWNERS from github
*/

import httpget from "../../util/httpget";
import { platforms } from "../../../shared/platforms";
import { environment, Environment } from "../../code";
import fs from "fs";

export default {
  get: function() {
    if(environment == Environment.Development) {
      return new Promise((resolve) => {
        let data = fs.readFileSync('test/CODEOWNERS', { encoding: 'utf-8' });
        return resolve(this.transform(data));
      });
    }
    return httpget('raw.githubusercontent.com', '/keymanapp/keyman/master/docs/CODEOWNERS').then(data => this.transform(data.data));
  },

  transform: function(data: string) {
    let owners = {};
    const lines = data.replace("\r", "").split("\n");
    for(let line of lines) {
      line = line.trim();
      if(line.startsWith('#') || line == '') {
        continue;
      }
      let values = /^\/([a-z]+)\/\s+@([_a-z0-9-]+)\s+@([_a-z0-9-]+)/i.exec(line);
      if(!values) {
        // Isn't a platform line
        continue;
      }

      for(let platform of platforms) {
        if(platform.id == values[1]) {
          owners[platform.id] = {
            owner: values[2],
            advocate: values[3]
          }
        }
      }
    }
    return owners;
  }
};