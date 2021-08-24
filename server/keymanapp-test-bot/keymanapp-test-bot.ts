/*
 * Keyman is copyright (C) SIL International. MIT License.
 *
 * @keymanapptestbot implementation
 */

import { ManualTestProtocol, ManualTestStatus } from "../../shared/manual-test/manual-test-protocols";
import ManualTestParser from '../../shared/manual-test/manual-test-parser';
import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
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

  // TODO: deal with greater numbers of comments with pagination
  const issue_comments = await octokit.rest.issues.listComments({...data, per_page: 100});

  const mtp = new ManualTestParser();
  let protocol = new ManualTestProtocol(data.owner, data.repo, data.issue_number, is_pull_request);

  // Process all comments in the issue / PR
  mtp.parseComment(protocol, null, issue.data.body);
  issue_comments.data.forEach((comment) => {
    mtp.parseComment(protocol, comment.id, comment.body);
  });

  // Determine if all tests no longer have an 'Open' status
  let testResult = protocol.tests.reduce((previous, test) => test.status() != ManualTestStatus.Open ? previous : false, true);

  // For issues, we don't make any changes unless someone has added a `# User Testing` comment
  // In the unlikely event that someone removes a `# User Testing` comment, it is up to them to remove the
  // label and the `# User Test Results` comment if they wish.
  if(!is_pull_request && !protocol.userTesting.id) {
    return null;
  }

  // manual-test-required
  const hasManualTestRequiredLabel = issue.data.labels.find(label => (typeof label == 'string' ? label : label.name) == manualTestRequiredLabelName);
  if(testResult && hasManualTestRequiredLabel) {
    log(`Removing ${manualTestRequiredLabelName} label`);
    await octokit.rest.issues.removeLabel({...data, name: manualTestRequiredLabelName});
  } else if(!testResult && !hasManualTestRequiredLabel) {
    log(`Adding ${manualTestRequiredLabelName} label`);
    await octokit.rest.issues.addLabels({...data, labels: [manualTestRequiredLabelName]});
  }

  // manual-test-missing
  const hasManualTestMissingLabel = issue.data.labels.find(label => (typeof label == 'string' ? label : label.name) == manualTestMissingLabelName);
  if(protocol.tests.length == 0 && !protocol.skipTesting && !hasManualTestMissingLabel) {
    log(`Adding ${manualTestMissingLabelName} label`);
    await octokit.rest.issues.addLabels({...data, labels: [manualTestMissingLabelName]});
  } else if((protocol.tests.length > 0 || protocol.skipTesting) && hasManualTestMissingLabel) {
    log(`Removing ${manualTestMissingLabelName} label`);
    await octokit.rest.issues.removeLabel({...data, name: manualTestMissingLabelName});
  }

  // Update the User Test Results comment:
  let comment = mtp.getUserTestResultsComment(protocol);
  if(comment != protocol.userTestResults.body) {
    if(protocol.userTestResults.id) {
      // Update the body of result comment
      await octokit.rest.issues.updateComment({...data, comment_id: protocol.userTestResults.id, body: comment});
    } else {
      await octokit.rest.issues.createComment({...data, body: comment});
    }
  }

  // If this is a pull request, add a status check
  if(is_pull_request) {
    let pr = await octokit.pulls.get({...data, pull_number: data.issue_number});

    const passedTests = protocol.tests.reduce((total, test) => test.status() == ManualTestStatus.Passed ? total + 1 : total, 0);
    const checkDescription = protocol.skipTesting ? 'User tests are not required' :
      protocol.tests.length == 0 ? 'ERROR: User tests have not yet been defined' :
      `${passedTests} of ${protocol.tests.length} user tests passed`;

    await octokit.repos.createCommitStatus({...data,
      name: '@keymanapp-test-bot User Test Coverage',
      sha: pr.data.head.sha,
      state: protocol.skipTesting || (protocol.tests.length > 0 && passedTests == protocol.tests.length) ? 'success' : 'failure',
      target_url: `https://status.keyman.com/user-test/${data.owner}/${data.repo}/${data.issue_number}`,
      description: checkDescription,
      context: 'user_testing',
    });
  }
}

module.exports = (app: Probot) => {

  app.on(['pull_request.edited', 'pull_request.opened'], async (context) => {
    log('pull_request: '+context.name+', '+context.payload.pull_request.number);

    return processEvent(
      context.octokit,
      {
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: context.payload.pull_request.number
      },
      false
    );
  });

  app.on(['issues.opened', 'issues.edited'], async (context) => {
    log('issue: '+context.name+', '+context.payload.issue.number);

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
    if(context.isBot) {
      log('issue_comment: isBot');
      return;
    }
    log('issue_comment: '+context.name+', '+context.payload.comment.id);

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