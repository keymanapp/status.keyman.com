import { ProbotOctokit } from "probot";

import teamcityService from "../services/teamcity/teamcity.js";
import { statusData } from '../data/status-data.js';
import { artifactLinks } from '../../shared/artifact-links.js';
import { getTeamcityUrlParams } from "../../shared/getTeamcityUrlParams.js";

export async function getArtifactLinksComment(
  octokit: InstanceType<typeof ProbotOctokit>,
  data,
  pull) {
  // Only pull requests can have artifacts
  if(!pull) {
    console.error('[@keymanapp-test-bot] getArtifactLinksComment: pull is nullish')
    return '';
  }

  let statuses;
  try {
    statuses = await octokit.rest.repos.getCombinedStatusForRef({...data, ref: pull.data.head.ref});
  } catch(e) {
    console.error(`[@keymanapp-test-bot] ${e}`);
    return '';
  }
  //const statuses = await octokit.rest.repos.getCombinedStatusForRef({owner:'keymanapp',repo:'keyman',ref:'fix/web/5950-clear-timeout-on-longpress-flick'/*pull.data.head.ref*/});
  let s: {[index:string]: {context:string, target_url:string, state:string}} = {};
  statuses.data.statuses.forEach(status => {
    if(s[status.context]) return;
    let o = {
      context: status.context,
      target_url: status.target_url,
      state: status.state,
    };
    s[status.context] = o;
  });

  let version = null;
  let buildData = null;

  // Load version of the build from cached data or if necessary,
  // pull it from TeamCity

  let teamCityData = statusData.cache.teamCity;
  let teamCityDataFromCache = !!teamCityData;
  if(!teamCityDataFromCache) {
    teamCityData = (await teamcityService.get())[0];
   }

  type LinkInfo = {
    state: string;
    platform: string;
    download: string;
    url: string;
    extra?: string
  };

  let links: {[key: string]: LinkInfo[]} = {};

  for(let context of Object.keys(s)) {
    // artifactLinks
    let u;
    if(!s[context].target_url) {
      console.warn(`[@keymanapp-test-bot] skipping ${s[context].context}`);
      continue;
    }
    try {
      u = new URL(s[context].target_url);
    } catch(e) {
      console.error(`[@keymanapp-test-bot] ${e}`);
      continue;
    }
    if (context == 'Debian Packaging') {
      // https://github.com/keymanapp/keyman/actions/runs/4294449810
      const matches = s[context].target_url.match(/.+\/runs\/(\d+)/);
      if (!matches) {
        console.error(`[@keymanapp-test-bot] Can't find workflow run in url ${s[context].target_url}`);
        return '';
      }
      const run_id = matches[1];
      try {
        const run = await octokit.rest.actions.getWorkflowRun({...data, run_id});
        const artifacts = await octokit.rest.actions.listWorkflowRunArtifacts({ ...data, run_id });
        for (const artifact of artifacts.data.artifacts) {
          if (!artifact.name.startsWith('keyman-binarypkgs')) {
            continue;
          }
          // "keyman-binarypkgs-focal_amd64"
          const distroMatches = artifact.name.match(/keyman-binarypkgs-(.+)_amd64/);
          if (!distroMatches) {
            console.error(`[@keymanapp-test-bot] Can't find distribution in artifact name ${artifact.name}`);
            return '';
          }
          if (!links['Linux']) links['Linux'] = [];
          links['Linux'].push({
            state: s[context].state,
            platform: 'Linux',
            download: `**Keyman for Linux**: ${distroMatches[1]}`,
            url: `https://github.com/keymanapp/keyman/suites/${run.data.check_suite_id}/artifacts/${artifact.id}`
          });
        }
      } catch (e) {
        console.error(`[@keymanapp-test-bot] ${e}`);
        return '';
      }
    } else if(u.searchParams.has('buildTypeId') || u.pathname.match(/\/buildConfiguration\//)) {
      const { buildTypeId, buildId } = getTeamcityUrlParams(u);
      console.log(`[@keymanapp-test-bot] Finding TeamCity build data for build ${buildTypeId}:${buildId}`)

      buildData = findBuildData(s, buildTypeId, teamCityData);

      if(buildData) version = findBuildVersion(buildData);
      if(version) version = /^(\d+\.\d+\.\d+)/.exec(version)?.[1];
      if(!version) {
        if(teamCityDataFromCache) {
          // retry reload, but only once
          console.log(`[@keymanapp-test-bot] Attempting reload of TeamCity data instead of using cache`);
          teamCityDataFromCache = false;
          teamCityData = (await teamcityService.get())[0];
          buildData = findBuildData(s, buildTypeId, teamCityData);

          if(buildData) version = findBuildVersion(buildData);
          if(version) version = /^(\d+\.\d+\.\d+)/.exec(version)?.[1];
        }
        if(!version) {
          console.error(`[@keymanapp-test-bot] Failed to find version information for artifact links; buildData: ${JSON.stringify(buildData)}`);
          continue;
        }
      }
      if(version) {
        console.log(`[@keymanapp-test-bot] Found version data for ${buildTypeId}:${buildId}:${version}`)
      }

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
          let buildLevel = buildData?.properties?.property?.find(prop => prop.name == 'env.KEYMAN_BUILD_LEVEL')?.value;
          if(buildLevel != 'build') {
            links[platform].push({
              state: s[context].state,
              platform: platform,
              download: download.name,
              url: `https://build.palaso.org/repository/download/${buildTypeId}/${buildId}:id/${fragment}`
            });
          }
        }
        if(t.platform == 'ios') {
          // Special case note for TestFlight
          let buildCounter = buildData?.resultingProperties?.property?.find(prop => prop.name == 'build.counter')?.value;
          if(buildCounter) {
            links[t.name].push({
              state: s[context].state,
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

  let platforms = Object.keys(links);
  if(platforms.length == 0)
    return '';
  platforms.sort((a,b) => a.localeCompare(b, 'en', {sensitivity: 'base'}));

  let r = '\n## Test Artifacts\n\n';
  platforms.forEach(platform => {
    let items = links[platform];
    items.sort((a:LinkInfo,b:LinkInfo) => a.download.localeCompare(b.download));
    r += `* **${platform}**\n` +
      items.map<string>(link =>
        (link.state == 'success'
          ? `  * [${link.download}](${link.url})`
          : `  * ${link.download} - build ${link.state}`)
        + (link.extra ? ` - ${link.extra}` : '')
      ).join('\n') + '\n';
  });
  return r;
}

function findBuildData(s, buildTypeId, teamCity) {
  for(let context of Object.keys(s)) {
    if(s[context].state == 'success') {
      // artifactLinks
      let u;
      try {
        u = new URL(s[context].url);
      } catch(e) {
        continue;
      }
      const up = getTeamcityUrlParams(u);
      // Assume TeamCity
      if(up.buildTypeId == buildTypeId) {
        let data = getBuildDataFromTeamCityFromCache(buildTypeId, up.buildId, teamCity);
        return data;
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
