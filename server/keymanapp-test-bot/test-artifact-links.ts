/*
  To use this unit to test the artifacts output:

  1. update the data on line 17 for a currently open pull request
  2. set `debugTestBot = true` in code.ts (around line 34)
  3. run `npm run start-server`

  This will emit markdown for the current test artifacts for that PR
*/

import { ProbotOctokit } from "probot";
import { exit } from "process";
import { getArtifactLinksComment } from "./artifact-links-comment";

export function testArtifactLinks() {
  let octokit = new ProbotOctokit();
  const comment = getArtifactLinksComment(octokit,
    {owner:'keymanapp',repo:'keyman'/*pull.data.head.ref*/},
    {data:{number:6494, head:{ref:'fix/android/6489-key-tip-sticky'}}}
  );
  comment.then(data => {
    console.log(data);
    exit(0);
  });
}
