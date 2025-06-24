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
      testSamples: "Keyman_iOS_TestSamplesAndTestProjects",
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
      beta: "Keyman_Developer_Release",
      stable: "Keyman_Developer_Release",
      test: "Keyman_Developer_Test",
    },
    context: "Keyman - Windows \\(Desktop\\/Developer\\)",
    sentry: "keyman-developer",
  },
  {
    id: "core",
    name: "Core",
    configs: {
      testLinux: "Keyman_Common_KPAPI_TestPullRequests_Linux",
      testMac: "Keyman_Common_KPAPI_TestPullRequests_macOS",
      testWASM: "Keyman_Common_KPAPI_TestPullRequests_WASM",
      testWindows: "Keyman_Common_KPAPI_TestPullRequests_Windows",
    },
    context: "Core",
  },
  {
    id: "common",
    name: "Common",
    configs: {
      testLMLayer: "Keyman_Common_LMLayer_TestPullRequests",
      testKeyboards: "Keyboards_TestPullRequests",
      triggerTests: "Keyman_Test",
      triggerAlpha: "Keyman_TriggerReleaseBuildsMaster",
      triggerStable: "Keyman_TriggerReleaseBuildsStable",
      triggerBeta: "Keyman_TriggerReleaseBuildsBeta",
      testWindows: "Keyman_Test_Common_Windows",
      testMac: "Keyman_Test_Common_Mac",
      testLinux: "Keyman_Test_Common_Linux",
    },
    context: "Common",
  },
  {
    id: "resources",
    name: "Resources",
    configs: {
    },
    context: "Resources",
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
