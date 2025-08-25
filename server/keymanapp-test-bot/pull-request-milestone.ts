import { ProbotOctokit } from "probot";
import { GetResponseTypeFromEndpointMethod } from "@octokit/types";

import { ProcessEventData } from "./keymanapp-test-bot.js";
import { getCurrentSprint } from "../current-sprint.js";
import { statusData } from '../data/status-data.js';
import { consoleError, consoleLog } from "../util/console-log.js";

/**
 * Apply the current milestone to the PR if no milestone has been set
 */
export async function processPRMilestone(
  octokit: InstanceType<typeof ProbotOctokit>,
  data: ProcessEventData,
  issue: GetResponseTypeFromEndpointMethod<typeof octokit.rest.issues.get>,
  pull: GetResponseTypeFromEndpointMethod<typeof octokit.rest.pulls.get>,
): Promise<void> {
  consoleLog('pr-bot', null, `Checking PR #${pull.data.number} milestone`);
  const currentSprint = getCurrentSprint(statusData.cache.sprints?.current?.github?.data);
  if(currentSprint && !pull.data.milestone) {
    consoleLog(`pr-bot`, null, `Applying milestone ${currentSprint.title} to PR #${pull.data.number}`);
    const milestones = await octokit.rest.issues.listMilestones({...data, state: "open", per_page: 100});
    const milestone = milestones.data.find(m => m.title == currentSprint.title);
    if(!milestone) {
      consoleError('pr-bot', null, `Could not find milestone ${currentSprint.title} in list of milestones`);
      return;
    }
    await octokit.rest.issues.update({
      owner: data.owner, repo: data.repo, issue_number: issue.data.number,
      milestone: milestone.number
    });
  }
}
