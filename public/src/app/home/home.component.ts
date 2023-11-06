import { NgZone, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { StatusService } from '../status/status.service';
import { StatusSource } from '../../../../shared/status-source';
import { platforms, PlatformSpec } from '../../../../shared/platforms';
import { sites, siteSentryNames } from '../sites';
import { DataSocket } from '../datasocket/datasocket.service';
import emojiRegex from 'emoji-regex';
import { pullStatus, pullUserTesting, pullBuildState, pullChecks } from '../utility/pullStatus';
import { IssueView } from '../issue-list/issue-list.component';
import { EMPTY_STATUS, Status } from '../status/status.interface';
import { getAvatarUrl } from '../../../../shared/users';
import { IssueClipboard } from '../utility/issue-clipboard';

interface OtherSites {
  repos: string[];
  pulls: any[];
  milestones: any[];
};

enum PullRequestView {
  Platform = 'platform',
  Project = 'project',
  Status = 'status',
  Author = 'author',
  Base = 'base'
};

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  providers: [ StatusService ],
})
export class HomeComponent {
  status: Status = EMPTY_STATUS;
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
  keyboardIssues = [];
  lexicalModelIssues = [];
  userTestIssues = [];
  userTestIssuesPassed = [];
  keyboardPRs = [];
  lexicalModelPRs = [];
  changeCounter: number = 0;

  sprintDays = [];


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
  showCodeOwners = false;
  showRefreshButton = false;
  showAgents = false;
  sprintOverride = null;

  // Issue View
  issueView: IssueView = IssueView.Current;

  // Pull Request View
  pullRequestView: PullRequestView = PullRequestView.Platform;
  pullsByStatus = {
    draft: [],
    waitingReview: [],
    waitingResponse: [],
    waitingTest: [],
    waitingGoodBuild: [],
    readyToMerge: []
  };
  pullStatusName = {
    draft: 'Draft',
    waitingReview: 'Waiting for review',
    waitingResponse: 'Changes requested',
    waitingTest: 'Waiting for user test',
    waitingGoodBuild: 'Waiting for build',
    readyToMerge: 'Ready to merge'
  };
  pullsByProject = {};
  pullsByAuthor = {};
  pullsByBase = {};

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
        this.showCodeOwners = queryParams.get('o') == '1';
        this.showRefreshButton = queryParams.get('r') == '1';
        this.showAgents = queryParams.get('a') == '1';
        this.sprintOverride = queryParams.get('sprint');
      });


    this.ws = new DataSocket();
    this.ws.onMessage = (data) => {
      this.zone.run(() => this.refreshStatus(data as StatusSource));
    };
  }

  refreshBackend() {
    console.log('Connecting to status service for refresh');
    this.statusService.refreshBackend();
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
            case StatusSource.CodeOwners:
              this.status.codeOwners = data.codeOwners;
              break;
            case StatusSource.GitHub:
              this.status.github = data.github;
              this.keyboardPRs = this.status.github?.data.organization.repositories.nodes.find(e=>e.name=='keyboards')?.pullRequests.edges;
              this.lexicalModelPRs = this.status.github?.data.organization.repositories.nodes.find(e=>e.name=='lexical-models')?.pullRequests.edges;
              this.transformPlatformStatusData();
              this.transformSiteStatusData();
              this.extractUnlabeledPulls();
              this.extractPullsByAuthorProjectAndStatus();
              this.removeDuplicateTimelineItems();
              break;
            case StatusSource.GitHubIssues:
              this.status.issues = data.issues;
              this.removeDuplicateTimelineItems();
              this.extractKeyboardAndLMIssues();
              this.extractUserTestIssues();
              break;
            case StatusSource.GitHubContributions:
              this.status.contributions = data.contributions;
              break;
            case StatusSource.CommunitySite:
              this.status.communitySite = this.transformCommunitySiteData(data.communitySite.contributions);
              this.status.communitySiteQueue = data.communitySite.queue;
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
              this.status.teamCityAgents = data.teamCityAgents;
              this.status.teamCityQueue = data.teamCityQueue;
              this.changeCounter++; // forces a rebuild
              break;
            case StatusSource.DebianBeta:
            case StatusSource.DebianStable:
            case StatusSource.ITunesKeyman:
            case StatusSource.ITunesFirstVoices:
            case StatusSource.PlayStoreKeyman:
            case StatusSource.PlayStoreFirstVoices:
            case StatusSource.SKeymanCom:
            case StatusSource.LaunchPadAlpha:
            case StatusSource.LaunchPadBeta:
            case StatusSource.LaunchPadStable:
            case StatusSource.PackagesSilOrg:
            case StatusSource.LinuxLsdevSilOrgAlpha:
            case StatusSource.LinuxLsdevSilOrgBeta:
            case StatusSource.LinuxLsdevSilOrgStable:
            case StatusSource.NpmKeymanCompiler:
            case StatusSource.NpmModelsTypes:
              this.status.deployment[source] = data.data;
              this.changeCounter++; // forces a rebuild
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

  pullEmoji(pull) {
    let title: string = pull.node.title;
    let regex = emojiRegex(), match;
    while(match = regex.exec(title)) {
      const emoji = match[0];
      if(emoji != '🍒') return emoji;
    }
    return "";
  }

  transformPlatformStatusData() {
    this.labeledPulls = [];

    for(let platform of this.platforms) {
      platform.pulls = [];
      platform.pullsByEmoji = {};
      //console.log(this.status.github.data.repository.pullRequests.edges);
      for(let pull of this.status.github.data.repository.pullRequests.edges) {
        //console.log(pull);
        pull.node.checkSummary = pullChecks(pull);
        let labels = pull.node.labels.edges;
        let status = pull.node.commits.edges[0].node.commit.status;
        let contexts = status ? status.contexts : null;
        if(!labels) {
          continue;
        }
        for(let label of labels) {
          if(label.node.name == platform.id+'/') {
            let foundContext = null, userTestingContext = null;
            if(contexts) {
              let firstContext = null;
              for(let context of contexts) {
                if(context.context == 'user_testing') {
                  userTestingContext = context;
                  continue;
                }
                if(!firstContext) {
                  firstContext = context;
                }
                if(context.state != 'SUCCESS') {
                  foundContext = context;
                }
                if(!foundContext && context.context.match(new RegExp('Test-\\d\\d\\.\\d \\('+platform.context+'\\)'))) {
                  foundContext = context;
                }
              }
              if(contexts.length && !foundContext) foundContext = firstContext;
            }
            platform.pulls.push({pull: pull, state: foundContext, userTesting: userTestingContext});
            this.labeledPulls.push(pull);
            let emoji = this.pullEmoji(pull);
            if(!platform.pullsByEmoji[emoji]) {
              platform.pullsByEmoji[emoji] = [];
            }
            platform.pullsByEmoji[emoji].push({pull: pull, state: foundContext, userTesting: userTestingContext});
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

  removeDuplicateTimelineItems() {
    let removeDuplicates = function(items) {
      // This is very much O(n^2) but the arrays are generally short
      items.nodes = items.nodes.filter(item => {
        let master = items.nodes.find(e => e.subject.number == item.subject.number);
        return items.nodes.indexOf(master) == items.nodes.indexOf(item);
      })
    };

    if(this.status.github && this.status.github.data) {
      this.status.github.data.repository.pullRequests.edges.forEach(item => {
        removeDuplicates(item.node.timelineItems);
/*
"timelineItems": {
                  "nodes": [
                    {
                      "__typename": "CrossReferencedEvent",
                      "subject": {
                        "number": 4427,
                        "url": "https://github.com/keymanapp/keyman/pull/4427"
                      }
                    }
                  ]
                },
*/
     });
    }

    if(this.status.issues) {
      this.status.issues.forEach(issue => {
        removeDuplicates(issue.timelineItems);
/*
"timelineItems": {
        "nodes": [
          {
            "__typename": "CrossReferencedEvent",
            "subject": {
              "number": 5754,
              "url": "https://github.com/keymanapp/keyman/pull/5754"
            }
          },
*/
      });
    }
  }

  transformSentryData(data) {
    let result = {};
    if(!data) return result;
    Object.keys(data).forEach(environment => {
      data[environment].forEach(issue => {
        if (!issue) return;
        if (!issue.project) return;
        let platformName = siteSentryNames[issue.project.slug] ?
          siteSentryNames[issue.project.slug] :
          this.getPlatformFromSentryProject(issue.project.slug);
        let platform = result[platformName];
        if(!platform) platform = result[platformName] = {};
        let env = platform[environment];
        if(!env) env = platform[environment] = {
          totalUsers: 0,
          totalEvents: 0,
          issues: [],
        };
        env.totalUsers += issue.userCount;
        env.totalEvents += parseInt(issue.count, 10);
        env.issues.push(issue);
      });
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

    // For the current milestone, Waiting-external, Tests, and Future, we want to report. Other milestones, we'll ignore for now.
    this.milestones = {
      Future: { title: "Future", count: 0 },
      Current: { title: this.phase.title, count: 0 },
      Waiting: { title: "Waiting-external", count: 0 },
      Tests: { title: "Tests", count: 0 },
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
        { id: 'tests', title: "Tests", count: 0, nodes: [] },
        { id: 'other', title: "Other", count: 0, nodes: [] }
      ];
      this.status.issues
        .filter(issue => issue.repository.name === 'keyman' && issue.labels.nodes.some(l=>l.name === label.node.name))
        .forEach(issue => {
        let m = null;
        if(!issue.milestone) m = platform.milestones[4];
        else switch(issue.milestone.title) {
          case this.phase.title: m = platform.milestones[0]; break;
          case "Future": m = platform.milestones[1]; break;
          case "Waiting-external": m = platform.milestones[2]; break;
          case "Tests": m = platform.milestones[3]; break;
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
      { id: 'tests', title: "Tests", count: 0, nodes: [] },
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
        { id: 'tests', title: "Tests", count: 0, nodes: [] },
        { id: 'other', title: "Other", count: 0, nodes: [] }
      ];
      this.status.issues
        .filter(issue => issue.repository.name === repo.name)
        .forEach(issue => {
        let m = null;
        if(!issue.milestone) m = site.milestones[4];
        else switch(issue.milestone.title) {
          case this.phase.title: m = site.milestones[0]; break;
          case "Future": m = site.milestones[1]; break;
          case "Waiting-external": m = site.milestones[2]; break;
          case "Tests": m = site.milestones[3]; break;
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

  transformCommunitySiteData(data) {
    let result = {};
    Object.keys(data).forEach(user => {
      result[user] = data[user].map(post => {
        return {
          // Top three are provided for consistency with github issue node data
          title: post.title,
          url: `https://community.software.sil.org/t/${post.slug}/${post.topic_id}/${post.post_number}`,
          occurredAt: post.created_at,
          ...post
        }
      });
    });
    return result;
  }

  /* Multiple issue views */

  setIssueView(view: string) {
    this.issueView = view as IssueView;
  }

  /* Multiple PR views */

  setPRView(view: string) {
    this.pullRequestView = view as PullRequestView;
  }

  getPlatformPullData(pull) {
    for(let p of this.platforms) {
      for(let q of p.pulls) {
        if(q.pull.node.number == pull.node.number) {
          q.pull.node.ultimateBaseRefName = pull.node.ultimateBaseRefName;
          return q;
        }
      }
    }
    return {pull:pull,userTesting:null,state:null};
  }

  extractKeyboardAndLMIssues() {
    this.keyboardIssues = this.status.issues.filter(issue => issue.repository.name == 'keyboards');
    this.lexicalModelIssues = this.status.issues.filter(issue => issue.repository.name == 'lexical-models');
  }

  extractUserTestIssues() {
    this.userTestIssues = this.status.issues.filter(issue => issue.repository.name == 'keyman' && issue.labels.nodes.find(node => node.name=='has-user-test'));
    this.userTestIssuesPassed = this.status.issues.filter(issue => issue.repository.name == 'keyman' &&
      issue.labels.nodes.find(node => node.name=='has-user-test') &&
      !issue.labels.nodes.find(node => node.name=='user-test-required') &&
      !issue.labels.nodes.find(node => node.name=='user-test-failed'));
  }

  extractPullsByAuthorProjectAndStatus() {
    this.pullsByAuthor = {};
    this.pullsByProject = {};
    this.pullsByBase = {'master':[]}; // always show 'master' base
    this.pullsByStatus.draft = [];
    this.pullsByStatus.readyToMerge = [];
    this.pullsByStatus.waitingGoodBuild = [];
    this.pullsByStatus.waitingReview = [];
    this.pullsByStatus.waitingTest = [];
    this.pullsByStatus.waitingResponse = [];
    for(let q in this.status.github.data.repository.pullRequests.edges) {
      let pull = this.status.github.data.repository.pullRequests.edges[q];
      let emoji = this.pullEmoji(pull) || "other";
      if(!this.pullsByProject[emoji]) this.pullsByProject[emoji] = [];

      let pd = this.getPlatformPullData(pull);
      this.pullsByProject[emoji].push(pd);

      let base = this.getPullUltimateBase(pull);
      if(!this.pullsByBase[base]) this.pullsByBase[base] = [];
      this.pullsByBase[base].push(pd);

      if(!this.pullsByAuthor[pull.node.author.login]) this.pullsByAuthor[pull.node.author.login] = [];
      this.pullsByAuthor[pull.node.author.login].push(pd);

      let status = pullStatus(pd);
      let userTesting = pullUserTesting(pd);
      let buildState = pullBuildState(pd);

      switch(status) {
        case 'status-draft':
          this.pullsByStatus.draft.push(pd);
          continue; // We don't add draft PRs to other categories
        case 'status-pending':
          this.pullsByStatus.waitingReview.push(pd);
          break;
        case 'status-changes-requested':
          this.pullsByStatus.waitingResponse.push(pd);
          break;
        case 'status-approved':
          break;
        default:
          console.log('unexpected '+status);
        }

      switch(userTesting) {
        case 'user-test-none':
        case 'user-test-failure':
          if(!this.pullsByStatus.waitingResponse.includes(pd))
            this.pullsByStatus.waitingResponse.push(pd);

          if(pull.node.labels.edges.find(e => e.node.name == 'user-test-required')) {
            this.pullsByStatus.waitingTest.push(pd);
          }
          break;
        case 'user-test-pending':
          this.pullsByStatus.waitingTest.push(pd);
          break;
        case 'user-test-success':
          break;
        default:
          console.log('unexpected '+userTesting);
        }

      switch(buildState) {
        case 'pending':
        case 'missing':
          this.pullsByStatus.waitingGoodBuild.push(pd);
          break;
        case 'failure':
          if(!this.pullsByStatus.waitingResponse.includes(pd))
            this.pullsByStatus.waitingResponse.push(pd);
          break;
        case 'success':
          break;
        default:
          console.log('unexpected '+buildState);
      }

      if(status == 'status-approved' && userTesting == 'user-test-success' && buildState == 'success')
        this.pullsByStatus.readyToMerge.push(pd);
    }
    this.sortPullGroupByTreeAndNumber(this.pullsByProject);
    this.sortPullGroupByTreeAndNumber(this.pullsByStatus);
    this.sortPullGroupByTreeAndNumber(this.pullsByAuthor);
    this.sortPullGroupByTreeAndNumber(this.pullsByBase);
  }

  /**
   * Sort our pull arrays to make the dependency order clear, as it may not be
   * the same as the PR number order.
   */
  sortPullsByTreeAndNumber(pulls): void {
    function TreeNode(data) {
      this.data = data;
      this.parent = null;
      this.children = [];
    }

    TreeNode.comparer = function (a, b) {
      return a.data.pull.node.number - b.data.pull.node.number;
    };

    TreeNode.prototype.sortRecursive = function () {
      this.children.sort(TreeNode.comparer);
      for (var i=0, l=this.children.length; i<l; i++) {
        this.children[i].sortRecursive();
      }
      return this;
    };

    TreeNode.prototype.walk = function(f, recursive) {
      for (var i=0, l=this.children.length; i<l; i++) {
        var child = this.children[i];
        f.apply(child, Array.prototype.slice.call(arguments, 2));
        if (recursive) child.walk.apply(child, arguments);
      }
    }

    const refs = {};
    const root = new TreeNode(undefined);
    pulls.forEach(pull => { refs[pull.pull.node.headRefName] = new TreeNode(pull); });
    pulls.forEach(pull => {
      const node = refs[pull.pull.node.headRefName];
      node.parent = refs[pull.pull.node.baseRefName] || root;
      node.parent.children.push(node);
    });

    root.sortRecursive();

    // Replace pulls array with root treewalk
    let newPulls = [];
    root.walk(function() { if(this.data) newPulls.push(this.data) }, true);
    pulls.splice(0, pulls.length, ...newPulls);
  }

  sortPullGroupByTreeAndNumber(pullGroup): void {
    for(let key of Object.keys(pullGroup)) {
      this.sortPullsByTreeAndNumber(pullGroup[key]);
    }
  }

  getPullUltimateBase(pull): string {
    let input = pull;
    const ultimateBaseRef = /^(master|beta|stable-\d+\.\d+|feature-.+|epic\/.+)$/;
    if(pull.node.headRefName.match(ultimateBaseRef)) {
      // probably top of a feature branch
      pull.node.ultimateBaseRefName = pull.node.headRefName;
      return pull.node.headRefName;
    }

    while(pull && !pull.node.baseRefName.match(ultimateBaseRef)) {
      pull = this.status.github.data.repository.pullRequests.edges.find(e => e.node.headRefName == pull.node.baseRefName);
    }

    input.node.ultimateBaseRefName = pull ? pull.node.baseRefName : 'unknown';

    return input.node.ultimateBaseRefName;
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
    // We want PRs for current sprint only at this point. We will group
    // by base and status (draft vs open)?

    let text = ``; //'<ul>';

    const bases = Object.keys(this.pullsByBase).sort();

    for(let base of bases) {
      const pulls = this.pullsByBase[base];
      const baseEmoji = pulls.length ?  this.pullEmoji(pulls[0].pull) : '';
      text += `<h3>${base} ${baseEmoji}</h3>`;
      // text += `<li>${base} ${baseEmoji}`;
      if(pulls.length) {
        text += `<ul>`;
        let pullEmoji = baseEmoji;
        for(let pull of pulls) {
          let emoji = this.pullEmoji(pull.pull);
          if(emoji != pullEmoji) {
            if(pullEmoji.length) {
              text += `</ul></li>`;
            }
            if(emoji.length) {
              text += `<li>${emoji}<ul>`;
            }
            pullEmoji = emoji;
          }
          const title = pull.pull.node.title.replace(emoji, '');
          const style = pull.pull.node.isDraft ? ` style='color: #aaaaaa'` : '';
          text += `<li${style}>${title} (<a href='${pull.pull.node.url}'>#${pull.pull.node.number}</a>)</li>`;
        }
        if(pullEmoji != baseEmoji) {
          text += `</ul></li>`;
        }
        text += `</ul>`;
      }
      // text += `</li>`;
    }

    for(let siteName of Object.keys(this.sites)) {
      let site = this.sites[siteName];
      if(site.pulls.length) {
        // text += `<li>${siteName}<ul>`;
        text += `<h3>${siteName}</h3><ul>`;
        for(let pull of site.pulls) {
          text += `<li>${pull.pull.node.title} (<a href='${pull.pull.node.url}'>#${pull.pull.node.number}</a>)</li>`;
        }
        text += '</ul>';
        // text += '</ul></li>';
      }
    }

    text += `</ul>`;

    return { content: text, type: 'text/html' };
  }
}
