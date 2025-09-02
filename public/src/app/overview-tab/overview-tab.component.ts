import { Component } from '@angular/core';
import { platforms, PlatformSpec } from '../../../../shared/platforms';
import { getAvatarUrl, getUserAvatarUrl } from '../../../../shared/users';
import { IssueClipboard } from '../utility/issue-clipboard';
import { PullRequestClipboard } from '../utility/pull-request-clipboard';
import { ContributionsModel } from '../data/contributions.model';
import { dataModel } from '../data/data.model';
import { appState } from '../../state';

@Component({
    selector: 'app-overview-tab',
    templateUrl: './overview-tab.component.html',
    styleUrls: ['./overview-tab.component.css'],
    standalone: false
})
export class OverviewTabComponent {
  error: any;
  timer: any;
  title = 'Keyman Status';

  TIMER_INTERVAL = 60000; //msec  //TODO: make this static for dev side?

  // Data proxies
  get data() { return dataModel }
  get status() { return dataModel.status }
  get platforms() { return dataModel.platforms }
  get sites() { return dataModel.sites }
  get pullsByBase() { return dataModel.pullsByBase }
  get sprintDays() { return dataModel.sprintDays }
  get phase() { return dataModel.phase }
  get phaseStart() { return dataModel.phaseStart }
  get phaseEnd() { return dataModel.phaseEnd }
  get unlabeledPulls() { return dataModel.unlabeledPulls }
  get changeCounter() { return dataModel.changeCounter }
  get userTestIssues() { return dataModel.userTestIssues }
  get userTestIssuesPassed() { return dataModel.userTestIssuesPassed }
  get pullsByStatus() { return dataModel.pullsByStatus }
  get pullStatusName() { return dataModel.pullStatusName }
  get pullsByProject() { return dataModel.pullsByProject }
  get pullsByAuthor() { return dataModel.pullsByAuthor }
  get otherSites() { return dataModel.otherSites }
  get keyboardPRs() { return dataModel.keyboardPRs }
  get lexicalModelPRs() { return dataModel.lexicalModelPRs }
  get keyboardIssues() { return dataModel.keyboardIssues }
  get lexicalModelIssues() { return dataModel.lexicalModelIssues }

  // State proxies
  get issueView() { return appState.homeIssueView; }
  setIssueView(value) { appState.homeIssueView = value; }
  get pullRequestView() { return appState.homePullRequestView; }
  setPRView(value) { appState.homePullRequestView = value; }

  // Query parameter proxies
  get showContributions() { return appState.showContributions }
  get showCodeOwners() { return appState.showCodeOwners }
  get showRefreshButton() { return appState.showRefreshButton }
  get showAgents() { return appState.showAgents }
  get sprintOverride() { return appState.sprintOverride }

  isBetaRunning() {
    let e = this.status && this.status.github ? this.status.github.data.repository.refs.nodes.find(e => e.name == 'beta') : undefined;
    return (typeof e != 'undefined');
  }

  getAvatar(name) {
    return getAvatarUrl(name);
  }

  clipboardAllIssues = () => {
    // We want issues for current sprint only at this point. These should be
    // copied after we rotate milestones for planning purposes, so we have the
    // full list of issues allocated to the current sprint.

    let text = '<ul>';

    for(let platform of this.platforms) {
      const issues = platform.milestones.reduce(
        (prev,m) => m.nodes && (m.id == 'current' || m.id == 'other') ? [].concat(prev, m.nodes) : prev,
        []
      );
      if(issues.length) {
        text += `<li>${platform.name}${IssueClipboard.getIssueListText(issues).content}</li>`;
      }
    }

    for(let siteName of Object.keys(this.sites)) {
      let site = this.sites[siteName];
      const issues = site.milestones.reduce(
        (prev,m) => m.nodes && (m.id == 'current' || m.id == 'other') ? [].concat(prev, m.nodes) : prev,
        []
      );
      if(issues.length) {
        text += `<li>${siteName}${IssueClipboard.getIssueListText(issues).content}</li>`;
      }
    }

    text += `</ul>`;

    return { content: text, type: 'text/html' };
  }

  clipboardAllPullRequests = () => {
    return PullRequestClipboard.getPullRequestListByArea(this.pullsByBase, this.sites);
  }

  getSiteLivelinessClass = (site) => {
    return this.status.siteLiveliness?.find?.(item => item.site == site)?.state ?? 'unknown'; // 'dead'; // | 'alive' | 'ready'
  }
}
