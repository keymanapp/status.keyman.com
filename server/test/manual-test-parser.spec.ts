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

const skippedTestRunComment = `
**TEST_FIZZ: PASSED**
**TEST_BAZ: SKIPPED**`;

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

[Test specification and instructions](https://github.com/keymanapp/keyman/issues/1#issuecomment-1)

- ✅ **TEST_FOO ([PASSED](https://github.com/keymanapp/keyman/issues/1#issuecomment-2))**: yes great ([notes](https://github.com/keymanapp/keyman/issues/1#issuecomment-2))
- 🟥 **TEST_BAR ([FAILED](https://github.com/keymanapp/keyman/issues/1#issuecomment-2))** ([notes](https://github.com/keymanapp/keyman/issues/1#issuecomment-2))
- ⬜ **TEST_FIZZ (OPEN)**
- ⬜ **TEST_BAZ (OPEN)**


<details><summary>Results Template</summary>

\`\`\`
# User Test Results

* **TEST_FIZZ (STATUS):** notes
* **TEST_BAZ (STATUS):** notes
\`\`\`
</details>`;

const userTestResultsAllPassedComment =
`# User Test Results

[Test specification and instructions](https://github.com/keymanapp/keyman/issues/1#issuecomment-1)

- ✅ **TEST_FOO ([PASSED](https://github.com/keymanapp/keyman/issues/1#issuecomment-2))**: yes great ([notes](https://github.com/keymanapp/keyman/issues/1#issuecomment-2))
- ✅ **TEST_BAR ([PASSED](https://github.com/keymanapp/keyman/issues/1#issuecomment-3))** ([notes](https://github.com/keymanapp/keyman/issues/1#issuecomment-3))
- ✅ **TEST_FIZZ ([PASSED](https://github.com/keymanapp/keyman/issues/1#issuecomment-4))**: this went pretty well actually
- ✅ **TEST_BAZ ([PASSED](https://github.com/keymanapp/keyman/issues/1#issuecomment-4))** ([notes](https://github.com/keymanapp/keyman/issues/1#issuecomment-4))`;

const userTestResultsSkippedComment =
`# User Test Results

[Test specification and instructions](https://github.com/keymanapp/keyman/issues/1#issuecomment-1)

- ✅ **TEST_FOO ([PASSED](https://github.com/keymanapp/keyman/issues/1#issuecomment-2))**: yes great ([notes](https://github.com/keymanapp/keyman/issues/1#issuecomment-2))
- ✅ **TEST_BAR ([PASSED](https://github.com/keymanapp/keyman/issues/1#issuecomment-3))** ([notes](https://github.com/keymanapp/keyman/issues/1#issuecomment-3))
- ✅ **TEST_FIZZ ([PASSED](https://github.com/keymanapp/keyman/issues/1#issuecomment-5))**
- 🟩 **TEST_BAZ ([SKIPPED](https://github.com/keymanapp/keyman/issues/1#issuecomment-5))**`;

const nestedUserTest =
`Follows #5619..

This PR serves as the first major step in a (conceptually) three part sequence intended to fully split the OSK's code paths into distinct, specialized OSK implementations.  Toward that end, this PR is focused on defining a new \`abstract\` base class for the future specialized versions - the \`OSKView\`.

This PR moves all common code and logic for OSK management into \`OSKView\`, leaving all "specialized" logic within \`OSKManager\` for now.  In follow-up PRs, \`OSKManager\` will be split into two separate classes - one for desktop OSKs, one for touch - each of which will subclass \`OSKView\`.  Given that this will, overall, be splitting 1 monolithic class into a total of 3... ✂️ felt appropriate for this PR chain.

Great care was taken (in tandem with #5619) to ensure that this common base class - \`OSKView\` - would be able to implement the 📐-added \`refreshLayout\` subsystem directly, rather than having to pawn it off to its future derived subclasses.  This in turn ensures that the base class can handle near-all of the \`VisualKeyboard\` layout logic internally without any need for specialized intervention.

There are also some nomenclature shifts for some of the default-value methods in \`OSKManager\`, as their original names implied different purposes than those they have actually served.

# User Testing

🚧


### SUITE_DESKTOP: \`desktop\` form factor tests

**Platform / browser combinations**:
- GROUP_WIN: Windows / Chrome
- GROUP_MAC: macOS / Firefox
    - Unless otherwise specified, use the "**Test unminified KeymanWeb**" test page.

<details>
  <summary>Tests (with inlined instructions)</summary>

- TEST_RESIZING:  Verify that desktop OSK resizing operates normally.

    Using the resize handle (<img width="28" alt="image" src="https://user-images.githubusercontent.com/25213402/126436281-2ea2c834-4fb0-45b4-b57a-8e3a9dcd817f.png">) for the desktop OSK, resize it at least three different ways.
     - The test "passes" if the OSK rescales according to the resize-handle's new position each time.  (The aspect ratio is _not_ locked, so narrow+tall and wide+short are both possible.)


- TEST_HARDWARE_SHIFT:  A physical SHIFT keypress should affect the OSK's shift key.

    Using the \`khmer_angkor\` keyboard, press and hold your physical keyboard's \`SHIFT\` key.
    - Expected result:  on the OSK, the \`shift\` layer should be displayed and the \`SHIFT\` key highlighted.

- TEST_OSK_KEY_SEQUENCE:  Using the OSK with a keyboard for English, type "The ".  (Include the space)

    So, in sequence:
    - SHIFT
    - T
    - SHIFT (to return to the default layer)
    - h
    - e
    - (spacebar)

</details>

### SUITE_PHONE:  \`phone\` form-factor tests (both in-app and out-of-app)

**Platform / browser combinations**:
- GROUP_CHROME_EMU:  Chrome emulation / iOS

    Use the "**Prediction - robust testing**" test page.

- GROUP_ANDROID:  Android / System keyboard mode

    Ensure that predictive text is enabled for English.

- GROUP_IOS:  iOS / Keyman app

    Ensure that predictive text is enabled for English.

<details>
  <summary>Tests (with inlined instructions)</summary>

- TEST_ROTATE_P-TO-L:

    1. With Keyman not active, load it in a portrait orientation.
    2. Once loaded, rotate the device to a landscape orientation.
        - On Android devices, you may need to press something like this for the rotation to occur:
        - The test "passes" if the OSK rotates properly.

- TEST_ROTATE_L-TO-P:

    1. With Keyman not active, load it in a landscape orientation.
    2. Once loaded, rotate the device to a portrait orientation.
        - On Android devices, you may need to press something like this for the rotation to occur:
        - The test "passes" if the OSK rotates properly.

- TEST_LAYER_SHIFT:  Touch-OSK layer shifting

    Using the \`sil_euro_latin\` keyboard, swap among the 'default', 'shift', 'numeric', 'symbol', and 'currency' layers.
    - Expected result:  the layer should always change correctly.

- TEST_SWAP:  Keyboard swapping via globe key

    With at least two total keyboards available / installed, confirm that swapping between them works properly.

- TEST_SPACEBAR_CAP:  Spacebar captions

    Confirm that there is a visible spacebar caption that matches the currently-loaded keyboard.

- TEST_BOUNDARY_KEYS:  Use of keys on the keyboard's edges

    Using \`sil_euro_latin\`, use the following keys, pressing as close as possible to their respective edge of the keyboard:
    - \`a\` (use the key's left edge)
    - the spacebar (use the key's bottom edge)
    - \`t\` (use the key's top edge)

    All should output normally.

- TEST_PREDICTIONS:  ensure that predictions work correctly.

    1. Set \`sil_euro_latin\` as the active keyboard.
    2. Ensure that predictions are enabled.
    3. Reload/refresh your test setup by force-closing, then restarting the app used for testing.
    4. With the reloaded keyboard active, verify that default suggestions are shown.
    5. Type "th" and verify that suggestions beginning with "th" are shown.

</details>`;

const nestedResult =
`SUITE_DESKTOP
GROUP_MAC
* TEST_RESIZING: PASS
* TEST_HARDWARE_SHIFT: PASS
This was okay but I got a puzzle?
* TEST_OSK_KEY_SEQUENCE: PASS`;

const nestedRetestControlComment = 'SUITE_DESKTOP GROUP_MAC TEST_HARDWARE_SHIFT';

describe('ManualTestParser', function() {
  describe('isUserTestingComment()', function() {
    it('should return true when comment includes a User Testing title', function() {
      let mtp = new ManualTestParser();
      assert.strictEqual(mtp.isUserTestingComment(userTestingComment), true);
      assert.strictEqual(mtp.isUserTestingComment(nestedUserTest), true);
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
    it('should parse suite without description', function() {
      // parser was treating `# SUITE_BASIC` as `SUITE_BASI: C`!
      let mtp = new ManualTestParser();
      let protocol = new ManualTestProtocol('keymanapp', 'keyman', 1, false, 0);
      mtp.parseUserTestingComment(protocol, 1, '# SUITE_BASIC\n* TEST_FOO: test');
      assert.strictEqual(protocol.suites.length, 1);
      assert.strictEqual(protocol.suites[0].name, 'BASIC');
      assert.strictEqual(protocol.suites[0].description, '');
    });

    it('should parse title information', function() {
      let mtp = new ManualTestParser();
      let protocol = new ManualTestProtocol('keymanapp', 'keyman', 1, false, 0);
      mtp.parseUserTestingComment(protocol, 1, userTestingComment);
      assert.strictEqual(protocol.getTests().length, 4);
      assert.strictEqual(protocol.getTests()[0].name, 'FOO');
      assert.strictEqual(protocol.getTests()[0].description, 'Press the widget and flob it');
      assert.strictEqual(protocol.getTests()[0].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.getTests()[0].summary, 'Steps');
      assert.strictEqual(protocol.getTests()[0].detailedSteps,
`  STEP | NOTES
  ---|---
  1 | Step 1
  2 | Step 2
  3 | Step 3`);

      assert.strictEqual(protocol.getTests()[1].name, 'BAR');
      assert.strictEqual(protocol.getTests()[1].description, 'Wonky widgets');
      assert.strictEqual(protocol.getTests()[1].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.getTests()[1].summary, 'Steps');
      assert.strictEqual(protocol.getTests()[1].detailedSteps,
`  1. Step 1
  2. Step 2
  3. Step 3`);

      assert.strictEqual(protocol.getTests()[2].name, 'FIZZ');
      assert.strictEqual(protocol.getTests()[2].description, 'whatevs');
      assert.strictEqual(protocol.getTests()[2].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.getTests()[2].detailedSteps,
`  * Some details on the test
  * And this also`);

      assert.strictEqual(protocol.getTests()[3].name, 'BAZ');
      assert.strictEqual(protocol.getTests()[3].description, 'hello world');
      assert.strictEqual(protocol.getTests()[3].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.getTests()[3].detailedSteps, '');
    });

    it('should parse a nested test spec', function() {
      let mtp = new ManualTestParser();
      let protocol = new ManualTestProtocol('keymanapp', 'keyman', 1, false, 0);
      mtp.parseUserTestingComment(protocol, 1, nestedUserTest);
      assert.strictEqual(protocol.suites.length, 2);
      assert.strictEqual(protocol.suites[0].name, 'DESKTOP');
      assert.strictEqual(protocol.suites[0].description, '`desktop` form factor tests');

      assert.strictEqual(protocol.suites[0].groups.length, 2);
      assert.strictEqual(protocol.suites[0].groups[0].tests.length, 3);
      assert.strictEqual(protocol.suites[0].groups[0].name, 'WIN');
      assert.strictEqual(protocol.suites[0].groups[0].description, 'Windows / Chrome');
      assert.strictEqual(protocol.suites[0].groups[1].name, 'MAC');
      assert.strictEqual(protocol.suites[0].groups[1].description, 'macOS / Firefox');
      assert.strictEqual(protocol.suites[0].groups[1].detail,
`    - Unless otherwise specified, use the "**Test unminified KeymanWeb**" test page.

<details>
  <summary>Tests (with inlined instructions)</summary>

`);

      assert.strictEqual(protocol.suites[0].groups[0].tests[0].name, 'RESIZING');
      assert.strictEqual(protocol.suites[0].groups[0].tests[1].name, 'HARDWARE_SHIFT');
      assert.strictEqual(protocol.suites[0].groups[0].tests[2].name, 'OSK_KEY_SEQUENCE');

      assert.strictEqual(protocol.suites[1].name, 'PHONE');
      assert.strictEqual(protocol.suites[1].description, '`phone` form-factor tests (both in-app and out-of-app)');
      assert.strictEqual(protocol.suites[1].groups.length, 3);
    });
  });

  describe('parseTestRunComment()', function() {
    it('should parse test results', function() {
      let mtp = new ManualTestParser();
      let protocol = new ManualTestProtocol('keymanapp', 'keyman', 1, false, 0);
      mtp.parseComment(protocol, 1, userTestingComment);
      assert.strictEqual(protocol.getTests()[0].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.getTests()[1].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.getTests()[2].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.getTests()[3].status(), ManualTestStatus.Open);
      mtp.parseComment(protocol, 2, testRunComment);
      assert.strictEqual(protocol.getTests()[0].status(), ManualTestStatus.Passed);
      assert.strictEqual(protocol.getTests()[1].status(), ManualTestStatus.Failed);
      assert.strictEqual(protocol.getTests()[2].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.getTests()[3].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.getTests()[0].testRuns.length, 1);
      assert.strictEqual(protocol.getTests()[0].testRuns[0].commentID, 2);
      assert.strictEqual(protocol.getTests()[0].testRuns[0].summary, 'yes great');
      assert.strictEqual(protocol.getTests()[0].testRuns[0].notes, '- Found a good solution to make it work');
      assert.strictEqual(protocol.getTests()[0].testRuns[0].status, ManualTestStatus.Passed);
      assert.strictEqual(protocol.getTests()[1].testRuns.length, 1);
      assert.strictEqual(protocol.getTests()[1].testRuns[0].commentID, 2);
      assert.strictEqual(protocol.getTests()[1].testRuns[0].summary, '');
      assert.strictEqual(protocol.getTests()[1].testRuns[0].notes, '- It was not happy jane');
      assert.strictEqual(protocol.getTests()[1].testRuns[0].status, ManualTestStatus.Failed);
      assert.strictEqual(protocol.getTests()[2].testRuns.length, 0);
      assert.strictEqual(protocol.getTests()[3].testRuns.length, 0);
      mtp.parseComment(protocol, 3, secondTestRunComment);
      assert.strictEqual(protocol.getTests()[1].status(), ManualTestStatus.Passed);
      assert.strictEqual(protocol.getTests()[1].testRuns.length, 2);
      assert.strictEqual(protocol.getTests()[1].testRuns[1].commentID, 3);
      assert.strictEqual(protocol.getTests()[1].testRuns[1].notes, '- Happy');
      assert.strictEqual(protocol.getTests()[1].testRuns[1].status, ManualTestStatus.Passed);
      mtp.parseComment(protocol, 4, thirdTestRunComment);
      assert.strictEqual(protocol.getTests()[2].status(), ManualTestStatus.Passed);
      assert.strictEqual(protocol.getTests()[2].testRuns.length, 1);
      assert.strictEqual(protocol.getTests()[2].testRuns[0].commentID, 4);
      assert.strictEqual(protocol.getTests()[2].testRuns[0].summary, 'this went pretty well actually');
      assert.strictEqual(protocol.getTests()[2].testRuns[0].notes, '');
      assert.strictEqual(protocol.getTests()[2].testRuns[0].status, ManualTestStatus.Passed);
      assert.strictEqual(protocol.getTests()[3].testRuns.length, 1);
      assert.strictEqual(protocol.getTests()[3].testRuns[0].commentID, 4);
      assert.strictEqual(protocol.getTests()[3].testRuns[0].summary, '');
      assert.strictEqual(protocol.getTests()[3].testRuns[0].notes, '- Fantastic!');
      assert.strictEqual(protocol.getTests()[3].testRuns[0].status, ManualTestStatus.Passed);
      mtp.parseComment(protocol, 5, skippedTestRunComment);
      assert.strictEqual(protocol.getTests()[2].status(), ManualTestStatus.Passed);
      assert.strictEqual(protocol.getTests()[3].status(), ManualTestStatus.Skipped);
      mtp.parseComment(protocol, 6, retestComment);
      assert.strictEqual(protocol.getTests()[0].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.getTests()[1].status(), ManualTestStatus.Passed);
      assert.strictEqual(protocol.getTests()[2].status(), ManualTestStatus.Passed);
      assert.strictEqual(protocol.getTests()[3].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.getTests()[0].testRuns[1].isControl, true);
      assert.strictEqual(protocol.getTests()[0].testRuns[1].status, ManualTestStatus.Open);
      assert.strictEqual(protocol.getTests()[3].testRuns[2].isControl, true);
      assert.strictEqual(protocol.getTests()[3].testRuns[2].status, ManualTestStatus.Open);
      mtp.parseComment(protocol, 7, retestAllComment);
      assert.strictEqual(protocol.getTests()[0].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.getTests()[1].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.getTests()[2].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.getTests()[3].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.getTests()[0].testRuns[2].isControl, true);
      assert.strictEqual(protocol.getTests()[0].testRuns[2].status, ManualTestStatus.Open);
      assert.strictEqual(protocol.getTests()[1].testRuns[2].isControl, true);
      assert.strictEqual(protocol.getTests()[1].testRuns[2].status, ManualTestStatus.Open);
      assert.strictEqual(protocol.getTests()[2].testRuns[2].isControl, true);
      assert.strictEqual(protocol.getTests()[2].testRuns[2].status, ManualTestStatus.Open);
      assert.strictEqual(protocol.getTests()[3].testRuns[3].isControl, true);
      assert.strictEqual(protocol.getTests()[3].testRuns[3].status, ManualTestStatus.Open);
    });

    it('should retest', function() {
      // setup
      let mtp = new ManualTestParser();
      let protocol = new ManualTestProtocol('keymanapp', 'keyman', 1, false, 0);
      mtp.parseComment(protocol, 1, userTestingComment);
      mtp.parseComment(protocol, 2, testRunComment);
      assert.strictEqual(protocol.getTests()[0].status(), ManualTestStatus.Passed);
      assert.strictEqual(protocol.getTests()[1].status(), ManualTestStatus.Failed);
      assert.strictEqual(protocol.getTests()[2].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.getTests()[3].status(), ManualTestStatus.Open);

      // test
      assert.strictEqual(mtp.isControlComment(altRetestComment), true);
      mtp.parseComment(protocol, 3, altRetestComment);
      assert.strictEqual(protocol.getTests()[0].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.getTests()[1].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.getTests()[2].status(), ManualTestStatus.Open);
      assert.strictEqual(protocol.getTests()[3].status(), ManualTestStatus.Open);
    });
  });

  describe('getUserTestResultsComment()', function() {
    it('should set checkmarks and status correctly', function() {
      let mtp = new ManualTestParser();
      let protocol = new ManualTestProtocol('keymanapp', 'keyman', 1, false, 0);
      mtp.parseComment(protocol, 1, userTestingComment);
      mtp.parseComment(protocol, 2, testRunComment);
      let comment = mtp.getUserTestResultsComment(protocol);
      assert.strictEqual(comment, userTestResultsComment);
      mtp.parseComment(protocol, 3, secondTestRunComment);
      mtp.parseComment(protocol, 4, thirdTestRunComment);
      comment = mtp.getUserTestResultsComment(protocol);
      assert.strictEqual(comment, userTestResultsAllPassedComment);
      mtp.parseComment(protocol, 5, skippedTestRunComment);
      comment = mtp.getUserTestResultsComment(protocol);
      assert.strictEqual(comment, userTestResultsSkippedComment);
    });

    it('should parse nested results', function() {
      let mtp = new ManualTestParser();
      let protocol = new ManualTestProtocol('keymanapp', 'keyman', 1, false, 0);
      mtp.parseUserTestingComment(protocol, 1, nestedUserTest);
      mtp.parseComment(protocol, 2, nestedResult);
      assert.strictEqual(protocol.suites[0].groups[1].tests[1].testRuns[0].notes, 'This was okay but I got a puzzle?');

      assert.strictEqual(protocol.suites[0].groups[1].tests[1].testRuns[0].status, ManualTestStatus.Passed);
      mtp.parseRetestControlComment(protocol, 3, nestedRetestControlComment);
      assert.strictEqual(protocol.suites[0].groups[1].tests[1].testRuns[1].status, ManualTestStatus.Open);
    });
  });
});