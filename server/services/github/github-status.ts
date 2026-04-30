
import httppost from '../../util/httppost.js';
import { github_token } from '../../identity/github.js';
import { getCurrentSprint } from '../../current-sprint.js';
import { issueLabelScopes } from '../../../shared/issue-labels.js';
import { logGitHubRateLimit } from '../../util/github-rate-limit.js';

import * as Sentry from '@sentry/node';
import { consoleError, consoleLog } from '../../util/console-log.js';

const queryStrings = {

  keyboards: `
    rateLimit {
      limit
      cost
      remaining
      resetAt
    }
    keyboards: repository(owner: "keymanapp", name: "keyboards") {
      issues(filterBy: {states: OPEN}) {
        totalCount
      }
      pullRequests(states: OPEN) {
        totalCount
      }
    }
  `,

  lexicalModels: `
    rateLimit {
      limit
      cost
      remaining
      resetAt
    }
    lexicalModels: repository(owner: "keymanapp", name: "lexical-models") {
      issues(filterBy: {states: OPEN}) {
        totalCount
      }
      pullRequests(states: OPEN) {
        totalCount
      }
    }
  `,

  unlabeledIssues: `
    rateLimit {
      limit
      cost
      remaining
      resetAt
    }
    unlabeledIssues: search(type: ISSUE, first: 100, query: "repo:keymanapp/keyman is:issue is:open ${issueLabelScopes.map(scope=>`-label:${scope}`).join(' ')}") {
      issueCount
      nodes {
        ... on Issue {
          author {
            login
            avatarUrl
            url
          }
          labels(first:5) {
            nodes {
              name
              color
            }
          }
          title
          number
          url
        }
      }
    }
  `,

  repositoryRefsLabelsMilestones: `
    rateLimit {
      limit
      cost
      remaining
      resetAt
    }
    repositoryRefsLabelsMilestones: repository(owner: "keymanapp", name: "keyman") {
      refs(first:100, refPrefix: "refs/heads/") {
        nodes {
          name
        }
      }
      issueLabels: labels(first: 100) {
        edges {
          node {
            name
            openIssues: issues(first: 100, filterBy: {states: [OPEN]}) {
              totalCount
            }
          }
        }
      }
      milestones(first: 10, orderBy: {direction: ASC, field: DUE_DATE}, states: OPEN) {
        edges {
          node {
            dueOn
            title
            openIssues: issues(first: 1, states: OPEN) {
              totalCount
            }
            closedIssues: issues(first: 1, states: CLOSED) {
              totalCount
            }
            openPullRequests: pullRequests(first: 1, states: OPEN) {
              totalCount
            }
            mergedPullRequests: pullRequests(first: 1, states: MERGED) {
              totalCount
            }
          }
        }
      }
    }
  `,

  organization: `
    rateLimit {
      limit
      cost
      remaining
      resetAt
    }
    organization(login: "keymanapp") {
      repositories(isArchived:false, isFork:false, first: 100) {
        nodes {
          name
        }
      }
    }
  `
};

export const pullRequestQuery = `
  title
  number
  isDraft # requires application/vnd.github.shadow-cat-preview+json
  headRefName
  baseRefName

  additions
  deletions

  milestone {
    title
  }
  author {
    avatarUrl
    login
    url
  }

  reviewsRequested:timelineItems(
    itemTypes: [REVIEW_REQUESTED_EVENT]
    first: 10
  ) {
    nodes {
      ... on ReviewRequestedEvent {
        createdAt
      }
    }
  }

  timelineItems(itemTypes: [CROSS_REFERENCED_EVENT, CONNECTED_EVENT, DISCONNECTED_EVENT], first: 10) {
    nodes {
      ... on CrossReferencedEvent {
        __typename
        subject: source {
          ... on Issue {
            number
            url
          }
          ... on PullRequest {
            number
            url
          }
        }
      }
      ... on ConnectedEvent {
        __typename
        subject {
          ... on Issue {
            number
            url
          }
        }
      }
      ... on DisconnectedEvent {
        __typename
        subject {
          ... on Issue {
            number
          }
        }
      }
    }
  }

  commits(last: 1) {
    edges {
      node {
        commit {
          oid
          status {
            contexts {
              description
              context
              state
              targetUrl
            }
          }
        }
      }
    }
    nodes {
      commit {
        checkSuites(last: 10) {
          nodes {
            app { name }
            conclusion
            status
          }
        }
      }
    }
  }

  reviews(last:100) {
    nodes {
      author { login }
      updatedAt
      state
    }
  }

  labels(first: 25) {
    edges {
      node {
        color
        name
      }
    }
  }

  url
`;

const repoQuery = (name) => `
  rateLimit {
    limit
    cost
    remaining
    resetAt
  }
  repository(owner: "keymanapp", name: "${name}") {
    name
    pullRequests(last: 100, states: OPEN) {
      edges {
        node {
          ${pullRequestQuery}

        }
      }
    }
  }
`;

// Lists all open pull requests in keyman repos
// and all open pull requests + status for keymanapp repo
// Gather the contributions for each recent user

// Current rate limit cost is 60 points. We have 5000 points/hour.
// https://developer.github.com/v4/guides/resource-limitations/

async function httppostgh(query, key) {
  consoleLog('services', 'github-status-' + key, '  starting refresh');
  try {
    const res = await httppost('api.github.com', '/graphql',  //3
      {
        Authorization: ` Bearer ${github_token}`,
        Accept: 'application/vnd.github.antiope-preview+json, application/vnd.github.shadow-cat-preview+json'
      },
      JSON.stringify({query: '{' + query + '}'})
    );
    return res;
  } finally {
    consoleLog('services', 'github-status-' + key, '  finishing refresh');
  }
}

async function runPromisesSequentially<T>(functions: (() => Promise<T>)[]): Promise<T[]> {
  if (functions.length === 0) {
    return [];
  }
  const [first, ...rest] = functions;

  return [await first(), ...(await runPromisesSequentially(rest))];
}

export default {
  get: async function(sprint): Promise<{github, phase, adjustedStart}> {
    const keys = Object.keys(queryStrings);
    consoleLog('services', 'github-status', 'starting refresh of 5 github services');
    const values = await runPromisesSequentially( keys.map(key => async () => {
      const result = await httppostgh(queryStrings[key], key);
      try {
        const j = JSON.parse(result);
        if(!j || !j.data) {
          throw new Error(`Error parsing JSON for ${key}: '${result}`);
        }
        logGitHubRateLimit(j.data.rateLimit, 'github-status-'+key);
        return j;//.data[key];
      } catch(e) {
        console.error(e);
        Sentry.captureException(e);
      }
      return null;
    }));

    // use list of repos --> to retrieve each org repo separately

    const organization = values[keys.indexOf('organization')].data.organization;
    for(const repo of organization.repositories.nodes) {
      console.dir(repo);
      const q = repoQuery(repo.name);
      const result = await httppostgh(q, `organization-${repo.name}`);
      try {
        const j = JSON.parse(result);
        if(!j || !j.data) {
          throw new Error(`Error parsing JSON for organization-${repo.name}: '${result}`);
        }
        logGitHubRateLimit(j.data.rateLimit, 'github-status-organization-'+repo.name);
        repo.pullRequests = j.data.repository.pullRequests;
      } catch(e) {
        console.error(e);
        Sentry.captureException(e);
        return null;
      }
    }

    try {
      let data = keys.reduce((result, key, index) => {
        result[key] = values[index].data[key];
        result[key].rateLimit = values[index].data.rateLimit;
        return result;
      }, {});
      let githubPullsData = { data };

      // for(let item of Object.keys(data)) {
      //   logGitHubRateLimit(data[item]?.rateLimit, 'github-status-'+item);
      // }

      const dd: any = githubPullsData.data;
      if(!dd?.organization) {
        return null;
      }

      const phase = getCurrentSprint(githubPullsData.data);

      let d = new Date(phase.start);
      d.setDate(d.getDate()-2);
      let adjustedStart = d;

      // TODO: is this correct now?
      // adjust for when we are before the official start-of-sprint which causes all sorts of havoc
      if(adjustedStart > new Date()) adjustedStart = new Date();
      return {github: githubPullsData, phase: phase, adjustedStart: adjustedStart};
    } catch(e) {
      consoleError('services', 'github-status', e);
      Sentry.addBreadcrumb({
        category: "JSON",
        message: JSON.stringify(values)
      });
      Sentry.captureException(e);
      return null;
    }
  },
};