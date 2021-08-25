/*
 * Keyman is copyright (C) SIL International. MIT License.
 *
 * Parsing of user testing comments from GitHub issues/pull requests
 */

import { ManualTestStatusUtil, ManualTest, ManualTestProtocol, ManualTestStatus, ManualTestRun, ManualTestSuite, ManualTestGroup } from './manual-test-protocols';

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
    return result;
  }

  parseComment(protocol: ManualTestProtocol, id: number, comment: string): ManualTestProtocol {
    return !comment ? protocol :
      this.isUserTestingComment(comment) ?
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

  parseUserTestingCommentDetail(test: ManualTest) {
    const testDetailRegex = /^(?:\s*<details>\s*(?:<summary>\s*(.+?)\s*<\/summary>)?\s*\n(.+?)\s*<\/details>\s*)|(?:\n*(.+?)\n*)$/si;
    const testDetail = testDetailRegex.exec(test.detailedSteps);
    if(!testDetail) {
      test.detailedSteps = test.detailedSteps.trimRight();
    } else if(testDetail[1]) {
      test.summary = testDetail[1].trimRight();
      test.detailedSteps = testDetail[2].trimRight();
    } else {
      test.detailedSteps = testDetail[3].trimRight();
    }
  }

  parseUserTestingComment(protocol: ManualTestProtocol, id: number, comment: string): ManualTestProtocol {
    // user testing comment contains a pattern:
    //      - TEST_NAME: description
    // Optionally followed by 1 or more blank lines and:
    //      <details><summary>summary</summary> detailedSteps</details>
    // Or the `<details><summmary>summary</summary>` and `</details>` content may be omitted,
    // in which case, it will treat all content down to the next `- TEST_` entry as detailedSteps

    const lines = comment.replace(/\r/g, '').split('\n');

    const testTitleRegex = /^\s*(?:(?:[-*]|(?:#{1,4}))\s)?(?:\*\*)?(TEST|SUITE|GROUP)_([A-Z0-9_.-]+)(?::\*\*|\*\*:?|:)?\s*(.+) *$/i;

    protocol.userTesting.id = id;
    protocol.userTesting.body = comment;

    let suite: ManualTestSuite = null;
    let group: ManualTestGroup = null;
    let test: ManualTest = null;
    for(let line of lines) {
      let title = line.match(testTitleRegex);
      //console.log(line+': '+JSON.stringify(title));
      if(!title) {
        if(test) test.detailedSteps += line + '\n';
        else if(group) group.detail += line +'\n';
        else if(suite) suite.detail += line + '\n';
        continue;
      }

      switch(title[1].toUpperCase()) {
      case 'TEST':
        group = null;
        test = new ManualTest();
        test.commentID = id;
        test.name = title[2];
        test.description = title[3];

        if(!suite) {
          suite = new ManualTestSuite();
          protocol.suites.push(suite);
        }

        suite.testTemplates.push(test);

        break;
      case 'SUITE':
        test = null;
        group = null;
        suite = new ManualTestSuite();
        suite.name = title[2];
        suite.description = title[3];
        protocol.suites.push(suite);
        break;
      case 'GROUP':
        test = null;
        group = new ManualTestGroup();
        group.name = title[2];
        group.description = title[3];
        if(!suite) {
          suite = new ManualTestSuite();
          protocol.suites.push(suite);
        }
        suite.groups.push(group);
        break;
      default:
        console.log('Unexpected: '+title);
        return;
      }
    }

    for(suite of protocol.suites) {
      if(suite.groups.length == 0) suite.groups.push(new ManualTestGroup());
      for(test of suite.testTemplates) {
        this.parseUserTestingCommentDetail(test);
        suite.groups.forEach(group => group.tests.push(test.clone()));
      }
    }

    return protocol;
  }

  parseTestRunComment(protocol: ManualTestProtocol, id: number, comment: string): ManualTestProtocol {
    const lines = comment.replace(/\r/g, '').split('\n');
    const testTitleRegex = /^\s*(?:(?:[-*]|(?:#{1,4}))\s)?(?:\*\*)?(TEST|SUITE|GROUP)_([A-Z0-9_.-]+)(?:\*\*)?:?(?:\*\*)?\s*(.*?)\s*$/i;
    const testStatusRegex = /(OPEN|PASSED|FAILED|BLOCKED|UNKNOWN|PASS|FAIL|BLOCK)(?:\*\*)? *(.*) *$/i;

    if(protocol.suites.length == 0) return;
    let suite: ManualTestSuite = protocol.suites[0];
    if(suite.groups.length == 0) return;
    let group: ManualTestGroup = suite.groups[0];

    // For named suites and groups, test result has to specify them
    if(suite.name) suite = null;
    if(group.name) group = null;

    let run: ManualTestRun = null;
    for(let line of lines) {
      let title = line.match(testTitleRegex);
      if(!title) {
        //console.log(line+': '+JSON.stringify(title)+'; run='+JSON.stringify(run));
        if(run) run.notes += line + '\n';
        continue;
      }

      if(run) run.notes = run.notes.trimRight();
      run = null;

      const titleType = title[1].toUpperCase(), titleName = title[2].toUpperCase(), titleData = title[3];

      switch(titleType) {
      case 'TEST':
        if(!suite || !group) {
          console.log('group and suite not found for TEST_'+titleName);
          continue;
        }
        let test: ManualTest = group.tests.find((value) => value.name.toUpperCase() == titleName);
        let status = titleData.match(testStatusRegex);
        if(!status) {
          console.log(`test result "${titleData}" did not match`);
        } else if(test) {
          run = new ManualTestRun();
          run.commentID = id;
          run.isControl = false;
          run.summary = status[2];
          run.notes = '';
          run.status = ManualTestStatusUtil.fromString(status[1]);
          test.testRuns.push(run);
        } else {
          if(group.name && suite.name)
            console.log('test TEST_'+titleName+' not found in GROUP_'+group.name+', SUITE_'+suite.name);
          else
            console.log('test TEST_'+titleName+' not found');
          // TODO: add an errors collection to be dumped into the comment
        }
        break;
      case 'SUITE':
        group = null;
        suite = protocol.suites.find(value => value.name.toUpperCase() == titleName);
        if(!suite) {
          console.log('suite not found: SUITE_'+titleName);
          continue;
        }
        break;
      case 'GROUP':
        if(!suite) {
          console.log('group not found for TEST_'+titleName);
          continue;
        }
        group = suite.groups.find(value => value.name.toUpperCase() == titleName);
        break;
      default:
        console.log('Unexpected: '+title);
        return;
      }
    }
    if(run) run.notes = run.notes.trimRight();

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
    for(let test of protocol.getTests()) {
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

  /**
   * Build the '# User Test Results' comment
   * @param protocol
   * @returns         the comment body in markdown
   */
  getUserTestResultsComment(protocol: ManualTestProtocol): string {
    let content = '# User Test Results\n\n';

    if(protocol.getTests().length == 0) {
      return protocol.skipTesting ?
        content+'_User tests are not required_' :
        content+'_**ERROR:** user tests have not yet been defined_';
    }

    for(let suite of protocol.suites) {
      if(suite.name) {
        content += `## ${suite.statusEmoji()} SUITE_${suite.name}: ${suite.description}\n`;
      }
      for(let group of suite.groups) {
        let n = '';
        if(group.name) {
          content += `* ${group.statusEmoji()} GROUP_${group.name}: ${group.description}\n`;
          n = '  ';
        }
        for(let test of group.tests) {
          content += n + test.resultText(protocol.owner, protocol.repo, protocol.issue, protocol.isPR) + '\n';
        }
        content += '\n';
      }
      content += '\n';
    }

    return content.trimRight();
  }
}