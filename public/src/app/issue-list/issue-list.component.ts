import { Component, OnInit, Input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { labelColor } from '../utility/labelColor';
import { PopupCoordinatorService } from '../popup-coordinator.service';
import { PopupComponent } from '../popup/popup.component';
import { VisibilityService } from '../visibility/visibility.service';
import { getAuthorAvatarUrl } from '../../../../shared/users';
import { IssueClipboard } from '../utility/issue-clipboard';

export enum IssueView {
  Current = 'current',
  All = 'all'
};

@Component({
  selector: 'app-issue-list',
  templateUrl: './issue-list.component.html',
  styleUrls: ['./issue-list.component.css']
})
export class IssueListComponent extends PopupComponent implements OnInit {
  @Input() view?: IssueView;
  @Input() isNav: boolean;
  @Input() issues: any;
  @Input() repo?: any;
  @Input() milestone?: any;
  @Input() platform?: any;

  constructor(private sanitizer: DomSanitizer, popupCoordinator: PopupCoordinatorService, visibilityService: VisibilityService) {
    super(popupCoordinator, visibilityService);
  }

  ngOnInit() {
    this.popupId = 'issues-'+(this.platform ? this.platform.value.id : this.repo)+'-'+this.milestone?.title;
    if(!this.gravityX) this.gravityX = 'right';
    if(!this.gravityY) this.gravityY = 'bottom';
    super.ngOnInit();
  }

  labelColor(label) {
    return this.sanitizer.bypassSecurityTrustStyle(labelColor(label));
  }

  labelName(label: string) {
    return label.replace(/-/g, '‑');
  }

  trackByIssue(index, item) {
    return item.number;
  }

  getUnfixedIssueCount() {
    const fixedIssueCount = this.issues?.filter(this.issueHasLinkedPR).length ?? 0;
    return (this.milestone?.count ?? 0) - fixedIssueCount;
  }

  getIssueListText() {
    if(!this.issues) return null;
    return IssueClipboard.getIssueListText(this.issues);
  }

  issueHasLinkedPR(issue) {
    return issue && issue.timelineItems && Array.isArray(issue.timelineItems.nodes) ?
      issue.timelineItems.nodes.find(pr => pr.subject.url && pr.subject.url.includes('/pull/') && pr.willCloseTarget) != null : false;
  }

  errorClassIfNonZero(v) {
    if(v !== null && v != 0) return "failure";
    return "";
  }

  getAuthorAvatar(author, size) {
    return getAuthorAvatarUrl(author, size);
  }

}
