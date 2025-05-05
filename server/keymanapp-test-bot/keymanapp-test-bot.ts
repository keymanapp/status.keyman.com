/*
 * Keyman is copyright (C) SIL International. MIT License.
 *
 * @keymanapp-test-bot implementation
 */

import { User } from "@octokit/webhooks-types";
import { Probot, ProbotOctokit } from "probot";
import { GetResponseTypeFromEndpointMethod, GetResponseDataTypeFromEndpointMethod } from "@octokit/types";

import { ManualTestProtocol, ManualTestStatus, ManualTestUtil } from "../../shared/manual-test/manual-test-protocols.js";
import ManualTestParser from '../../shared/manual-test/manual-test-parser.js';
import { statusData } from '../data/status-data.js';
import { getArtifactLinksComment } from "./artifact-links-comment.js";
import { processEpicLabelsEmoji } from './emoji-label.js';
import { processPRMilestone } from './pull-request-milestone.js';
import { updateIssueMilestoneWhenIssueClosed } from "./issue-milestone.js";

const manualTestRequiredLabelName = 'user-test-required';
const manualTestMissingLabelName = 'user-test-missing';
const manualTestFailedLabelName = 'user-test-failed';
const hasUserTestLabelName = 'has-user-test';

function log(s) {
  console.log('[@keymanapp-test-bot] '+s);
}

export interface ProcessEventData {
  owner: string;
  repo: string;
  issue_number: number;
};

async function processEvent(
  octokit: InstanceType<typeof ProbotOctokit>,
  data: ProcessEventData,
  is_pull_request: boolean
) {
  log('processEvent ENTER');
  // TODO: we may just be able to use the issue data coming in
  const issue = await octokit.rest.issues.get({...data});
  const pull = is_pull_request ? await octokit.rest.pulls.get({owner: data.owner, repo: data.repo, pull_number: data.issue_number}) : null;

  const issue_comments = await octokit.paginate(
    octokit.rest.issues.listComments,
    {...data, per_page: 100},
    response => response.data
  );

  await processUserTest(octokit, data, is_pull_request, issue, pull, issue_comments);
  await processEpicLabelsEmoji(octokit, data, is_pull_request, issue, pull);
  if(is_pull_request) {
    await processPRMilestone(octokit, data, issue, pull);
  }
}

async function processUserTest(
  octokit: InstanceType<typeof ProbotOctokit>,
  data: ProcessEventData,
  is_pull_request: boolean,
  issue: GetResponseTypeFromEndpointMethod<typeof octokit.rest.issues.get>,
  pull: GetResponseTypeFromEndpointMethod<typeof octokit.rest.pulls.get>,
  issue_comments: GetResponseDataTypeFromEndpointMethod<typeof octokit.rest.issues.listComments>) {

  const mtp = new ManualTestParser();
  let protocol = new ManualTestProtocol(data.owner, data.repo, data.issue_number, is_pull_request, issue.data.id, pull?.data?.id);
  log(`processEvent: pull.id: ${pull?.data?.id} issue.id: ${issue?.data?.id} baseId: ${protocol?.baseIssueId}`);

  // Process all comments in the issue / PR
  mtp.parseComment(protocol, null, issue.data.body, issue.data.user.login);
  issue_comments.forEach((comment) => {
    mtp.parseComment(protocol, comment.id, comment.body, comment.user.login);
  });

  // DEBUG: console.log(JSON.stringify(protocol, null, 2));

  // has-user-test label
  const hasHasUserTestLabel = issue.data.labels.find(label => (typeof label == 'string' ? label : label.name) == hasUserTestLabelName);
  if(protocol.userTesting.body && !hasHasUserTestLabel) {
    // We have a user test in the issue or PR, so we add the has-user-test label
    log(`processEvent: Adding ${hasUserTestLabelName} label`);
    await octokit.rest.issues.addLabels({...data, labels: [hasUserTestLabelName]});
  } else if(!protocol.userTesting.body && hasHasUserTestLabel) {
    log(`processEvent: Removing ${hasUserTestLabelName} label`);
    await octokit.rest.issues.removeLabel({...data, name: hasUserTestLabelName});
  }

  // For issues, we don't make any changes unless someone has added a `# User Testing` comment
  // In the unlikely event that someone removes a `# User Testing` comment, it is up to them to remove the
  // label and the `# User Test Results` comment if they wish.
  if(!is_pull_request && !protocol.userTesting.body) {
    log('processEvent EXIT: issue has no user test');
    return null;
  }

  // Determine if all tests have a non-'Open' status
  const testComplete = protocol.getTests().reduce((previous, test) => test.status() != ManualTestStatus.Open ? previous : false, true);
  // Determine if any tests have failed or been blocked
  const testFailed = protocol.getTests().reduce((previous, test) =>
    test.status() == ManualTestStatus.Failed || test.status() == ManualTestStatus.Blocked ? true : previous, false);

  // user-test-required label
  const hasManualTestRequiredLabel = issue.data.labels.find(label => (typeof label == 'string' ? label : label.name) == manualTestRequiredLabelName);
  if(testComplete && hasManualTestRequiredLabel) {
    log(`processEvent: Removing ${manualTestRequiredLabelName} label`);
    await octokit.rest.issues.removeLabel({...data, name: manualTestRequiredLabelName});
  } else if(!testComplete && !hasManualTestRequiredLabel) {
    log(`processEvent: Adding ${manualTestRequiredLabelName} label`);
    await octokit.rest.issues.addLabels({...data, labels: [manualTestRequiredLabelName]});
  }

  // user-test-missing label
  const hasManualTestMissingLabel = issue.data.labels.find(label => (typeof label == 'string' ? label : label.name) == manualTestMissingLabelName);
  if(protocol.getTests().length == 0 && !protocol.skipTesting && !hasManualTestMissingLabel) {
    log(`processEvent: Adding ${manualTestMissingLabelName} label`);
    await octokit.rest.issues.addLabels({...data, labels: [manualTestMissingLabelName]});
  } else if((protocol.getTests().length > 0 || protocol.skipTesting) && hasManualTestMissingLabel) {
    log(`processEvent: Removing ${manualTestMissingLabelName} label`);
    await octokit.rest.issues.removeLabel({...data, name: manualTestMissingLabelName});
  }

  // user-test-failed label
  const hasManualTestFailedLabel = issue.data.labels.find(label => (typeof label == 'string' ? label : label.name) == manualTestFailedLabelName);
  if(testFailed && !hasManualTestFailedLabel) {
    log(`processEvent: Adding ${manualTestFailedLabelName} label`);
    await octokit.rest.issues.addLabels({...data, labels: [manualTestFailedLabelName]});
  } else if(!testFailed && hasManualTestFailedLabel) {
    log(`processEvent: Removing ${manualTestFailedLabelName} label`);
    await octokit.rest.issues.removeLabel({...data, name: manualTestFailedLabelName});
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
    statusCounts[ManualTestStatus.Skipped] = 0;
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
      (statusCounts[ManualTestStatus.Skipped] ? `${statusCounts[ManualTestStatus.Skipped]} skipped, ` : '') +
      `${statusCounts[ManualTestStatus.Passed]} test(s) passed of ${totalTests}`;

    const state =
      protocol.skipTesting ? 'success' :
      totalTests == 0 ? 'failure' : // no tests defined, this is an error
      statusCounts[ManualTestStatus.Passed] + statusCounts[ManualTestStatus.Skipped] == totalTests ? 'success' : // all passed
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
  log('processEvent: EXIT');
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

const exports = (app: Probot) => {
  app.on(['pull_request.edited', 'pull_request.opened', 'pull_request.synchronize'], (context) => {
    log('pull_request ENTER: '+context.id+', '+context.payload.pull_request.number);
    if(!shouldProcessEvent(context.payload.sender, context.payload.pull_request.state)) {
      log('pull_request EXIT: '+context.id+' -- skipping');
      return null;
    }
    processEvent(
      context.octokit,
      {
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: context.payload.pull_request.number
      },
      true
    );
    log('pull_request EXIT: '+context.id);
    return 'ok';
  });

  app.on(['issues.labeled'], (context) => {
    log('issues.labeled ENTER: '+context.id+', '+context.payload.issue.number);
    if(!shouldProcessEvent(context.payload.sender, context.payload.issue.state)) {
      log('issues.labeled EXIT: '+context.id+' -- skipping');
      return null;
    }
    processEvent(
      context.octokit,
      {
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: context.payload.issue.number
      },
      false
    );
    log('issues.labeled EXIT: '+context.id);
    return 'ok';
  });

  app.on(['issues.opened', 'issues.edited'], (context) => {
    log('issue ENTER: '+context.id+', '+context.payload.issue.number);
    if(!shouldProcessEvent(context.payload.sender, context.payload.issue.state)) {
      log('issue EXIT: '+context.id+' -- skipping');
      return null;
    }
    processEvent(
      context.octokit,
      {
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: context.payload.issue.number
      },
      false
    );
    log('issue EXIT: '+context.id);
    return 'ok';
  });

  app.on(['issues.closed'], async (context) => {
    log('issues.closed ENTER: '+context.id+', '+context.payload.issue.number);
    // Note: we _do_ want to process the issue close event even though that
    // means the issue is closed, so we fake out our gatekeeper here
    if(!shouldProcessEvent(context.payload.sender, "open")) {
      log('issue.closed EXIT: '+context.id+' -- skipping');
      return null;
    }

    // We only run this process
    await updateIssueMilestoneWhenIssueClosed(context.octokit, {
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      issue_number: context.payload.issue.number
    }, context.payload.issue);

    log('issues.closed EXIT: '+context.id);
    return 'ok';
  });

  app.on(['issue_comment.created', 'issue_comment.edited', 'issue_comment.deleted'], (context) => {
    log('issue_comment ENTER: '+context.id+', '+context.payload.comment.id);
    if(!shouldProcessEvent(context.payload.sender, context.payload.issue.state)) {
      log('issue_comment EXIT: '+context.id+' -- skipping');
      return null;
    }
    processEvent(
      context.octokit,
      {
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: context.payload.issue.number
      },
      !!context.payload.issue.pull_request
    );
    log('issue_comment EXIT: '+context.id);
    return 'ok';
  });

  app.on(['status'], (context) => {
    log('status ENTER: '+context.id+', '+context.payload.sha);
    if(context.payload.context == 'user_testing' || context.payload.state != 'success') {
      log('status EXIT: '+context.id+' -- ignoring event');
      return null;
    }

    // We can look for a corresponding PR in our cache because we'll almost certainly have it there
    // before any check returns 'success'.
    const pulls = statusData.cache.sprints?.current?.github?.data?.repository?.pullRequests?.edges;
    if(!pulls) {
      log('status EXIT: '+context.id+' -- no pulls found -- cache may not be ready');
      return null;
    }

    for(let pull of pulls) {
      let commit = pull?.node?.commits?.edges?.[0]?.node?.commit;
      if(!commit) {
        continue
      }
      if(commit.oid == context.payload.sha){
        log('status: found matching target url');
        processEvent(
          context.octokit,
          {
            owner: context.payload.repository.owner.login,
            repo: context.payload.repository.name,
            issue_number: pull.node.number
          },
          true // is pull request
        );
        log('status EXIT: '+context.id);
        return 'ok';
      }
    }
    log('status EXIT: '+context.id+' -- no matching pull request found');
  });
};

export default exports;