import { ProbotOctokit } from "probot";
import { GetResponseTypeFromEndpointMethod, GetResponseDataTypeFromEndpointMethod } from "@octokit/types";
import { ProcessEventData } from "./keymanapp-test-bot";
import { getCurrentSprint } from "../current-sprint";
import { statusData } from '../data/status-data';

/**
 * Apply the current milestone to the PR if no milestone has been set
 */
export async function processPRMilestone(
  octokit: InstanceType<typeof ProbotOctokit>,
  data: ProcessEventData,
  issue: GetResponseTypeFromEndpointMethod<typeof octokit.rest.issues.get>,
  pull: GetResponseTypeFromEndpointMethod<typeof octokit.rest.pulls.get>,
): Promise<void> {
  console.log(`[@keymanapp-pr-bot] Checking PR #${pull.data.number} milestone`);
  const currentSprint = getCurrentSprint(statusData.cache.sprints?.current?.github?.data);
  if(currentSprint && !pull.data.milestone) {
    console.log(`[@keymanapp-pr-bot] Applying milestone ${currentSprint.title} to PR #${pull.data.number}`);
    await octokit.rest.issues.update({
      owner: data.owner, repo: data.repo, issue_number: issue.data.number,
      milestone: currentSprint.title
    });
  }
}
