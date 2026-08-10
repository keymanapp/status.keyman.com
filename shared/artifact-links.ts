/*
 * Keyman is copyright (C) SIL Global. MIT License.
 */

export const artifactLinks = {
  teamCityTargets: {
    'KeymanAndroid_TestPullRequests': {platform: 'android', name: 'Android', icon: 'android.png', downloads: [
      {fragment: 'release/keyman-$version_with_tag.apk', name: '**Keyman for Android** apk', icon: 'keyman.png'},
      {fragment: 'release/FirstVoices/firstvoices-$version_with_tag.apk', name: 'FirstVoices Keyboards for Android apk', icon: 'firstvoices.png'} ,
    ]},
    'KeymanAndroid_TestSamplesAndTestProjects': {platform: 'android', name: 'Android', icon: 'android.png', downloads: [
      // We always run the debug builds for these projects
      {fragment: 'Samples/KMSample1/debug/KMSample1-$version_with_tag-debug.apk', name: 'KMSample1 apk', icon: 'kmsample1.png'} ,
      {fragment: 'Samples/KMSample2/debug/KMSample2-$version_with_tag-debug.apk', name: 'KMSample2 apk', icon: 'kmsample2.png'} ,
      {fragment: 'Tests/KeyboardHarness/debug/KeyboardHarness-$version_with_tag-debug.apk', name: 'KeyboardHarness apk', icon: 'keyboardharness.png'} ,
    ]},

    'Keyman_iOS_TestPullRequests': {platform: 'ios', name: 'iOS', icon: 'ios.png', downloads: [
      {fragment: 'upload/$version/keyman-ios-simulator-$version_with_tag.app.zip', name: '**Keyman for iOS** (simulator image)', icon: 'keyman.png'} ,
      {fragment: 'upload/$version/firstvoices-ios-simulator-$version_with_tag.app.zip', name: 'FirstVoices Keyboards for iOS (simulator image)', icon: 'firstvoices.png'} ,
    ]},

    'Keyman_KeymanMac_PullRequests': {platform: 'mac', name: 'macOS', icon: 'mac.png', downloads: [
      {fragment: 'upload/$version/keyman-$version_with_tag.dmg', name: '**Keyman for macOS (.dmg)**', icon: 'keyman.png'} ,
      {fragment: 'upload/$version/keyman-$version_with_tag.pkg', name: '**Keyman for macOS (.pkg)**', icon: 'keyman.png'} ,
    ]},

    'KeymanDesktop_TestPullRequests': {platform: 'windows', name: 'Windows', icon: 'windows.png', downloads: [
      {fragment: 'release/$version/keyman-$version_with_tag.exe', name: '**Keyman for Windows**', icon: 'keyman.png'} ,
      {fragment: 'release/$version/firstvoices-$version_with_tag.exe', name: 'FirstVoices Keyboards for Windows', icon: 'firstvoices.png'} ,
      {fragment: 'support/editor32.exe', name: 'Text Editor (x86)', icon: 'tool.png'} ,
      {fragment: 'support/editor64.exe', name: 'Text Editor (x64)', icon: 'tool.png'} ,
      {fragment: 'support/editorarm64.exe', name: 'Text Editor (ARM64)', icon: 'tool.png'} ,
    ]},

    'Keyman_Developer_Test': {platform: 'developer', name: 'Developer', icon: 'developer.png', downloads: [
      {fragment: 'release/$version/keymandeveloper-$version_with_tag.exe', name: '**Keyman Developer**', icon: 'developer.png'} ,
      {fragment: 'release/$version/kmcomp-$version_with_tag.zip', name: 'kmcomp.zip', icon: 'developer.png'},
      {fragment: 'keyboard-regression/', name: 'Compiler Regression Tests', icon: 'developer.png'},
      {fragment: 'keyboards/index.html', name: 'Test Keyboards', icon: 'developer.png'} ,
    ]},

    'Keymanweb_TestPullRequests': {platform: 'web', name: 'Web', icon: 'web.png', downloads: [
      {fragment: 'index.html', name: '**KeymanWeb Test Home**', icon: 'keyman.png'} ,
    ]},
  },

}