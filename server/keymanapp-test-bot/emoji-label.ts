import { ProbotOctokit } from "probot";
import { GetResponseTypeFromEndpointMethod, GetResponseDataTypeFromEndpointMethod } from "@octokit/types";
import { ProcessEventData } from "./keymanapp-test-bot";
import emojiRegex from 'emoji-regex';
import { issueLabelTypes, issueLabelScopes, issueValidTitleRegex } from "../../shared/issue-labels";

const titleRegex = issueValidTitleRegex;
const validTypeLabels = issueLabelTypes;
const validScopeLabels = issueLabelScopes;

const isEpicRef = (ref: string) => !!ref.match(/^epic\//) || !!ref.match(/^feature-/);
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

const epicRefSubstring = (ref: string) => ref.match(/^epic\//) ? ref.substring('epic/'.length) : ref.substring('feature-'.length);
const epicRefToLabel = (ref: string) => 'epic-'+epicRefSubstring(ref);

function log(issue, s) {
  console.log(`[@keymanapp-pr-bot] #${issue.data.number}: ${s}`);
}

export async function processEpicLabelsEmoji(
  octokit: InstanceType<typeof ProbotOctokit>,
  data: ProcessEventData,
  is_pull_request: boolean,
  issue: GetResponseTypeFromEndpointMethod<typeof octokit.rest.issues.get>,
  pull: GetResponseTypeFromEndpointMethod<typeof octokit.rest.pulls.get>,
  /*issue_comments: GetResponseDataTypeFromEndpointMethod<typeof octokit.rest.issues.listComments>*/) {

  log(issue, `Checking emoji and epic label, and issue title`);
  let emoji = '';

  const getEmojiFromRef = async (ref: string): Promise<string> => {
    const prs = await octokit.rest.pulls.list({owner: data.owner, repo: data.repo, head: 'keymanapp:'+ref});
    log(issue, `Checked ref ${ref}, found ${prs?.data?.length}, #${prs?.data?.[0]?.number}: '${prs?.data?.[0]?.title}'`);
    if(prs?.data?.length) {
      let result = extractEmojiFromTitle(prs.data[0].title);
      log(issue, `Result of '${prs.data[0].title}', found = ${result}`);
      return result;
    } else {
      return '';
    }
  }

  const getPullTop = async (base: string): Promise<string> => {
    if(isEpicRef(base) || isStableRef(base) || base == 'master') {
      return base;
    }
    let prs = await octokit.rest.pulls.list({owner: data.owner, repo: data.repo, head: 'keymanapp:'+base});
    if(prs?.data?.length) {
      return await getPullTop(prs.data[0].base.ref);
    } else {
      log(issue, `failed to get pull top for ${base}: ${prs}`);
      return null;
    }
  }

  // Look at the PR chain to determine if it is based on an epic/ or a stable- branch, or only on master

  if(is_pull_request) {


    // We can assume the PR doesn't have a head ref of either master or stable-x.y

    if(isEpicRef(pull.data.head.ref)) {
      // If the PR is the start of an epic branch, then we can apply an `epic-` label but nothing else
      const epicLabelName = epicRefToLabel(pull.data.head.ref);
      log(issue, `This is the top of an epic branch. Do we need to apply ${epicLabelName} label to PR?`);
      if(!issue.data.labels.find(label => (typeof label != 'string' ? label.name : label) == epicLabelName)) {
        log(issue, `Label '${epicLabelName}' is being applied.`);
        await octokit.rest.issues.addLabels({...data, labels: [epicLabelName]});
      }
      return;
    }


    const topRef = await getPullTop(pull.data.base.ref);
    if(!topRef) {
      log(issue, 'aborting, no top ref found');
      return;
    }
    if(isEpicRef(topRef)) {
      // Apply the epic- label
      const epicLabelName = epicRefToLabel(topRef);
      log(issue, `This is a PR based on epic ${topRef}. Does label '${epicLabelName}' need to be applied?`);

      if(!issue.data.labels.find(label => (typeof label != 'string' ? label.name : label) == epicLabelName)) {
        log(issue, `Label '${epicLabelName}' is being applied.`);
        await octokit.rest.issues.addLabels({...data, labels: [epicLabelName]});
      }

      // Retrieve the PR emoji title
      emoji = await getEmojiFromRef(topRef);
    } else if(isStableRef(topRef)) {
      // Apply the stable label
      log(issue, `This is a PR based on stable branch ${topRef}. Does label 'stable' need to be applied?`);

      if(!issue.data.labels.find(label => (typeof label != 'string' ? label.name : label) == 'stable')) {
        log(issue, `Label 'stable' is being applied.`);
        await octokit.rest.issues.addLabels({...data, labels: ['stable']});
      }

      emoji = '🏠';
    }
  } else {
    // For issues, we can determine the emoji from the epic label
    const epicLabel = issue.data.labels.find(label => (typeof label != 'string' ? label.name.match(/^epic-/) : false));
    if(epicLabel && typeof epicLabel != 'string') {
      // Look for the emoji from the epic's base PR
      log(issue, 'Searching for emoji on epic/'+epicLabel.name.substring(5));
      emoji = await getEmojiFromRef('epic/'+epicLabel.name.substring(5));
      if(!emoji) {
        log(issue, 'Searching for emoji on feature-'+epicLabel.name.substring(5));
        emoji = await getEmojiFromRef('feature-'+epicLabel.name.substring(5));
      }
    }

    await applyIssueLabels(octokit, data, issue);
  }

  if(emoji != '') {
    log(issue, `Found emoji ${emoji}`);
    // We'll update the title to add the emoji, if it isn't already there
    if(!issue.data.title.includes(emoji)) {
      log(issue, `Applying emoji ${emoji}`);
      const title = issue.data.title + ' ' + emoji;
      await octokit.rest.issues.update({owner: data.owner, repo: data.repo, issue_number: issue.data.number, title});
    }
  }
}

// Attempt to automatically add labels corresponding to issue title
//
// type(scope[,scope...]): title [emoji]
// type: auto|bug|change|chore|docs|feat|maint|refactor|spec|style|test
// scope: android|common|core|developer|ios|linux|mac|web|windows
//
async function applyIssueLabels(
  octokit: InstanceType<typeof ProbotOctokit>,
  data: ProcessEventData,
  issue: GetResponseTypeFromEndpointMethod<typeof octokit.rest.issues.get>
) {
  const matches = titleRegex.exec(issue.data.title);
  if(!matches) {
    // This is not a title format that we recognise for automatic labelling
    return;
  }
  const existingLabels = issue.data.labels
    .map(label => typeof label == 'string' ? label : label.name);

  const labelsToAdd =
    // add any scopes -- if no scope defined, the issue goes under 'common'
    (matches[2] || 'common')
    .split(',')
    .map(name => name.trim().toLowerCase() + '/')
    .filter(name => validScopeLabels.includes(name))
    // also add title
    .concat([matches[1]]);

  // We'll remove our known top-level scopes that don't match, and 'type'
  // labels that are not in the title. Sub-scopes will remain, as we don't
  // generally put those into the title
  const labelsToRemove = existingLabels
    .filter(name =>
      (validScopeLabels.includes(name) || validTypeLabels.includes(name))
      // Obviously don't remove labels that we are trying to add
      && !labelsToAdd.includes(name));

  // Remove the old labels
  log(issue, `Removing labels ${labelsToRemove.join(',')}`);
  for(let name of labelsToRemove) {
    await octokit.rest.issues.removeLabel({...data, name});
  }

  // Don't add labels that are already present
  const newLabelsToAdd = labelsToAdd.filter(name => !existingLabels.includes(name));
  if(newLabelsToAdd.length) {
    // Then add the actually new labels
    log(issue, `Adding labels ${newLabelsToAdd.join(',')}`);
    await octokit.rest.issues.addLabels({...data, labels: newLabelsToAdd});
  }
}