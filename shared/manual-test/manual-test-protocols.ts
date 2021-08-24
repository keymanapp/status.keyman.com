/*
 * Keyman is copyright (C) SIL International. MIT License.
 *
 * User testing structures from GitHub issues/pull requests
 */

export enum ManualTestStatus {
  Open,     // Test has not yet been run
  Passed,   // Test has been run and passed
  Failed,   // Test has been run and failed
  Blocked,  // Was not able to run test due to external issues
  Unknown,  // ???
};

export class ManualTestStatusUtil {
  public static toString(status: ManualTestStatus): string {
    return ManualTestStatus[status].toUpperCase();
  }
  public static fromString(status: string): ManualTestStatus {
    status = (status || '').toLowerCase();
    switch(status) {
      case 'pass': return ManualTestStatus.Passed;
      case 'fail': return ManualTestStatus.Failed;
      case 'block': return ManualTestStatus.Blocked;
    }
    const result = ManualTestStatus[(status.substr(0,1).toUpperCase() + status.substr(1)) as keyof typeof ManualTestStatus];
    return result || ManualTestStatus.Open;
  }
  public static emoji(status: ManualTestStatus) {
    const statusEmoji: string[] = ['⬜', '✅', '🟥', '🟧', '🟦'];
    return statusEmoji[status];
  }
}

export class ManualTestRun {
  status: ManualTestStatus;
  commentID: number;        // comment id from GitHub (may be multiple test results in a comment)
  isControl: boolean;
  summary?: string;         // one line summary
  notes?: string;           // detailed test results
};

export class ManualTest {
  commentID: number;        // comment id from GitHub where the test is defined, tests may be defined in multiple issues
  name: string;
  description: string;
  summary?: string;         // optional summary title for the detailed steps, default to 'Steps'
  detailedSteps?: string;
  testRuns: ManualTestRun[];
  status(): ManualTestStatus {
    return this.testRuns.length == 0 ?
      ManualTestStatus.Open :
      this.testRuns[this.testRuns.length-1].status;
  }

  statusEmoji(): string {
    return ManualTestStatusUtil.emoji(this.status());
  }

  statusLink(owner: string, repo: string, issuenum: number, isPR: boolean): string {
    return this.testRuns.length ?
      `https://github.com/${owner}/${repo}/${isPR?'pull':'issues'}/${issuenum}#issuecomment-${this.testRuns[this.testRuns.length-1].commentID}` :
      '';
  }

  resultText(owner: string, repo: string, issuenum: number, isPR: boolean): string {
    const statusLink = this.statusLink(owner, repo, issuenum, isPR);

    // Get status from last test run
    let statusDescription = this.testRuns.length ? this.testRuns[this.testRuns.length-1].summary : '';
    statusDescription = statusDescription ? statusDescription = ': '+statusDescription : '';

    let statusText = ManualTestStatusUtil.toString(this.status());
    statusText = statusLink ? `([${statusText}](${statusLink}))` : `(${statusText})`;
    return `- ${this.statusEmoji()} **TEST_${this.name} ${statusText}**${statusDescription}`;
  }

  constructor () {
    this.testRuns = [];
  }
};

export class ManualTestComment {
  id: number;
  body: string;
}

export class ManualTestProtocol {
  org: string;
  repo: string;
  issue: number;           // may be an issue number or pull request
  isPR: boolean;
  skipTesting: boolean;
  userTesting: ManualTestComment;
  userTestResults: ManualTestComment;
  tests: ManualTest[];

  constructor (org: string, repo: string, issue: number, isPR: boolean) {
    this.tests = [];
    this.userTesting = new ManualTestComment();
    this.userTestResults = new ManualTestComment();
    this.org = org;
    this.repo = repo;
    this.issue = issue;
    this.isPR = isPR;
    this.skipTesting = false;
    }
};
