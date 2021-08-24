/*
 * Keyman is copyright (C) SIL International. MIT License.
 *
 * Parsing of user testing comments from GitHub issues/pull requests
 */

import { ManualTestStatusUtil, ManualTest, ManualTestProtocol, ManualTestStatus, ManualTestRun } from './manual-test-protocols';

export default class ManualTestParser {
  controlRegex = /@keymanapp-test-bot\b/i;
  controlRetestRegex = /@keymanapp-test-bot(?: +)retest(?: *)(.*)$/im;
  controlSkipRegex = /@keymanapp-test-bot(?: +)skip\b/im;

  isUserTestingComment(comment: string): boolean {
    // Match on a User Testing header in the string (any level of header is okay)
    return /# User Testing/i.test(comment);
  }

  isUserTestResultsComment(comment: string): boolean {
    // Match on a User Test Results header in the string (any level of header is okay)
    return /# User Test Results/i.test(comment);
  }

  isControlComment(comment: string): boolean {
    let result = this.controlRegex.test(comment);
    if(result) {
      //console.log('isControlComment: '+comment);
    }
    return result;
  }

  parseComment(protocol: ManualTestProtocol, id: number, comment: string): ManualTestProtocol {
    return this.isUserTestingComment(comment) ?
      this.parseUserTestingComment(protocol, id, comment) :
      this.isUserTestResultsComment(comment) ?
      this.saveUserTestResultsComment(protocol, id, comment) :
      this.isControlComment(comment) ?
      this.parseControlComment(protocol, id, comment) :
      this.parseTestRunComment(protocol, id, comment);
  }

  saveUserTestResultsComment(protocol: ManualTestProtocol, id: number, comment: string): ManualTestProtocol {
    // Just save the # User Test Results comment for later update
    protocol.userTestResults.id = id;
    protocol.userTestResults.body = comment;
    return protocol;
  }

  parseUserTestingComment(protocol: ManualTestProtocol, id: number, comment: string): ManualTestProtocol {
    // user testing comment contains a pattern:
    //      - TEST_NAME: description
    // Optionally followed by 1 or more blank lines and:
    //      <details><summary>summary</summary> detailedSteps</details>
    // Or the `<details><summmary>summary</summary>` and `</details>` content may be omitted,
    // in which case, it will treat all content down to the next `- TEST_` entry as detailedSteps
    const testTitleRegex = /^(?:[-*]\s)?(?:\*\*)?(?:TEST)_([A-Z0-9_.-]+)(?::\*\*|\*\*:?|:)?\s*(.+?) *$/gmi;
    const testDetailRegex = /^(?:\s*<details>\s*(?:<summary>\s*(.+?)\s*<\/summary>)?\s*\n(.+?)\s*<\/details>\s*)|(?:\n*(.+?)\n*)$/si;
    let title = testTitleRegex.exec(comment);
    let baseIndex = 0;
    protocol.userTesting.id = id;
    protocol.userTesting.body = comment;
    while(title !== null) {
      let test = new ManualTest();
      test.commentID = id;
      test.name = title[1];
      test.description = title[2];
      protocol.tests.push(test);

      baseIndex += testTitleRegex.lastIndex;
      comment = comment.substr(testTitleRegex.lastIndex);
      testTitleRegex.lastIndex = 0;

      // console.log(comment);
      // console.log('-----------------------------------');

      //let details = testDetailRegex.exec(comment);

      let lastIndex = comment.search(testTitleRegex);
      let fullDetail = comment.substr(0, lastIndex);
      let fullDetailMatch = fullDetail.match(testDetailRegex);
      if(fullDetailMatch) {
        if(fullDetailMatch[1]) {
          test.detailedSteps = fullDetailMatch[2];
          test.summary = fullDetailMatch[1];
        } else {
          test.detailedSteps = fullDetailMatch[3];
        }
      } else {
        test.detailedSteps = fullDetail;
      }

      title = testTitleRegex.exec(comment);
    }

    return protocol;
  }

  parseTestRunComment(protocol: ManualTestProtocol, id: number, comment: string): ManualTestProtocol {
    const testTitleRegex = /^(?:[\*-] )?(?:\*\*)?TEST_([A-Z0-9_.-]+)(?:\*\*)?:?(?:\*\*)?\s*(OPEN|PASSED|FAILED|BLOCKED|UNKNOWN|PASS|FAIL|BLOCK)(?:\*\*)? *([^\r\n]*?) *$/smgi;
    const testDetailRegex = /^(?:\s*<details>\s*(?:<summary>\s*(.+?)\s*<\/summary>)?\s*\n(.+?)\s*<\/details>\s*)|(?:\n*(.+?)\n*)$/si;

    let title = testTitleRegex.exec(comment);
    while(title !== null) {
      let test = protocol.tests.find((value) => value.name.toLowerCase() == title[1].toLowerCase());

      comment = comment.substr(testTitleRegex.lastIndex);
      testTitleRegex.lastIndex = 0;

      let lastIndex = comment.search(testTitleRegex);
      if(lastIndex == -1) lastIndex = comment.length + 1;
      let fullDetail = comment.substr(0, lastIndex);
      //let fullDetailMatch = fullDetail.match(testDetailRegex);
      if(test) {
        let run = new ManualTestRun();
        run.commentID = id;
        run.isControl = false;
        run.summary = title[3];
        run.notes = fullDetail.trim();
        run.status = ManualTestStatusUtil.fromString(title[2]);
        test.testRuns.push(run);
      } else {
        // TODO: log
      }

      title = testTitleRegex.exec(comment);
    }

    return protocol;
  }

  parseControlComment(protocol: ManualTestProtocol, id: number, comment: string) {
    const retest = comment.match(this.controlRetestRegex);
    if(retest)
    return this.parseRetestControlComment(protocol, id, retest);

    const skip = comment.match(this.controlSkipRegex);
    if(skip)
    return this.parseSkipControlComment(protocol);

    return protocol;
  }

  parseSkipControlComment(protocol: ManualTestProtocol) {
    protocol.skipTesting = true;
    return protocol;
  }

  /**
   * Looks for a `@keymanapp-test-bot retest` control comment. Accepts 'all' to retest all, or test_xxx names
   * @param protocol
   * @param id
   * @param comment
   * @returns
   */
  parseRetestControlComment(protocol: ManualTestProtocol, id: number, retest: RegExpMatchArray) {
    const matches = retest[1];
    for(let test of protocol.tests) {
      if(!matches || matches.match(/all/i) || matches.match(new RegExp("TEST_"+test.name+"\\b", 'i'))) {
        let run = new ManualTestRun();
        run.commentID = id;
        run.isControl = true;
        run.status = ManualTestStatus.Open;
        test.testRuns.push(run);
      }
    }
    return protocol;
  }

  getUserTestResultsComment(protocol: ManualTestProtocol): string {
    // We'll explode this into test strings

    const header = '# User Test Results\n\n';

    if(protocol.tests.length == 0) {
      return protocol.skipTesting ?
        header+'_User tests are not required_' :
        header+'_**ERROR:** user tests have not yet been defined_';
    }

    return protocol.tests.reduce((comment, test) =>
      comment + test.resultText(protocol.org, protocol.repo, protocol.issue, protocol.isPR) + '\n',
      header
    );
  }
}