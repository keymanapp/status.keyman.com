# Quick Start

Clone the repo:

```bash
git clone https://github.com/keymanapp/status.keyman.com
cd status.keyman.com/
```

### Prerequisites

* Docker Desktop
* On Windows, you'll need to have Git Bash installed in `C:\Program Files\git\bin\bash.exe`.

Before building and starting the site, you need to have API tokens set as
environment variables. These should be added in script `server/localenv.sh`.

```bash
export KEYMANSTATUS_TEAMCITY_TOKEN=[your personal auth token here]
export KEYMANSTATUS_GITHUB_TOKEN=[your personal auth token here]
export KEYMANSTATUS_SENTRY_TOKEN=[your personal auth token here]
```

## Build the docker containers

Build status.keyman.com, in development mode:

```bash
./build.sh stop build --debug
```

## Start the development server

This repo is configured for live build and reload of both the client and server,
running in Docker.

```bash
./build.sh start --debug
```

* Point your browser to <http://localhost:8061> to view the live reload version
  of the application.
* The following query parameters are available:
  * `?c=1` shows contributions at the top center
  * `?o=1` shows owner for each platform
  * `?a=1` shows build agent status at the top right
  * `?r=1` adds a refresh button to force a server-side full refresh (this is
           costly, so only press this when there has been a data error such as a
           network failure making status data out of date; most errors are
           actually self-healing)

### @keymanapp-test-bot

Three files needed for development:

* `.keymanapp-test-bot.appid`: integer appid (e.g. 134443 for the normal test app)
* `.keymanapp-test-bot.pem`: certificate for GitHub integration for app
* `.keymanapp-test-bot.secret`: secret for GitHub integration for app

## Production

This site is deployed to a Kubernetes cluster via configuration in a private
repo to status.keyman.com.
