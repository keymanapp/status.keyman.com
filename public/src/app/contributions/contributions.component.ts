import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { getUserAvatarUrl } from '../../../../shared/users';
import { appState } from '../../state';
import { ContributionsModel } from '../data/contributions.model';
import { dataModel } from '../data/data.model';

@Component({
  selector: 'app-contributions',
  templateUrl: './contributions.component.html',
  styleUrls: ['./contributions.component.css']
})
export class ContributionsComponent implements OnInit {

  // data proxies
  get status() { return dataModel.status }
  get sprintDays() { return dataModel.sprintDays }
  get pullsByBase() { return dataModel.pullsByBase }
  get sites() { return dataModel.sites }
  // state proxies
  get activeTab() { return appState.homeActiveTab }

  @Input() user: any;


  @Output() onSelectTab = new EventEmitter<string>();

  constructor() { }

  stringify(o: any) {
    return JSON.stringify(o);
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
    if(login == '') appState.userView = 'assigned-issues';
    this.onSelectTab.emit(this.activeTab == login ? 'overview' : login);
  }
}
