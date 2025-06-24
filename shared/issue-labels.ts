
// Ordered in the same way as the status home page is (developer, core, common, resources at end)
export const issueLabelScopes = [
  'android/', 'ios/', 'linux/', 'mac/', 'web/', 'windows/', 'developer/', 'core/', 'common/', 'resources/',
];

export const issueLabelTypes = [
  'auto', 'bug', 'change', 'chore', 'docs', 'feat', 'maint', 'refactor', 'spec', 'style', 'test'
];

export const issueValidTitleRegex = /^(auto|bug|change|chore|docs|feat|maint|refactor|spec|style|test)(?:\(([a-z, ]+)\))?:/;