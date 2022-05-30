export interface PlatformSpec {
  id: string;
  name: string;
  configs?: any; //{alpha: string, beta: string, stable: string, test: string},
  context?: string;
  sentry?: string;
  pulls?: any;
  pullsByEmoji?: any;
  milestones?: any;
  totalIssueCount?: number;
}

export const platforms: PlatformSpec[] = [
  {
    id: "android",
    name: "Android",
    configs: {
      alpha: "KeymanAndroid_Build",
      beta: "KeymanAndroid_Build",
      stable: "KeymanAndroid_Build",
      test: "KeymanAndroid_TestPullRequests",
      testSamples: "KeymanAndroid_TestSamplesAndTestProjects",
    },
    context: "Keyman - Android",
    sentry: "keyman-android",
  },
  {
    id: "ios",
    name: "iOS",
    configs: {
      alpha: "Keyman_iOS_Master",
      beta: "Keyman_iOS_Master",
      stable: "Keyman_iOS_Master",
      test: "Keyman_iOS_TestPullRequests",
    },
    context: "Keyman - iOS",
    sentry: "keyman-ios",
  },
  {
    id: "linux",
    name: "Linux",
    configs: {
      alpha: "KeymanLinux_Master",
      beta: "KeymanLinux_Master",
      stable: "KeymanLinux_Master",
      test: "KeymanLinux_TestPullRequests",
      testCore: "Keyman_Common_KPAPI_TestPullRequests_Linux",
    },
    context: "Keyman - Linux",
    sentry: "keyman-linux",
  },
  {
    id: "mac",
    name: "macOS",
    configs: {
      alpha: "KeymanMac_Master",
      beta: "KeymanMac_Master",
      stable: "KeymanMac_Master",
      test: "Keyman_KeymanMac_PullRequests",
      testCore: "Keyman_Common_KPAPI_TestPullRequests_macOS",
    },
    context: "Keyman - macOS",
    sentry: "keyman-mac",
  },
  {
    id: "web",
    name: "KeymanWeb",
    configs: {
      alpha: "Keymanweb_Build",
      beta: "Keymanweb_Build",
      stable: "Keymanweb_Build",
      test: "Keymanweb_TestPullRequests",
    },
    context: "Keyman - Web",
    sentry: "keyman-web",
  },
  {
    id: "windows",
    name: "Windows",
    configs: {
      alpha: "Keyman_Build",
      beta: "Keyman_Build",
      stable: "Keyman_Build",
      test: "KeymanDesktop_TestPullRequests",
      testCore: "Keyman_Common_KPAPI_TestPullRequests_Windows",
      testOSK: "KeymanDesktop_TestPrRenderOnScreenKeyboards",
    },
    context: "Keyman - Windows \\(Desktop\\/Developer\\)",
    sentry: "keyman-windows",
  },
  {
    id: "developer",
    name: "Developer",
    configs: {
      alpha: "Keyman_Developer_Release",
      beta: "Keyman_Build",
      stable: "Keyman_Build",
      test: "Keyman_Developer_Test",
    },
    context: "Keyman - Windows \\(Desktop\\/Developer\\)",
    sentry: "keyman-developer",
  },
  {
    id: "common",
    name: "Common",
    configs: { testLMLayer: "Keyman_Common_LMLayer_TestPullRequests" },
    context: "Common",
  },
];

// TODO: consolidate with list in sentry-issues.ts
export const platformSentryIds = {
  android: 5983520,
  developer: 5983519,
  ios: 5983521,
  linux: 5983525,
  mac: 5983522,
  web: 5983524,
  windows: 5983518,
};
