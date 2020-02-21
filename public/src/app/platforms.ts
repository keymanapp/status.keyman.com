export interface PlatformSpec {
  id: string,
  name: string,
  configs?: {alpha: string, beta: string, stable: string, prs: string},
  context?: string,
  pulls?: any,
  milestones?: any
};

export const platforms: PlatformSpec[] = [
  {
    id:'android',
    name:'Android',
    configs:{"alpha": "KeymanAndroid_Build", "beta": "KeymanAndroid_Beta", "stable": "KeymanAndroid_Stable", prs: "KeymanAndroid_TestPullRequests"},
    context: "Test: Pull Requests (Keyman Android)"
  },
  {
    id:'ios',
    name:'iOS',
    configs:{"alpha": "Keyman_iOS_Master", "beta": "Keyman_iOS_Beta", "stable": "Keyman_iOS_Stable", prs: "Keyman_iOS_TestPullRequests"},
    context: "Test:  Pull Requests (Keyman iOS)"
  },
  {
    id:'linux',
    name:'Linux',
    configs:{"alpha": "KeymanLinux_Master", "beta": "KeymanLinux_Beta", "stable": "KeymanLinux_Stable", prs: "KeymanLinux_TestPullRequests"},
    context: "Test: Pull Requests : Beta (Keyman for Linux)"
  },
  {
    id:'mac',
    name:'macOS',
    configs:{"alpha": "KeymanMac_Master", "beta": "KeymanMac_Beta", "stable": "KeymanMac_Stable", prs: "Keyman_KeymanMac_PullRequests"},
    context: "Test: Pull Requests (Keyman Mac)"
  },
  {
    id:'web',
    name:'KeymanWeb',
    configs:{"alpha": "Keymanweb_Build", "beta": "Keymanweb_Beta", "stable": "Keymanweb_Stable", prs: "Keymanweb_TestPullRequests"},
    context: "Test: Pull Requests (Keymanweb)"
  },
  {
    id:'windows',
    name:'Windows',
    configs:{"alpha": "Keyman_Build", "beta": "KeymanDesktop_Beta", "stable": "KeymanDesktop_Stable", prs: "KeymanDesktop_TestPullRequests"},
    context: "Test: Pull Requests (Keyman Desktop and Keyman Developer)"
  },
  {
    id:'developer',
    name:'Developer',
    configs:{"alpha": "Keyman_Build", "beta": "KeymanDesktop_Beta", "stable": "KeymanDesktop_Stable", prs: "KeymanDesktop_TestPullRequests"},
    context: "Test: Pull Requests (Keyman Desktop and Keyman Developer)"
  },
  {
    id:'common',
    name:'Common',
    configs: null,
    context: null
  },
];
