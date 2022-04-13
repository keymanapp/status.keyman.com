/*
 Service to collect stats from downloads.keyman.com
*/

import httpget from "../../util/httpget";

const teamcity_token=process.env['KEYMANSTATUS_TEAMCITY_TOKEN'];

export default {
   get: function() {
    return Promise.all([
      httpget(  //0
        'build.palaso.org',
        '/app/rest/buildTypes?locator=affectedProject:(id:Keyman)&fields=buildType(id,name,builds($locator(canceled:false,branch:default:any),'+
          'build(id,number,branchName,status,statusText,resultingProperties($locator(name:build.counter),property(name,value)))))',
        {
          Authorization: ` Bearer ${teamcity_token}`,
          Accept: 'application/json'
        }
      ).then(data => this.transformTeamCityResponse(JSON.parse(data.data))),

      httpget(  //1
        'build.palaso.org',
        '/app/rest/buildTypes?locator=affectedProject:(id:Keyman)&fields=buildType(id,name,builds($locator(running:true,canceled:false,branch:default:any),'+
          'build(id,number,branchName,status,statusText)))',
        {
          Authorization: ` Bearer ${teamcity_token}`,
          Accept: 'application/json'
        }
      ).then(data => this.transformTeamCityResponse(JSON.parse(data.data)))
    ]);
  },

  transformTeamCityResponse: function (data) {
    let t = data;
    t.buildType.forEach((value) => {
      data[value.id] = value;
      // Remove a level of indirection
      value.builds = value.builds ? value.builds.build : null;
    });

    data.buildType = {};
    return data;
  }
}
