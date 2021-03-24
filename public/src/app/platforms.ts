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
    configs:{"alpha": "KeymanAndroid_Build", "beta": "KeymanAndroid_Build", "stable": "KeymanAndroid_Build", test: "KeymanAndroid_TestPullRequests"},
    context: "Keyman - Android"
  },
  {
    id:'ios',
    name:'iOS',
    configs:{"alpha": "Keyman_iOS_Master", "beta": "Keyman_iOS_Master", "stable": "Keyman_iOS_Master", test: "Keyman_iOS_TestPullRequests"},
    context: "Keyman - iOS"
  },
  {
    id:'linux',
    name:'Linux',
    configs:{"alpha": "KeymanLinux_Master", "beta": "KeymanLinux_Master", "stable": "KeymanLinux_Master", test: "KeymanLinux_TestPullRequests"},
    context: "Keyman - Linux"
  },
  {
    id:'mac',
    name:'macOS',
    configs:{"alpha": "KeymanMac_Master", "beta": "KeymanMac_Master", "stable": "KeymanMac_Master", test: "Keyman_KeymanMac_PullRequests"},
    context: "Keyman - macOS"
  },
  {
    id:'web',
    name:'KeymanWeb',
    configs:{"alpha": "Keymanweb_Build", "beta": "Keymanweb_Build", "stable": "Keymanweb_Build", test: "Keymanweb_TestPullRequests"},
    context: "Keyman - Web"
  },
  {
    id:'windows',
    name:'Windows',
    configs:{"alpha": "Keyman_Build", "beta": "Keyman_Build", "stable": "Keyman_Build", test: "KeymanDesktop_TestPullRequests"},
    context: "Keyman - Windows \\(Desktop\\/Developer\\)"
  },
  {
    id:'developer',
    name:'Developer',
    configs:{"alpha": "Keyman_Build", "beta": "Keyman_Build", "stable": "Keyman_Build", test: "KeymanDesktop_TestPullRequests"},
    context: "Keyman - Windows \\(Desktop\\/Developer\\)"
  },
  {
    id:'common',
    name:'Common',
    configs: null,
    context: "Common"
  },
];
