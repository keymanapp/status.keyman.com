import { ProbotOctokit } from "probot";
import { Issue } from "@octokit/webhooks-types";

import { ProcessEventData } from "./keymanapp-test-bot.js";
import { getCurrentSprint } from "../current-sprint.js";
import { statusData } from '../data/status-data.js';
import { consoleError, consoleLog } from "../util/console-log.js";

/**
 * Apply the current milestone to the issue when it is closed,
 * even if a milestone was previously set.
 */
export async function updateIssueMilestoneWhenIssueClosed(
  octokit: InstanceType<typeof ProbotOctokit>,
  data: ProcessEventData,
  issue: Issue
): Promise<void> {
  consoleLog('pr-bot', null, `Updating issue #${issue.number} milestone`);
  const currentSprint = getCurrentSprint(statusData.cache.sprints?.current?.github?.data);
  if(currentSprint) {
    consoleLog('pr-bot', null, `Applying milestone ${currentSprint.title} to issue #${issue.number}`);
    const milestones = await octokit.rest.issues.listMilestones({...data, state: "open", per_page: 100});
    const milestone = milestones.data.find(m => m.title == currentSprint.title);
    if(!milestone) {
      consoleError('pr-bot', null, `Could not find milestone ${currentSprint.title} in list of milestones`);
      return;
    }
    await octokit.rest.issues.update({
      owner: data.owner, repo: data.repo, issue_number: issue.number,
      milestone: milestone.number
    });
  }
}
