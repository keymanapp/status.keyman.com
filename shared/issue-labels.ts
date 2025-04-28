
// Ordered in the same way as the status home page is (developer, core, common at end)
export const issueLabelScopes = [
  'android/', 'ios/', 'linux/', 'mac/', 'web/', 'windows/', 'developer/', 'core/', 'common/'
  // note: resources/ lives under common/ for now
];

export const issueLabelTypes = [
  'auto', 'bug', 'change', 'chore', 'docs', 'feat', 'refactor', 'spec', 'style', 'test'
];

export const issueValidTitleRegex = /^(auto|bug|change|chore|docs|feat|refactor|spec|style|test)(?:\(([a-z, ]+)\))?:/;