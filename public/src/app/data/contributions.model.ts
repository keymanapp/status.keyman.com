import { FilterObjectByDatePipe } from '../pipes/filter-object-by-date.pipe';
import { escapeHtml } from '../utility/escapeHtml';
import { repoShortNameFromGithubUrl } from '../utility/repoShortNameFromGithubUrl';

export class ContributionsModel {

  static getUserContributions = (sprintDays, status, context) => {
    let text = '';

    if(context.user.contributions.issues.nodes.length) {
      text += `<h3>Issues</h3>${ContributionsModel.getContributionIssueText(context).content}`;
    }

    if(context.user.contributions.pullRequests.nodes.length) {
      text += `<h3>Pull Requests</h3>${ContributionsModel.getContributionPRText(context).content}`;
    }

    if(context.user.contributions.reviews.nodes.length) {
      text += `<h3>Reviews</h3>${ContributionsModel.getContributionReviewText(context).content}`;
    }

    if(context.user.contributions.tests.nodes.length) {
      text += `<h3>User Tests</h3>${ContributionsModel.getContributionTestText(context).content}`;
    }

    if(ContributionsModel.getContributionPosts(sprintDays, status, context).length) {
      text += `<h3>Topic Posts</h3>${ContributionsModel.getContributionPostText(sprintDays, status, context).content}`;
    }

    return { content: text, type: 'text/html' };
    }

  static getContributionText(nodes, type, day?) {
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

  static getContributionPRText = (context) => {
    return ContributionsModel.getContributionText(context.user.contributions.pullRequests.nodes, 'pullRequest', context.day);
  }

  static getContributionIssueText = (context) => {
    return ContributionsModel.getContributionText(context.user.contributions.issues.nodes, 'issue', context.day);
  }

  static getContributionReviewText = (context) => {
    return ContributionsModel.getContributionText(context.user.contributions.reviews.nodes, 'pullRequest', context.day);
  }

  static getContributionTestText = (context) => {
    return ContributionsModel.getContributionText(context.user.contributions.tests.nodes, 'issue', context.day);
  }

  /* Community Site Post Contributions */

  static getContributionPosts(sprintDays, status, context) {
    let n = status.communitySite?.[context.user.login];

    if(!n) {
      return [];
    }

    if(context.day) {
      return (new FilterObjectByDatePipe()).transform(n, context.day.date);
    }

    // Filter to contributions in this sprint only
    let min = sprintDays[0].date;
    let max = sprintDays[13].date;
    max.setDate(max.getDate()+1);

    return n.filter(item => {
      let od = new Date(item.occurredAt);
      return od >= min && od < max;
    }).sort(
      (a,b) => new Date(a.occurredAt).valueOf() - new Date(b.occurredAt).valueOf()
    );
  }

  static getContributionPostText = (sprintDays, status, context) => {
    let n = ContributionsModel.getContributionPosts(sprintDays, status, context);
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