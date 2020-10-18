/**
 * Extracts the repo short name from a GitHub URL, for use with issue 
 * and pull request references, returning #1234, api#77, etc.
 * @param url A GitHub url, e.g. https://github.com/keymanapp/keyman/...
 */
export function repoShortNameFromGithubUrl(url: string): string {
    const matches = url.match(/\/github.com\/keymanapp\/([^\/]+)\//);
    if(!matches) return '';
    switch(matches[1]) {
      case 'keyman': return '';
      case 'keyman.com': return 'keyman.com';
    }

    const submatches = matches[1].match(/^([^.]+)\.keyman\.com/);
    return submatches ? submatches[1] : matches[1];
  }
