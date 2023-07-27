import { ProbotOctokit } from "probot";
import { GetResponseTypeFromEndpointMethod, GetResponseDataTypeFromEndpointMethod } from "@octokit/types";
import { ProcessEventData } from "./keymanapp-test-bot";
import emojiRegex from 'emoji-regex';

const isEpicRef = (ref: string) => !!ref.match(/^epic\//);
const isStableRef = (ref: string) => !!ref.match(/^stable-/);
//const iseRef = (ref: string) => !!ref.match(/^epic\//);
const extractEmojiFromTitle = (title: string) => {
  let regex = emojiRegex(), match;
  while(match = regex.exec(title)) {
    const emoji = match[0];
    if(emoji != '🍒') return emoji;
  }
  return "";
}

export async function processEpicLabelsEmoji(
  octokit: InstanceType<typeof ProbotOctokit>,
  data: ProcessEventData,
  is_pull_request: boolean,
  issue: GetResponseTypeFromEndpointMethod<typeof octokit.rest.issues.get>,
  pull: GetResponseTypeFromEndpointMethod<typeof octokit.rest.pulls.get>,
  /*issue_comments: GetResponseDataTypeFromEndpointMethod<typeof octokit.rest.issues.listComments>*/) {

  console.log(`[@keymanapp-pr-bot] Checking #${issue.data.number} emoji and epic label`);
  let emoji = '';

  const getEmojiFromRef = async (ref: string): Promise<string> => {
    const prs = await octokit.rest.pulls.list({owner: data.owner, repo: data.repo, head: ref});
    if(prs?.data?.length) {
      return extractEmojiFromTitle(prs.data[0].title);
    } else {
      return '';
    }
  }

  const getPullTop = async (base: string): Promise<string> => {
    if(isEpicRef(base) || isStableRef(base) || base == 'master') {
      return base;
    }
    let prs = await octokit.rest.pulls.list({owner: data.owner, repo: data.repo, head: base});
    if(prs?.data?.length) {
      return await getPullTop(prs.data[0].base.ref);
    } else {
      return null;
    }
  }

  // Look at the PR chain to determine if it is based on an epic/ or a stable- branch, or only on master

  if(is_pull_request) {


    // We can assume the PR doesn't have a head ref of either master or stable-x.y

    if(isEpicRef(pull.data.head.ref)) {
      // If the PR is the start of an epic branch, then we can apply an `epic-` label but nothing else
      const epicLabelName = 'epic-' + pull.data.head.ref.substring(5);
      console.log(`[@keymanapp-pr-bot] Applying ${epicLabelName} label to PR #${pull.data.number}`);
      await octokit.rest.issues.addLabels({...data, labels: [epicLabelName]});
      return;
    }


    const topRef = await getPullTop(pull.data.base.ref);
    if(isEpicRef(topRef)) {
      // Apply the epic- label
      const epicLabelName = 'epic-' + topRef.substring(5);

      if(!issue.data.labels.find(label => typeof label != 'string' ? label.name : label == epicLabelName)) {
        await octokit.rest.issues.addLabels({...data, labels: [epicLabelName]});
      }

      // Retrieve the PR emoji title
      emoji = await getEmojiFromRef(topRef);
    } else if(isStableRef(topRef)) {
      emoji = '🏠';
    }
  } else {
    // For issues, we can determine the emoji from the epic label
    const epicLabel = issue.data.labels.find(label => typeof label != 'string' ? label.name.match(/^epic-/) : false);
    if(epicLabel && typeof epicLabel != 'string') {
      // Look for the emoji from the epic's base PR
      emoji = await getEmojiFromRef('epic/'+epicLabel.name.substring(5));
    }
  }

  if(emoji != '') {
    // We'll update the title to add the emoji, if it isn't already there
    if(!issue.data.title.includes(emoji)) {
      const title = issue.data.title + ' ' + emoji;
      await octokit.rest.issues.update({owner: data.owner, repo: data.repo, issue_number: issue.data.number, title});
    }
  }
}