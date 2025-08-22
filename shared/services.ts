export enum ServiceIdentifier {
  // Custom sources
  Keyman = "keyman",
  GitHub = "github",
  GitHubIssues = "github-issues",
  GitHubContributions = "github-contributions",
  TeamCity = "teamcity",
  SentryIssues = "sentry-issues",
  CodeOwners = "code-owners",
  SiteLiveliness = "site-liveliness",
  // Deployment targets - standard sources
  ITunesKeyman = "itunes-keyman",
  ITunesFirstVoices = "itunes-firstvoices",
  PlayStoreKeyman = "play-store-keyman",
  PlayStoreFirstVoices = "play-store-firstvoices",
  LaunchPadAlpha = "launch-pad-alpha",
  LaunchPadBeta = "launch-pad-beta",
  LaunchPadStable = "launch-pad-stable",
  NpmKeymanCompiler = "npm-kmc",
  NpmCommonTypes = "npm-common-types",
  SKeymanCom = "s-keyman-com",
  PackagesSilOrg = "packages-sil-org",
  LinuxLsdevSilOrgAlpha = "linux-lsdev-sil-org-alpha",
  LinuxLsdevSilOrgBeta = "linux-lsdev-sil-org-beta",
  LinuxLsdevSilOrgStable = "linux-lsdev-sil-org-stable",
  DebianBeta = "debian-beta",
  DebianStable = "debian-stable",
  // Other standard sources
  CommunitySite = "community-site",
  GitHubMilestones = 'github-milestones',
};

export enum ServiceState {
  loading = 'loading',
  successful = 'successful',
  error = 'error',
  unknown = 'unknown',
};

export interface ServiceStateRecord {
  state: ServiceState;
  message: string;
};

export type ServiceStateCache = {[index in ServiceIdentifier]?: ServiceStateRecord};
