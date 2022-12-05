import { Component, OnInit, OnChanges, Input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { labelColor } from '../utility/labelColor';
import emojiRegex from 'emoji-regex';
import { PopupComponent } from '../popup/popup.component';
import { PopupCoordinatorService } from '../popup-coordinator.service';
import { pullStatus, pullUserTesting, pullBuildState } from '../utility/pullStatus';
import { VisibilityService } from '../visibility/visibility.service';
import { getAuthorAvatarUrl } from '../../../../shared/users';

@Component({
  selector: 'app-pull-request',
  templateUrl: './pull-request.component.html',
  styleUrls: ['./pull-request.component.css']
})
export class PullRequestComponent extends PopupComponent implements OnInit, OnChanges {
  @Input() changeCounter: number;
  @Input() pull: any;
  @Input() teamCity?: any;
  @Input() class?: string;
  @Input() scope?: string;
  @Input() scopeValue?: string;
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
    const base = pr.milestone ? pr.milestone.title == 'Future' ? 'future ' : '' : '';
    //if(this.pull.pull.node.commits?.nodes[0]?.commit?.checkSuites?.nodes[0]?.status == 'COMPLETED') {
    //One day, with optional chaining (nearly here)
    let buildState = pullBuildState(this.pull);
    return base + buildState;
  }

  pullUserTesting() {
    return pullUserTesting(this.pull);
  }

  pullIsCherryPick() {
    return this.pull.pull.node.labels.edges.reduce( (f, e) => f || e.node.name == 'cherry-pick', false);
  }

  pullIsForStableBranch() {
    return this.pull.pull?.node?.ultimateBaseRefName?.match(/^stable-(\d+\.\d+)$/);
  }

  pullStableBranchNumber() {
    let m = /^stable-(\d+\.\d+)$/.exec(this.pull?.pull?.node?.ultimateBaseRefName);
    return m ? m[1] : '?';
  }

  pullStatus() {
    return pullStatus(this.pull);
  }

  pullEmoji() {
    let title: string = this.pull.pull.node.title;
    let regex = emojiRegex(), match;
    while(match = regex.exec(title)) {
      const emoji = match[0];
      if(emoji != '🍒') return emoji + ' ';
    }
    return '';
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
      {fragment: 'release/kMAPro-debug.apk', name: 'Keyman for Android apk', icon: 'keyman.png'} ,
      {fragment: 'release/FirstVoices/app-debug.apk', name: 'FirstVoices Keyboards for Android apk', icon: 'firstvoices.png'} ,
    ]},
    'KeymanAndroid_TestSamplesAndTestProjects': {platform: 'android', name: 'Android', icon: 'android.png', downloads: [
      {fragment: 'Samples/KMSample1/app-debug.apk', name: 'KMSample1 apk', icon: 'kmsample1.png'} ,
      {fragment: 'Samples/KMSample2/app-debug.apk', name: 'KMSample2 apk', icon: 'kmsample2.png'} ,
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
      let buildId = url.searchParams.get('buildId');
      let buildTypeId = url.searchParams.get('buildTypeId');
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
    }
    return result;
  }

  getAuthorAvatar(author, size) {
    return getAuthorAvatarUrl(author, size);
  }
}
