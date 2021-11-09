import { Component, OnInit, OnChanges, Input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { labelColor } from '../utility/labelColor';
import emojiRegex from 'emoji-regex/es2015/RGI_Emoji';
import { PopupComponent } from '../popup/popup.component';
import { PopupCoordinatorService } from '../popup-coordinator.service';

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

  constructor(private sanitizer: DomSanitizer, popupCoordinator: PopupCoordinatorService) { super(popupCoordinator); }

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
    if(pr.commits && pr.commits.nodes && pr.commits.nodes.length && pr.commits.nodes[0].commit &&
        pr.commits.nodes[0].commit.checkSuites &&
        pr.commits.nodes[0].commit.checkSuites.nodes.length) {
      const checks = pr.commits.nodes[0].commit.checkSuites.nodes;
      let conclusion = '';
      for(let check of checks) {
        if(check.app == null) {
          // GitHub will return a QUEUED null-app check. Not sure why.
          continue;
        }
        if(check.status == 'COMPLETED') {
          switch(check.conclusion) {
            case 'SUCCESS':
              if(conclusion == '') conclusion = 'SUCCESS';
              break;
            case 'ACTION_REQUIRED':
            case 'TIMED_OUT':
            case 'FAILURE':
              conclusion = 'FAILURE'; //   return base+'failure';
              break;
            case 'CANCELLED':
            case 'SKIPPED':
            case 'STALE':
            case 'NEUTRAL':
            default:
              if(conclusion == '') conclusion = 'CANCELLED';
              //return base+'missing'; // various other states
          }
        } else {
          //IN_PROGRESS, QUEUED, REQUESTED
          conclusion = 'QUEUED';
          //return base+'pending';
        }
      }
      switch(conclusion) {
        case 'QUEUED': return base+'pending';
        case 'SUCCESS': return base+'success';
        case 'FAILURE': return base+'failure';
        default: return base+'missing';
      }
    }
    if(!this.pull.state) return base+'missing';
    switch(this.pull.state.state) {
      case 'SUCCESS': return base+'success';
      case 'PENDING': return base+'pending';
      default: return base+'failure';
    }
  }

  pullUserTesting() {
    const c = this.pull.userTesting;
    if(!c) return 'user-test-none';
    switch(c.state) {
      case 'SUCCESS': return 'user-test-success';
      case 'FAILURE': return 'user-test-failure';
      default: return 'user-test-pending';
    }
  }

  pullIsCherryPick() {
    return this.pull.pull.node.labels.edges.reduce( (f, e) => f || e.node.name == 'cherry-pick', false);
  }

  pullStatus() {
    let authors = {};

    if(this.pull.pull.node.isDraft) return 'status-draft';

    if(this.pull.pull.node.labels.edges.find(node => node.node.name == 'work-in-progress') !== undefined) return 'status-draft';

    this.pull.pull.node.reviews.nodes.forEach(review => {
      if(!authors[review.author.login]) authors[review.author.login] = {reviews:[]};
      authors[review.author.login].reviews.push(review);
    });

    Object.entries(authors).forEach(entry => {
      (entry[1] as any).state = (entry[1] as any).reviews.reduce((a, c) => c.state == 'APPROVED' || c.state == 'CHANGES_REQUESTED' ? c.state : a, 'PENDING');
    });

    return Object.entries(authors).reduce(
      (a, c) =>
        (c[1] as any).state == 'CHANGES_REQUESTED' || a == 'status-changes-requested' ? 'status-changes-requested' :
        (c[1] as any).state == 'APPROVED' || a == 'status-approved' ? 'status-approved' : 'status-pending',
      'status-pending' // Initial value
    );
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
    let url = new URL(context.targetUrl);
    let result = {platform: '', downloads: [], name: '', icon: ''};
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
}
