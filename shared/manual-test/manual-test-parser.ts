/*
 * Keyman is copyright (C) SIL International. MIT License.
 *
 * Parsing of user testing comments from GitHub issues/pull requests
 */

import { ManualTestStatusUtil, ManualTest, ManualTestProtocol, ManualTestStatus, ManualTestRun } from './manual-test-protocols';

export default class ManualTestParser {
  controlRegex = /@keymanapp-test-bot\b/i;
  controlRetestRegex = /@keymanapp-test-bot(?: +)retest(?: *)(.*)$/im;

  isUserTestingComment(comment: string): boolean {
    // Match on a User Testing header in the string (any level of header is okay)
    return /# User Testing/i.test(comment);
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
      this.isControlComment(comment) ?
      this.parseControlComment(protocol, id, comment) :
      this.parseTestRunComment(protocol, id, comment);
  }

  parseUserTestingComment(protocol: ManualTestProtocol, id: number, comment: string): ManualTestProtocol {
    // user testing comment contains a pattern:
    //      - [ ] TEST_NAME: description
    // Optionally followed by 1 or more blank lines and:
    //      <details><summary>summary</summary> detailedSteps</details>
    // Or the `<details><summmary>summary</summary>` and `</details>` content may be omitted,
    // in which case, it will treat all content down to the next `- [ ] TEST_` entry as detailedSteps
    const testTitleRegex = /^[-*]\s\[([ x])\]\s(?:\*\*)?(?:TEST|)_([A-Z0-9_.-]+)(?:\*\*)?\s*(?:\*\*)?(?:\((?:\*\*)?(OPEN|PASS|PASSED|FAIL|FAILED|BLOCK|BLOCKED|UNKNOWN)(?:\*\*)?\))?(?:\*\*)?:?\s*(.+?) *$/gmi;
    const testDetailRegex = /^(?:\s*<details>\s*(?:<summary>\s*(.+?)\s*<\/summary>)?\s*\n(.+?)\s*<\/details>\s*)|(?:\n*(.+?)\n*)$/si;
    let title = testTitleRegex.exec(comment);
    let baseIndex = 0;
    protocol.userTestingCommentId = id;
    protocol.userTestingComment = comment;
    while(title !== null) {
      let test = new ManualTest();
      test.commentID = id;
      test.reportedTicked = title[1] != ' ';
      test.name = title[2];
      test.reportedStatus = ManualTestStatusUtil.fromString(title[3]);
      test.description = title[4];
      protocol.tests.push(test);

      test.titleIndex = title.index + baseIndex;
      test.titleLength = title[0].length;
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
    const testTitleRegex = /^(?:[\*-] )?(?:\*\*)?TEST_([A-Z0-9_.-]+)(?:\*\*)?:?(?:\*\*)?\s*(OPEN|PASS|PASSED|FAIL|FAILED|BLOCK|BLOCKED|UNKNOWN)(?:\*\*)?\s*$/smgi;
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

  /**
   * Looks for a `@keymanapp-test-bot retest` control comment. Accepts 'all' to retest all, or test_xxx names
   * @param protocol
   * @param id
   * @param comment
   * @returns
   */
  parseControlComment(protocol: ManualTestProtocol, id: number, comment: string) {
    const control = comment.match(this.controlRetestRegex);
    if(control) {
      //console.log(control);
      const matches = control[1];
      for(let test of protocol.tests) {
        if(!matches || matches.match(/all/i) || matches.match(new RegExp("TEST_"+test.name+"\\b", 'i'))) {
          let run = new ManualTestRun();
          run.commentID = id;
          run.isControl = true;
          run.status = ManualTestStatus.Open;
          test.testRuns.push(run);
        }
      }
    }
    return protocol;
  }

  getUpdatedUserTestComment(protocol: ManualTestProtocol): string {
    // We'll replace from back to front, so we don't have to recalculate string indices
    //let
    return protocol.tests.reduceRight((comment, test) =>
      comment.substr(0, test.titleIndex) + test.title() + comment.substr(test.titleIndex + test.titleLength),
      protocol.userTestingComment);
  }
}