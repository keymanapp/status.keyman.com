// TODO: update pull-request.component.ts to use these
// TODO: jenkins links
export const artifactLinks = {
  teamCityTargets: {
    'KeymanAndroid_TestPullRequests': {platform: 'android', name: 'Android', icon: 'android.png', downloads: [
      {fragment: 'release/keyman-$version_with_tag.apk', name: '**Keyman for Android** apk', icon: 'keyman.png'} ,
      {fragment: 'release/FirstVoices/firstvoices-$version_with_tag.apk', name: 'FirstVoices Keyboards for Android apk', icon: 'firstvoices.png'} ,
      {fragment: 'release/keyman-$version.apk', name: 'Keyman for Android apk (old PRs)', icon: 'keyman.png'} ,
      {fragment: 'release/FirstVoices/firstvoices-$version.apk', name: 'FirstVoices Keyboards for Android apk (old PRs)', icon: 'firstvoices.png'} ,
    ]},
    'KeymanAndroid_TestSamplesAndTestProjects': {platform: 'android', name: 'Android', icon: 'android.png', downloads: [
      {fragment: 'Samples/KMSample1/app-debug.apk', name: 'KMSample1 apk', icon: 'kmsample1.png'} ,
      {fragment: 'Samples/KMSample2/app-debug.apk', name: 'KMSample2 apk', icon: 'kmsample2.png'} ,
      {fragment: 'Tests/KeyboardHarness/app-debug.apk', name: 'KeyboardHarness apk', icon: 'keyboardharness.png'} ,
    ]},

    'Keyman_iOS_TestPullRequests': {platform: 'ios', name: 'iOS', icon: 'ios.png', downloads: [
      {fragment: 'upload/$version/keyman-ios-simulator-$version_with_tag.app.zip', name: '**Keyman for iOS** (simulator image)', icon: 'keyman.png'} ,
      {fragment: 'upload/$version/firstvoices-ios-simulator-$version_with_tag.app.zip', name: 'FirstVoices Keyboards for iOS (simulator image)', icon: 'firstvoices.png'} ,
      //TODO: remove next two downloads when version_with_tag artifact filenames have propagated everywhere
      {fragment: 'upload/$version/keyman-ios-simulator-$version.app.zip', name: 'Keyman for iOS (simulator image) (old PRs)', icon: 'keyman.png'} ,
      {fragment: 'upload/$version/firstvoices-ios-simulator-$version.app.zip', name: 'FirstVoices Keyboards for iOS (simulator image) (old PRs)', icon: 'firstvoices.png'} ,
    ]},

    'Keyman_KeymanMac_PullRequests': {platform: 'mac', name: 'macOS', icon: 'mac.png', downloads: [
      {fragment: 'upload/$version/keyman-$version_with_tag.dmg', name: '**Keyman for macOS**', icon: 'keyman.png'} ,
      //TODO: remove next download when version_with_tag artifact filenames have propagated everywhere
      {fragment: 'upload/$version/keyman-$version.dmg', name: 'Keyman for macOS (old PRs)', icon: 'keyman.png'} ,
    ]},

    'KeymanDesktop_TestPullRequests': {platform: 'windows', name: 'Windows', icon: 'windows.png', downloads: [
      {fragment: 'release/$version/keyman-$version_with_tag.exe', name: '**Keyman for Windows**', icon: 'keyman.png'} ,
      {fragment: 'release/$version/firstvoices-$version_with_tag.exe', name: 'FirstVoices Keyboards for Windows', icon: 'firstvoices.png'} ,
      {fragment: 'support/editor32.exe', name: 'Text Editor (x86)', icon: 'tool.png'} ,
      {fragment: 'support/editor64.exe', name: 'Text Editor (x64)', icon: 'tool.png'} ,
      {fragment: 'support/editorarm64.exe', name: 'Text Editor (ARM64)', icon: 'tool.png'} ,
      //TODO: remove next two downloads when version_with_tag artifact filenames have propagated everywhere
      {fragment: 'release/$version/keyman-$version.exe', name: 'Keyman for Windows (old PRs)', icon: 'keyman.png'} ,
      {fragment: 'release/$version/firstvoices-$version.exe', name: 'FirstVoices Keyboards for Windows (old PRs)', icon: 'firstvoices.png'} ,
    ]},

    'Keyman_Developer_Test': {platform: 'developer', name: 'Developer', icon: 'developer.png', downloads: [
      {fragment: 'release/$version/keymandeveloper-$version_with_tag.exe', name: '**Keyman Developer**', icon: 'developer.png'} ,
      {fragment: 'release/$version/kmcomp-$version_with_tag.zip', name: 'kmcomp.zip', icon: 'developer.png'},
      {fragment: 'keyboard-regression/', name: 'Compiler Regression Tests', icon: 'developer.png'},
      {fragment: 'keyboards/index.html', name: 'Test Keyboards', icon: 'developer.png'} ,
      //TODO: remove next two downloads when version_with_tag artifact filenames have propagated everywhere
      {fragment: 'release/$version/keymandeveloper-$version.exe', name: 'Keyman Developer (old PRs)', icon: 'developer.png'} ,
      {fragment: 'release/$version/kmcomp-$version.zip', name: 'kmcomp.zip (old PRs)', icon: 'developer.png'},
    ]},

    'Keymanweb_TestPullRequests': {platform: 'web', name: 'Web', icon: 'web.png', downloads: [
      {fragment: 'index.html', name: '**KeymanWeb Test Home**', icon: 'keyman.png'} ,
    ]},
  },

  jenkinsTarget: {
    platform: 'linux', name: 'linux', icon: 'linux.png', downloads: [
      { fragment: 'artifact/*zip*/archive.zip', name: 'Keyman for Linux', icon: 'keyman.png' }
    ]
  }
}