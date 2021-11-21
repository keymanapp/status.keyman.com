/*
 * Keyman is copyright (C) SIL International. MIT License.
 *
 * @keymanapp-test-bot implementation
 */

import { ManualTestProtocol, ManualTestStatus, ManualTestUtil } from "../../shared/manual-test/manual-test-protocols";
import ManualTestParser from '../../shared/manual-test/manual-test-parser';
import { artifactLinks } from '../../shared/artifact-links';
import teamcityService from "../services/teamcity/teamcity";
import { User } from "@octokit/webhooks-types";
import { Probot, ProbotOctokit } from "probot";
import { statusData } from '../data/status-data';

const manualTestRequiredLabelName = 'user-test-required';
const manualTestMissingLabelName = 'user-test-missing';

function log(s) {
  console.log('@keymanapp-test-bot: '+s);
}

interface ProcessEventData {
  owner: string;
  repo: string;
  issue_number: number;
};

async function processEvent(
  octokit: InstanceType<typeof ProbotOctokit>,
  data: ProcessEventData,
  is_pull_request: boolean
) {

  // TODO: we may just be able to use the issue data coming in
  const issue = await octokit.rest.issues.get({...data});
  const pull = is_pull_request ? await octokit.rest.pulls.get({owner: data.owner, repo: data.repo, pull_number: data.issue_number}) : null;

  const issue_comments = await octokit.paginate(
    octokit.rest.issues.listComments,
    {...data, per_page: 100},
    response => response.data
  );

  const mtp = new ManualTestParser();
  let protocol = new ManualTestProtocol(data.owner, data.repo, data.issue_number, is_pull_request, pull ? pull.data.id : issue.data.id);

  // Process all comments in the issue / PR
  mtp.parseComment(protocol, null, issue.data.body);
  issue_comments.forEach((comment) => {
    mtp.parseComment(protocol, comment.id, comment.body);
  });

  // DEBUG: console.log(JSON.stringify(protocol, null, 2));

  // For issues, we don't make any changes unless someone has added a `# User Testing` comment
  // In the unlikely event that someone removes a `# User Testing` comment, it is up to them to remove the
  // label and the `# User Test Results` comment if they wish.
  if(!is_pull_request && !protocol.userTesting.body) {
    return null;
  }

  // Determine if all tests have a non-'Open' status
  let testResult = protocol.getTests().reduce((previous, test) => test.status() != ManualTestStatus.Open ? previous : false, true);

  // manual-test-required label
  const hasManualTestRequiredLabel = issue.data.labels.find(label => (typeof label == 'string' ? label : label.name) == manualTestRequiredLabelName);
  if(testResult && hasManualTestRequiredLabel) {
    log(`Removing ${manualTestRequiredLabelName} label`);
    await octokit.rest.issues.removeLabel({...data, name: manualTestRequiredLabelName});
  } else if(!testResult && !hasManualTestRequiredLabel) {
    log(`Adding ${manualTestRequiredLabelName} label`);
    await octokit.rest.issues.addLabels({...data, labels: [manualTestRequiredLabelName]});
  }

  // manual-test-missing label
  const hasManualTestMissingLabel = issue.data.labels.find(label => (typeof label == 'string' ? label : label.name) == manualTestMissingLabelName);
  if(protocol.getTests().length == 0 && !protocol.skipTesting && !hasManualTestMissingLabel) {
    log(`Adding ${manualTestMissingLabelName} label`);
    await octokit.rest.issues.addLabels({...data, labels: [manualTestMissingLabelName]});
  } else if((protocol.getTests().length > 0 || protocol.skipTesting) && hasManualTestMissingLabel) {
    log(`Removing ${manualTestMissingLabelName} label`);
    await octokit.rest.issues.removeLabel({...data, name: manualTestMissingLabelName});
  }

  // Update the `# User Test Results` comment
  let comment = (mtp.getUserTestResultsComment(protocol) + '\n' +
    await getArtifactLinksComment(octokit, {owner: data.owner, repo: data.repo}, pull)
    ).trimRight();
  if(comment != protocol.userTestResults.body) {
    if(protocol.userTestResults.id) {
      await octokit.rest.issues.updateComment({...data, comment_id: protocol.userTestResults.id, body: comment});
    } else {
      let commentData = await octokit.rest.issues.createComment({...data, body: comment});
      // note: assuming success here
      protocol.userTestResults.id = commentData.data.id;
    }
  }

  // If this is a pull request, add a status check
  if(is_pull_request) {
    let pr = await octokit.pulls.get({...data, pull_number: data.issue_number});

    let statusCounts = {}, totalTests = 0;
    statusCounts[ManualTestStatus.Open] = 0;
    statusCounts[ManualTestStatus.Passed] = 0;
    statusCounts[ManualTestStatus.Failed] = 0;
    statusCounts[ManualTestStatus.Blocked] = 0;
    statusCounts[ManualTestStatus.Unknown] = 0;
    for(let test of protocol.getTests()) {
      statusCounts[test.status()]++;
      totalTests++;
    }

    const checkDescription =
      protocol.skipTesting ? 'User tests are not required' :
      totalTests == 0 ? 'ERROR: User tests have not yet been defined' :

      (statusCounts[ManualTestStatus.Failed] ? `${statusCounts[ManualTestStatus.Failed]} failed, ` : '') +
      (statusCounts[ManualTestStatus.Blocked] ? `${statusCounts[ManualTestStatus.Blocked]} blocked, ` : '') +
      `${statusCounts[ManualTestStatus.Passed]} test(s) passed of ${totalTests}`;

    const state =
      protocol.skipTesting ? 'success' :
      totalTests == 0 ? 'failure' : // no tests defined, this is an error
      statusCounts[ManualTestStatus.Passed] == totalTests ? 'success' : // all passed
      statusCounts[ManualTestStatus.Failed] + statusCounts[ManualTestStatus.Blocked] == 0 ? 'pending' :  // no errors, but testing unfinished
      'failure'; // at least one error

    await octokit.repos.createCommitStatus({...data,
      name: '@keymanapp-test-bot User Test Coverage',
      sha: pr.data.head.sha,
      state: state,
      target_url: ManualTestUtil.commentLink(data.owner, data.repo, data.issue_number, protocol.userTestResults.id, is_pull_request),
      // for future, perhaps: `https://status.keyman.com/user-test/${data.owner}/${data.repo}/${data.issue_number}`,
      description: checkDescription,
      context: 'user_testing',
    });
  }
}

function shouldProcessEvent(sender: User, state: "closed"|"open"): boolean {
  if(sender.type != "User")
    return false;

  if(sender.login == "keyman-server")
    return false;

  if(state == "closed")
    return false;

  return true;
}

async function getArtifactLinksComment(
  octokit: InstanceType<typeof ProbotOctokit>,
  data,
  pull) {
  // Only pull requests can have artifacts
  if(!pull) return '';
  const statuses = await octokit.rest.repos.getCombinedStatusForRef({...data, ref: pull.data.head.ref});
  //const statuses = await octokit.rest.repos.getCombinedStatusForRef({owner:'keymanapp',repo:'keyman',ref:'fix/web/5950-clear-timeout-on-longpress-flick'/*pull.data.head.ref*/});
  let s = {};
  statuses.data.statuses.forEach(status => {
    if(s[status.context]) return;
    let o = {
      context: status.context,
      url: status.target_url,
      state: status.state,
    };
    s[status.context] = o;
  });

  let r = '';
  let version = null;

  // Load version of the build from cached data or if necessary,
  // pull it from TeamCity
  version = findBuildVersion(s, statusData.cache.teamCity) ??
            findBuildVersion(s, (await teamcityService.get())[0]);
  if(version) version = /^(\d+\.\d+\.\d+)/.exec(version)?.[1];

  //log(version);

  for(let context of Object.keys(s)) {
    if(s[context].state == 'success') {
      // artifactLinks
      const u = new URL(s[context].url);
      if(u.searchParams.has('buildTypeId')) {
        // Assume TeamCity
        let buildTypeId = u.searchParams.get('buildTypeId');
        let buildId = u.searchParams.get('buildId');
        let t = artifactLinks.teamCityTargets[buildTypeId];
        if(t) {
          for(let download of t.downloads) {
            let fragment = download.fragment.replace(/\$version/g, version);
            if(r == '') r = '\n## Test Artifacts\n\n';
            r += `* [${download.name}](https://build.palaso.org/repository/download/${buildTypeId}/${buildId}:id/${fragment})\n`;
          }
        }
      }
    }
  }

  return r;
}

function findBuildVersion(s, teamCity) {
  for(let context of Object.keys(s)) {
    if(s[context].state == 'success') {
      // artifactLinks
      const u = new URL(s[context].url);
      if(u.searchParams.has('buildTypeId')) {
        // Assume TeamCity
        let buildTypeId = u.searchParams.get('buildTypeId');
        let buildId = u.searchParams.get('buildId');
        let version = getVersionFromTeamCityFromCache(buildTypeId, buildId, teamCity);
        if(version) {
          return version;
        }
      }
    }
  }
  return null;
}

function getVersionFromTeamCityFromCache(buildTypeId, buildId, teamCity) {
  return teamCity?.[buildTypeId]?.builds?.find(e => e.id == buildId)?.number;
}

module.exports = (app: Probot) => {

  app.on(['pull_request.edited', 'pull_request.opened', 'pull_request.synchronize'], async (context) => {
    if(!shouldProcessEvent(context.payload.sender, context.payload.pull_request.state)) return null;
    log('pull_request: '+context.id+', '+context.payload.pull_request.number);
    return processEvent(
      context.octokit,
      {
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: context.payload.pull_request.number
      },
      true
    );
  });

  app.on(['issues.opened', 'issues.edited'], async (context) => {
    if(!shouldProcessEvent(context.payload.sender, context.payload.issue.state)) return null;
    log('issue: '+context.id+', '+context.payload.issue.number);
    return processEvent(
      context.octokit,
      {
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: context.payload.issue.number
      },
      false
    );
  });

  app.on(['issue_comment.created', 'issue_comment.edited', 'issue_comment.deleted'], async (context) => {
    if(!shouldProcessEvent(context.payload.sender, context.payload.issue.state)) return null;
    log('issue_comment: '+context.id+', '+context.payload.comment.id);
    return processEvent(
      context.octokit,
      {
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: context.payload.issue.number
      },
      !!context.payload.issue.pull_request
    );
  });

  app.on(['status'], async (context) => {
    log('status: '+context.id+', '+context.payload.sha);
    if(context.payload.context == 'user_testing' || context.payload.state != 'success') {
      log('status: ignoring event');
      return null;
    }

    // We can look for a corresponding PR in our cache because we'll almost certainly have it there
    // before any check returns 'success'.
    const pulls = statusData.cache.sprints?.current?.github?.data?.repository?.pullRequests?.edges;
    if(!pulls) {
      log('status: no pulls found -- cache may not be ready');
      return null;
    }

    for(let pull of pulls) {
      let ctxs = pull?.node?.commits?.edges?.[0]?.node?.commit?.status?.contexts;
      if(!ctxs) {
        continue;
      }
      for(let ctx of ctxs) {
        if(ctx.targetUrl == context.payload.target_url) {
          log('status: found matching target url');
          return processEvent(
            context.octokit,
            {
              owner: context.payload.repository.owner.login,
              repo: context.payload.repository.name,
              issue_number: pull.node.number
            },
            true // is pull request
          );
        }
      }
    }
    log('status: no matching pull request found');
  });
};