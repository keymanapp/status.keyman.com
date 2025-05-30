/*
 * Keyman is copyright (C) SIL International. MIT License.
 *
 * Parsing of user testing comments from GitHub issues/pull requests
 */

import { ManualTestStatusUtil, ManualTest, ManualTestProtocol, ManualTestStatus, ManualTestRun, ManualTestSuite, ManualTestGroup, ManualTestUtil } from './manual-test-protocols.js';

export default class ManualTestParser {
  controlRegex = /(?:@keymanapp-test-bot\b|^Test-Bot: )/im;
  controlRetestRegex = /(?:@keymanapp-test-bot|^Test-Bot:)(?: +)retest(?: *)(.*)$/im;
  controlSkipRegex = /(?:@keymanapp-test-bot|^Test-Bot:)(?: +)skip\b/im;
  testBotLogin = 'keymanapp-test-bot[bot]';

  isUserTestingComment(comment: string, login: string): boolean {
    // Match on a User Testing header in the string (any level of header is okay)
    return login != this.testBotLogin && /# User Testing/i.test(comment);
  }

  isUserTestResultsComment(comment: string, login: string): boolean {
    // Match on a User Test Results header in the string (any level of header is okay)
    return login == this.testBotLogin && /# User Test Results/i.test(comment);
  }

  isControlComment(comment: string, login: string): boolean {
    return login != this.testBotLogin && this.controlRegex.test(comment);
  }

  parseComment(protocol: ManualTestProtocol, id: number, comment: string, login: string): ManualTestProtocol {
    return !comment ? protocol :
      this.isUserTestingComment(comment, login) ?
      this.parseUserTestingComment(protocol, id, comment) :
      this.isUserTestResultsComment(comment, login) ?
      this.saveUserTestResultsComment(protocol, id, comment) :
      this.isControlComment(comment, login) ?
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

    const testTitleRegex = /^\s*(?:(?:[-*]|(?:#{1,4}))\s)?(?:\*\*)?(TEST|SUITE|GROUP)_([A-Z0-9_.-]+)(?::\*\*|\*\*:?|:)?\s*(.*) *$/i;

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
    const testStatusRegex = /(OPEN|PASSED|FAILED|BLOCKED|SKIPPED|UNKNOWN|PASS|FAIL|BLOCK|SKIP)(?:\)?:?\*\*\)?)? *(.*) *$/i;

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
        let test: ManualTest = group.tests.find((value) => (value.name ?? '').toUpperCase() == titleName);
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
        suite = protocol.suites.find(value => (value.name ?? '').toUpperCase() == titleName);
        if(!suite) {
          console.log('suite not found: SUITE_'+titleName);
          continue;
        }
        if(!suite.groups[0].name) group = suite.groups[0];
        break;
      case 'GROUP':
        if(!suite) {
          console.log('group not found for TEST_'+titleName);
          continue;
        }
        group = suite.groups.find(value => (value.name ?? '').toUpperCase() == titleName);
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
      return this.parseRetestControlComment(protocol, id, retest[1]);

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
  parseRetestControlComment(protocol: ManualTestProtocol, id: number, comment: string) {
    let matches = comment.trim().split(/[ ,]/);
    if(!matches.length || !matches[0].length) {
      // if no comment is given, retest all tests
      matches = ['all'];
    }

    if(protocol.suites.length == 0) {
      return protocol;
    }

    let suite: ManualTestSuite = null;
    let group: ManualTestGroup = null;
    let isCollection = false;
    for(let match of matches) {
      isCollection = !!match.match(/^(SUITE|GROUP)_/i);
      if(match.match(/^SUITE_/i)) {
        suite = protocol.findSuite(match.substring(6));
      } else if(match.match(/^GROUP_/i)) {
        group = (suite || protocol).findGroup(match.substring(6));
      } else if(match.match(/^TEST_/i)) {
        for(let test of (group || suite || protocol).findTests(match.substring(5))) {
          test.addRun(id, true, ManualTestStatus.Open);
        }
      } else if(match == 'all') {
        for(let test of (group || suite || protocol).getTests()) {
          test.addRun(id, true, ManualTestStatus.Open);
        }
      }
    }

    if(isCollection) {
      // We've got an inferred 'all' on the end of the test spec
      for(let test of (group || suite).getTests()) {
        test.addRun(id, true, ManualTestStatus.Open);
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

    if(protocol.userTesting) {
      content += `[Test specification and instructions](${ManualTestUtil.commentLink(protocol.owner, protocol.repo, protocol.issue, protocol.userTesting.id, protocol.isPR, protocol.baseIssueId)})\n\n`;
    }

    if(protocol.getTests().length == 0) {
      return protocol.skipTesting ?
        content+'_User tests are not required_' :
        content+'_**ERROR:** user tests have not yet been defined_';
    }

    let resultsTemplate = {suite:'', group:'', content:'', retest:''};

    for(let suite of protocol.suites) {
      if(suite.name) {
        content += `## ${suite.statusEmoji()} SUITE_${suite.name}: ${suite.description}\n`;
        resultsTemplate.suite = `## SUITE_${suite.name}: ${suite.description}\n\n`;

        if(suite.status() == ManualTestStatus.Passed) {
          if(suite.groups?.[0]?.name == '') {
            content += `\n\n<details><summary>${suite.getTests().length} tests PASSED</summary>\n\n`;
          } else {
            content += `\n\n<details><summary>${suite.getTests().length} tests in ${suite.groups.length} groups PASSED</summary>\n\n`;
          }
        }
      } else {
        resultsTemplate.suite = '';
      }

      for(let group of suite.groups) {
        let n = '';
        if(group.name) {
          content += `* ${group.statusEmoji()} GROUP_${group.name}: ${group.description}\n`;
          resultsTemplate.group = `### GROUP_${group.name}: ${group.description}\n\n`;
          n = '  ';
          if(group.status() == ManualTestStatus.Passed) {
            content += `\n\n  <details><summary>${group.tests.length} tests PASSED</summary>\n\n`;
          }
        } else {
          resultsTemplate.group = '';
        }
        for(let test of group.tests) {
          content += n + test.resultText(protocol.owner, protocol.repo, protocol.issue, protocol.isPR) + '\n';
          if(test.status() == ManualTestStatus.Open) {
            if(resultsTemplate.suite + resultsTemplate.group != '') {
              resultsTemplate.content += '\n';
            }
            resultsTemplate.content += resultsTemplate.suite + resultsTemplate.group;
            resultsTemplate.suite = '';
            resultsTemplate.group = '';
            resultsTemplate.content += `* **TEST_${test.name} (OPEN):** notes\n`;
          }
        }

        if(group.name && group.status() == ManualTestStatus.Passed) {
          content += `\n  </details>\n`;
        }

        content += '\n';
      }

      if(suite.name && suite.status() == ManualTestStatus.Passed) {
        content += '\n</details>\n';
      }

      content += '\n';
    }

    //
    // Add a results template for all unfinished tests
    //

    if(resultsTemplate.content != '') {
      content +=
        "<details><summary>Results Template</summary>\n\n" +
        "```\n" +
        "# Test Results\n\n"+
        resultsTemplate.content.trim()+
        "\n```\n"+
        "</details>\n";
    }

    //
    // Build up a template for retesting failed/blocked tests
    //

    for(let suite of protocol.suites) {
      resultsTemplate.suite = suite.name ? `SUITE_${suite.name}` : '';

      for(let group of suite.groups) {
        resultsTemplate.group = group.name ? `GROUP_${group.name}` : '';

        for(let test of group.tests) {
          if(test.status() == ManualTestStatus.Failed || test.status() == ManualTestStatus.Blocked) {
            resultsTemplate.retest += ' ' + `${resultsTemplate.suite} ${resultsTemplate.group} TEST_${test.name}`.trim();
            resultsTemplate.suite = '';
            resultsTemplate.group = '';
          }
        }
      }
    }

    if(resultsTemplate.retest != '') {
      content +=
        "<details><summary>Retesting Template</summary>\n\n" +
        "```\n" +
        `Test-bot: retest ${resultsTemplate.retest.trim()}\n`+
        "```\n"+
        "</details>\n";
    }

    return content.trimRight();
  }
}