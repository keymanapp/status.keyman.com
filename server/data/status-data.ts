
import versionService from "../services/downloads.keyman.com/version";
import teamcityService from "../services/teamcity/teamcity";
import githubStatusService from "../services/github/github-status";
import githubIssuesService from "../services/github/github-issues";
import githubContributionsService from "../services/github/github-contributions";
import sentryService from "../services/sentry/sentry";
import deepEqual from "deep-equal";

export interface StatusDataCache {
  teamCity?: any;
  teamCityRunning?: any;
  keymanVersion?: any;
  issues?: any;
  sprints: {
    current: {
      github?: any;
      contributions?: any;
      currentSprint?: any;
      sentry?: any;
    };
  };
};

export class StatusData {
  cache: StatusDataCache;

  constructor() {
    this.cache = { sprints: { current: { } } };
  };

  refreshKeymanVersionData = async (): Promise<boolean> => {
    console.log('refreshKeymanVersion starting');
    let keymanVersion = await versionService.get();
    let result = !deepEqual(keymanVersion, this.cache.keymanVersion);
    this.cache.keymanVersion = keymanVersion;
    console.log('refreshKeymanVersion finished');
    return result;
  };

  refreshTeamcityData = async (): Promise<boolean> => {
    console.log('refreshTeamcityData starting');
    const data = await teamcityService.get();
    let result =
      !deepEqual(data[0], this.cache.teamCity) ||
      !deepEqual(data[1], this.cache.teamCityRunning);
    this.cache.teamCity = data[0];
    this.cache.teamCityRunning = data[1];
    console.log('refreshTeamcityData finished');
    return result;
  };

  refreshGitHubIssuesData = async (): Promise<boolean> => {
    console.log('refreshGitHubIssuesData starting');
    let issues = await githubIssuesService.get(null, []);
    let result = !deepEqual(issues, this.cache.issues);
    this.cache.issues = issues;
    console.log('refreshGitHubIssuesData finished');
    return result;
  };

  // Warning: this currently returns TRUE if sprint dates have changed,
  // not if any data has changed. This is different to all the others
  refreshGitHubStatusData = async (sprintName): Promise<boolean> => {
    console.log('refreshGitHubStatusData starting');
    const data = await githubStatusService.get(sprintName);
    this.cache.sprints[sprintName].github = data.github;
    this.cache.sprints[sprintName].phase = data.phase;

    const result = this.cache.sprints[sprintName].adjustedStart !== data.adjustedStart;
    if(result) {
      this.cache.sprints[sprintName].adjustedStart = data.adjustedStart;
    }
    console.log('refreshGitHubStatusData finished');
    return result;
  };

  refreshGitHubContributionsData = async (sprintName): Promise<boolean> => {
    console.log('refreshGitHubContributionsData starting');
    const sprint = this.cache.sprints[sprintName];
    if(!sprint || !sprint.phase) return false;
    const sprintStartDateTime = sprint.phase ? new Date(sprint.adjustedStart).toISOString() : getSprintStart().toISOString();
    let contributions = await githubContributionsService.get(sprintStartDateTime);
    let result = !deepEqual(contributions, sprint.contributions);
    sprint.contributions = contributions;
    console.log('refreshGitHubContributionsData finished');
    return result;
  };

  refreshSentryData = async (sprintName): Promise<boolean> => {
    console.log('refreshSentryData starting');
    const sprint = this.cache.sprints[sprintName];
    if(!sprint || !sprint.phase) return false;
    let sentry = await sentryService.get(sprint.adjustedStart);
    let result = !deepEqual(sentry, sprint.sentry);
    sprint.sentry = sentry;
    console.log('refreshSentryData finished');
    return result;
  };
};


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
