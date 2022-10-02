import { Component, Input, OnInit } from '@angular/core';
import { FilterObjectByDatePipe } from '../pipes/filter-object-by-date.pipe';
import { escapeHtml } from '../utility/escapeHtml';
import { repoShortNameFromGithubUrl } from '../utility/repoShortNameFromGithubUrl';

@Component({
  selector: 'app-contributions',
  templateUrl: './contributions.component.html',
  styleUrls: ['./contributions.component.css']
})
export class ContributionsComponent implements OnInit {

  @Input() status: any;
  @Input() sprintDays: any;

  selectedContribution = null;
  hoveredContribution = null;

  constructor() { }

  stringify(o: any) {
    return JSON.stringify(o);
  }
  ngOnInit(): void {
  }

  shouldDisplay(user) {
    return user.contributions.tests.nodes.length +
      user.contributions.pullRequests.nodes.length +
      user.contributions.reviews.nodes.length +
      user.contributions.issues.nodes.length +
      (this.status?.communitySite?.[user.login]?.length ?? 0) > 0;
  }

  selectUser(login) {
    this.selectedContribution = login == this.selectedContribution ? null : login;
  }

  hoverUser(event,login) {
    if(event.type == 'mouseenter' || event.currentTarget.parentElement.contains(event.relatedTarget)) {
      this.hoveredContribution = login;
    } else {
      this.hoveredContribution = null;
    }
  }

  getContributionText(nodes, type, day?) {
    let n = nodes.reverse();
    if(day) {
      n = (new FilterObjectByDatePipe()).transform(n, day.date);
    }
    const text =
      '<ul>' +
      n.reduce(
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

  getContributionPostText = (context) => {
    let n = this.status.communitySite?.[context.user.login];
    if(!n) return { context: '', type: 'text/html' };

    if(context.day) {
      n = (new FilterObjectByDatePipe()).transform(n, context.day.date);
    }

    const text =
      '<ul>' +
      n.reduce((text, node) => text + `<li>${escapeHtml(node.title)} (<a href='${node.url}'>${node.topic_id}#${node.post_number}</a>)</li>\n`, '') +
      '</ul>';
    return { content: text, type: 'text/html' };
  }
}
