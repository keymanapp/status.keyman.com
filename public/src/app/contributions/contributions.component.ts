import { Component, Input, OnInit } from '@angular/core';
import { getUserAvatarUrl } from '../../../../shared/users';
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

  selectedView = 0;
  selectedContribution = null;
  hoveredContribution = null;

  nullUser = { login:'', avatarUrl: null, contributions: {
    issues: { nodes: [] },
    pullRequests: { nodes: [] },
    reviews: { nodes: [] },
    tests: { nodes: [] },
  } };

  constructor() { }

  stringify(o: any) {
    return JSON.stringify(o);
  }

  users() {
    let users = [];
    if(this.status?.contributions?.data.repository.contributions.nodes) {
      users = [].concat([this.nullUser],this.status?.contributions?.data.repository.contributions.nodes);
    }
    return users;
  }

  ngOnInit(): void {
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
    return getUserAvatarUrl(user, size);
  }

  contributionCount(user) {
    return user.contributions.tests.nodes.length +
      user.contributions.pullRequests.nodes.length +
      user.contributions.reviews.nodes.length +
      user.contributions.issues.nodes.length +
      (this.status?.communitySite?.[user.login]?.length ?? 0);
  }

  selectUser(login) {
    this.selectedContribution = login == this.selectedContribution ? null : login;
  }

  hoverSubItem(event,login,item) {
    this.selectedView = item;
  }

  hoverUser(event,login) {
    if(event.type == 'mouseenter' || event.currentTarget.parentElement.contains(event.relatedTarget)) {
      this.hoveredContribution = login;
      if(login == '') this.selectedView = 0;
    } else {
      this.hoveredContribution = null;
    }
  }

  getAllContributions = () => {
    let text = '';
    for(let user of this.status?.contributions?.data.repository.contributions.nodes) {
      let userContributions = this.getUserContributions({user: user}).content;
      if(userContributions) {
        text += `
          <h2><img style="width:32px; height:32px" src="${this.getUserAvatar(user, 32)}"> ${user.login}</h2>
          ${userContributions}
          <hr>
        `;
      }
    }
    return { content: text, type: 'text/html' };
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
}
