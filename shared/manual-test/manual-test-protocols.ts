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

export class ManualTestUtil {
  static commentLink(owner: string, repo: string, issuenum: number, commentId: number, isPR: boolean, baseIssueId?: number): string {
    return `https://github.com/${owner}/${repo}/${isPR?'pull':'issues'}/${issuenum}#${commentId?'issuecomment':'issue'}-${commentId?commentId:baseIssueId}`
  }
}

export class ManualTestRun {
  status: ManualTestStatus; // result of the test run
  commentID: number;        // comment id from GitHub (may be multiple test results in a comment)
  isControl: boolean;       // true if not actually a test run but rather the result of a control command such as `retest`
  summary?: string;         // one line summary
  notes?: string;           // detailed test results
};

export class ManualTest {
  commentID: number;        // comment id from GitHub where the test is defined, tests may be defined in multiple issues
  name: string;             // the name of the test, excluding the TEST_ prefix
  description: string;      // a short one-line description of the test
  summary?: string;         // optional summary title for the detailed steps, <details><summary>___</summary></details>
  detailedSteps?: string;   // detailed steps for the test; if summary is set, within a <details></details> block
  testRuns: ManualTestRun[];

  clone(): ManualTest {
    const result = new ManualTest();
    result.commentID = this.commentID;
    result.name = this.name;
    result.description = this.description;
    result.summary = this.summary;
    result.detailedSteps = this.detailedSteps;
    result.testRuns = [];
    return result;
  }

  addRun(commentID: number, isControl: boolean, status: ManualTestStatus): ManualTestRun {
    let run = new ManualTestRun();
    run.commentID = commentID;
    run.isControl = isControl;
    run.status = status;
    this.testRuns.push(run);
    return run;
  }

  status(): ManualTestStatus {
    return this.testRuns.length == 0 ?
      ManualTestStatus.Open :
      this.testRuns[this.testRuns.length-1].status;
  }

  statusEmoji(): string {
    return ManualTestStatusUtil.emoji(this.status());
  }

  commentLink(owner: string, repo: string, issuenum: number, isPR: boolean): string {
    return this.testRuns.length ?
      ManualTestUtil.commentLink(owner,repo,issuenum,this.testRuns[this.testRuns.length-1].commentID,isPR) : '';
  }

  resultText(owner: string, repo: string, issuenum: number, isPR: boolean): string {
    const commentLink = this.commentLink(owner, repo, issuenum, isPR);
    const lastRun = this.testRuns.length ? this.testRuns[this.testRuns.length-1] : null;

    // Get status from last test run
    let runDescription = lastRun ? (lastRun.isControl ? ' _retest_ ' : '') + (lastRun.summary || '') : '';
    runDescription = runDescription ? ': '+runDescription : '';

    // If there are detailed test result notes in the last test run, add a `(notes)` link
    let runNotes = lastRun ? lastRun.notes : '';
    runNotes = runNotes && commentLink ? ` ([notes](${commentLink}))` : '';

    // Get the test run status and link it to its comment
    let statusText = ManualTestStatusUtil.toString(this.status());
    statusText = commentLink ? `([${statusText}](${commentLink}))` : `(${statusText})`;

    return `- ${this.statusEmoji()} **TEST_${this.name} ${statusText}**${runDescription}${runNotes}`;
  }

  constructor () {
    this.testRuns = [];
    this.detailedSteps = '';
  }
};

function reduceStatus(prev: ManualTestStatus, current: ManualTestStatus): ManualTestStatus {
  return prev == ManualTestStatus.Failed || current == ManualTestStatus.Failed ? ManualTestStatus.Failed :
    prev == ManualTestStatus.Blocked || current == ManualTestStatus.Blocked ? ManualTestStatus.Blocked :
    prev == ManualTestStatus.Open || current == ManualTestStatus.Open ? ManualTestStatus.Open :
    current;
}

export class ManualTestGroup {
  name: string;
  description?: string;   // one liner
  detail?: string;
  status(): ManualTestStatus {
    return this.tests.length == 0 ?
      ManualTestStatus.Open :
      this.tests.reduce<ManualTestStatus>((status, test) => reduceStatus(status, test.status()), ManualTestStatus.Unknown);
  }
  statusEmoji(): string {
    return ManualTestStatusUtil.emoji(this.status());
  }

  findTests(name: string): ManualTest[] {
    return this.tests.filter(test => test.name.toLowerCase() == name.toLowerCase());
  }

  getTests(): ManualTest[] {
    return this.tests;
  }

  tests: ManualTest[];
  constructor() {
    this.tests = [];
    this.detail = '';
  }

  findTest(name: string): ManualTest {
    return this.tests.find(test => test.name.toLowerCase() == name.toLowerCase());
  }
};

export class ManualTestSuite {
  name: string;
  description?: string;   // one liner
  detail?: string;
  status(): ManualTestStatus {
    return this.groups.length == 0 ?
      ManualTestStatus.Open :
      this.groups.reduce<ManualTestStatus>((status, group) => reduceStatus(status, group.status()), ManualTestStatus.Unknown);
  }

  getTests(): ManualTest[] {
    return this.groups.flatMap(group => group.tests);
  }

  findTests(name: string): ManualTest[] {
    return this.getTests().filter(test => test.name.toLowerCase() == name.toLowerCase());
  }

  statusEmoji(): string {
    return ManualTestStatusUtil.emoji(this.status());
  }

  findGroup(name: string): ManualTestGroup {
    return this.groups.find(group => group.name.toLowerCase() == name.toLowerCase());
  }

  testTemplates: ManualTest[];
  groups: ManualTestGroup[];
  constructor() {
    this.testTemplates = [];
    this.groups = [];
    this.detail = '';
  }
};

export class ManualTestComment {
  id: number;
  body: string;
}

export class ManualTestProtocol {
  owner: string;
  repo: string;
  issue: number;           // may be an issue number or pull request
  baseIssueId: number;     // issue id
  basePullId: number;      // PR id
  isPR: boolean;
  skipTesting: boolean;
  userTesting: ManualTestComment;
  userTestResults: ManualTestComment;
  suites: ManualTestSuite[];

  /**
   * @returns flat array of all tests in all groups in all suites
   */
  getTests(): ManualTest[] {
    return this.suites.flatMap(suite => suite.groups.flatMap(group => group.tests));
  }

  /**
   * @returns flat array of all groups in all suites
   */
  getGroups(): ManualTestGroup[] {
    return this.suites.flatMap(suite => suite.groups);
  }

  /**
   * Finds first test that matches `name` in all suites and groups
   */
  findTest(name: string): ManualTest {
    return this.getTests().find(test => test.name.toLowerCase() == name.toLowerCase());
  }

  /**
   * Finds all tests that match `name` in all suites and groups
   */
  findTests(name: string): ManualTest[] {
    return this.getTests().filter(test => test.name.toLowerCase() == name.toLowerCase());
  }

  /**
   * Finds all groups that match `name` in all suites
   */
  findGroups(name: string): ManualTestGroup[] {
    return this.getGroups().filter(group => group.name.toLowerCase() == name.toLowerCase());
  }

  /**
   * Finds first group that matches `name` in any suite
   */
  findGroup(name: string): ManualTestGroup {
    return this.suites.flatMap(suite => suite.groups).find(group => group.name.toLowerCase() == name.toLowerCase());
  }

  /**
   * Finds first suite that matches `name`
   */
  findSuite(name: string): ManualTestSuite {
    return this.suites.find(suite => suite.name.toLowerCase() == name.toLowerCase());
  }

  constructor (owner: string, repo: string, issue: number, isPR: boolean, baseIssueId: number, basePullId?: number) {
    this.suites = [];
    this.userTesting = new ManualTestComment();
    this.userTestResults = new ManualTestComment();
    this.owner = owner;
    this.repo = repo;
    this.issue = issue;
    this.isPR = isPR;
    this.skipTesting = false;
    this.baseIssueId = baseIssueId;
    this.basePullId = basePullId;
    }
};
