# DONE

-12. test results should include one line summary from latest results
-1. user-test-missing label should be added auto when no tests are there
-2. a `@keymanapp-test-bot skip [testing]` command would tell us that user test is not required
-4. enable webhook for initial comment in a PR/issue
-- emoji use:
    - green w checkmark:  all passed
    - red:  at least one failure
    - blue / white / grey :  all pending
    - yellow: partial results (all have passed)
-6. status of a test in the User Testing comment should be a link to the comment where it is reported
-13. add a '*' if there are details for a test result
-5. design how we would run test suites and grouped tests (SUITE / GROUP / TEST)
-   a) consider using emoji for SUITES and GROUPS so we don't confuse with checkboxes ✅ 🟧 🟥 🟩 🟦 🟨 ❎ ❌
-3. auto PRs will not be tagged by the bot. (either auto label or created by [any] bot)
-2. icon and metadata for the bot - which orgs can install it, etc.
-1. Deploy manual-test-bot - PEM, secret, and address.
-5. Update wiki page for groups and suites

# TO DO


6. Edumacation and links from our internal documentation
7. Enhanced status.keyman.com reporting on PR user test status

# FUTURE

2. ensure that comments are only processed if they are from people on the team?
4. add an error report in the protocol to be placed into the user test results
7. bot can auto-inject a template result comment that it updates.
   a) Initial: ya ain't got none. do sommat about it."
8) PR template(?) has a template suite that may be filled out.
9. editing test protocols in status.keyman.com
10. editing test results in status.keyman.com

















   b) Specification mode:
       i)  SUITE_ scoping
       ii) GROUP_ + TEST_ defined at same level
   c) Results mode:
       i)   Top-level SUITE_ scoping
       ii)  GROUP_ subscope
            - _might_ could be scoped at same level, but consistency is better, IMO.
       iii) TEST_ results
            - uses most recent SUITE_ and GROUP_ to auto-match the specified test.

Example specification mode (within the PR's description):
```markdown
## SUITE_DESKTOP: Testing on Desktop browsers

This is a set of tests across a bunch of desktop browsers.
Additional instructions incl details/summary if wanted etc.
* GROUP_WINDOWS:details details, including etc etc.
* GROUP_MACOS: the dot point is optional
* GROUP_LINUX
* GROUP_CHROMEBOOK

- TEST_RESIZING:  Do the thing
- TEST_LAYERS_SHIFT:  Do this other thing, too
- TEST_LAYERS_CAPS:  Do the same thing, but with CAPS.

First comment (auto-reserved by test-bot):

@keymanapp-test-bot commented on 23 Aug:
# User Test Results

## 🟥 SUITE_DESKTOP
* 🟧 GROUP_WINDOWS: details details, including etc etc.
* 🟥 GROUP_MACOS: the dot point is optional
  V Tests
    * 🟥 TEST_RESIZING
    * ✅ TEST_LAYERS_SHIFT
    * ✅ TEST_LAYERS_CAPS
* ✅ GROUP_LINUX
* ⬜ GROUP_CHROMEBOOK
```

- rolled vs unrolled
    - devs specify the 'rolled' form (SUITE & GROUP updated)
    - bot manages a corresponding 'unrolled' form
    - if a group has a failure, the rolled's link (for point 6)
      hops to the unrolled's summary with the direct link.


Example results mode:
```markdown
## SUITE_DESKTOP
### GROUP_WINDOWS
* TEST_RESIZING: PASS. I had some trouble but got it going?
* TEST_LAYERS_SHIFT: PASS
* TEST_LAYERS_CAPS: BLAH BLAH

### GROUP_MACOS
* TEST_RESIZING:  FAILED
```
