import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { issueLabelScopes } from '../../../../shared/issue-labels';
import { getUserAvatarUrl, getTz } from '../../../../shared/users';
import { appState } from '../../state';
import { dataModel } from '../data/data.model';
import { FilterObjectByDatePipe } from '../pipes/filter-object-by-date.pipe';
import { escapeHtml } from '../utility/escapeHtml';
import { repoShortNameFromGithubUrl } from '../utility/repoShortNameFromGithubUrl';

@Component({
  selector: 'app-contributions-tab',
  templateUrl: './contributions-tab.component.html',
  styleUrls: ['./contributions-tab.component.css']
})
export class ContributionsTabComponent implements OnInit, OnChanges {

  @Input() user: any;

  // data proxies
  get status() { return dataModel.status }
  get sprintDays() { return dataModel.sprintDays }
  get pullsByBase() { return dataModel.pullsByBase }
  get sites() { return dataModel.sites }
  get userTz() { return getTz(this.user?.login); }

  userDate() {
    return new Date().toLocaleString([], {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: this.userTz,
      timeZoneName: "long",
    });
  }

  currentView() {
    return appState.userView;
  }

  _issues = null;

  constructor() { }

  stringify(o: any) {
    return JSON.stringify(o);
  }

  ngOnInit(): void {
  }

  ngOnChanges() {
    this._issues = null;
  }


  shouldDisplay(user) {
    if(user.login == '') {
      // unassigned
      return this.status?.issues?.find(issue =>
        issue.milestone?.title == this.status.currentSprint?.title &&
        issue.assignees.nodes.length == 0
      ) !== undefined;
    }
    return this.contributionCount(user) > 0 ||
      this.status?.issues?.find(issue =>
        issue.milestone?.title == this.status.currentSprint?.title &&
        issue.assignees.nodes.find(assignee => assignee.login == user.login) !== undefined) !== undefined;
  }

  getUserAvatar(user, size) {
    if(user.login == '') return null;
    return getUserAvatarUrl(user, size);
  }

  contributionCount(user) {
    return user.contributions.tests.nodes.length +
      user.contributions.pullRequests.nodes.length +
      user.contributions.reviews.nodes.length +
      user.contributions.issues.nodes.length +
      (this.status?.communitySite?.[user.login]?.length ?? 0);
  }

  hoverSubItem(item) {
    appState.userView = item;
  }

  getUserContributions = (context) => {
    let text = '';

    if(context.user.contributions.issues.nodes.length) {
      text += `<h3>Issues</h3>${this.getContributionIssueText(context).content}`;
    }

    if(context.user.contributions.pullRequests.nodes.length) {
      text += `<h3>Pull Requests</h3>${this.getContributionPRText(context).content}`;
    }

    if(context.user.contributions.reviews.nodes.length) {
      text += `<h3>Reviews</h3>${this.getContributionReviewText(context).content}`;
    }

    if(context.user.contributions.tests.nodes.length) {
      text += `<h3>User Tests</h3>${this.getContributionTestText(context).content}`;
    }

    if(this.getContributionPosts(context).length) {
      text += `<h3>Topic Posts</h3>${this.getContributionPostText(context).content}`;
    }

    return { content: text, type: 'text/html' };
  }

  getContributionText(nodes, type, day?) {
    let n = nodes.reverse();
    if(day) {
      n = (new FilterObjectByDatePipe()).transform(n, day.date);
    }
    const text =
      '<ul>' +
      n.sort((a,b)=>a[type].title.localeCompare(b[type].title))
       .reduce(
        (text, node) => {
          const url = node.url ?? node[type].url;
          const repo = repoShortNameFromGithubUrl(url);
          return text + `<li>${escapeHtml(node[type].title)} (<a href='${url}'>${repo}#${node[type].number}</a>)</li>\n`
        }, '') +
      '</ul>';
    return { content: text, type: 'text/html' };
  }

  getContributionPRText = (context) => {
    return this.getContributionText(context.user.contributions.pullRequests.nodes, 'pullRequest', context.day);
  }

  getContributionIssueText = (context) => {
    return this.getContributionText(context.user.contributions.issues.nodes, 'issue', context.day);
  }

  getContributionReviewText = (context) => {
    return this.getContributionText(context.user.contributions.reviews.nodes, 'pullRequest', context.day);
  }

  getContributionTestText = (context) => {
    return this.getContributionText(context.user.contributions.tests.nodes, 'issue', context.day);
  }

  /* Community Site Post Contributions */

  getContributionPosts(context) {
    let n = this.status.communitySite?.[context.user.login];

    if(!n) {
      return [];
    }

    if(context.day) {
      return (new FilterObjectByDatePipe()).transform(n, context.day.date);
    }

    // Filter to contributions in this sprint only
    let min = this.sprintDays[0].date;
    let max = this.sprintDays[13].date;
    max.setDate(max.getDate()+1);

    return n.filter(item => {
      let od = new Date(item.occurredAt);
      return od >= min && od < max;
    }).sort(
      (a,b) => new Date(a.occurredAt).valueOf() - new Date(b.occurredAt).valueOf()
    );
  }

  getContributionPostText = (context) => {
    let n = this.getContributionPosts(context);
    if(!n || !n.length) {
      return { content: '', type: 'text/html' };
    }

    // Merge posts on same topic
    const topics = {};
    n.forEach((node) => {
      topics[node.topic_id] = topics[node.topic_id] || [];
      topics[node.topic_id].push(node);
    });
    const list = Object.keys(topics).reduce((text, node) => {
      const t: Array<any> = topics[node];
      const links = t.sort((a,b)=>a.post_number-b.post_number).map(node => `<a href='${node.url}'>${node.topic_id}#${node.post_number}</a>`).join(', ');
      return text + `<li>✉ ${escapeHtml(t[0].title)} (${links})</li>\n`
    }, '');

    const text = `<ul>${list}</ul>`;
    return { content: text, type: 'text/html' };
  }

  // issues

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

}
