import { repoShortNameFromGithubUrl } from './repoShortNameFromGithubUrl';
import { escapeHtml } from './escapeHtml';

export class IssueClipboard {

  static issueHasLinkedPR(issue) {
    return issue && issue.timelineItems && Array.isArray(issue.timelineItems.nodes) ?
      issue.timelineItems.nodes.find(pr => pr.subject.url && pr.subject.url.includes('/pull/') && pr.willCloseTarget) != null : false;
  }

  public static getIssueListText(issues, showMilestone?) {
    const text =
      '<ul>' +
      issues.reduce(
        (text, node) => {
          const repo = repoShortNameFromGithubUrl(node.url);
          const check = this.issueHasLinkedPR(node) ? '✔ ' : '';
          const prs = check
            ? node.timelineItems.nodes.reduce(
                (current, pr) => `${current} <a href='${pr.subject.url}'>#${pr.subject.number}</a>`, ' 🔗 '
              )
            : '';
          return text +
            `<li>${check}${escapeHtml(node.title)} ${showMilestone ? ('<b>'+(node.milestone?.title ?? '')+'</b> ') : ''}`+
            `(<a href='${node.url}'>${repo}#${node.number}</a>)${prs}</li>\n`
        }, '') +
      '</ul>';
    return { content: text, type: 'text/html' };
  }

}