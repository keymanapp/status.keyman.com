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
}

export class ManualTestRun {
  status: ManualTestStatus;
  commentID: number;         // comment id from GitHub (may be multiple test results in a comment)
  isControl: boolean;
  notes?: string;
};

export class ManualTest {
  commentID: number;        // comment id from GitHub where the test is defined, tests may be defined in multiple issues
  name: string;
  titleIndex: number;       // position in the comment text, for replacement
  titleLength: number;      // position in the comment text, for replacement
  description: string;
  summary?: string;         // optional summary title for the detailed steps, default to 'Steps'
  detailedSteps?: string;
  testRuns: ManualTestRun[];
  reportedTicked: boolean;   // true if checkbox is checked
  reportedStatus: ManualTestStatus; // what was reported in the user testing comment, which may not be accurate
  status(): ManualTestStatus {
    return this.testRuns.length == 0 ?
      ManualTestStatus.Open :
      this.testRuns[this.testRuns.length-1].status;
  }
  title(): string {
    const x = this.status() == ManualTestStatus.Passed ? 'x' : ' ';
    const status = ManualTestStatusUtil.toString(this.status());
    return `- [${x}] **TEST_${this.name} (${status})**: ${this.description}`;
  }

  constructor () {
    this.testRuns = [];
  }
};

export class ManualTestProtocol {
  org: string;
  repo: string;
  issue: number;           // may be an issue number or pull request
  userTestingComment: string;
  userTestingCommentId: number;
  tests: ManualTest[];

  constructor () {
    this.tests = [];
  }
};
