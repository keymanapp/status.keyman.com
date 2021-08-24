/*
 * Keyman is copyright (C) SIL International. MIT License.
 *
 * Tests for parsing of user testing comments from GitHub issues/pull requests
 */

import assert from 'assert';
import ManualTestParser from '../../shared/manual-test/manual-test-parser';
import { ManualTestProtocol, ManualTestStatus } from '../../shared/manual-test/manual-test-protocols';

const userTestingComment = `
# User Testing

* TEST_FOO: Press the widget and flob it

  <details><summary>Steps</summary>

  STEP | NOTES
  ---|---
  1 | Step 1
  2 | Step 2
  3 | Step 3

  </details>

- TEST_BAR: Wonky widgets

  <details><summary>Steps</summary>

  1. Step 1
  2. Step 2
  3. Step 3

  </details>

- TEST_FIZZ whatevs

  * Some details on the test
  * And this also

- TEST_BAZ: hello world
`;

const testRunComment = `
TEST_FOO: PASS yes great
- Found a good solution to make it work

**TEST_BAR**: FAIL
- It was not happy jane
`;

const secondTestRunComment = `
I re-ran the test as you asked. Things went better
once I had frobbed the fizzer.

TEST_BAR: PASS
- Happy
`;

const thirdTestRunComment = `
I'm not great at formatting test results.

**TEST_FIZZ:** PASSED this went pretty well actually
**TEST_BAZ PASS**
- Fantastic!
`;

const retestComment = `@keymanapp-test-bot retest test_foo, test_baz`;
const retestAllComment = `
I'm not happy with the results

@keymanapp-test-bot retest all
`;
const altRetestComment = `x
@keymanapp-test-bot retest`;

//const retestAllComment2 = `@keymanapp-test-bot retest`;

const userTestResultsComment =
`# User Test Results

- ✅ **TEST_FOO ([PASSED](https://github.com/keymanapp/keyman/issues/1#issuecomment-2))**: yes great
- 🟥 **TEST_BAR ([FAILED](https://github.com/keymanapp/keyman/issues/1#issuecomment-2))**
- ⬜ **TEST_FIZZ (OPEN)**
- ⬜ **TEST_BAZ (OPEN)**
`;

const userTestResultsAllPassedComment =
`# User Test Results

- ✅ **TEST_FOO ([PASSED](https://github.com/keymanapp/keyman/issues/1#issuecomment-2))**: yes great
- ✅ **TEST_BAR ([PASSED](https://github.com/keymanapp/keyman/issues/1#issuecomment-3))**
- ✅ **TEST_FIZZ ([PASSED](https://github.com/keymanapp/keyman/issues/1#issuecomment-4))**: this went pretty well actually
- ✅ **TEST_BAZ ([PASSED](https://github.com/keymanapp/keyman/issues/1#issuecomment-4))**
`;

describe('ManualTestParser', function() {
  describe('isUserTestingComment()', function() {
    it('should return true when comment includes a User Testing title', function() {
      let mtp = new ManualTestParser();
      assert.strictEqual(mtp.isUserTestingComment(userTestingComment), true);
    });
  });

  describe('isTestControlComment()', function() {
    it('should return true when comment contains a bot handle @keymanapp-test-bot', function() {
      let mtp = new ManualTestParser();
      assert.strictEqual(mtp.isControlComment(retestAllComment), true);
      assert.strictEqual(mtp.isControlComment(retestComment), true);
      assert.strictEqual(mtp.isControlComment(userTestingComment), false);
      assert.strictEqual(mtp.isControlComment(testRunComment), false);
    })
  });

  describe('parseUserTestingComment()', function() {
    it('should parse title information', function() {
      let mtp = new ManualTestParser();
      let protocol = new ManualTestProtocol('keymanapp', 'keyman', 1, false);
      mtp.parseUserTestingComment(protocol, 1, userTestingComment);
      assert.strictEqual(protocol.tests.length, 4);
      assert.strictEqual(protocol.tests[0].name, 'FOO');
      assert.strictEqual(protocol.tests[0].description, 'Press the widget and flob it');
      assert.strictEqual(protocol.tests[0].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.tests[0].summary, 'Steps');
      assert.strictEqual(protocol.tests[0].detailedSteps,
`  STEP | NOTES
  ---|---
  1 | Step 1
  2 | Step 2
  3 | Step 3`);

      assert.strictEqual(protocol.tests[1].name, 'BAR');
      assert.strictEqual(protocol.tests[1].description, 'Wonky widgets');
      assert.strictEqual(protocol.tests[1].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.tests[1].summary, 'Steps');
      assert.strictEqual(protocol.tests[1].detailedSteps,
`  1. Step 1
  2. Step 2
  3. Step 3`);

      assert.strictEqual(protocol.tests[2].name, 'FIZZ');
      assert.strictEqual(protocol.tests[2].description, 'whatevs');
      assert.strictEqual(protocol.tests[2].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.tests[2].detailedSteps,
`  * Some details on the test
  * And this also`);

      assert.strictEqual(protocol.tests[3].name, 'BAZ');
      assert.strictEqual(protocol.tests[3].description, 'hello world');
      assert.strictEqual(protocol.tests[3].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.tests[3].detailedSteps, '');
    });
  });

  describe('parseTestRunComment()', function() {
    it('should parse test results', function() {
      let mtp = new ManualTestParser();
      let protocol = new ManualTestProtocol('keymanapp', 'keyman', 1, false);
      mtp.parseComment(protocol, 1, userTestingComment);
      assert.strictEqual(protocol.tests[0].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.tests[1].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.tests[2].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.tests[3].status(), ManualTestStatus.Open);
      mtp.parseComment(protocol, 2, testRunComment);
      assert.strictEqual(protocol.tests[0].status(), ManualTestStatus.Passed);
      assert.strictEqual(protocol.tests[1].status(), ManualTestStatus.Failed);
      assert.strictEqual(protocol.tests[2].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.tests[3].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.tests[0].testRuns.length, 1);
      assert.strictEqual(protocol.tests[0].testRuns[0].commentID, 2);
      assert.strictEqual(protocol.tests[0].testRuns[0].summary, 'yes great');
      assert.strictEqual(protocol.tests[0].testRuns[0].notes, '- Found a good solution to make it work');
      assert.strictEqual(protocol.tests[0].testRuns[0].status, ManualTestStatus.Passed);
      assert.strictEqual(protocol.tests[1].testRuns.length, 1);
      assert.strictEqual(protocol.tests[1].testRuns[0].commentID, 2);
      assert.strictEqual(protocol.tests[1].testRuns[0].summary, '');
      assert.strictEqual(protocol.tests[1].testRuns[0].notes, '- It was not happy jane');
      assert.strictEqual(protocol.tests[1].testRuns[0].status, ManualTestStatus.Failed);
      assert.strictEqual(protocol.tests[2].testRuns.length, 0);
      assert.strictEqual(protocol.tests[3].testRuns.length, 0);
      mtp.parseComment(protocol, 3, secondTestRunComment);
      assert.strictEqual(protocol.tests[1].status(), ManualTestStatus.Passed);
      assert.strictEqual(protocol.tests[1].testRuns.length, 2);
      assert.strictEqual(protocol.tests[1].testRuns[1].commentID, 3);
      assert.strictEqual(protocol.tests[1].testRuns[1].notes, '- Happy');
      assert.strictEqual(protocol.tests[1].testRuns[1].status, ManualTestStatus.Passed);
      mtp.parseComment(protocol, 4, thirdTestRunComment);
      assert.strictEqual(protocol.tests[2].status(), ManualTestStatus.Passed);
      assert.strictEqual(protocol.tests[2].testRuns.length, 1);
      assert.strictEqual(protocol.tests[2].testRuns[0].commentID, 4);
      assert.strictEqual(protocol.tests[2].testRuns[0].summary, 'this went pretty well actually');
      assert.strictEqual(protocol.tests[2].testRuns[0].notes, '');
      assert.strictEqual(protocol.tests[2].testRuns[0].status, ManualTestStatus.Passed);
      assert.strictEqual(protocol.tests[3].testRuns.length, 1);
      assert.strictEqual(protocol.tests[3].testRuns[0].commentID, 4);
      assert.strictEqual(protocol.tests[3].testRuns[0].summary, '');
      assert.strictEqual(protocol.tests[3].testRuns[0].notes, '- Fantastic!');
      assert.strictEqual(protocol.tests[3].testRuns[0].status, ManualTestStatus.Passed);
      mtp.parseComment(protocol, 5, retestComment);
      assert.strictEqual(protocol.tests[0].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.tests[1].status(), ManualTestStatus.Passed);
      assert.strictEqual(protocol.tests[2].status(), ManualTestStatus.Passed);
      assert.strictEqual(protocol.tests[3].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.tests[0].testRuns[1].isControl, true);
      assert.strictEqual(protocol.tests[0].testRuns[1].status, ManualTestStatus.Open);
      assert.strictEqual(protocol.tests[3].testRuns[1].isControl, true);
      assert.strictEqual(protocol.tests[3].testRuns[1].status, ManualTestStatus.Open);
      mtp.parseComment(protocol, 6, retestAllComment);
      assert.strictEqual(protocol.tests[0].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.tests[1].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.tests[2].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.tests[3].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.tests[0].testRuns[2].isControl, true);
      assert.strictEqual(protocol.tests[0].testRuns[2].status, ManualTestStatus.Open);
      assert.strictEqual(protocol.tests[1].testRuns[2].isControl, true);
      assert.strictEqual(protocol.tests[1].testRuns[2].status, ManualTestStatus.Open);
      assert.strictEqual(protocol.tests[2].testRuns[1].isControl, true);
      assert.strictEqual(protocol.tests[2].testRuns[1].status, ManualTestStatus.Open);
      assert.strictEqual(protocol.tests[3].testRuns[2].isControl, true);
      assert.strictEqual(protocol.tests[3].testRuns[2].status, ManualTestStatus.Open);
    });

    it('should retest', function() {
      // setup
      let mtp = new ManualTestParser();
      let protocol = new ManualTestProtocol('keymanapp', 'keyman', 1, false);
      mtp.parseComment(protocol, 1, userTestingComment);
      mtp.parseComment(protocol, 2, testRunComment);
      assert.strictEqual(protocol.tests[0].status(), ManualTestStatus.Passed);
      assert.strictEqual(protocol.tests[1].status(), ManualTestStatus.Failed);
      assert.strictEqual(protocol.tests[2].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.tests[3].status(), ManualTestStatus.Open);

      // test
      assert.strictEqual(mtp.isControlComment(altRetestComment), true);
      mtp.parseComment(protocol, 3, altRetestComment);
      assert.strictEqual(protocol.tests[0].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.tests[1].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.tests[2].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.tests[3].status(), ManualTestStatus.Open);
    });
  });

  describe('getUserTestResultsComment()', function() {
    it('should set checkmarks and status correctly', function() {
      let mtp = new ManualTestParser();
      let protocol = new ManualTestProtocol('keymanapp', 'keyman', 1, false);
      mtp.parseComment(protocol, 1, userTestingComment);
      mtp.parseComment(protocol, 2, testRunComment);
      let comment = mtp.getUserTestResultsComment(protocol);
      assert.strictEqual(comment, userTestResultsComment);
      mtp.parseComment(protocol, 3, secondTestRunComment);
      mtp.parseComment(protocol, 4, thirdTestRunComment);
      comment = mtp.getUserTestResultsComment(protocol);
      assert.strictEqual(comment, userTestResultsAllPassedComment);
    });
  })
});