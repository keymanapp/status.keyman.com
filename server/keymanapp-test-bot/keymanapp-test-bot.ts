/*
 * Keyman is copyright (C) SIL International. MIT License.
 *
 * @keymanapptestbot implementation
 */

import { ManualTestProtocol, ManualTestStatus } from "../../shared/manual-test/manual-test-protocols";
import ManualTestParser from '../../shared/manual-test/manual-test-parser';
import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Probot } from "probot";

const manualTestLabelName = 'user-test-required';

function log(s) {
  console.log('@keymanapp-test-bot: '+s);
}

module.exports = (app: Probot) => {
  log('started');
  /*app.on(['issues.opened', 'issues.edited', 'pull_request.edited', 'pull_request.opened'], async (context) => {
    log('issue');
    //app.log.info(context);
    //const params = context.issue({ body: "hello world" });
    //return context.octokit.issues.createComment(params);
    //console.log('Issue opened...' + context.payload);
  });*/
  app.on(['issue_comment.created', 'issue_comment.edited', 'issue_comment.deleted'], async (context) => {
    if(context.isBot) {
      log('issue_comment: isBot');
      return;
    }
    log('issue_comment: '+context.name+', '+context.payload.comment.id);
    //app.log.info(context);

    // TODO: we may just be able to use the issue data coming in
    const issue = await context.octokit.rest.issues.get({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      issue_number: context.payload.issue.number,
    });

    const issue_comments = await context.octokit.rest.issues.listComments({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      issue_number: issue.data.number,
      per_page: 100
    });

    const mtp = new ManualTestParser();
    let protocol = new ManualTestProtocol();

    // Process all comments in the issue / PR
    mtp.parseComment(protocol, null, issue.data.body);
    issue_comments.data.forEach((comment) => {
      mtp.parseComment(protocol, comment.id, comment.body);
    });

    // Determine if all tests have passed
    let testResult = protocol.tests.reduce((previous, test) => test.status() == ManualTestStatus.Passed ? previous : false, true);

    // manual-test-required
    if(testResult && issue.data.labels.find(label => (typeof label == 'string' ? label : label.name) == manualTestLabelName)) {
      log('Removing label '+manualTestLabelName);
      await context.octokit.rest.issues.removeLabel({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: issue.data.number,
        name: manualTestLabelName
      });
    } else if(!testResult && !issue.data.labels.find(label => (typeof label == 'string' ? label : label.name) == manualTestLabelName)) {
      log('Adding label');
      await context.octokit.rest.issues.addLabels({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: issue.data.number,
        labels: [manualTestLabelName]
      });
    }

    // Update the User Testing comment:
    let comment = mtp.getUpdatedUserTestComment(protocol);
    if(comment != protocol.userTestingComment) {
      if(protocol.userTestingCommentId === null) {
        // Update the body of the issue
        await context.octokit.rest.issues.update({
          issue_number: issue.data.number,
          owner: context.payload.repository.owner.login,
          repo: context.payload.repository.name,
          body: comment
        });
      } else {
        await context.octokit.rest.issues.updateComment({
          comment_id: protocol.userTestingCommentId,
          owner: context.payload.repository.owner.login,
          repo: context.payload.repository.name,
          body: comment
        });
      }
    }

    // If this is a pull request, add a status check
    if(context.payload.issue.pull_request) {
      let pr = await context.octokit.pulls.get({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        pull_number: issue.data.number
      });

      const passedTests = protocol.tests.reduce((total, test) => test.status() == ManualTestStatus.Passed ? total + 1 : total, 0);
      const checkDescription = `${passedTests} of ${protocol.tests.length} user tests passed`;

      await context.octokit.repos.createCommitStatus({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        name: '@keymanapp-test-bot User Test Coverage',
        sha: pr.data.head.sha,
        state: passedTests == protocol.tests.length ? 'success' : 'failure',
        target_url: `https://status.keyman.com/user-test/${context.payload.repository.owner.login}/${context.payload.repository.name}/${issue.data.number}`,
        description: checkDescription,
        context: 'user_testing',
      });
    }
  });
};