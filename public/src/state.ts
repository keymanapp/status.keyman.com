
// TODO: we will refactor some of this into Angular routes
// TODO: add query parameters to this and add controls to toggle
type AppStateItem = 'user.view' | 'home.issueView' | 'home.pullRequestView' | 'home.activeTab';

export type UserView = 'assigned-issues' | 'contributions';

export enum IssueView {
  Current = 'current',
  All = 'all'
};

export enum PullRequestView {
  Platform = 'platform',
  Project = 'project',
  Status = 'status',
  Author = 'author',
  Base = 'base'
};

class AppState {
  constructor() {
    'path = /'; // overview
    'path = /mcdurdin/assigned-issues';
    'path = /mcdurdin/contributions';
    // location.hash;
  }

  private setItem(name: AppStateItem, value) {
    localStorage.setItem(name, value);
  }

  private getItem(name: AppStateItem) {
    return localStorage.getItem(name);
  }

  // user.view

  public get userView(): UserView {
    return <UserView>this.getItem('user.view') || 'contributions';
  }

  public set userView(value: UserView) {
    this.setItem('user.view', value);
  }

  // home.issueView

  public get homeIssueView(): IssueView {
    return <IssueView>this.getItem('home.issueView') || IssueView.Current;
  }

  public set homeIssueView(value: IssueView) {
    this.setItem('home.issueView', value);
  }

  // home.pullRequestView

  public get homePullRequestView(): PullRequestView {
    return <PullRequestView>this.getItem('home.pullRequestView') || PullRequestView.Status;
  }

  public set homePullRequestView(value: PullRequestView) {
    this.setItem('home.pullRequestView', value);
  }

  // home.activeTab

  public get homeActiveTab(): string {
    return this.getItem('home.activeTab') ?? 'overview';
  }

  public set homeActiveTab(value: string) {
    this.setItem('home.activeTab', value);
  }

  //
  showContributions = false;
  showCodeOwners = false;
  showRefreshButton = false;
  showAgents = false;
  sprintOverride = null;
}

export const appState = new AppState();
