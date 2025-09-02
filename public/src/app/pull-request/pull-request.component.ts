import { Component, OnInit, OnChanges, Input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { labelColor } from '../utility/labelColor';
import emojiRegex from 'emoji-regex';
import { PopupComponent } from '../popup/popup.component';
import { PopupCoordinatorService } from '../popup-coordinator.service';
import { pullStatus, pullUserTesting, pullBuildState, pullBuildStateEx } from '../utility/pullStatus';
import { VisibilityService } from '../visibility/visibility.service';
import { getAuthorAvatarUrl } from '../../../../shared/users';
import { getTeamcityUrlParams } from '../../../../shared/getTeamcityUrlParams';
import { pullEmoji } from '../utility/pullEmoji';

@Component({
    selector: 'app-pull-request',
    templateUrl: './pull-request.component.html',
    styleUrls: ['./pull-request.component.css'],
    standalone: false
})
export class PullRequestComponent extends PopupComponent implements OnInit, OnChanges {
  @Input() changeCounter: number;
  @Input() pull: any;
  @Input() teamCity?: any;
  @Input() class?: string;
  @Input() scope?: string;
  @Input() scopeValue?: string;
  @Input() status: any;
  contexts: any;

  constructor(private sanitizer: DomSanitizer, popupCoordinator: PopupCoordinatorService, visibilityService: VisibilityService) {
    super(popupCoordinator, visibilityService);
  }

  ngOnInit() {
    this.popupId = 'pull-'+this.pull.pull.node.number+(this.scopeValue ? '-'+this.scopeValue:'');
    if(!this.gravityX) this.gravityX = 'right';
    if(!this.gravityY) this.gravityY = 'bottom';
    this.prepareData();
    super.ngOnInit();
  }

  ngOnChanges() {
    this.prepareData();
  }

  prepareData() {
    let c = {};
    let contexts = this.pull?.pull?.node?.commits?.edges?.[0]?.node?.commit?.status?.contexts;
    if(contexts) {
      for(let context of contexts) {
        let downloads = this.getDownloads(context);
        if(!c[downloads.platform]) {
          c[downloads.platform] = {
            platform: downloads.platform,
            name: downloads.name,
            icon: downloads.icon,
            downloads: []
          };
        }
        c[downloads.platform].downloads = [].concat(c[downloads.platform].downloads, downloads.downloads);
      }
    }
    this.contexts = Object.keys(c).map(id => c[id]);
  }

  pullClass() {
    const pr = this.pull.pull.node;
    const base = pr.milestone?.title == this.status?.currentSprint?.title ? '' : 'future ';
    //if(this.pull.pull.node.commits?.nodes[0]?.commit?.checkSuites?.nodes[0]?.status == 'COMPLETED') {
    //One day, with optional chaining (nearly here)
    const buildState = pullBuildStateEx(this.pull);// pullBuildState(this.pull);
    const epic = pr.headRefName.match(/^(epic\/|feature-)/) ? 'epic ' : '';
    return base + epic + buildState;
  }

  pullStateSummary() {
    const pr = this.pull.pull.node;
    let check = null;
    let queued = 0, passed = 0, failed = 0;

    if(!pr.checkSummary) return 'missing';

    for(let c of pr.checkSummary) {
      if(c.context == 'check/web/file-size' || c.context == 'user_testing') {
        continue;
      }
      switch(c.state) {
        case 'SUCCESS':
          passed++;
          if(!check) {
            check = c;
          }
          break;
        case 'PENDING':
        case 'EXPECTED':
          queued++;
          if(!check || check.state == 'SUCCESS') {
            check = c;
          }
          break;
        case 'ERROR':
        case 'FAILURE':
          failed++;
          if(!check || check.state != 'ERROR' || check.state != 'FAILURE') {
            check = c;
          }
          break;
      }
    }
    let result = (check ? (check.context + ': ' + check.description) : 'Unknown build state') + ' —';
    if(queued > 0) result += ` ${queued} queued`;
    if(failed > 0) result += `${queued?',':''} ${failed} failed`;
    if(passed > 0) result += `${queued+failed?',':''} ${passed} passed`;
    result += ` of ${passed+queued+failed} checks`;
    return result;
  }

  pullUserTesting() {
    return pullUserTesting(this.pull);
  }

  pullIsCherryPick() {
    return this.pull.pull.node.labels.edges.reduce( (f, e) => f || e.node.name == 'cherry-pick', false);
  }

  pullIsForStableOrBetaBranch() {
    return this.pull.pull?.node?.ultimateBaseRefName?.match(/^beta|(stable-(\d+\.\d+))$/);
  }

  pullStableOrBetaBranchIdentifier() {
    if(this.pull?.pull?.node?.ultimateBaseRefName == 'beta') return 'beta';
    let m = /^stable-(\d+\.\d+)$/.exec(this.pull?.pull?.node?.ultimateBaseRefName);
    return m ? m[1] : '?';
  }

  pullStableOrBetaClassName() {
    if(this.pull?.pull?.node?.ultimateBaseRefName == 'beta') return 'beta';
    return 'stable';
  }

  pullStatus() {
    return pullStatus(this.pull);
  }

  pullEmoji() {
    return pullEmoji(this.pull.pull);
    /*let title: string = this.pull.pull.node.title;
    let regex = emojiRegex(), match;
    while(match = regex.exec(title)) {
      const emoji = match[0];
      if(emoji != '🍒') return emoji + ' ';
    }
    return '';*/
  }

  labelColor(label) {
    return this.sanitizer.bypassSecurityTrustStyle(labelColor(label));
  }

  labelName(label: string) {
    return label.replace(/-/g, '‑');
  }

  // Build status links

  teamCityTargets = {
    'KeymanAndroid_TestPullRequests': {platform: 'android', name: 'Android', icon: 'android.png', downloads: [
      {fragment: 'release/keyman-$version.apk', name: 'Keyman for Android apk', icon: 'keyman.png'} ,
      {fragment: 'release/FirstVoices/firstvoices-$version.apk', name: 'FirstVoices Keyboards for Android apk', icon: 'firstvoices.png'} ,

      // TODO: Remove 16.0 links when 17.0 released
      {fragment: 'release/kMAPro-debug.apk', name: 'Keyman for Android 16.0 apk', icon: 'keyman.png'} ,
      {fragment: 'release/FirstVoices/app-debug.apk', name: 'FirstVoices for Android 16.0 apk', icon: 'firstvoices.png'} ,
    ]},
    'KeymanAndroid_TestSamplesAndTestProjects': {platform: 'android', name: 'Android', icon: 'android.png', downloads: [
      {fragment: 'Samples/KMSample1/app-debug.apk', name: 'KMSample1 apk', icon: 'kmsample1.png'} ,
      {fragment: 'Samples/KMSample2/app-debug.apk', name: 'KMSample2 apk', icon: 'kmsample2.png'} ,
      {fragment: 'Tests/KeyboardHarness/app-debug.apk', name: 'KeyboardHarness apk', icon: 'keyboardharness.png'} ,
    ]},

    'Keyman_iOS_TestPullRequests': {platform: 'ios', name: 'iOS', icon: 'ios.png', downloads: [
      {fragment: 'upload/$version/keyman-ios-simulator-$version.app.zip', name: 'Keyman for iOS (simulator image)', icon: 'keyman.png'} ,
      {fragment: 'upload/$version/firstvoices-ios-simulator-$version.app.zip', name: 'FirstVoices Keyboards for iOS (simulator image)', icon: 'firstvoices.png'} ,
    ]},

    'Keyman_KeymanMac_PullRequests': {platform: 'mac', name: 'macOS', icon: 'mac.png', downloads: [
      {fragment: 'upload/$version/keyman-$version.dmg', name: 'Keyman for macOS', icon: 'keyman.png'} ,
    ]},

    'KeymanDesktop_TestPullRequests': {platform: 'windows', name: 'Windows', icon: 'windows.png', downloads: [
      {fragment: 'release/$version/keyman-$version.exe', name: 'Keyman for Windows', icon: 'keyman.png'} ,
      {fragment: 'release/$version/keymandeveloper-$version.exe', name: 'Keyman Developer', icon: 'developer.png'} ,
      {fragment: 'release/$version/firstvoices-$version.exe', name: 'FirstVoices Keyboards for Windows', icon: 'firstvoices.png'} ,
    ]},

    'Keymanweb_TestPullRequests': {platform: 'web', name: 'Web', icon: 'web.png', downloads: [
      {fragment: 'index.html', name: 'KeymanWeb Test Home', icon: 'keyman.png'} ,
    ]},
  };

  getDownloads(context) {
    let result = {platform: '', downloads: [], name: '', icon: ''};

    if(!context.targetUrl) {
      return result;
    }

    let url;
    try {
      url = new URL(context.targetUrl);
    } catch(e) {
      console.log('getDownloads failed.');
      console.debug(context);
      console.trace(e);
      return result;
    }

    if(url.hostname == 'build.palaso.org') {
      const { buildId, buildTypeId } = getTeamcityUrlParams(url);
      let targets = this.teamCityTargets[buildTypeId];
      if(targets) {
        result.name = targets.name;
        result.icon = targets.icon;
        result.platform = targets.platform;
        for(let download of targets.downloads) {
          let fragment = download.fragment;
          if(!this.teamCity) continue;

          let t = this.teamCity?.[buildTypeId];
          if(!t) continue;

          let build = t.builds.find(b => b.id == buildId);
          if(!build) continue;

          let version = /^(\d+\.\d+\.\d+)/.exec(build.number)?.[1];
          fragment = fragment.replaceAll('$version', version);

          result.downloads.push({url: `https://build.palaso.org/repository/download/${buildTypeId}/${buildId}:id/${fragment}`,
            ...download});
        }
      }
    } else if(url.hostname == 'jenkins.lsdev.sil.org') {
      result = {
        platform: 'linux',
        downloads: [
          {url: context.targetUrl + 'artifact/*zip*/archive.zip', name: 'Keyman for Linux', icon: 'keyman.png'}
        ],
        name: 'Keyman for Linux',
        icon: 'linux.png'
      };
      //https://jenkins.lsdev.sil.org/job/pipeline-keyman-packaging/job/PR-5883/9/artifact/*zip*/archive.zip
      //https://jenkins.lsdev.sil.org/job/pipeline-keyman-packaging/job/PR-5883/9/
    } else if (context.context == 'Debian Packaging') {
      result = {
        platform: 'linux',
        downloads: [
          { url: context.targetUrl, name: 'Keyman for Linux', icon: 'keyman.png' }
        ],
        name: 'Keyman for Linux',
        icon: 'linux.png'
      };
    }
    return result;
  }

  getAuthorAvatar(author, size) {
    return getAuthorAvatarUrl(author, size);
  }
}
