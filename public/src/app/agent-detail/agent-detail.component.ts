import { Component, Input, OnInit } from '@angular/core';
import { platforms, PlatformSpec } from '../../../../shared/platforms';
import { PopupCoordinatorService } from '../popup-coordinator.service';
import { PopupComponent } from '../popup/popup.component';
import { VisibilityService } from '../visibility/visibility.service';

@Component({
  selector: 'app-agent-detail',
  templateUrl: './agent-detail.component.html',
  styleUrls: ['./agent-detail.component.css']
})
export class AgentDetailComponent extends PopupComponent implements OnInit {
  @Input() agent: any;
  @Input() status: any;

  platform: PlatformSpec;
  buildType: string;
  branch: string;
  pullRequest: any;

  constructor(popupCoordinator: PopupCoordinatorService, visibilityService: VisibilityService) {
    super(popupCoordinator, visibilityService);
  }

  buildTypeFromConfig(buildTypeId: string, pspec: PlatformSpec) {
    if(!pspec.configs) {
      return undefined;
    }
    return Object.getOwnPropertyNames(pspec.configs).find(c => pspec.configs[c] == buildTypeId);
  }

  ngOnInit(): void {
    this.popupId = 'agent-'+this.agent.name;
    super.ngOnInit();

    if(this.agent && this.agent.build) {
      const pspec = platforms.find(p => this.buildTypeFromConfig(this.agent.build.buildTypeId, p) != undefined);
      if(!pspec) {
        this.platform = platforms.find(p => p.id == 'common');
        this.buildType = this.agent.build.buildTypeId;
      } else {
        this.platform = pspec;
        this.buildType = this.buildTypeFromConfig(this.agent.build.buildTypeId, this.platform);
      }
      if(this.agent.build.branchName?.match(/^\d+$/)) {
        const prNumber = parseInt(this.agent.build.branchName, 10);
        this.pullRequest = this.status.github?.data?.repository?.pullRequests?.edges?.find(pr => pr.node?.number == prNumber)?.node;
        if(!this.pullRequest) {
          this.pullRequest = {number: prNumber, title: '<unknown pull request>'};
        }
      } else {
        this.branch = this.agent.build.branchName;
      }
    }
  }

  /* Build agent status icons */

  agentStatus(agent: any): { title: string, class: string } {
    let result = { title: '', class: '' };
    if(!agent.connected) {
      result.title = 'Offline';
      result.class = 'agent-offline';
    } else if(!agent.enabled) {
      result.title = 'Disabled';
      result.class = 'agent-offline';
    } else {
      if(agent.idleSinceTime) {
        result.title = "Idle";
        result.class = 'agent-idle';
      } else if(agent.build) {
        result.title = "Building";
        result.class = agent.build.status == 'FAILURE' ? 'agent-failure' : 'agent-busy';
      } else {
        result.title = 'Unknown build status';
        result.class = 'agent-failure';
      }
    }
    return result;
  }

  agentNameToPlatform(name: string): string {
    if(name.match(/^ba-win/)) return 'windows';
    if(name.match(/^ba-mac/)) return 'mac';
    if(name.match(/^ba-bionic/)) return 'linux';
    if(name.match(/^ba-jammy/)) return 'linux';
    return 'common'; // unknown agent
  }

}
