# Quick Start

Clone the repo:

```bash
git clone https://github.com/keymanapp/status.keyman.com
cd status.keyman.com/
```

Build status.keyman.com:

```bash
cd server
npm install
npm run-script build
cd ../public
npm install
npm run-script build
cd ..
```

Before running the node server, you need to have two API tokens set as environment variables.  You might want to add these to script `server/localenv.sh`.

```bash
export KEYMANSTATUS_TEAMCITY_TOKEN=[your personal auth token here]
export KEYMANSTATUS_GITHUB_TOKEN=[your personal auth token here]
export KEYMANSTATUS_SENTRY_TOKEN=[your personal auth token here]
# export KEYMANSTATUS_GITHUB_WEBHOOK_SECRET=[github webhook secret here] # optional unless testing the github webhook
```

On Windows, you'll also need to have Git Bash installed in `C:\Program Files\git\bin\bash.exe`.

## Development server

This repo is configured for live build and reload of both the client and server. You'll need two terminals open. In the first, run:

```bash
npm run start-server
```

and in the second, run:

```bash
npm run start-client
```

* Point your browser to <http://localhost:4200> to view the live reload version of the application.
* The query parameter `?c=1` adds a contributions view which is not visible by default.
* Another query parameter `?sprint=P8S4` parameter to view sprint contributions data for P8S4

### @keymanapp-test-bot

Three files needed for development:

* `.keymanapp-test-bot.appid`: integer appid (e.g. 134443 for the normal test app)
* `.keymanapp-test-bot.pem`: certificate for GitHub integration for app
* `.keymanapp-test-bot.secret`: secret for GitHub integration for app

### Webhooks

* GitHub: 2 webhooks are configured to the same endpoint /webhook/github to POST
  events from keymanapp organization. These are split to make log review
  simpler, because check_run and check_suite are very noisy.
  * check_run, check_suite
  * issues, issue_comment, milestones, pull requests, pull request reviews

* TeamCity: /webhook/teamcity - for build status

* Discourse: /webhook/discourse - for community.software.sil.org topics

* Sentry: /webhook/sentry - when new errors are logged

* GitHub Testbot app: /webhook/keymanapp-test-bot
