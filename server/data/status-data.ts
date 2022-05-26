
import versionService from "../services/downloads.keyman.com/version";
import teamcityService from "../services/teamcity/teamcity";
import githubStatusService from "../services/github/github-status";
import githubIssuesService from "../services/github/github-issues";
import githubContributionsService from "../services/github/github-contributions";
import githubTestContributionsService from "../services/github/github-test-contributions";
import sentryIssuesService from "../services/sentry/sentry-issues";
import codeOwnersService from "../services/github/code-owners";
import deepEqual from "deep-equal";
import DataService from "../services/data-service";
import { keymaniTunesService, firstVoicesiTunesService } from "../services/deployment/itunes";
import { keymanPlayStoreService, firstVoicesPlayStoreService } from "../services/deployment/play-store";
import sKeymanComService from "../services/deployment/s-keyman-com";
import { launchPadAlphaService, launchPadBetaService, launchPadStableService } from "../services/deployment/launch-pad";
import packagesSilOrgService from "../services/deployment/packages-sil-org";
import { linuxLsdevSilOrgAlphaService, linuxLsdevSilOrgBetaService, linuxLsdevSilOrgStableService } from "../services/deployment/linux-lsdev-sil-org";
import { debianBetaService, debianStableService } from "../services/deployment/debian";
import { lmcService, mtService } from "../services/deployment/npmjs";
import { StatusSource } from "../../shared/status-source";

const services = {};
services[StatusSource.ITunesKeyman] = keymaniTunesService;
services[StatusSource.ITunesFirstVoices] = firstVoicesiTunesService;
services[StatusSource.PlayStoreKeyman] = keymanPlayStoreService;
services[StatusSource.PlayStoreFirstVoices] = firstVoicesPlayStoreService;
services[StatusSource.SKeymanCom] = sKeymanComService;
services[StatusSource.LaunchPadAlpha] = launchPadAlphaService;
services[StatusSource.LaunchPadBeta] = launchPadBetaService;
services[StatusSource.LaunchPadStable] = launchPadStableService;
services[StatusSource.PackagesSilOrg] = packagesSilOrgService;
services[StatusSource.LinuxLsdevSilOrgAlpha] = linuxLsdevSilOrgAlphaService;
services[StatusSource.LinuxLsdevSilOrgBeta] = linuxLsdevSilOrgBetaService;
services[StatusSource.LinuxLsdevSilOrgStable] = linuxLsdevSilOrgStableService;
services[StatusSource.DebianBeta] = debianBetaService;
services[StatusSource.DebianStable] = debianStableService;
services[StatusSource.NpmLexicalModelCompiler] = lmcService;
services[StatusSource.NpmModelsTypes] = mtService;

export interface StatusDataCache {
  teamCity?: any;
  teamCityRunning?: any;
  keymanVersion?: any;
  issues?: any;
  sentryIssues?: any;
  sprints: {
    current: {
      github?: any;
      contributions?: any;
      currentSprint?: any;
    };
  };
  deployment: {};
  codeOwners?: {};
};

export class StatusData {
  cache: StatusDataCache;

  constructor() {
    this.cache = { sprints: { current: { } }, deployment: { } };
  };

  refreshKeymanVersionData = async (): Promise<boolean> => {
    console.log('[Refresh] Keyman Version ENTER');
    let keymanVersion;
    try {
      keymanVersion = await versionService.get();
    } catch(e) {
      console.log(e);
      return false;
    }
    let result = !deepEqual(keymanVersion, this.cache.keymanVersion);
    this.cache.keymanVersion = keymanVersion;
    console.log('[Refresh] Keyman Version EXIT');
    return result;
  };

  refreshTeamcityData = async (): Promise<boolean> => {
    console.log('[Refresh] TeamCity ENTER');
    let data;
    try {
      data = await teamcityService.get();
    } catch(e) {
      console.log(e);
      return false;
    }
    let result =
      !deepEqual(data[0], this.cache.teamCity) ||
      !deepEqual(data[1], this.cache.teamCityRunning);
    this.cache.teamCity = data[0];
    this.cache.teamCityRunning = data[1];
    console.log('[Refresh] TeamCity EXIT');
    return result;
  };

  refreshGitHubIssuesData = async (): Promise<boolean> => {
    console.log('[Refresh] GitHub Issues ENTER');
    let issues;
    try {
      issues = await githubIssuesService.get(null, []);
    } catch(e) {
      console.log(e);
      return false;
    }
    let result = !deepEqual(issues, this.cache.issues);
    this.cache.issues = issues;
    console.log('[Refresh] GitHub Issues EXIT');
    return result;
  };

  // Warning: this currently returns TRUE if sprint dates have changed,
  // not if any data has changed. This is different to all the others
  refreshGitHubStatusData = async (sprintName): Promise<boolean> => {
    console.log('[Refresh] GitHub Status ENTER');
    let data;
    try {
      data = await githubStatusService.get(sprintName);
    } catch(e) {
      console.log(e);
      return false;
    }
    this.cache.sprints[sprintName].github = data.github;
    this.cache.sprints[sprintName].phase = data.phase;

    const result = this.cache.sprints[sprintName].adjustedStart !== data.adjustedStart;
    if(result) {
      this.cache.sprints[sprintName].adjustedStart = data.adjustedStart;
    }
    console.log('[Refresh] GitHub Status EXIT');
    return result;
  };

  refreshGitHubContributionsData = async (sprintName): Promise<boolean> => {
    console.log('[Refresh] GitHub Contributions ENTER');
    const sprint = this.cache.sprints[sprintName];
    if(!sprint || !sprint.phase) return false;
    const sprintStartDateTime = sprint.phase ? new Date(sprint.adjustedStart).toISOString() : getSprintStart().toISOString();
    let contributions;
    try {
      contributions = await githubContributionsService.get(sprintStartDateTime);

      for(let node of contributions?.data?.repository?.contributions?.nodes) {
        node.contributions.tests = {nodes: await githubTestContributionsService.get(null, [], getSprintStart(), node.login)};
      }
    } catch(e) {
      console.log(e);
      return false;
    }

    let result = !deepEqual(contributions, sprint.contributions);
    sprint.contributions = contributions;
    console.log('[Refresh] GitHub Contributions EXIT');
    return result;
  };

  refreshSentryIssuesData = async (): Promise<boolean> => {
    console.log('[Refresh] Sentry ENTER');
    let sentryIssues;
    try {
      sentryIssues = await sentryIssuesService.get();
    } catch(e) {
      console.log(e);
      return false;
    }
    let result = !deepEqual(sentryIssues, this.cache.sentryIssues);
    this.cache.sentryIssues = sentryIssues;
    console.log('[Refresh] Sentry EXIT');
    return result;
  };

  refreshCodeOwnersData = async (): Promise<boolean> => {
    console.log('[Refresh] CodeOwners ENTER');
    let codeOwners;
    try {
      codeOwners = await codeOwnersService.get();
    } catch(e) {
      console.log(e);
      return false;
    }
    let result = !deepEqual(codeOwners, this.cache.codeOwners);
    this.cache.codeOwners = codeOwners;
    console.log('[Refresh] CodeOwners EXIT');
    return result;
  };

  // Deployment endpoints

  refreshService = async (id: StatusSource, service: DataService): Promise<boolean> => {
    console.log('[Refresh] '+id+' ENTER');
    let status;
    try {
      status = await service.get();
    } catch(e) {
      console.log(e);
      return false;
    }
    let result = !deepEqual(status, this.cache.deployment[id]);
    this.cache.deployment[id] = status;
    console.log('[Refresh] '+id+' EXIT');
    return result;
  }

  refreshEndpointData = async (source: StatusSource): Promise<boolean> => {
    if(!services[source]) return Promise.resolve(false);
    return this.refreshService(source, services[source]);
  }
};

export const statusData = new StatusData();

function getSprintStart() {
  // Get the start of sprint. Messy but probably works okay for now
  let Current = new Date();
  Current.setUTCHours(0);
  Current.setUTCMinutes(0);
  Current.setUTCSeconds(0);
  Current.setUTCMilliseconds(0);
  let diff = Current.getDate() -  Current.getDay();
  let StartOfWeek = new Date(Current.setDate(diff));
  //console.log("StartOfWeek: "+StartOfWeek.toDateString());
  let sec = (StartOfWeek.getTime() - Date.UTC(2019, 9, 6)) / 1000;
  //console.log(StartOfWeek.getTime());
  //console.log(Date.UTC(2019, 9, 6));
  let days = sec / 60 / 60 / 24;
  //console.log(days % 14);
  if(days % 14 > 6)
    StartOfWeek.setDate(StartOfWeek.getDate() - 7);

  return StartOfWeek;
}
