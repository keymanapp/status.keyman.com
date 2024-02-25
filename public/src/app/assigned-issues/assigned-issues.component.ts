import { Component, Input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { getAuthorAvatarUrl } from '../../../../shared/users';
import { issueLabelScopes } from "../../../../shared/issue-labels";

import { IssueClipboard } from '../utility/issue-clipboard';
import { labelColor } from '../utility/labelColor';
import { PullRequestClipboard } from '../utility/pull-request-clipboard';
import { dataModel } from '../data/data.model';

@Component({
  selector: 'app-assigned-issues',
  templateUrl: './assigned-issues.component.html',
  styleUrls: ['./assigned-issues.component.css']
})
export class AssignedIssuesComponent {
  @Input() user: any;
  @Input() issues: any;

  // data proxies
  get status() { return dataModel.status }
  get pullsByBase() { return dataModel.pullsByBase }
  get sites() { return dataModel.sites }

  constructor(private sanitizer: DomSanitizer) { }

  trackByIssue(index, item) {
    return item.number;
  }

  getIssueListText() {
    if(!this.status.currentSprint) return { content: '', type: 'text/html' };

    const release = this.status.currentSprint.title.substring(0,4);
    const sprintNumber = Number.parseInt(this.status.currentSprint.title.substring(4));
    // If we are collecting triaged issues near the end of the current sprint then we
    // want next sprint's issues too
    const offset = Date.now() >= new Date(this.status.currentSprint.start).valueOf() + 8*24*60*60*1000 ? 1 : 0;
    if(!this.status.issues) {
      return '';
    }
    const issues = this.status.issues.filter(issue =>
      (
        !issue.milestone || // for keyboards repo or untriaged issues
        (issue.milestone.title.startsWith(release) && Number.parseInt(issue.milestone.title.substring(4)) <= sprintNumber+offset) // matches sprint milestones
      ) &&
      (
        (this.user.login == "" && !issue.assignees.nodes.length && issue.milestone?.title == this.status.currentSprint?.title) ||
        (this.user.login != "" && issue.assignees.nodes.find(assignee => assignee.login == this.user.login) !== undefined)
      )

    ).sort(this.issueSort);
    const issuesList = IssueClipboard.getIssueListText(issues, true).content;
    const prList = PullRequestClipboard.getPullRequestListForAuthor(this.pullsByBase, this.sites, this.user.login).content;
    const text = this.user.login == ''
      ? issuesList
      : `<ul><li><b>Current Pull Requests</b>\n${prList}</li><li><b>Assigned Issues</b>\n${issuesList}</li></ul>`;
    return { content: text, type: 'text/html' };
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
    if(!this.issues) return false;
    let n = this.issues?.indexOf(issue);
    return n == 0;
  }

  issueIsDifferentRepo(issue) {
    if(!this.issues) return false;
    let n = this.issues?.indexOf(issue);
    if(n > 0) {
      return this.issues[n-1].repository.name != issue.repository.name;
    }
    return true;
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
