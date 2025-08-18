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
import { StatusSource } from "../../shared/status-source.js";
import discourseService from "../services/discourse/discourse.js";
import { performanceLog } from "../performance-log.js";
import siteLivelinessService from "../services/keyman/site-liveliness.js";

import * as Sentry from '@sentry/node';

export type ContributionChanges = { issue: boolean, pull: boolean, review: boolean, test: boolean, post: boolean };

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
services[StatusSource.NpmKeymanCompiler] = kmcService;
services[StatusSource.NpmCommonTypes] = ctService;
services[StatusSource.CommunitySite] = discourseService;

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
};

async function logAsync(event, method: () => Promise<any>): Promise<any> {
  let dt = performance.now();
  let v;
  try {
    v = await method();
  } catch(e) {
    console.error(`Error connecting to ${event}: ${e}`);
    if(e.errors) {
      // AggregateErrors
      console.error(e.errors);
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

  refreshKeymanVersionData = async (): Promise<boolean> => {
    // console.log('[Refresh] Keyman Version ENTER');
    let keymanVersion;
    try {
      keymanVersion = await logAsync('refreshKeymanVersionData', () => versionService.get());
    } catch(e) {
      return false;
    }
    let result = !deepEqual(keymanVersion, this.cache.keymanVersion);
    this.cache.keymanVersion = keymanVersion;
    // console.log('[Refresh] Keyman Version EXIT');
    return result;
  };

  refreshTeamcityData = async (): Promise<boolean> => {
    // console.log('[Refresh] TeamCity ENTER');
    let data;
    try {
      data = await logAsync('refreshTeamcityData', () => teamcityService.get());
    } catch(e) {
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
    // console.log('[Refresh] TeamCity EXIT: '+result);
    return result;
  };

  refreshGitHubIssueData = async (repo: string, number: number): Promise<boolean> => {
    let issue;
    try {
      issue = await logAsync(`refreshGitHubIssueData(${repo}, ${number})`, () => githubIssueService.get(repo, number));
    } catch(e) {
      return false;
    }

    const idx = this.cache.issues.findIndex(i => i.number == issue.number);

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
    // console.log('[Refresh] GitHub Issues ENTER');
    let issues;
    try {
      issues = await logAsync('refreshGitHubIssuesData', () => githubIssuesService.get(null, []));
    } catch(e) {
      return false;
    }
    let result = !deepEqual(issues, this.cache.issues);
    this.cache.issues = issues;
    // console.log('[Refresh] GitHub Issues EXIT');
    return result;
  };

  // Warning: this currently returns TRUE if sprint dates have changed,
  // not if any data has changed. This is different to all the others
  refreshGitHubStatusData = async (sprintName): Promise<boolean> => {
    // console.log('[Refresh] GitHub Status ENTER');
    let data;
    try {
      data = await logAsync('refreshGitHubStatusData', () => githubStatusService.get(sprintName));
    } catch(e) {
      return false;
    }
    if(data == null) {
      console.log('[Refresh] GitHub Status EXIT -- null data');
      return false;
    }
    this.cache.sprints[sprintName].github = data.github;
    this.cache.sprints[sprintName].phase = data.phase;

    const result = this.cache.sprints[sprintName].adjustedStart !== data.adjustedStart;
    if(result) {
      this.cache.sprints[sprintName].adjustedStart = data.adjustedStart;
    }
    // console.log('[Refresh] GitHub Status EXIT');
    return result;
  };

  refreshGitHubContributionsData = async (sprintName: string, contributionChanges: ContributionChanges): Promise<boolean> => {
    // console.log('[Refresh] GitHub Contributions ENTER');
    const sprint = this.cache.sprints[sprintName];
    if(!sprint || !sprint.phase) return false;
    const sprintStartDateTime = sprint.phase ? new Date(sprint.adjustedStart).toISOString() : getSprintStart().toISOString();
    let contributions;
    try {
      // TODO: check other contributionChanges?
      contributions = await logAsync('refreshGitHubContributionsData', () => githubContributionsService.get(sprintStartDateTime));

      if(contributionChanges.test) {
        for(let node of contributions?.data?.repository?.contributions?.nodes) {
          node.contributions.tests = {nodes: await logAsync(`refreshGitHubContributionsTestsData(${node.login})`, () => githubTestContributionsService.get(null, [], sprintStartDateTime, node.login))};
        }
      } else {
        contributions.tests = sprint.contributions?.tests;
      }
    } catch(e) {
      return false;
    }

    let result = !deepEqual(contributions, sprint.contributions);
    sprint.contributions = contributions;
    // console.log('[Refresh] GitHub Contributions EXIT');
    return result;
  };

  refreshSentryIssuesData = async (): Promise<boolean> => {
    // console.log('[Refresh] Sentry ENTER');
    let sentryIssues;
    try {
      sentryIssues = await logAsync('refreshSentryIssuesData', () => sentryIssuesService.get());
    } catch(e) {
      return false;
    }
    let result = !deepEqual(sentryIssues, this.cache.sentryIssues);
    this.cache.sentryIssues = sentryIssues;
    // console.log('[Refresh] Sentry EXIT');
    return result;
  };

  refreshCodeOwnersData = async (): Promise<boolean> => {
    // console.log('[Refresh] CodeOwners ENTER');
    let codeOwners;
    try {
      codeOwners = await logAsync('refreshCodeOwnersData', () => codeOwnersService.get());
    } catch(e) {
      return false;
    }
    let result = !deepEqual(codeOwners, this.cache.codeOwners);
    this.cache.codeOwners = codeOwners;
    // console.log('[Refresh] CodeOwners EXIT');
    return result;
  };

  refreshSiteLivelinessData = async (): Promise<boolean> => {
    let siteLiveliness;
    try {
      siteLiveliness = await logAsync('refreshSiteLivelinessData', async () => await siteLivelinessService.get());
    } catch(e) {
      return false;
    }
    let result = !deepEqual(siteLiveliness, this.cache.siteLiveliness);
    this.cache.siteLiveliness = siteLiveliness;
    return result;
  };

  // Deployment endpoints

  refreshService = async (id: StatusSource, service: DataService): Promise<boolean> => {
    // console.log('[Refresh] '+id+' ENTER');
    let status;
    try {
      status = await logAsync(`refreshService:${id}`, () => service.get());
    } catch(e) {
      return false;
    }
    let result = !deepEqual(status, this.cache.deployment[id]);
    this.cache.deployment[id] = status;
    // console.log('[Refresh] '+id+' EXIT');
    return result;
  }

  refreshEndpointData = async (source: StatusSource): Promise<boolean> => {
    if(!services[source]) return Promise.resolve(false);
    return this.refreshService(source, services[source]);
  }

  // Discourse

  refreshCommunitySiteData = async (sprintName: string, user?: string): Promise<boolean> => {
    // console.log('[Refresh] Community-Site ENTER');

    const sprint = this.cache.sprints[sprintName];
    if(!sprint || !sprint.phase) {
      console.error(`[Refresh] Community-Site: invalid sprint ${JSON.stringify(sprint)}`);
      return false;
    }
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
    // console.log('[Refresh] Community-Site EXIT');
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
