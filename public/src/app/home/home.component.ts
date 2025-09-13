import { NgZone, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { StatusService } from '../status/status.service';
import { ServiceIdentifier } from '../../../../shared/services';
import { DataSocket } from '../datasocket/datasocket.service';
import { getTz, getUserAvatarUrl } from '../../../../shared/users';
import { ContributionsModel } from '../data/contributions.model';
import { appState } from '../../state';
import { dataModel } from '../data/data.model';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
    providers: [StatusService],
    standalone: false
})
export class HomeComponent {
  error: any;
  timer: any;
  ws: DataSocket;
  title = 'Keyman Status';

  activeTab = 'overview';

  TIMER_INTERVAL = 60000; //msec  //TODO: make this static for dev side?

  // Query parameter proxies
  get showContributions() { return appState.showContributions }
  get showCodeOwners() { return appState.showCodeOwners }
  get showRefreshButton() { return appState.showRefreshButton }
  get showAgents() { return appState.showAgents }
  get sprintOverride() { return appState.sprintOverride }

  // Data proxies
  get data() { return dataModel; }
  get status() { return this.data.status };
  get platforms() { return this.data.platforms };
  get sites() { return this.data.sites };
  get pullsByBase() { return this.data.pullsByBase };
  get sprintDays() { return this.data.sprintDays };
  get phase() { return this.data.phase };
  get phaseStart() { return this.data.phaseStart };
  get phaseEnd() { return this.data.phaseEnd };
  get unlabeledPulls() { return this.data.unlabeledPulls };
  get serviceState() { return this.data.serviceState };
  get contributionUsers() { return this.data.contributionUsers; }

  constructor(private statusService: StatusService, private route: ActivatedRoute, private zone: NgZone) {
  };

  ngOnInit() {
    this.route.queryParamMap
      .subscribe(queryParams => {
        // This runs twice when params are included.
        // Inelegant workaround based on: https://github.com/angular/angular/issues/12157#issuecomment-396979118.
        // Note how this uses location.href so it's no longer mockable. Too bad so sad.
        if(queryParams.keys.length == 0 && location.href.includes('?')) return;

        appState.showContributions = queryParams.get('c') == '1';
        appState.showCodeOwners = queryParams.get('o') == '1';
        appState.showRefreshButton = queryParams.get('r') == '1';
        appState.showAgents = queryParams.get('a') == '1';
        appState.sprintOverride = queryParams.get('sprint');
      });


    this.ws = new DataSocket();
    this.ws.onMessage = (data: string) => {
      this.zone.run(() => {
        if(data.startsWith('service-state:')) {
          const json = JSON.parse(data.substring('service-state:'.length));
          this.data.updateServiceState(json);
        } else {
          this.refreshStatus(data as ServiceIdentifier)
        }
      });
    };
  }

  refreshBackend() {
    console.log('Connecting to status service for refresh');
    this.statusService.refreshBackend();
  }

  refreshStatus(source: ServiceIdentifier) {
    // Suck in Keyman Status from code.js (server side)
    this.statusService.getStatus(source, this.sprintOverride)
      .subscribe(
        (data: any) => {
          this.data.refreshStatus(source, data);

        }, // success path
        error => this.error = error // error path
      );
  };

  // Tab View

  getAllContributions = () => {
    let text = '';
    for(let user of this.status?.contributions?.data.repository.contributions.nodes) {
      let userContributions = ContributionsModel.getUserContributions(this.sprintDays, this.status, {user: user}).content;
      if(userContributions) {
        text += `
          <h2><img style="width:32px; height:32px" src="${getUserAvatarUrl(user, 32)}"> ${user.login}</h2>
          ${userContributions}
          <hr>
        `;
      }
    }
    return { content: text, type: 'text/html' };
  }

  selectTab(tab) {
    this.activeTab = tab;
    appState.homeActiveTab = this.activeTab;
  }
}
