/*
  This unit was testing an issue where the artifact links
  comment was not getting the correct version references,
  because it was picking up a build where there was no real
  version data.
*/

import { ProbotOctokit } from "probot";
import { exit } from "process";
import { getArtifactLinksComment } from "./artifact-links-comment";

export function foo() {
  let octokit = new ProbotOctokit();
  const comment = getArtifactLinksComment(octokit,
    {owner:'keymanapp',repo:'keyman'/*pull.data.head.ref*/},
    {data:{head:{ref:'feat/web/3621-newcontext-group'}}}
  );
  comment.then(data => {
    console.log(data);
    exit(0);
  });
}
