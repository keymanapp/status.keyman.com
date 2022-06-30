/*
  To use this unit to generate a User Test Results Comment:

  1. update the data on line 17 for a currently open pull request
  2. set `debugTestBot = true` in code.ts (around line 34)
  3. run `npm run start-server`

  This will emit markdown for the current test artifacts for that PR
*/

import { ProbotOctokit } from "probot";
import { exit } from "process";
import ManualTestParser from "../../shared/manual-test/manual-test-parser";
import { ManualTestProtocol } from "../../shared/manual-test/manual-test-protocols";
import { getArtifactLinksComment } from "./artifact-links-comment";

const pr = 6849;
const is_pull_request = true;
const data = {owner:'keymanapp', repo:'keyman', issue_number: pr};

export async function testUserTestComment() {
  let octokit = new ProbotOctokit();

  const issue = await octokit.rest.issues.get(data);
  const pull = is_pull_request ? await octokit.rest.pulls.get({owner: data.owner, repo: data.repo, pull_number: pr}) : null;

  const issue_comments = await octokit.paginate(
    octokit.rest.issues.listComments,
    {...data, per_page: 100},
    response => response.data
  );

  const mtp = new ManualTestParser();
  let protocol = new ManualTestProtocol(data.owner, data.repo, data.issue_number, is_pull_request, issue.data.id, pull?.data?.id);

  // Process all comments in the issue / PR
  mtp.parseComment(protocol, null, issue.data.body, issue.data.user.login);
  issue_comments.forEach((comment) => {
    mtp.parseComment(protocol, comment.id, comment.body, comment.user.login);
  });

  // Update the `# User Test Results` comment
  let comment = (mtp.getUserTestResultsComment(protocol) + '\n' +
    await getArtifactLinksComment(octokit, {owner: data.owner, repo: data.repo}, pull)
    ).trimRight();

  console.log(comment);
  exit(0);
}





