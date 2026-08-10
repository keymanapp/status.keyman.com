import { Component, OnInit, OnChanges, Input, ChangeDetectionStrategy } from '@angular/core';
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
import { artifactLinks } from '../../../../shared/artifact-links';

@Component({
    selector: 'app-pull-request',
    templateUrl: './pull-request.component.html',
    styleUrls: ['./pull-request.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
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
      let targets = artifactLinks.teamCityTargets[<keyof typeof artifactLinks.teamCityTargets>(buildTypeId)];
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

          download = {...download, name: download.name.replaceAll('**', '')}; // remove bold formatting which won't work here}

          result.downloads.push({url: `https://build.palaso.org/repository/download/${buildTypeId}/${buildId}:id/${fragment}`,
            ...download});
        }
      }
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
