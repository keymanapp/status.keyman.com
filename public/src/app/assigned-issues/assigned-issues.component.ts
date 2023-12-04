import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { getAuthorAvatarUrl } from '../../../../shared/users';
import { issueLabelScopes } from "../../../../shared/issue-labels";

import { IssueClipboard } from '../utility/issue-clipboard';
import { labelColor } from '../utility/labelColor';

@Component({
  selector: 'app-assigned-issues',
  templateUrl: './assigned-issues.component.html',
  styleUrls: ['./assigned-issues.component.css']
})
export class AssignedIssuesComponent implements OnInit, OnChanges {
  @Input() status: any;
  @Input() user: any;
  @Input() selectedView: any;

  _issues = null;

  constructor(private sanitizer: DomSanitizer) { }

  ngOnInit(): void {
  }

  ngOnChanges() {
    this._issues = null;
  }

  trackByIssue(index, item) {
    return item.number;
  }

  getIssueListText() {
    return IssueClipboard.getIssueListText(this.issues());
  }

  issueSort(a,b) {
    // keyman repo always sorts first
    let a0 = (a.repository.name == 'keyman');
    let b0 = (b.repository.name == 'keyman');
    if(a0 && !b0) return -1;
    if(b0 && !a0) return 1;
    // compare repo names
    let x = a.repository.name.localeCompare(b.repository.name);
    if(x) return x;
    // compare labels with '/'
    let alabel = a.labels.nodes.find(label => label.name.endsWith('/'));
    let blabel = b.labels.nodes.find(label => label.name.endsWith('/'));
    if(alabel && !blabel) return -1;
    if(blabel && !alabel) return 1;
    if(alabel && blabel && alabel.name != blabel.name) {
      let al0 = alabel.name.match(/^[^/]+\//)[0];
      let bl0 = blabel.name.match(/^[^/]+\//)[0];
      let ali = issueLabelScopes.indexOf(al0);
      let bli = issueLabelScopes.indexOf(bl0);
      return ali-bli;
      //return alabel.name.localeCompare(blabel.name);
    }
    // compare issue number
    return a.number - b.number;
  }

  issueIsFirst(issue) {
    if(!this._issues) return false;
    let n = this._issues?.indexOf(issue);
    return n == 0;
  }

  issueIsDifferentRepo(issue) {
    if(!this._issues) return false;
    let n = this._issues?.indexOf(issue);
    if(n > 0) {
      return this._issues[n-1].repository.name != issue.repository.name;
    }
    return true;
  }

  issues() {
    if(this._issues) {
      return this._issues;
    }

    if(!this.status?.issues) {
      return [];
    }

    if(this.user.login == '') {
      // unassigned issues
      this._issues = this.status.issues.filter(issue =>
        issue.milestone?.title == this.status.currentSprint?.title &&
        issue.assignees.nodes.length == 0
      ).sort(this.issueSort);
    }
    else {
      this._issues = this.status.issues.filter(issue =>
        // We always report issues from keyboards repo because it doesn't use sprint milestones
        (issue.repository.name == 'keyboards' || issue.milestone?.title == this.status.currentSprint?.title) &&
        issue.assignees.nodes.find(assignee => assignee.login == this.user.login) !== undefined
      ).sort(this.issueSort);
    }
    return this._issues;
  }

  getAuthorAvatar(author, size) {
    return getAuthorAvatarUrl(author, size);
  }

  issueHasLinkedPR(issue) {
    return issue && issue.timelineItems && Array.isArray(issue.timelineItems.nodes) ?
      issue.timelineItems.nodes.find(pr => pr.subject.url && pr.subject.url.includes('/pull/') && pr.willCloseTarget) != null : false;
  }

  labelColor(label) {
    return this.sanitizer.bypassSecurityTrustStyle(labelColor(label));
  }

  labelName(label: string) {
    return label.replace(/-/g, '‑');
  }

}
