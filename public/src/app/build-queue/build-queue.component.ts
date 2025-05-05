import { Component, Input, OnInit } from '@angular/core';
import { platforms, PlatformSpec } from '../../../../shared/platforms';
import { PopupCoordinatorService } from '../popup-coordinator.service';
import { PopupComponent } from '../popup/popup.component';
import { VisibilityService } from '../visibility/visibility.service';

@Component({
    selector: 'app-build-queue',
    templateUrl: './build-queue.component.html',
    styleUrls: ['./build-queue.component.css'],
    standalone: false
})
export class BuildQueueComponent extends PopupComponent implements OnInit {
  @Input() queue: any;
  @Input() status: any;

  constructor(popupCoordinator: PopupCoordinatorService, visibilityService: VisibilityService) {
    super(popupCoordinator, visibilityService);
  }

  buildTypeFromConfig(buildTypeId: string, pspec: PlatformSpec) {
    if(!pspec.configs) {
      return undefined;
    }
    let config = Object.getOwnPropertyNames(pspec.configs).find(c => pspec.configs[c] == buildTypeId);
    switch(config) {
      case 'alpha':
      case 'beta':
      case 'stable':
        return 'release';
    }
    return config;
  }

  isPullRequest(build) {
    return !!build.branchName?.match(/^\d+$/);
  }

  getPlatformSpec(build) {
    const pspec = platforms.find(p => this.buildTypeFromConfig(build.buildTypeId, p) != undefined);
    return pspec ?? platforms.find(p => p.id == 'common');
  }

  getPlatform(build) {
    const pspec = this.getPlatformSpec(build);
    return pspec.name;
  }

  getBuildType(build) {
    const pspec = this.getPlatformSpec(build);
    return this.buildTypeFromConfig(build.buildTypeId, pspec) ?? build.buildTypeId;
  }

  getPullRequestTitle(build) {
    const prNumber = parseInt(build.branchName, 10);
    const pullRequest = this.status.github?.data?.repository?.pullRequests?.edges?.find(pr => pr.node?.number == prNumber)?.node;
    return pullRequest ? pullRequest.title : '<unknown pull request>';
  }

  ngOnInit(): void {
    this.popupId = 'queue-popup';
    super.ngOnInit();
  }
}
