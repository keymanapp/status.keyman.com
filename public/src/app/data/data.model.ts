import { platforms, PlatformSpec } from "../../../../shared/platforms";
import { ServiceStateCache, ServiceState, ServiceIdentifier } from "../../../../shared/services";
import { sites, siteSentryNames, sitesWithState } from "../sites";
import { EMPTY_STATUS, Status } from "../status/status.interface";
import { pullEmoji } from "../utility/pullEmoji";
import { pullBuildState, pullChecks, pullStatus, pullUserTesting } from "../utility/pullStatus";

interface OtherSites {
  repos: string[];
  pulls: any[];
  milestones: any[];
};

export class DataModel {
  status: Status = EMPTY_STATUS;

  serviceState: {service: ServiceIdentifier, state: ServiceState, message?: string}[];

  platforms: PlatformSpec[] = JSON.parse(JSON.stringify(platforms)); // makes a copy of the constant platform data for this component
  sites = Object.assign({}, ...sites.map(v => ({[v]: {id: /^([^.]+)/.exec(v)[0], pulls:[], hasState: sitesWithState.includes(v)}}))); // make an object map of 'url.com': {pulls:[]}
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

  updateServiceState(data: ServiceStateCache) {
    this.serviceState = Object.keys(data).map(key =>
      ({service: <ServiceIdentifier>key, state: data[key].state, message: data[key].message, lastStateChange: data[key].lastStateChange})
    );
  }

  refreshStatus(source: ServiceIdentifier, data) {
    console.log('getStatus.data for '+source);
    this.status.currentSprint = data.currentSprint;
    switch(source) {
      case ServiceIdentifier.CodeOwners:
        this.status.codeOwners = data.codeOwners;
        break;
      case ServiceIdentifier.SiteLiveliness:
        this.status.siteLiveliness = data.siteLiveliness;
        break;
      case ServiceIdentifier.GitHub:
        this.status.github = data.github;
        this.keyboardPRs = this.status.github?.data.organization.repositories.nodes.find(e=>e.name=='keyboards')?.pullRequests.edges;
        this.lexicalModelPRs = this.status.github?.data.organization.repositories.nodes.find(e=>e.name=='lexical-models')?.pullRequests.edges;
        this.transformPlatformStatusData();
        this.transformSiteStatusData();
        this.extractUnlabeledPulls();
        this.extractPullsByAuthorProjectAndStatus();
        this.removeDuplicateTimelineItems();
        break;
      case ServiceIdentifier.GitHubIssues:
        this.status.issues = data.issues;
        this.removeDuplicateTimelineItems();
        this.extractKeyboardAndLMIssues();
        this.extractUserTestIssues();
        break;
      case ServiceIdentifier.GitHubContributions:
        this.status.contributions = data.contributions;
        break;
      case ServiceIdentifier.CommunitySite:
        this.status.communitySite = this.transformCommunitySiteData(data.communitySite.contributions);
        this.status.communitySiteQueue = data.communitySite.queue;
        break;
      case ServiceIdentifier.Keyman:
        this.status.keyman = data.keyman;
        break;
      case ServiceIdentifier.SentryIssues:
        this.status.sentryIssues = this.transformSentryData(data.sentryIssues);
        break;
      case ServiceIdentifier.TeamCity:
        this.status.teamCity = data.teamCity;
        this.status.teamCityRunning = data.teamCityRunning;
        this.status.teamCityAgents = data.teamCityAgents;
        this.status.teamCityQueue = data.teamCityQueue;
        this.changeCounter++; // forces a rebuild
        break;
      case ServiceIdentifier.DebianBeta:
      case ServiceIdentifier.DebianStable:
      case ServiceIdentifier.ITunesKeyman:
      case ServiceIdentifier.ITunesFirstVoices:
      case ServiceIdentifier.PlayStoreKeyman:
      case ServiceIdentifier.PlayStoreFirstVoices:
      case ServiceIdentifier.SKeymanCom:
      case ServiceIdentifier.LaunchPadAlpha:
      case ServiceIdentifier.LaunchPadBeta:
      case ServiceIdentifier.LaunchPadStable:
      case ServiceIdentifier.PackagesSilOrg:
      case ServiceIdentifier.LinuxLsdevSilOrgAlpha:
      case ServiceIdentifier.LinuxLsdevSilOrgBeta:
      case ServiceIdentifier.LinuxLsdevSilOrgStable:
      case ServiceIdentifier.NpmKeymanCompiler:
      case ServiceIdentifier.NpmCommonTypes:
        this.status.deployment[source] = data.data;
        this.changeCounter++; // forces a rebuild
        break;
      }

    if(this.status.github && this.status.issues) {
      this.extractMilestoneData();
    }
  }

  transformPlatformStatusData() {
    this.labeledPulls = [];

    for(let platform of this.platforms) {
      platform.pulls = [];
      platform.pullsByEmoji = {};
      for(let pull of this.status.github.data.repository.pullRequests.edges) {
        pull.node.checkSummary = pullChecks(pull);
        let labels = pull.node.labels.edges;
        let status = pull.node.commits.edges[0].node.commit.status;
        let contexts = status ? status.contexts : null;
        if(!labels) {
          continue;
        }
        for(let label of labels) {
          const labelName = /*label.node.name == 'resources/' ? 'common/' :*/ label.node.name;
          if(labelName == platform.id+'/') {
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
            let emoji = pullEmoji(pull);
            if(!platform.pullsByEmoji[emoji]) {
              platform.pullsByEmoji[emoji] = [];
            }
            platform.pullsByEmoji[emoji].push({pull: pull, state: foundContext, userTesting: userTestingContext});
          }
        }
      }
    }
  }

  removeDuplicateTimelineItems() {
    let removeDuplicates = function(items) {
      if(!Array.isArray(items?.nodes)) {
        return;
      }
      // This is very much O(n^2) but the arrays are generally short
      items.nodes = items.nodes.filter(item => {
        let master = items.nodes.find(e => e.subject.number == item.subject.number);
        return items.nodes.indexOf(master) == items.nodes.indexOf(item);
      })
    };

    if(this.status.github && this.status.github.data) {
      this.status.github.data.repository.pullRequests.edges.forEach(item => {
        removeDuplicates(item.node.timelineItems);
     });
    }

    if(this.status.issues) {
      this.status.issues.forEach(issue => {
        removeDuplicates(issue.timelineItems);
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
      let emoji = pullEmoji(pull) || "other";
      if(!this.pullsByProject[emoji]) this.pullsByProject[emoji] = [];

      let pd = this.getPlatformPullData(pull);
      this.pullsByProject[emoji].push(pd);

      let base = this.getPullUltimateBase(pull);
      if(!this.pullsByBase[base]) this.pullsByBase[base] = [];
      this.pullsByBase[base].push(pd);

      const author = pull.node.headRefName.match(/^epic\//) ? '' : pull.node.author.login;
      if(!this.pullsByAuthor[author]) this.pullsByAuthor[author] = [];
      this.pullsByAuthor[author].push(pd);

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

  getPlatformFromSentryProject(slug) {
    for(let p of platforms) {
      if(p.sentry == slug) return p.id;
    }
    return null;
  }

  getPlatform(platformId: string): PlatformSpec {
    // if(platformId == 'resources') platformId = 'common';
    return this.platforms.find(e => e.id == platformId);
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
      node.parent = (refs[pull.pull.node.baseRefName] == node ? root : refs[pull.pull.node.baseRefName]) || root;
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

}

export const dataModel = new DataModel();
