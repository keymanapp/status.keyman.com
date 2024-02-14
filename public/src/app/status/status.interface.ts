export interface Status {
  currentSprint: any;
  github: any;
  issues: any;
  contributions: any;
  communitySite: any;
  communitySiteQueue: any;
  codeOwners: any;
  siteLiveliness: any;
  keyman: any[];
  sentryIssues: any;
  teamCity: any[];
  teamCityRunning: any[];
  teamCityAgents: any[];
  teamCityQueue: any[];
  deployment: {
  }
};

export const EMPTY_STATUS: Status = {
  currentSprint: undefined,
  github: undefined,
  issues: undefined,
  contributions: undefined,
  communitySite: undefined,
  communitySiteQueue: undefined,
  codeOwners: {},
  siteLiveliness: {},
  keyman: [],
  sentryIssues: {},
  teamCity: [],
  teamCityRunning: [],
  teamCityAgents: [],
  teamCityQueue: [],
  deployment: {
  }
};