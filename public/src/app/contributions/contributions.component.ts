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

  getUserAvatar(user, size) {
    return getUserAvatarUrl(user, size);
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
    if(n && context.day) {
      n = (new FilterObjectByDatePipe()).transform(n, context.day.date);
    }
    return n || [];
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
