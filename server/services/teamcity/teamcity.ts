/*
 Service to collect stats from downloads.keyman.com
*/

import httpget from "../../util/httpget.js";

const teamcity_token=process.env['KEYMANSTATUS_TEAMCITY_TOKEN'];

function getTeamCity(api: string) {
  return httpget('build.palaso.org', api, { Authorization: ` Bearer ${teamcity_token}`, Accept: 'application/json' });
}

function transformTeamCityResponse(data) {
  let t = data;
  t.buildType.forEach((value) => {
    data[value.id] = value;
    // Remove a level of indirection
    value.builds = value.builds ? value.builds.build : null;
  });

  data.buildType = {};
  return data;
}

export default {
  get: function() {
    return Promise.all([
      getTeamCity(  //0 - cache.teamCity
        '/app/rest/buildTypes?locator=affectedProject:(id:Keyman)&fields=buildType(id,name,builds($locator(canceled:false,branch:default:any),'+
          'build(id,number,branchName,status,statusText,properties($locator(name:env.KEYMAN_BUILD_LEVEL),property(name,value)),resultingProperties($locator(name:build.counter),property(name,value)))))'
      ).then(data => transformTeamCityResponse(JSON.parse(data.data))),

      getTeamCity(  //1 - cache.teamCityRunning
        '/app/rest/buildTypes?locator=affectedProject:(id:Keyman)&fields=buildType(id,name,builds($locator(running:true,canceled:false,branch:default:any),'+
          'build(id,number,branchName,status,statusText)))'
      ).then(data => transformTeamCityResponse(JSON.parse(data.data))),

      getTeamCity(  //2 - cache.teamCityAgents
        '/app/rest/agents?fields=agent(id,name,connected,enabled,idleSinceTime,build,webUrl)&locator=pool:(name:Keyman)'
      ).then(data => JSON.parse(data.data).agent),

      getTeamCity(  //3 - cache.teamCityQueue
        '/app/rest/buildQueue?locator=pool:(name:Keyman)&fields=build(id,buildTypeId,number,branchName,webUrl,status)'
      ).then(data => JSON.parse(data.data).build),
    ]);
  },
}
