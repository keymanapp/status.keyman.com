import express from 'express';
import { timingManager, sendWsAlert, respondGitHubContributionsDataChange, reportSiteErrorToSentry } from '../code.js';
import { statusData } from '../data/status-data.js';
import { USER_TEST_RESULT_REGEX } from '../services/github/github-test-contributions.js';
import { consoleLog } from '../util/console-log.js';
import { Webhooks } from "@octokit/webhooks";

const webhooks = new Webhooks({
  secret: process.env.KEYMANSTATUS_GITHUB_WEBHOOK_SECRET ?? 'unset',
});

export async function processGithubWebhookEvent(request: express.Request, response: express.Response): Promise<boolean> {
  // For now, removing this so that we get all refreshes -- check_run and
  // check_suite are busy but only do anything significant if they reference a
  // specific PR, so majority of those events should have no real impact. The
  // problem here is that we lose the individual refreshes as they are coalesced
  // by timingManager, but we need them to keep issues and PRs in sync, so a
  // redesign is needed.
  //
  // if(timingManager.isTooSoon('github', GitHubRefreshRate, () => respondGitHubDataChange(request))) {
  //   return;
  // }
  timingManager.start('github');
  try {

    const signature = request.headers["x-hub-signature-256"] as string ?? '';
    const body = JSON.stringify(request.body);

    if (!(await webhooks.verify(body, signature))) {
      response.status(401).send("Unauthorized");
      return false;
    }

    const event = request?.headers?.['x-github-event'];
    const issueNumber = request?.body?.issue?.number;
    const pullNumber = request?.body?.pull_request?.number;
    const repo = request?.body?.repository?.name;
    const action = request?.body?.action;

    if ((event == 'issues' || event == 'issue_comment') && !request?.body?.issue?.pull_request) {
      consoleLog('main', 'github', `POST webhook ${event}.${action} : keymanapp/${repo}#${issueNumber}`);
      try {
        if (await statusData.refreshGitHubIssueData(repo, issueNumber)) {
          sendWsAlert(true, 'github-issues');

          await respondGitHubContributionsDataChange(
            { issue: true, post: false, pull: false, review: false, test: false }
          );
        }
      } catch (error) {
        reportSiteErrorToSentry(error);
      }
      /*  } else if(event == 'check_run') {
          // TODO: only refresh data related to check runs?
          const prNumbers = request.body?.check_suite?.pull_requests?.map(pr => pr.number) ?? [];
        } else if(event == 'check_suite') {
          // TODO: only refresh data related to check suites?
          const prNumbers = request.body?.check_suite?.pull_requests?.map(pr => pr.number) ?? [];
        } else if(event == 'pull_request') {
          // TODO: only refresh data related to pull requests
          const prNumber = request.body?.pull_request?.number;
      */
    } else {
      try {
        const prNumbers: { hasBeenClosed: boolean; repo: string; pullNumber: number; }[] = [];
        if (issueNumber && repo && request?.body?.issue?.pull_request) {
          prNumbers.push({ hasBeenClosed: request.body.issue.state == 'closed', repo, pullNumber: issueNumber });
        } else if (pullNumber && repo) {
          prNumbers.push({ hasBeenClosed: request.body.action == 'closed' || request.body.pull_request?.state == 'closed', repo, pullNumber });
        } else if (event == 'check_suite') {
          prNumbers.push(...request.body?.check_suite?.pull_requests?.map(pr => ({ hasBeenClosed: false, repo: pr.base.repo.name, pullNumber: pr.number })) ?? []);
        } else if (event == 'check_run') {
          prNumbers.push(...request.body?.check_run?.check_suite?.pull_requests?.map(pr => ({ hasBeenClosed: false, repo: pr.base.repo.name, pullNumber: pr.number })) ?? []);
        }

        consoleLog('main', 'github', `POST webhook ${event}.${action} : ${prNumbers.map(p => `keymanapp/${p.repo}#${p.pullNumber}`).join(',')}`);

        if (await statusData.refreshGitHubPullRequestsData(prNumbers)) {
          sendWsAlert(true, 'github'); // TODO: later just refresh prs

          if (event != 'check_run' && event != 'check_suite') {
            // We'll only refresh contribution data if the event type merits it -- checks do not impact contributions
            const isUserTestComment = event == 'issue_comment' &&
              (request?.body?.comment?.body ?? '').match(USER_TEST_RESULT_REGEX);
            await respondGitHubContributionsDataChange({ issue: event == 'issues', post: false, pull: event == 'pull_request', review: event == 'pull_request' || event == 'pull_request_review', test: isUserTestComment });
          }
        }
      } catch (error) {
        reportSiteErrorToSentry(error);
      }
    }
  } finally {
    timingManager.finish('github');
  }
  return true;
}

