import { Component, Input, OnInit } from '@angular/core';
import { PlatformSpec } from '../../../../shared/platforms';

@Component({
    selector: 'app-platform-tier-box',
    templateUrl: './platform-tier-box.component.html',
    styleUrls: ['./platform-tier-box.component.css'],
    standalone: false
})
export class PlatformTierBoxComponent implements OnInit {
  @Input() tier: string;
  @Input() platforms: PlatformSpec[];
  @Input() platform?: PlatformSpec;
  @Input() status: any;
  @Input() changeCounter: number;

  constructor() { }

  ngOnInit(): void {
  }

  downloadClass(platformId: string, tier: string): string {
    return this.releaseDate(platformId, tier) == '' ?
      'tier-release-version-error' :
      this.status.keyman[platformId][tier].version == this.statusText(platformId, tier) ?
        'tier-release-version-equal' :
        'tier-release-version-pending';
  }

  releaseDate(platformId: string, tier: string): string {
    if(!this.status) return '';
    let files = this.status.keyman[platformId];
    if(!files) return '';
    files = files[tier].files;
    let items = Object.keys(files);
    if(items.length == 0) return '';
    return files[items[0]].date;
  }

  getStatus(platformId: string, tier: string): any {
    return this.status ? this.status.teamCity[this.getPlatform(platformId).configs[tier]] : null;
  }

  getRunningStatus(platformId: string, tier: string): any {
    return this.status ? this.status.teamCityRunning[this.getPlatform(platformId).configs[tier]] : null;
  }

  getPlatform(platformId: string): PlatformSpec {
    return this.platforms.find(e => e.id == platformId);
  }

  getFirstBuild(builds: any, tier: string) {
    if(!builds || !builds.builds || !builds.builds.length) return null;
    for(let build of builds.builds) {
      if(build.branchName == tier) return build;
      if(tier == 'stable' && build.branchName.startsWith('stable-')) return build; // stable builds have stable-version.version branch names
      if(tier == 'alpha' && !build.branchName) return build; // legacy builds do not have a branch name
      if(tier == 'alpha' && build.branchName == 'master') return build;
    }
    return null;
  }

  statusClass(platformId: string, tier: string): string {
    let b = this.getStatus(platformId, tier), br = this.getRunningStatus(platformId, tier);
    let build = this.getFirstBuild(br, tier);
    if(build) {
      return build.status == 'SUCCESS' ? 'pending' : 'failure';
    }

    build = this.getFirstBuild(b, tier);
    if(!build) return 'missing';
    return build.status == 'SUCCESS' ? 'success' : 'failure';
  }

  statusText(platformId: string, tier: string): string {
    let b = this.getStatus(platformId, tier), br = this.getRunningStatus(platformId, tier);
    let build = this.getFirstBuild(br, tier);
    if(build) {
      return build.number;
    }

    build = this.getFirstBuild(b, tier);
    if(!build) {
      return 'Unreported';
    }
    return build.number;
  }

  statusTip(platformId: string, tier: string): string {
    let b = this.getStatus(platformId, tier), br = this.getRunningStatus(platformId, tier);
    let build = this.getFirstBuild(br, tier);
    if(build) {
      return build.statusText;
    }

    build = this.getFirstBuild(b, tier);
    if(!build) return '';
    return build.statusText;
  }

  statusLink(platformId: string, tier: string): string {
    let b = this.getStatus(platformId, tier), br = this.getRunningStatus(platformId, tier);
    let build = this.getFirstBuild(br, tier);
    if(build) {
      return `https://build.palaso.org/viewLog.html?buildId=${build.id}&buildTypeId=${b.id}`;
    }

    build = this.getFirstBuild(b, tier);
    if(!build) return '';
    return `https://build.palaso.org/viewLog.html?buildId=${build.id}&buildTypeId=${b.id}`;

  }

  /* Show test build result (alpha-only until 14.0 release phase) */

  tierTestRunningAndLatestBuild(platformId,tier,testId): {id,number,status,statusText} {
    const tierText = (tier == 'stable' ? '' : '-'+tier);
    const buildNumberRE = "^\\d+\\.\\d+\\.\\d+"+tierText+"-test$";
    const tcData = this.status.teamCity[this.getPlatform(platformId).configs[testId]];
    const tcRunningData = this.status.teamCityRunning[this.getPlatform(platformId).configs[testId]];
    if(!tcRunningData) return null;
    const build = tcRunningData.builds.find(build => build.number.match(buildNumberRE));
    if(build) {
      // teamcity returns 'SUCCESS' for a pending build that hasn't yet failed
      return {
        id: build.id,
        number: build.number,
        status: build.status == 'SUCCESS' ? 'PENDING' : build.status,
        statusText: build.statusText
      };
    }

    return tcData.builds.find(build => build.number.match(buildNumberRE));
  }

  tierTestClass(platformId,tier,testId='test') {
    if(!this.status) return null;
    const build = this.tierTestRunningAndLatestBuild(platformId,tier,testId);
    if(build) {
      switch(build.status) {
        case 'SUCCESS': return 'tier-test-success';
        case 'FAILURE': return 'tier-test-failure';
        default: return 'tier-test-pending';
      }
    }
    return null;
  }

  tierTestTitle(platformId,tier,testId='test') {
    if(!this.status) return null;
    const build = this.tierTestRunningAndLatestBuild(platformId,tier,testId);
    return (testId == 'test' ? '' : testId+': ') + (build ? build.number+'('+build.status+'): '+build.statusText : null);
  }

  tierTestLink(platformId,tier,testId='test') {
    if(!this.status) return null;
    const build = this.tierTestRunningAndLatestBuild(platformId,tier,testId);
    return build ? `https://build.palaso.org/viewLog.html?buildId=${build.id}` : null;
  }

  platformToTierId(platformId) {
    switch(platformId) {
      case 'linux': return 'testLinux';
      case 'mac': return 'testMac';
      case 'web': return 'testWASM';
      case 'windows': return 'testWindows';
    }
    return platformId;
  }

  hasReleaseBuild(platform) {
    return platform.id != 'common' && platform.id != 'core' && platform.id != 'resources';
  }

}
