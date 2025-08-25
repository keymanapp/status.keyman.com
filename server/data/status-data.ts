import { performance } from 'node:perf_hooks';

import deepEqual from "deep-equal";

import versionService from "../services/downloads.keyman.com/version.js";
import teamcityService from "../services/teamcity/teamcity.js";
import githubStatusService from "../services/github/github-status.js";
import githubIssuesService from "../services/github/github-issues.js";
import githubIssueService, { KSGitHubIssue } from "../services/github/github-issue.js";
import githubContributionsService from "../services/github/github-contributions.js";
import githubTestContributionsService from "../services/github/github-test-contributions.js";
import sentryIssuesService from "../services/sentry/sentry-issues.js";
import codeOwnersService from "../services/github/code-owners.js";
import DataService from "../services/data-service.js";
import { keymaniTunesService, firstVoicesiTunesService } from "../services/deployment/itunes.js";
import { keymanPlayStoreService, firstVoicesPlayStoreService } from "../services/deployment/play-store.js";
import sKeymanComService from "../services/deployment/s-keyman-com.js";
import { launchPadAlphaService, launchPadBetaService, launchPadStableService } from "../services/deployment/launch-pad.js";
import packagesSilOrgService from "../services/deployment/packages-sil-org.js";
import { linuxLsdevSilOrgAlphaService, linuxLsdevSilOrgBetaService, linuxLsdevSilOrgStableService } from "../services/deployment/linux-lsdev-sil-org.js";
import { debianBetaService, debianStableService } from "../services/deployment/debian.js";
import { kmcService, ctService } from "../services/deployment/npmjs.js";
import { ServiceStateCache, ServiceState, ServiceIdentifier } from "../../shared/services.js";
import discourseService from "../services/discourse/discourse.js";
import { performanceLog } from "../performance-log.js";
import siteLivelinessService from "../services/keyman/site-liveliness.js";
import { consoleError, consoleLog } from '../util/console-log.js';

export type ContributionChanges = { issue: boolean, pull: boolean, review: boolean, test: boolean, post: boolean };

const services: {[index in ServiceIdentifier]?: any} = {};
services[ServiceIdentifier.ITunesKeyman] = keymaniTunesService;
services[ServiceIdentifier.ITunesFirstVoices] = firstVoicesiTunesService;
services[ServiceIdentifier.PlayStoreKeyman] = keymanPlayStoreService;
services[ServiceIdentifier.PlayStoreFirstVoices] = firstVoicesPlayStoreService;
services[ServiceIdentifier.SKeymanCom] = sKeymanComService;
services[ServiceIdentifier.LaunchPadAlpha] = launchPadAlphaService;
services[ServiceIdentifier.LaunchPadBeta] = launchPadBetaService;
services[ServiceIdentifier.LaunchPadStable] = launchPadStableService;
services[ServiceIdentifier.PackagesSilOrg] = packagesSilOrgService;
services[ServiceIdentifier.LinuxLsdevSilOrgAlpha] = linuxLsdevSilOrgAlphaService;
services[ServiceIdentifier.LinuxLsdevSilOrgBeta] = linuxLsdevSilOrgBetaService;
services[ServiceIdentifier.LinuxLsdevSilOrgStable] = linuxLsdevSilOrgStableService;
services[ServiceIdentifier.DebianBeta] = debianBetaService;
services[ServiceIdentifier.DebianStable] = debianStableService;
services[ServiceIdentifier.NpmKeymanCompiler] = kmcService;
services[ServiceIdentifier.NpmCommonTypes] = ctService;
services[ServiceIdentifier.CommunitySite] = discourseService;

export interface StatusDataCache {
  teamCity?: any;
  teamCityRunning?: any;
  teamCityAgents?: any;
  teamCityQueue?: any;
  keymanVersion?: any;
  issues?: KSGitHubIssue[];
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
  siteLiveliness?: any;
  communitySite?: any;

  serviceState?: ServiceStateCache;
};

async function logAsync(event, method: () => Promise<any>): Promise<any> {
  let dt = performance.now();
  let v;
  try {
    v = await method();
  } catch(e) {
    consoleError('refresh', event, `Error connecting to ${event}: ${e}`);
    if(e.errors) {
      // AggregateErrors
      consoleError('refresh', event, e.errors);
    }
    throw e;
  }
  performanceLog(dt, event);
  return v;
}

export class StatusData {
  cache: StatusDataCache;

  constructor() {
    this.cache = { sprints: { current: { } }, deployment: { } };
  };

  //
  public onServiceStateChanged: (serviceStateCache: ServiceStateCache) => void;

  private setServiceState(service: ServiceIdentifier, state: ServiceState, message?: any) {
    if(!this.cache.serviceState) this.cache.serviceState = {};
    const newState = { state, message };
    if(this.cache.serviceState[service] != newState) {
      this.cache.serviceState[service] = {
        state,
        // for now, limit errors to first 100 chars, hopefully enough to get a bit of an idea
        message: message === undefined
          ? undefined
          : (typeof message == 'string' ? message : JSON.stringify(message)).substring(0, 100)
      };
      this.onServiceStateChanged?.(this.cache.serviceState);
    }
  }

  refreshKeymanVersionData = async (): Promise<boolean> => {
    let keymanVersion;
    this.setServiceState(ServiceIdentifier.Keyman, ServiceState.loading);
    try {
      keymanVersion = await logAsync('refreshKeymanVersionData', () => versionService.get());
    } catch(e) {
      this.setServiceState(ServiceIdentifier.Keyman, ServiceState.error, e);
      return false;
    }
    let result = !deepEqual(keymanVersion, this.cache.keymanVersion);
    this.cache.keymanVersion = keymanVersion;
    this.setServiceState(ServiceIdentifier.Keyman, ServiceState.successful);
    return result;
  };

  refreshTeamcityData = async (): Promise<boolean> => {
    let data;
    this.setServiceState(ServiceIdentifier.TeamCity, ServiceState.loading);
    try {
      data = await logAsync('refreshTeamcityData', () => teamcityService.get());
    } catch(e) {
      this.setServiceState(ServiceIdentifier.TeamCity, ServiceState.error, e);
      return false;
    }
    let result =
      !deepEqual(data[0], this.cache.teamCity) ||
      !deepEqual(data[1], this.cache.teamCityRunning) ||
      !deepEqual(data[2], this.cache.teamCityAgents) ||
      !deepEqual(data[3], this.cache.teamCityQueue);
    this.cache.teamCity = data[0];
    this.cache.teamCityRunning = data[1];
    this.cache.teamCityAgents = data[2];
    this.cache.teamCityQueue = data[3];
    this.setServiceState(ServiceIdentifier.TeamCity, ServiceState.successful);
    return result;
  };

  refreshGitHubIssueData = async (repo: string, number: number): Promise<boolean> => {
    let issue;
      // this.setServiceStatus(StatusSource.Keyman, ServiceStatusState.loading);
    try {
      issue = await logAsync(`refreshGitHubIssueData(${repo}, ${number})`, () => githubIssueService.get(repo, number));
    } catch(e) {
      return false;
    }

    const idx = this.cache.issues.findIndex(i => i.number == issue.number);

    // this.setServiceStatus(StatusSource.Keyman, ServiceStatusState.successful);

    if(issue.state == 'CLOSED' && idx >= 0) {
      // issue has been closed, remove from cache
      this.cache.issues.splice(idx, 1);
      return true;
    }

    if(issue.state == 'CLOSED') {
      // issue is closed but not in cache, no need to refresh
      return false;
    }

    if(idx < 0) {
      // issue is not in the cache, add it
      this.cache.issues.push(issue);
      return true;
    }

    if(deepEqual(issue, this.cache.issues[idx])) {
      // issue is in cache, but has no visible changes
      return false;
    }

    // replace existing issue in cache
    this.cache.issues[idx] = issue;
    return true;
  };

  refreshGitHubIssuesData = async (): Promise<boolean> => {
    let issues;
    this.setServiceState(ServiceIdentifier.GitHubIssues, ServiceState.loading);
    try {
      issues = await logAsync('refreshGitHubIssuesData', () => githubIssuesService.get(null, []));
    } catch(e) {
      this.setServiceState(ServiceIdentifier.GitHubIssues, ServiceState.error, e);
      return false;
    }
    let result = !deepEqual(issues, this.cache.issues);
    this.cache.issues = issues;
    this.setServiceState(ServiceIdentifier.GitHubIssues, ServiceState.successful);
    return result;
  };

  // Warning: this currently returns TRUE if sprint dates have changed,
  // not if any data has changed. This is different to all the others
  refreshGitHubStatusData = async (sprintName): Promise<boolean> => {
    let data;
    this.setServiceState(ServiceIdentifier.GitHub, ServiceState.loading);
    try {
      data = await logAsync('refreshGitHubStatusData', () => githubStatusService.get(sprintName));
    } catch(e) {
      this.setServiceState(ServiceIdentifier.GitHub, ServiceState.error, e);
      return false;
    }
    if(data == null) {
      consoleLog('refresh', 'github', 'EXIT ERROR: unexpected null data');
      this.setServiceState(ServiceIdentifier.GitHub, ServiceState.error, 'null data');
      return false;
    }
    this.cache.sprints[sprintName].github = data.github;
    this.cache.sprints[sprintName].phase = data.phase;

    const result = this.cache.sprints[sprintName].adjustedStart !== data.adjustedStart;
    if(result) {
      this.cache.sprints[sprintName].adjustedStart = data.adjustedStart;
    }
    this.setServiceState(ServiceIdentifier.GitHub, ServiceState.successful);
    return result;
  };

  refreshGitHubContributionsData = async (sprintName: string, contributionChanges: ContributionChanges): Promise<boolean> => {
    const sprint = this.cache.sprints[sprintName];
    if(!sprint || !sprint.phase) return false;
    this.setServiceState(ServiceIdentifier.GitHubContributions, ServiceState.loading);
    const sprintStartDateTime = sprint.phase ? new Date(sprint.adjustedStart).toISOString() : getSprintStart().toISOString();
    let contributions;
    try {
      // TODO: check other contributionChanges?
      contributions = await logAsync('refreshGitHubContributionsData', () => githubContributionsService.get(sprintStartDateTime));

      for(let node of contributions?.data?.repository?.contributions?.nodes) {
          const cachedNode = sprint.contributions?.data?.repository?.
              contributions?.nodes?.find(n => n.login == node.login);
          if(contributionChanges.test || !cachedNode?.contributions?.tests) {
            node.contributions.tests = {nodes: await logAsync(`refreshGitHubContributionsTestsData(${node.login})`, () => githubTestContributionsService.get(null, [], sprintStartDateTime, node.login))};
          } else {
            node.contributions.tests = cachedNode.contributions.tests;
        }
      }
    } catch(e) {
      this.setServiceState(ServiceIdentifier.GitHubContributions, ServiceState.error, e);
      return false;
    }

    let result = !deepEqual(contributions, sprint.contributions);
    sprint.contributions = contributions;
    this.setServiceState(ServiceIdentifier.GitHubContributions, ServiceState.successful);
    return result;
  };

  refreshSentryIssuesData = async (): Promise<boolean> => {
    let sentryIssues;
    this.setServiceState(ServiceIdentifier.SentryIssues, ServiceState.loading);
    try {
      sentryIssues = await logAsync('refreshSentryIssuesData', () => sentryIssuesService.get());
    } catch(e) {
      this.setServiceState(ServiceIdentifier.SentryIssues, ServiceState.error, e);
      return false;
    }
    let result = !deepEqual(sentryIssues, this.cache.sentryIssues);
    this.cache.sentryIssues = sentryIssues;
    this.setServiceState(ServiceIdentifier.SentryIssues, ServiceState.successful);
    return result;
  };

  refreshCodeOwnersData = async (): Promise<boolean> => {
    let codeOwners;
    this.setServiceState(ServiceIdentifier.CodeOwners, ServiceState.loading);
    try {
      codeOwners = await logAsync('refreshCodeOwnersData', () => codeOwnersService.get());
    } catch(e) {
      this.setServiceState(ServiceIdentifier.CodeOwners, ServiceState.error, e);
      return false;
    }
    let result = !deepEqual(codeOwners, this.cache.codeOwners);
    this.cache.codeOwners = codeOwners;
    this.setServiceState(ServiceIdentifier.CodeOwners, ServiceState.successful);
    return result;
  };

  refreshSiteLivelinessData = async (): Promise<boolean> => {
    let siteLiveliness;
    this.setServiceState(ServiceIdentifier.SiteLiveliness, ServiceState.loading);
    try {
      siteLiveliness = await logAsync('refreshSiteLivelinessData', async () => await siteLivelinessService.get());
    } catch(e) {
      this.setServiceState(ServiceIdentifier.SiteLiveliness, ServiceState.error, e);
      return false;
    }
    let result = !deepEqual(siteLiveliness, this.cache.siteLiveliness);
    this.cache.siteLiveliness = siteLiveliness;
    this.setServiceState(ServiceIdentifier.SiteLiveliness, ServiceState.successful);
    return result;
  };

  // Deployment endpoints

  refreshService = async (id: ServiceIdentifier, service: DataService): Promise<boolean> => {
    // console.log('[Refresh] '+id+' ENTER');
    let status;
    this.setServiceState(id, ServiceState.loading);
    try {
      status = await logAsync(`refreshService:${id}`, () => service.get());
    } catch(e) {
      this.setServiceState(id, ServiceState.error, e);
      return false;
    }
    let result = !deepEqual(status, this.cache.deployment[id]);
    this.cache.deployment[id] = status;
    this.setServiceState(id, ServiceState.successful);
    return result;
  }

  refreshEndpointData = async (source: ServiceIdentifier): Promise<boolean> => {
    if(!services[source]) return Promise.resolve(false);
    return this.refreshService(source, services[source]);
  }

  // Discourse

  refreshCommunitySiteData = async (sprintName: string, user?: string): Promise<boolean> => {
    const sprint = this.cache.sprints[sprintName];
    if(!sprint || !sprint.phase) {
      consoleError('refresh', 'community-site', `invalid sprint ${JSON.stringify(sprint)}`);
      return false;
    }

    this.setServiceState(ServiceIdentifier.CommunitySite, ServiceState.loading);

    const sprintStartDateTime = sprint.phase ? new Date(sprint.adjustedStart) : getSprintStart();

    if(!this.cache.communitySite) {
      // If we get a webhook notification for a user before
      // the first load, then refresh all users anyway
      user = undefined;
    }

    let posts;
    try {
      if(user) {
        posts = await logAsync('refreshCommunitySiteData', () => discourseService.getUser(sprintStartDateTime, user));
      } else {
        posts = await logAsync('refreshCommunitySiteData', () => discourseService.get(sprintStartDateTime));
      }
    } catch(e) {
      this.setServiceState(ServiceIdentifier.CommunitySite, ServiceState.error, e);
      return false;
    }

    let result;
    if(user) {
      result = !deepEqual(posts, this.cache.communitySite.contributions[user]);
      this.cache.communitySite.contributions[user] = posts;
    } else {
      result = !deepEqual(posts, this.cache.communitySite);
      this.cache.communitySite = posts;
    }

    this.setServiceState(ServiceIdentifier.CommunitySite, ServiceState.successful);

    return result;
  };

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
