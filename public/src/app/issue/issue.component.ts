import { Component, OnInit, Input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { labelColor } from '../utility/labelColor';
import emojiRegex from 'emoji-regex';
import { PopupComponent } from '../popup/popup.component';
import { PopupCoordinatorService } from '../popup-coordinator.service';
//import { issueStatus, issueUserTesting, issueBuildState } from '../utility/issueStatus';
import { VisibilityService } from '../visibility/visibility.service';
import { ThisReceiver } from '@angular/compiler';
import { getAuthorAvatarUrl } from '../../../../shared/users';

@Component({
    selector: 'app-issue',
    templateUrl: './issue.component.html',
    styleUrls: ['./issue.component.css'],
    standalone: false
})
export class IssueComponent extends PopupComponent implements OnInit {
  @Input() changeCounter: number;
  @Input() issue: any;
  @Input() teamCity?: any;
  @Input() class?: string;
  @Input() scope?: string;
  @Input() scopeValue?: string;
  contexts: any;

  constructor(private sanitizer: DomSanitizer, popupCoordinator: PopupCoordinatorService, visibilityService: VisibilityService) {
    super(popupCoordinator, visibilityService);
  }

  ngOnInit() {
    this.popupId = 'issue-'+this.issue.number+(this.scopeValue ? '-'+this.scopeValue:'');
    if(!this.gravityX) this.gravityX = 'right';
    if(!this.gravityY) this.gravityY = 'bottom';
    super.ngOnInit();
  }

  issueClass() {
    return this.issue.milestone ? this.issue.milestone.title == 'Future' ? 'future ' : '' : '';
  }

  issueUserTesting() {
    const
      hasUserTest = this.issue.labels.nodes.find(node => node.name=='has-user-test'),
      userTestPending = this.issue.labels.nodes.find(node => node.name=='user-test-required'),
      userTestFailed =  this.issue.labels.nodes.find(node => node.name=='user-test-failed');
    return hasUserTest ?
        userTestPending ? 'user-test-pending' :
          userTestFailed ? 'user-test-failure' : 'user-test-success' : '';
//        : ''
  //    'user-test-pending' ?  : 'user-test-complete'; //issueUserTesting(this.issue);
  }

  issueEmoji() {
    let title: string = this.issue.title;
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

  getAuthorAvatar(author, size) {
    return getAuthorAvatarUrl(author, size);
  }

}
