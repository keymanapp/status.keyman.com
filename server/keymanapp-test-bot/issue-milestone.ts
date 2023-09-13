import { Probot, ProbotOctokit } from "probot";
import { Issue } from "@octokit/webhooks-types";
import { ProcessEventData } from "./keymanapp-test-bot";
import { getCurrentSprint } from "../current-sprint";
import { statusData } from '../data/status-data';

/**
 * Apply the current milestone to the issue when it is closed,
 * even if a milestone was previously set.
 */
export async function updateIssueMilestoneWhenIssueClosed(
  octokit: InstanceType<typeof ProbotOctokit>,
  data: ProcessEventData,
  issue: Issue
): Promise<void> {
  console.log(`[@keymanapp-pr-bot] Updating issue #${issue.number} milestone`);
  const currentSprint = getCurrentSprint(statusData.cache.sprints?.current?.github?.data);
  if(currentSprint) {
    console.log(`[@keymanapp-pr-bot] Applying milestone ${currentSprint.title} to issue #${issue.number}`);
    const milestones = await octokit.rest.issues.listMilestones({...data, state: "open", per_page: 100});
    const milestone = milestones.data.find(m => m.title == currentSprint.title);
    if(!milestone) {
      console.error(`Could not find milestone ${currentSprint.title} in list of milestones`);
      return;
    }
    await octokit.rest.issues.update({
      owner: data.owner, repo: data.repo, issue_number: issue.number,
      milestone: milestone.number
    });
  }
}
