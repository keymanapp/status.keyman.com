import { Component, OnInit, Input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { repoShortNameFromGithubUrl } from '../utility/repoShortNameFromGithubUrl';
import { escapeHtml } from '../utility/escapeHtml';
import { labelColor } from '../utility/labelColor';
import { PopupCoordinatorService } from '../popup-coordinator.service';
import { PopupComponent } from '../popup/popup.component';
import { VisibilityService } from '../visibility/visibility.service';

export enum IssueView {
  Current = 'current',
  All = 'all'
};

@Component({
    selector: 'app-pull-request-list',
    templateUrl: './pull-request-list.component.html',
    styleUrls: ['./pull-request-list.component.css'],
    standalone: false
})
export class PullRequestListComponent extends PopupComponent implements OnInit {
  @Input() view?: IssueView;
  @Input() pullRequests: any;
  @Input() repo?: any;
  @Input() milestone?: any;
  @Input() platform?: any;
  @Input() status: any;

  constructor(private sanitizer: DomSanitizer, popupCoordinator: PopupCoordinatorService, visibilityService: VisibilityService) {
    super(popupCoordinator, visibilityService);
  }

  ngOnInit() {
    this.popupId = 'pulls-'+(this.platform ? this.platform.id : this.repo)+'-'+this.milestone?.title;
    if(!this.gravityX) this.gravityX = 'right';
    if(!this.gravityY) this.gravityY = 'bottom';
    super.ngOnInit();
  }
}
