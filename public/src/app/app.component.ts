import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { StatusService } from './status/status.service';
import { platforms, PlatformSpec } from './platforms';
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
  platforms: PlatformSpec[] = JSON.parse(JSON.stringify(platforms)); // makes a copy of the constant platform data for this component
  sites = Object.assign({}, ...sites.map(v => ({[v]: {id: /^([^.]+)/.exec(v)[0], pulls:[]}}))); // make an object map of 'url.com': {pulls:[]}
  unlabeledPulls = [];
  labeledPulls = [];

  sprintDays = [];

  selectedContribution = null;

  // Phase data, grabbing from github's milestones for the keyman repo
  milestones = {};
  phase: any = null;
  phaseEnd = '';
  phaseStart = '';

  // Query parameters
  showContributions = false;
  sprintOverride = null;

  constructor(private statusService: StatusService, private route: ActivatedRoute) {
    this.JSON = JSON;
  };

  ngOnInit() {
    this.route.queryParamMap
      .subscribe(queryParams => {
        // This runs twice when params are included.
        // Inelegant workaround based on: https://github.com/angular/angular/issues/12157#issuecomment-396979118.
        // Note how this uses location.href so it's no longer mockable. Too bad so sad.
        if(queryParams.keys.length == 0 && location.href.includes('?')) return;

        this.showContributions = queryParams.get('c') == '1';
        this.sprintOverride = queryParams.get('sprint');
        this.refreshStatus();
      });

    this.timer = setInterval(() => {
      this.refreshStatus();
    }, this.TIMER_INTERVAL);
  }

  refreshStatus() {
    // Suck in Keyman Status from code.js (server side)

    this.statusService.getStatus(this.sprintOverride)
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

  getPlatform(platformId: string): PlatformSpec {
    return this.platforms.find(e => e.id == platformId);
  }

  getStatus(platformId: string, tier: string): any {
    return this.status ? this.status.teamCity[this.getPlatform(platformId).configs[tier]] : null;
  }

  getRunningStatus(platformId: string, tier: string): any {
    return this.status ? this.status.teamCityRunning[this.getPlatform(platformId).configs[tier]] : null;
  }

  downloadClass(platformId: string, tier: string): string {
    return this.releaseDate(platformId, tier) == '' ?
      'tier-release-version-error' :
      this.status.keyman[platformId][tier].version == this.statusText(platformId, tier) ?
        'tier-release-version-equal' :
        'tier-release-version-pending';
  }

  statusClass(platformId: string, tier: string): string {
    let b = this.getStatus(platformId, tier), br = this.getRunningStatus(platformId, tier);
    if(br && br.builds && br.builds.length) {
      return br.builds[0].status == 'SUCCESS' ? 'pending' : 'failure';
    }
    if(!b || !b.builds || !b.builds.length) return 'missing';
    return b.builds[0].status == 'SUCCESS' ? 'success' : 'failure';
  }

  statusText(platformId: string, tier: string): string {
    let b = this.getStatus(platformId, tier), br = this.getRunningStatus(platformId, tier);
    if(br && br.builds && br.builds.length) {
      return br.builds[0].number;
    }
    if(!b || !b.builds || !b.builds.length) return 'Unreported';
    return b.builds[0].number;
  }

  statusTip(platformId: string, tier: string): string {
    let b = this.getStatus(platformId, tier), br = this.getRunningStatus(platformId, tier);
    if(br && br.builds && br.builds.length) {
      return br.builds[0].statusText;
    }
    if(!b || !b.builds || !b.builds.length) return '';
    return b.builds[0].statusText;
  }

  statusLink(platformId: string, tier: string): string {
    let b = this.getStatus(platformId, tier);
    if(!b || !b.builds || !b.builds.length) return '';

    return `https://build.palaso.org/viewLog.html?buildId=${b.builds[0].id}&buildTypeId=${b.id}`;
    //return b.builds[0].number;
  }

  releaseDate(platformId: string, tier: string): string {
    if(!this.status) return '';
    let files = this.status.keyman[platformId][tier].files;
    let items = Object.keys(files);
    if(items.length == 0) return '';
    return files[items[0]].date;
  }

  pullClass(pull): string {
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
        let status = pull.node.commits.edges[0].node.commit.status;
        let contexts = status ? status.contexts : null;
        for(let l in labels) {
          let label = labels[l].node;
          if(label.name == platform.id+'/') {
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

  isBetaRunning() {
    let e = this.status ? this.status.github.data.repository.refs.nodes.find(e => e.name == 'beta') : undefined;
    return (typeof e != 'undefined');
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
    // We find this milestone by looking for the oldest one in the list :)

    this.phase = this.status.currentSprint;

    if(this.phase == null) {
      this.phaseEnd = '?';
      this.phaseStart = '?';
      this.phase = {title:'?'};
    } else {
      // Assuming a phase is 2 weeks; we can't really show more than that on screen easily anyway!
      this.phaseEnd = new Date(this.phase.end).toDateString();
      this.phaseStart = new Date(this.phase.start).toDateString();

      let d = new Date(this.phase.start);
      d.setUTCDate(d.getUTCDate()-2);  // Unofficial start date is the Sat before the start of sprint (which is a Monday)
      // TODO: sort out timezones one day ...

      let dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      let monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      this.sprintDays = new Array(14);
      for(let n = 0; n < 14; n++) {
        let dt = new Date(d.valueOf()+n*86400*1000);
        this.sprintDays[n] = {
            date: dt,
            dayText: dayName[dt.getUTCDay()],
            monthText: monthName[dt.getUTCMonth()],
            dateText: dt.getUTCDate().toString(),
            ghdate: dt.toISOString().substr(0,10)
          };
      }
    }

    // For the current milestone, Waiting-external and Future, we want to report. Other milestones, we'll ignore for now.
    this.milestones = {
      Future: { title: "Future", count: 0 },
      Current: { title: this.phase.title, count: 0 },
      Waiting: { title: "Waiting-external", count: 0 },
      Other: { title: "Other", count: 0 }
    };

    let sortMilestones = (a,b) => {
      const sprintMilestone = /^P(\d+)S(\d+)$/;
      let a0 = sprintMilestone.exec(a.title), b0 = sprintMilestone.exec(b.title);
      if(a0 !== null && b0 === null) return -1;
      if(a0 === null && b0 !== null) return 1;
      if(a0 === null) return a.title.localeCompare(b.title);
      return (parseInt(a0[1], 10) - parseInt(b0[1], 10))*100 + (parseInt(a0[2], 10) - parseInt(b0[2], 10));
    };

    // For each platform, fill in the milestone counts
    this.status.github.data.repository.issuesByLabelAndMilestone.edges.forEach(label => {
      let platform = this.getPlatform(label.node.name.substring(0,label.node.name.length-1));
      if(!platform) return;
      platform.totalIssueCount = label.node.openIssues.totalCount;
      platform.milestones = [
        { id: 'current', title: this.phase.title, count: 0 },
        { id: 'future', title: "Future", count: 0 },
        { id: 'waiting', title: "Waiting-external", count: 0 },
        { id: 'other', title: "Other", count: 0 }
      ];
      label.node.openIssues.edges.forEach(issue => {
        if(!issue.node.milestone) platform.milestones[3].count++;
        else switch(issue.node.milestone.title) {
          case this.phase.title: platform.milestones[0].count++; break;
          case "Future": platform.milestones[1].count++; break;
          case "Waiting-external": platform.milestones[2].count++; break;
          default:
            let m = platform.milestones.find(element => {return element.title == issue.node.milestone.title});
            if(!m) {
              m = { id: 'future', title: issue.node.milestone.title, count: 0};
              platform.milestones.push(m);
            }
            m.count++;
            break;
        }
      });

      platform.milestones = platform.milestones.sort(sortMilestones);
    });

    // For each site, fill in the milestone counts
    this.status.github.data.organization.repositories.nodes.forEach(repo => {
      let site = this.sites[repo.name];
      if(!site) return;
      site.milestones = [
        { id: 'current', title: this.phase.title, count: 0 },
        { id: 'future', title: "Future", count: 0 },
        { id: 'waiting', title: "Waiting-external", count: 0 },
        { id: 'other', title: "Other", count: 0 }
      ];
      repo.issuesByMilestone.edges.forEach(issue => {
        if(!issue.node.milestone) site.milestones[3].count++;
        else switch(issue.node.milestone.title) {
          case this.phase.title: site.milestones[0].count++; break;
          case "Future": site.milestones[1].count++; break;
          case "Waiting-external": site.milestones[2].count++; break;
          default:
            let m = site.milestones.find(element => {return element.title == issue.node.milestone.title});
            if(!m) {
              m = { id: 'future', title: issue.node.milestone.title, count: 0};
              site.milestones.push(m);
            }
            m.count++;
            break;

        }
      });
      site.milestones = site.milestones.sort(sortMilestones);
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

  selectUser(login) {
    this.selectedContribution = login == this.selectedContribution ? null : login;
  }

  /* Show test build result (alpha-only until 14.0 release phase) */

  tierTestRunningAndLatestBuild(platformId,tier): {id,number,status,statusText} {
    const buildNumberRE = "^\\d+\\.\\d+\\.\\d+-"+tier+"-test$";
    const tcData = this.status.teamCity[this.getPlatform(platformId).configs['test']];
    const tcRunningData = this.status.teamCityRunning[this.getPlatform(platformId).configs['test']];

    const build = tcRunningData.builds.find(build => build.number.match(buildNumberRE));
    if(build) {
      // teamcity returns 'SUCCESS' for a pending build that hasn't yet failed
      return {
        id: build.id,
        number: build.number,
        status: build.status == 'SUCCESS' ? 'PENDING' : build.status,
        statusText: build.statusText
      };
    }

    return tcData.builds.find(build => build.number.match(buildNumberRE));
  }

  tierTestClass(platformId,tier) {
    if(!this.status) return null;
    const build = this.tierTestRunningAndLatestBuild(platformId,tier);
    if(build) {
      switch(build.status) {
        case 'SUCCESS': return 'tier-test-success';
        case 'FAILURE': return 'tier-test-failure';
        default: return 'tier-test-pending';
      }
    }
    return null;
  }

  tierTestTitle(platformId,tier) {
    if(!this.status) return null;
    const build = this.tierTestRunningAndLatestBuild(platformId,tier);
    return build ? build.number+'('+build.status+'): '+build.statusText : null;
  }

  tierTestLink(platformId,tier) {
    if(!this.status) return null;
    const build = this.tierTestRunningAndLatestBuild(platformId,tier);
    return build ? `https://build.palaso.org/viewLog.html?buildId=${build.id}` : null;
  }
}
