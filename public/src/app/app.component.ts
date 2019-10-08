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
  sites = Object.assign({}, ...sites.map(v => ({[v]: {id: /^([^.]+)/.exec(v)[0], pulls:[]}}))); // make an object map of 'url.com': {pulls:[]}
  unlabeledPulls = [];
  labeledPulls = [];

  // Phase data, grabbing from github's milestones for the keyman repo
  milestones = {};
  phase: any = null;
  phaseEnd = '';
  phaseStart = '';

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
          this.extractMilestoneData();
        }, // success path
        error => this.error = error // error path
      );
  };

  getStatus(platform, tier) {
    return this.status ? this.status.teamCity[this.platforms[platform].configs[tier]] : null;
  }

  getRunningStatus(platform, tier) {
    return this.status ? this.status.teamCityRunning[this.platforms[platform].configs[tier]] : null;
  }

  statusClass(platform, tier) {
    let b = this.getStatus(platform, tier), br = this.getRunningStatus(platform, tier);
    if(br && br.builds && br.builds.length) {
      return br.builds[0].status == 'SUCCESS' ? 'pending' : 'failure';
    }
    if(!b || !b.builds || !b.builds.length) return 'missing';
    return b.builds[0].status == 'SUCCESS' ? 'success' : 'failure';
  }

  statusText(platform, tier) {
    let b = this.getStatus(platform, tier), br = this.getRunningStatus(platform, tier);
    if(br && br.builds && br.builds.length) {
      return br.builds[0].number;
    }
    if(!b || !b.builds || !b.builds.length) return 'Unreported';
    return b.builds[0].number;
  }

  statusTip(platform, tier) {
    let b = this.getStatus(platform, tier), br = this.getRunningStatus(platform, tier);
    if(br && br.builds && br.builds.length) {
      return br.builds[0].statusText;
    }
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

  errorClassIfNonZero(v) {
    if(v !== null && v != 0) return "failure";
    return "";
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
      site.pulls = repo.pullRequests.edges.map(v => { return { pull: v }});
    });
  }

  extractMilestoneData() {
    // We want the current milestone, plus its start and end date.
    this.phase = this.status.github.data.repository.milestones.edges.reduce ((a, m) => {
      if(m.node.dueOn == null) return a;
      if(a == null || a.node.dueOn == null) return m;
      if(new Date(a.node.dueOn) < new Date(m.node.dueOn)) return a;
      return m;
    });
    if(this.phase == null) {
      this.phaseEnd = '?';
      this.phaseStart = '?';
    } else {
      // Assuming a phase is 2 weeks
      this.phaseEnd = new Date(this.phase.node.dueOn).toDateString();
      let d = new Date(this.phase.node.dueOn);
      d.setDate(d.getDate()-11);
      this.phaseStart = d.toDateString();
    }

    // For the current milestone, Waiting-external and Future, we want to report. Other milestones, we'll ignore for now.
    this.milestones = {
      Future: { title: "Future", count: 0 },
      Current: { title: this.phase.node.title, count: 0 },
      Waiting: { title: "Waiting-external", count: 0 },
      Other: { title: "Other", count: 0 }
    };

    // For each platform, fill in the milestone counts
    this.status.github.data.repository.issuesByLabelAndMilestone.edges.forEach(label => {
      let platform = this.platforms[label.node.name];
      if(!platform) return;
      platform.milestones = [
        { id: 'current', title: this.phase.node.title, count: 0 },
        { id: 'future', title: "Future", count: 0 },
        { id: 'waiting', title: "Waiting-external", count: 0 },
        { id: 'other', title: "Other", count: 0 }
      ];
      label.node.openIssues.edges.forEach(issue => {
        if(!issue.node.milestone) platform.milestones[3].count++;
        else switch(issue.node.milestone.title) {
          case this.phase.node.title: platform.milestones[0].count++; break;
          case "Future": platform.milestones[1].count++; break;
          case "Waiting-external": platform.milestones[2].count++; break;
          default: platform.milestones[3].count++; break;
        }
      });
    });

    // For each site, fill in the milestone counts
    this.status.github.data.organization.repositories.nodes.forEach(repo => {
      let site = this.sites[repo.name];
      if(!site) return;
      site.milestones = [
        { id: 'current', title: this.phase.node.title, count: 0 },
        { id: 'future', title: "Future", count: 0 },
        { id: 'waiting', title: "Waiting-external", count: 0 },
        { id: 'other', title: "Other", count: 0 }
      ];
      repo.issuesByMilestone.edges.forEach(issue => {
        if(!issue.node.milestone) site.milestones[3].count++;
        else switch(issue.node.milestone.title) {
          case this.phase.node.title: site.milestones[0].count++; break;
          case "Future": site.milestones[1].count++; break;
          case "Waiting-external": site.milestones[2].count++; break;
          default: site.milestones[3].count++; break;
        }
      });
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
