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

  let statuses;
  try {
    statuses = await octokit.rest.repos.getCombinedStatusForRef({...data, ref: pull.data.head.ref});
  } catch(e) {
    console.log(e);
    return '';
  }
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

  let version = null;
  let buildData = null;

  // Load version of the build from cached data or if necessary,
  // pull it from TeamCity

  let teamCityData = statusData.cache.teamCity ?? (await teamcityService.get())[0];

  type LinkInfo = {
    platform: string;
    download: string;
    url: string;
    extra?: string
  };

  let links: {[key: string]: LinkInfo[]} = {};

  for(let context of Object.keys(s)) {
    if(s[context].state == 'success') {
      // artifactLinks
      let u;
      try {
        u = new URL(s[context].url);
      } catch(e) {
        continue;
      }
      if (u.hostname == 'jenkins.lsdev.sil.org') {
        for (let download of artifactLinks.jenkinsTarget.downloads) {
          if(!links['Linux']) links['Linux'] = [];
          links['Linux'].push({
            platform: 'Linux',
            download: download.name,
            url: `${s[context].url}/${download.fragment}`,
          });
        }
      } else if(u.searchParams.has('buildTypeId')) {
        // Assume TeamCity
        let buildTypeId = u.searchParams.get('buildTypeId');

        buildData = findBuildData(s, buildTypeId, teamCityData);

        if(buildData) version = findBuildVersion(buildData);
        if(version) version = /^(\d+\.\d+\.\d+)/.exec(version)?.[1];

        let buildId = u.searchParams.get('buildId');
        let t = artifactLinks.teamCityTargets[buildTypeId];
        if(t) {
          for(let download of t.downloads) {
            let fragment = download.fragment.replace(/\$version/g, version);
            // Special cases - Keyman Developer, Test Keyboards
            let platform =
              download.name == '**Keyman Developer**' ? 'Developer' :
              download.name == 'Test Keyboards' ? 'Keyboards' :
              t.name;
            if(!links[platform]) links[platform] = [];
            links[platform].push({
              platform: platform,
              download: download.name,
              url: `https://build.palaso.org/repository/download/${buildTypeId}/${buildId}:id/${fragment}`
            });
          }
          if(t.platform == 'ios') {
            // Special case note for TestFlight
            let buildCounter = buildData?.resultingProperties?.property?.find(prop => prop.name == 'build.counter')?.value;
            if(buildCounter) {
              links[t.name].push({
                platform: t.name,
                download: 'TestFlight internal PR build version',
                url: 'https://beta.itunes.apple.com/v1/app/933676545',
                extra: `\`${version} (0.${pull.data.number}.${buildCounter})\``
              });
            }
          }
        }
      }
    }
  }

  let platforms = Object.keys(links);
  if(platforms.length == 0)
    return '';
  platforms.sort((a,b) => a.localeCompare(b, 'en', {sensitivity: 'base'}));

  let r = '\n## Test Artifacts\n\n';
  platforms.forEach(platform => {
    let items = links[platform];
    items.sort((a:LinkInfo,b:LinkInfo) => a.download.localeCompare(b.download));
    r += `* **${platform}**\n` +
      items.map<string>(link => `  * [${link.download}](${link.url})` + (link.extra ? ` - ${link.extra}` : '')).
          join('\n') + '\n';
  });
  return r;
}

function findBuildData(s, buildTypeId, teamCity) {
  for(let context of Object.keys(s)) {
    if(s[context].state == 'success') {
      // artifactLinks
      const u = new URL(s[context].url);
      if(u.searchParams.has('buildTypeId')) {
        // Assume TeamCity
        if(u.searchParams.get('buildTypeId') == buildTypeId) {
          // let buildTypeId = u.searchParams.get('buildTypeId');
          let buildId = u.searchParams.get('buildId');
          let data = getBuildDataFromTeamCityFromCache(buildTypeId, buildId, teamCity);
          return data;
        }
      }
    }
  }
  return null;
}

function getBuildDataFromTeamCityFromCache(buildTypeId, buildId, teamCity) {
  const build = teamCity?.[buildTypeId]?.builds?.find(e => e.id == buildId);
  return build;
}

function findBuildVersion(data) {
  return data?.number;
}
