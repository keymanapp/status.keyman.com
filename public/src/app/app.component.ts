import { Component } from '@angular/core';
import { StatusService } from './status/status.service';
import { platforms } from './platforms';
import { sites } from './sites';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  providers: [ StatusService ],
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  status: any;
  error: any;
  JSON: any;
  timer: any;
  title = 'Keyman Status';

  TIMER_INTERVAL = 60000; //msec
  platforms = JSON.parse(JSON.stringify(platforms)); // makes a copy of the constant platform data for this component
  sites = Object.assign({}, ...sites.map(v => ({[v]: {pulls:[]}}))); // make an object map of 'url.com': {pulls:[]}
  unlabeledPulls = [];
  labeledPulls = [];

  constructor(private statusService: StatusService) {
    this.JSON = JSON;

    this.timer = setInterval(() => {
      this.refreshStatus();
    }, this.TIMER_INTERVAL);

    this.refreshStatus();
  };

  refreshStatus() {
    // Suck in Keyman Status from code.js (server side)

    this.statusService.getStatus()
      .subscribe(
        (data: Object) => {
          this.status = { ...data };

          // transform the platform data into our existing platforms
          this.transformPlatformStatusData();
          this.transformSiteStatusData();
          this.extractUnlabeledPulls();
        }, // success path
        error => this.error = error // error path
      );
  };

  getStatus(platform, tier) {
    return this.status ? this.status.teamCity[this.platforms[platform].configs[tier]] : null;
  }

  statusClass(platform, tier) {
    let b = this.getStatus(platform, tier);
    if(!b || !b.builds || !b.builds.length) return 'missing';
    return b.builds[0].status == 'SUCCESS' ? 'success' : 'failure';
  }

  statusText(platform, tier) {
    let b = this.getStatus(platform, tier);
    if(!b || !b.builds || !b.builds.length) return 'Unreported';
    return b.builds[0].number;
  }

  statusTip(platform, tier) {
    let b = this.getStatus(platform, tier);
    if(!b || !b.builds || !b.builds.length) return '';
    return b.builds[0].statusText;
  }

  statusLink(platform, tier) {
    let b = this.getStatus(platform, tier);
    if(!b || !b.builds || !b.builds.length) return '';

    return `https://build.palaso.org/viewLog.html?buildId=${b.builds[0].id}&buildTypeId=${b.id}`;
    //return b.builds[0].number;
  }

  releaseDate(platform, tier) {
    if(!this.status) return '';
    let files = this.status.keyman[platform][tier].files;
    let items = Object.keys(files);
    if(items.length == 0) return '';
    return files[items[0]].date;
  }

  pullClass(pull) {
    //console.log(pull);
    if(!pull.state) return 'missing';
    switch(pull.state.state) {
      case 'SUCCESS': return 'success';
      case 'PENDING': return 'pending';
      default: return 'failure';
    }
    //return pull.state ? pull.state.state == 'SUCCESS' ? 'success' : 'failure' : 'missing';
  }

  transformPlatformStatusData() {
    this.labeledPulls = [];

    for(let p in this.platforms) {
      let platform = this.platforms[p];
      platform.pulls = [];
      //console.log(this.status.github.data.repository.pullRequests.edges);
      for(let q in this.status.github.data.repository.pullRequests.edges) {
        let pull=this.status.github.data.repository.pullRequests.edges[q];
        //console.log(pull);
        let labels = pull.node.labels.edges;
        let contexts = pull.node.commits.edges[0].node.commit.status.contexts;
        for(let l in labels) {
          let label = labels[l].node;
          if(label.name == platform.id) {
            let foundContext = null;
            for(let r in contexts) {
              let context=contexts[r];
              //
              if(context.context == platform.context) {
                foundContext = context;
                break;
              }
            }
            platform.pulls.push({pull: pull, state: foundContext});
            this.labeledPulls.push(pull);
          }
        }
      }
    }
  }

  transformSiteStatusData() {
    // Grab the status.github.data.organization.repositories.nodes[].pullRequests
    for(let s in this.sites) {
      this.sites[s].pulls = [];
    }

    this.status.github.data.organization.repositories.nodes.forEach(repo => {
      if(repo.name == 'keyboards' || repo.name == 'lexical-models') {
        // report on keyboards and lexical models
        return;
      }
      let site = this.sites[repo.name];
      if(!site) return; // Not a repo we are interested in!
      site.pulls = repo.pullRequests.edges.map(v => { return { pull: v.node }});
    });
  }

  extractUnlabeledPulls() {
    this.unlabeledPulls = [];
    for(let q in this.status.github.data.repository.pullRequests.edges) {
      let pull = this.status.github.data.repository.pullRequests.edges[q];
      if(!this.labeledPulls.includes(pull)) {
        this.unlabeledPulls.push({pull:pull});
      }
    }
  }
}
