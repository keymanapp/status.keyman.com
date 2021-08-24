/*
 * Keyman is copyright (C) SIL International. MIT License.
 *
 * @keymanapp-test-bot implementation
 */

import { ManualTestProtocol, ManualTestStatus, ManualTestUtil } from "../../shared/manual-test/manual-test-protocols";
import ManualTestParser from '../../shared/manual-test/manual-test-parser';
import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { User } from "@octokit/webhooks-types";
import { Probot, ProbotOctokit } from "probot";

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

  const issue_comments = await octokit.paginate(
    octokit.rest.issues.listComments,
    {...data, per_page: 100},
    response => response.data
  );

  const mtp = new ManualTestParser();
  let protocol = new ManualTestProtocol(data.owner, data.repo, data.issue_number, is_pull_request);

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
  let comment = mtp.getUserTestResultsComment(protocol);
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

    const passedTests = protocol.getTests().reduce((total, test) => test.status() == ManualTestStatus.Passed ? total + 1 : total, 0);
    const checkDescription = protocol.skipTesting ? 'User tests are not required' :
      protocol.getTests().length == 0 ? 'ERROR: User tests have not yet been defined' :
      `${passedTests} of ${protocol.getTests().length} user tests passed`;

    await octokit.repos.createCommitStatus({...data,
      name: '@keymanapp-test-bot User Test Coverage',
      sha: pr.data.head.sha,
      state: protocol.skipTesting || (protocol.getTests().length > 0 && passedTests == protocol.getTests().length) ? 'success' : 'failure',
      target_url: ManualTestUtil.commentLink(data.owner, data.repo, data.issue_number, protocol.userTestResults.id, is_pull_request),
      // for future, perhaps: `https://status.keyman.com/user-test/${data.owner}/${data.repo}/${data.issue_number}`,
      description: checkDescription,
      context: 'user_testing',
    });
  }
}

function shouldProcessEvent(sender: User): boolean {
  if(sender.type != "User")
    return false;

  if(sender.login == "keyman-server")
    return false;

  return true;
}

module.exports = (app: Probot) => {

  app.on(['pull_request.edited', 'pull_request.opened', 'pull_request.synchronize'], async (context) => {
    if(!shouldProcessEvent(context.payload.sender)) return null;
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
    if(!shouldProcessEvent(context.payload.sender)) return null;
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
    if(!shouldProcessEvent(context.payload.sender)) return null;
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
};