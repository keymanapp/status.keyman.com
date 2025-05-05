import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { getUserAvatarUrl, getTz } from '../../../../shared/users';
import { appState } from '../../state';
import { dataModel } from '../data/data.model';

@Component({
    selector: 'app-contributions',
    templateUrl: './contributions.component.html',
    styleUrls: ['./contributions.component.css'],
    standalone: false
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

  userDate(user) {
    if(user.login == '') {
      return 'Unassigned issues';
    }

    const tz = getTz(user.login);
    if(!tz) {
      return user.login;
    }

    return user.login + ' - ' + new Date().toLocaleString([], {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: tz,
      timeZoneName: "long",
    });
  }

  userAvailability(user) {
    const tz = getTz(user.login);
    if(!tz) {
      return {color: 'rgba(0,0,0,0)'}; //TODO
    }
    const now = new Date();
    const result = {
      weekDay: now.toLocaleString('en-GB', { weekday: 'short', timeZone: tz }),
      time: now.toLocaleString('en-GB', { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }),
      hour: 0,
      color: 'green'
    };

    result.hour = parseInt(result.time, 10);

    if(result.weekDay == 'Sat' || result.weekDay == 'Sun' || result.hour < 6 || result.hour > 21) {
      result.color = 'red';
    } else if(result.hour < 8 || result.hour > 17) {
      result.color = 'orange';
    }
    return result;
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
