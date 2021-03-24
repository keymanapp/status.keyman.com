
import versionService from "../services/downloads.keyman.com/version";
import teamcityService from "../services/teamcity/teamcity";
import githubStatusService from "../services/github/github-status";
import githubIssuesService from "../services/github/github-issues";
import githubContributionsService from "../services/github/github-contributions";
import sentryService from "../services/sentry/sentry";


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

  refreshKeymanVersionData = async () => {
    console.log('refreshKeymanVersion starting');
    this.cache.keymanVersion = await versionService.get();
    console.log('refreshKeymanVersion finished');
  };

  refreshTeamcityData = async () => {
    console.log('refreshTeamcityData starting');
    const data = await teamcityService.get();
    this.cache.teamCity = data[0];
    this.cache.teamCityRunning = data[1];
    console.log('refreshTeamcityData finished');
  };

  refreshGitHubIssuesData = async () => {
    console.log('refreshGitHubIssuesData starting');
    this.cache.issues = await githubIssuesService.get(null, []);
    console.log('refreshGitHubIssuesData finished');
  };

  refreshGitHubStatusData = async (sprintName) => {
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

  refreshGitHubContributionsData = async (sprintName) => {
    console.log('refreshGitHubContributionsData starting');
    const sprint = this.cache.sprints[sprintName];
    if(!sprint || !sprint.phase) return;
    const sprintStartDateTime = sprint.phase ? new Date(sprint.adjustedStart).toISOString() : getSprintStart().toISOString();
    sprint.contributions = await githubContributionsService.get(sprintStartDateTime);
    console.log('refreshGitHubContributionsData finished');
  };

  refreshSentryData = async (sprintName) => {
    console.log('refreshSentryData starting');
    const sprint = this.cache.sprints[sprintName];
    if(!sprint || !sprint.phase) return;
    sprint.sentry = await sentryService.get(sprint.adjustedStart);
    console.log('refreshSentryData finished');
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
