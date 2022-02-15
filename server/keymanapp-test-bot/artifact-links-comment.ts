import { ProbotOctokit } from "probot";
import teamcityService from "../services/teamcity/teamcity";
import { statusData } from '../data/status-data';
import { artifactLinks } from '../../shared/artifact-links';

export async function getArtifactLinksComment(
  octokit: InstanceType<typeof ProbotOctokit>,
  data,
  pull) {
  // Only pull requests can have artifacts
  if(!pull) return '';
  const statuses = await octokit.rest.repos.getCombinedStatusForRef({...data, ref: pull.data.head.ref});
  //const statuses = await octokit.rest.repos.getCombinedStatusForRef({owner:'keymanapp',repo:'keyman',ref:'fix/web/5950-clear-timeout-on-longpress-flick'/*pull.data.head.ref*/});
  let s = {};
  statuses.data.statuses.forEach(status => {
    if(s[status.context]) return;
    let o = {
      context: status.context,
      url: status.target_url,
      state: status.state,
    };
    s[status.context] = o;
  });

  let r = '';
  let version = null;

  // Load version of the build from cached data or if necessary,
  // pull it from TeamCity

  version = findBuildVersion(s, statusData.cache.teamCity) ??
            findBuildVersion(s, (await teamcityService.get())[0]);
  if(version) version = /^(\d+\.\d+\.\d+)/.exec(version)?.[1];

  //console.log(version);
  //log(version);

  for(let context of Object.keys(s)) {
    if(s[context].state == 'success') {
      // artifactLinks
      const u = new URL(s[context].url);
      if (u.hostname == 'jenkins.lsdev.sil.org') {
        for (let download of artifactLinks.jenkinsTarget.downloads) {
          if (r == '') r = '\n## Test Artifacts\n\n';
          r += `* [${download.name}](${s[context].url}/${download.fragment})\n`;
        }
      } else if(u.searchParams.has('buildTypeId')) {
        // Assume TeamCity
        let buildTypeId = u.searchParams.get('buildTypeId');
        let buildId = u.searchParams.get('buildId');
        let t = artifactLinks.teamCityTargets[buildTypeId];
        if(t) {
          for(let download of t.downloads) {
            let fragment = download.fragment.replace(/\$version/g, version);
            if(r == '') r = '\n## Test Artifacts\n\n';
            r += `* [${download.name}](https://build.palaso.org/repository/download/${buildTypeId}/${buildId}:id/${fragment})\n`;
          }
        }
      }
    }
  }

  return r;
}

function findBuildVersion(s, teamCity) {
  for(let context of Object.keys(s)) {
    if(s[context].state == 'success') {
      // artifactLinks
      const u = new URL(s[context].url);
      if(u.searchParams.has('buildTypeId')) {
        // Assume TeamCity
        let buildTypeId = u.searchParams.get('buildTypeId');
        let buildId = u.searchParams.get('buildId');
        let version = getVersionFromTeamCityFromCache(buildTypeId, buildId, teamCity);
        if(version && version.toString().match(/^\d+\.\d+\.\d+/)) {
          return version;
        }
      }
    }
  }
  return null;
}

function getVersionFromTeamCityFromCache(buildTypeId, buildId, teamCity) {
  const build = teamCity?.[buildTypeId]?.builds?.find(e => e.id == buildId);
  return build?.number;
}
