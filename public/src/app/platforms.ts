export interface PlatformSpec {
  id: string,
  name: string,
  configs?: {alpha: string, beta: string, stable: string, test: string},
  context?: string,
  pulls?: any,
  milestones?: any,
  totalIssueCount?: number
};

export const platforms: PlatformSpec[] = [
  {
    id:'android',
    name:'Android',
    configs:{"alpha": "KeymanAndroid_Build", "beta": "KeymanAndroid_Beta", "stable": "KeymanAndroid_Stable", test: "KeymanAndroid_TestPullRequests"},
    context: "Keyman - Android"
  },
  {
    id:'ios',
    name:'iOS',
    configs:{"alpha": "Keyman_iOS_Master", "beta": "Keyman_iOS_Beta", "stable": "Keyman_iOS_Stable", test: "Keyman_iOS_TestPullRequests"},
    context: "Keyman - iOS"
  },
  {
    id:'linux',
    name:'Linux',
    configs:{"alpha": "KeymanLinux_Master", "beta": "KeymanLinux_Beta", "stable": "KeymanLinux_Stable", test: "KeymanLinux_TestPullRequests"},
    context: "Keyman - Linux"
  },
  {
    id:'mac',
    name:'macOS',
    configs:{"alpha": "KeymanMac_Master", "beta": "KeymanMac_Beta", "stable": "KeymanMac_Stable", test: "Keyman_KeymanMac_PullRequests"},
    context: "Keyman - macOS"
  },
  {
    id:'web',
    name:'KeymanWeb',
    configs:{"alpha": "Keymanweb_Build", "beta": "Keymanweb_Beta", "stable": "Keymanweb_Stable", test: "Keymanweb_TestPullRequests"},
    context: "Keyman - Web"
  },
  {
    id:'windows',
    name:'Windows',
    configs:{"alpha": "Keyman_Build", "beta": "KeymanDesktop_Beta", "stable": "KeymanDesktop_Stable", test: "KeymanDesktop_TestPullRequests"},
    context: "Keyman - Windows \\(Desktop\\/Developer\\)"
  },
  {
    id:'developer',
    name:'Developer',
    configs:{"alpha": "Keyman_Build", "beta": "KeymanDesktop_Beta", "stable": "KeymanDesktop_Stable", test: "KeymanDesktop_TestPullRequests"},
    context: "Keyman - Windows \\(Desktop\\/Developer\\)"
  },
  {
    id:'common',
    name:'Common',
    configs: null,
    context: "Common"
  },
];
