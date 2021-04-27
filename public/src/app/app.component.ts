import { NgZone, Component, ɵbypassSanitizationTrustResourceUrl } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { StatusService } from './status/status.service';
import { StatusSource } from '../../../shared/status-source';
import { platforms, PlatformSpec } from './platforms';
import { sites, siteSentryNames } from './sites';
import { repoShortNameFromGithubUrl } from './utility/repoShortNameFromGithubUrl';
import { escapeHtml } from './utility/escapeHtml';
import { DataSocket } from './datasocket/datasocket.service';

interface Status {
  currentSprint: any;
  github: any;
  issues: any;
  contributions: any;
  keyman: any[];
  sentryIssues: any[];
  teamCity: any[];
  teamCityRunning: any[];
  deployment: {
  }
};

interface OtherSites {
  repos: string[];
  pulls: any[];
  milestones: any[];
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  providers: [ StatusService ],
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  status: Status = {
    currentSprint: undefined,
    github: undefined,
    issues: undefined,
    contributions: undefined,
    keyman: [],
    sentryIssues: [],
    teamCity: [],
    teamCityRunning: [],
    deployment: {
    }
  };
  error: any;
  JSON: any;
  timer: any;
  ws: DataSocket;
  title = 'Keyman Status';

  TIMER_INTERVAL = 60000; //msec  //TODO: make this static for dev side?
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

  // Other sites
  otherSites: OtherSites = {
    repos: [],
    pulls: [],
    milestones: []
  };

  // Query parameters
  showContributions = false;
  sprintOverride = null;

  constructor(private statusService: StatusService, private route: ActivatedRoute, private zone: NgZone) {
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
      });


    this.ws = new DataSocket();
    this.ws.onMessage = (data) => {
      this.zone.run(() => this.refreshStatus(data as StatusSource));
    };
  }

  refreshStatus(source: StatusSource) {
    // Suck in Keyman Status from code.js (server side)
    let self = this;

    this.statusService.getStatus(source, this.sprintOverride)
      .subscribe(
        (data: any) => {
          console.log('getStatus.data for '+source);
          this.status.currentSprint = data.currentSprint;
          switch(source) {
            case StatusSource.GitHub:
              this.status.github = data.github;
              this.transformPlatformStatusData();
              this.transformSiteStatusData();
              this.extractUnlabeledPulls();
              break;
            case StatusSource.GitHubIssues:
              this.status.issues = data.issues;
              break;
            case StatusSource.GitHubContributions:
              this.status.contributions = data.contributions;
              break;
            case StatusSource.Keyman:
              this.status.keyman = data.keyman;
              break;
            case StatusSource.SentryIssues:
              this.status.sentryIssues = this.transformSentryData(data.sentryIssues);
              break;
            case StatusSource.TeamCity:
              this.status.teamCity = data.teamCity;
              this.status.teamCityRunning = data.teamCityRunning;
              break;
            case StatusSource.ITunes:
            case StatusSource.PlayStore:
            case StatusSource.SKeymanCom:
            case StatusSource.LaunchPad:
            case StatusSource.PackagesSilOrg:
            case StatusSource.NpmLexicalModelCompiler:
            case StatusSource.NpmModelsTypes:
              this.status.deployment[source] = data.data;
              break;
            }

          if(this.status.github && this.status.issues)
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

  getFirstBuild(builds: any, tier: string) {
    if(!builds || !builds.builds || !builds.builds.length) return null;
    for(let build of builds.builds) {
      if(build.branchName == tier) return build;
      if(tier == 'stable' && build.branchName.startsWith('stable-')) return build; // stable builds have stable-version.version branch names
      if(tier == 'alpha' && !build.branchName) return build; // legacy builds do not have a branch name
      if(tier == 'alpha' && build.branchName == 'master') return build;
    }
    return null;
  }

  statusClass(platformId: string, tier: string): string {
    let b = this.getStatus(platformId, tier), br = this.getRunningStatus(platformId, tier);
    let build = this.getFirstBuild(br, tier);
    if(build) {
      return build.status == 'SUCCESS' ? 'pending' : 'failure';
    }

    build = this.getFirstBuild(b, tier);
    if(!build) return 'missing';
    return build.status == 'SUCCESS' ? 'success' : 'failure';
  }

  statusText(platformId: string, tier: string): string {
    let b = this.getStatus(platformId, tier), br = this.getRunningStatus(platformId, tier);
    let build = this.getFirstBuild(br, tier);
    if(build) {
      return build.number;
    }

    build = this.getFirstBuild(b, tier);
    if(!build) return 'Unreported';
    return build.number;
  }

  statusTip(platformId: string, tier: string): string {
    let b = this.getStatus(platformId, tier), br = this.getRunningStatus(platformId, tier);
    let build = this.getFirstBuild(br, tier);
    if(build) {
      return build.statusText;
    }

    build = this.getFirstBuild(b, tier);
    if(!build) return '';
    return build.statusText;
  }

  statusLink(platformId: string, tier: string): string {
    let b = this.getStatus(platformId, tier);
    let build = this.getFirstBuild(b, tier);
    if(!build) return '';
    return `https://build.palaso.org/viewLog.html?buildId=${build.id}&buildTypeId=${b.id}`;

  }

  releaseDate(platformId: string, tier: string): string {
    if(!this.status) return '';
    let files = this.status.keyman[platformId];
    if(!files) return '';
    files = files[tier].files;
    let items = Object.keys(files);
    if(items.length == 0) return '';
    return files[items[0]].date;
  }

  transformPlatformStatusData() {
    this.labeledPulls = [];

    for(let platform of this.platforms) {
      platform.pulls = [];
      //console.log(this.status.github.data.repository.pullRequests.edges);
      for(let pull of this.status.github.data.repository.pullRequests.edges) {
        //console.log(pull);
        let labels = pull.node.labels.edges;
        let status = pull.node.commits.edges[0].node.commit.status;
        let contexts = status ? status.contexts : null;
        if(!labels) {
          continue;
        }
        for(let label of labels) {
          if(label.node.name == platform.id+'/') {
            let foundContext = null;
            if(contexts) {
              for(let context of contexts) {
                if(context.state != 'SUCCESS') {
                  foundContext = context;
                  break;
                }
                if(context.context.match(new RegExp('Test-\\d\\d\\.\\d \\('+platform.context+'\\)'))) {
                  foundContext = context;
                }
              }
              if(contexts.length && !foundContext) foundContext = contexts[0];
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
    let e = this.status && this.status.github ? this.status.github.data.repository.refs.nodes.find(e => e.name == 'beta') : undefined;
    return (typeof e != 'undefined');
  }

  getPlatformFromSentryProject(slug) {
    for(let p of platforms) {
      if(p.sentry == slug) return p.id;
    }
    return null;
  }
  transformSentryData(data) {
    let result = [];
    if(!data) return result;
    data.forEach(issue => {
      if(!issue) return;
      let platformName = siteSentryNames[issue.project.slug] ?
        siteSentryNames[issue.project.slug] :
        this.getPlatformFromSentryProject(issue.project.slug);
      let platform = result[platformName];
      if(!platform) platform = result[platformName] = {
        totalUsers: 0,
        totalEvents: 0,
        issues: [],
      };
      platform.totalUsers += issue.userCount;
      platform.totalEvents += parseInt(issue.count, 10);
      platform.issues.push(issue);
    });
    return result;
  }

  transformSiteStatusData() {
    // Grab the status.github.data.organization.repositories.nodes[].pullRequests
    for(let s in this.sites) {
      this.sites[s].pulls = [];
    }

    this.otherSites.pulls = [];

    this.status.github.data.organization.repositories.nodes.forEach(repo => {
      if(repo.name == 'keyboards' || repo.name == 'lexical-models' || repo.name == 'keyman') {
        // report on keyboards and lexical models
        return;
      }
      let site = this.sites[repo.name];
      let pulls = repo.pullRequests.edges.map(v => { return { pull: v }});
      if(!site) {
        this.otherSites.pulls = [].concat(this.otherSites.pulls, pulls);
      } else {
        site.pulls = pulls;
      }
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
      const sprintMilestone = /^([A-Z])(\d+)S(\d+)$/;
      let a0 = sprintMilestone.exec(a.title), b0 = sprintMilestone.exec(b.title);
      if(a0 !== null && b0 === null) return -1;
      if(a0 === null && b0 !== null) return 1;
      if(a0 === null) return a.title.localeCompare(b.title);
      return (parseInt(a0[2], 10) - parseInt(b0[2], 10))*1000 +
             (a0[1].charCodeAt(0)-b0[1].charCodeAt(0))*100 +
             (parseInt(a0[3], 10) - parseInt(b0[3], 10));
    };

    // TODO: split search against future and current milestones (future milestone shows only count; current milestone shows more detail)
    // For each platform, fill in the milestone counts
    this.status.github.data.repository.issuesByLabelAndMilestone.edges.forEach(label => {
      let platform = this.getPlatform(label.node.name.substring(0,label.node.name.length-1));
      if(!platform) return;
      platform.totalIssueCount = label.node.openIssues.totalCount;
      platform.milestones = [
        { id: 'current', title: this.phase.title, count: 0, nodes: [] },
        { id: 'future', title: "Future", count: 0, nodes: [] },
        { id: 'waiting', title: "Waiting-external", count: 0, nodes: [] },
        { id: 'other', title: "Other", count: 0, nodes: [] }
      ];
      this.status.issues
        .filter(issue => issue.repository.name === 'keyman' && issue.labels.nodes.some(l=>l.name === label.node.name))
        .forEach(issue => {
        let m = null;
        if(!issue.milestone) m = platform.milestones[3];
        else switch(issue.milestone.title) {
          case this.phase.title: m = platform.milestones[0]; break;
          case "Future": m = platform.milestones[1]; break;
          case "Waiting-external": m = platform.milestones[2]; break;
          default:
            m = platform.milestones.find(element => {return element.title == issue.milestone.title});
            if(!m) {
              m = { id: 'future', title: issue.milestone.title, count: 0, nodes: []};
              platform.milestones.push(m);
            }
            break;
        }
        if(m) {
          m.count++;
          m.nodes.push(issue);
        }
      });

      platform.milestones = platform.milestones.sort(sortMilestones);
    });

    this.otherSites.milestones = [
      { id: 'current', title: this.phase.title, count: 0, nodes: [] },
      { id: 'future', title: "Future", count: 0, nodes: [] },
      { id: 'waiting', title: "Waiting-external", count: 0, nodes: [] },
      { id: 'other', title: "Other", count: 0, nodes: [] }
    ];
    this.otherSites.repos = [];

    // For each site, fill in the milestone counts
    this.status.github.data.organization.repositories.nodes.forEach(repo => {
      if(repo.name == 'keyboards' || repo.name == 'lexical-models' || repo.name == 'keyman') return;
      let site = this.sites[repo.name];
      if(!site) {
        this.otherSites.repos.push(repo.name);
        site = this.otherSites;
      }
      else site.milestones = [
        { id: 'current', title: this.phase.title, count: 0, nodes: [] },
        { id: 'future', title: "Future", count: 0, nodes: [] },
        { id: 'waiting', title: "Waiting-external", count: 0, nodes: [] },
        { id: 'other', title: "Other", count: 0, nodes: [] }
      ];
      this.status.issues
        .filter(issue => issue.repository.name === repo.name)
        .forEach(issue => {
        let m = null;
        if(!issue.milestone) m = site.milestones[3];
        else switch(issue.milestone.title) {
          case this.phase.title: m = site.milestones[0]; break;
          case "Future": m = site.milestones[1]; break;
          case "Waiting-external": m = site.milestones[2]; break;
          default:
            m = site.milestones.find(element => {return element.title == issue.milestone.title});
            if(!m) {
              m = { id: 'future', title: issue.milestone.title, count: 0, nodes: []};
              site.milestones.push(m);
            }
            break;
        }
        if(m) {
          m.count++;
          m.nodes.push(issue);
        }
      });
      site.milestones = site.milestones.sort(sortMilestones);
    });

    this.otherSites.repos.sort();
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
    if(!tcRunningData) return null;
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

  getContributionText(nodes, type) {
    const text =
      '<ul>' +
      nodes.reverse().reduce(
        (text, node) => {
          const repo = repoShortNameFromGithubUrl(node[type].url);
          return text + `<li>${escapeHtml(node[type].title)} (<a href='${node[type].url}'>${repo}#${node[type].number}</a>)</li>\n`
        }, '') +
      '</ul>';
    return { content: text, type: 'text/html' };
  }

  getContributionPRText(user) {
    return this.getContributionText(user.contributions.pullRequests.nodes, 'pullRequest');
  }

  getContributionIssueText(user) {
    return this.getContributionText(user.contributions.issues.nodes, 'issue');
  }

  getContributionReviewText(user) {
    return this.getContributionText(user.contributions.reviews.nodes, 'pullRequest');
  }
}
