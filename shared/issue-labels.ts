
// Ordered in the same way as the status home page is (developer, core, common at end)
export const issueLabelScopes = [
  'android/', 'ios/', 'linux/', 'mac/', 'web/', 'windows/', 'developer/', 'core/', 'common/'
];

export const issueLabelTypes = [
  'auto', 'bug', 'bug', 'chore', 'docs', 'feat', 'refactor', 'spec', 'test'
];

export const issueValidTitleRegex = /^(auto|bug|chore|docs|feat|refactor|spec|test)(?:\(([a-z, ]+)\))?:/;