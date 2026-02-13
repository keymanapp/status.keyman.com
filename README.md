# status.keyman.com

## Overview

* Back end is a node server in `/server`.
* Front end is an Angular app in `/public`.
* The [Keyman Test-bot](https://github.com/keymanapp/keyman/wiki/User-Testing-Workflows)
  (@keymanapp-test-bot) is in `/server/keymanapp-test-bot`.

The site is setup to run in Docker container(s).

The site can be setup in development (`--debug`) or production (`--release`)
modes. When in development mode, the front end is hosted (on
http://localhost:8061) in a separate container to the back end (on
http://localhost:8060) in order to facilitate live-reload on changes.

For production mode, the front end is compiled to static pages which are then
served by the back end (on http://localhost:8060).

## Prerequisites

* Docker Desktop
* On Windows, you'll need to have Git Bash installed in `C:\Program Files\git\bin\bash.exe`.

Before building and starting the site, you need to have API tokens set as
environment variables. These should be added in script `server/localenv.sh`.

```bash
export KEYMANSTATUS_TEAMCITY_TOKEN=[your personal auth token here]
export KEYMANSTATUS_GITHUB_TOKEN=[your personal auth token here]
export KEYMANSTATUS_SENTRY_TOKEN=[your personal auth token here]
```

### @keymanapp-test-bot

Three files are needed for development:

* `.keymanapp-test-bot.appid`: integer appid (e.g. 134443 for the normal test app)
* `.keymanapp-test-bot.pem`: certificate for GitHub integration for app
* `.keymanapp-test-bot.secret`: secret for GitHub integration for app

## Development setup

Clone the repo:

```bash
git clone https://github.com/keymanapp/status.keyman.com
cd status.keyman.com/
```

### Build the docker containers

Build status.keyman.com, in development mode:

```bash
./build.sh stop build --debug
```

### Start the development server

This repo is configured for live build and reload of both the client and server,
running in Docker.

```bash
./build.sh start --debug
```

* Point your browser to <http://localhost:8061> to view the live reload version
  of the application.
* The site takes a moment to compile and load; you can watch the logs to see
  when it is ready.

### Running unit tests

The unit tests will currently stop the back end container before running.

```bash
./build.sh test --debug
```

## Production setup

This site is deployed to a Kubernetes cluster via configuration in a private
repo to status.keyman.com.

You can run the production mode site locally with:

```bash
./build.sh stop build start --release
```

* Point your browser to <http://localhost:8060> to view the production version
  of the application.

## Site query parameters

* The following query parameters are available:
  * `?c=1` shows contributions at the top center
  * `?o=1` shows owner for each platform
  * `?a=1` shows build agent status at the top right
  * `?r=1` adds a refresh button to force a server-side full refresh (this is
           costly, so only press this when there has been a data error such as a
           network failure making status data out of date; most errors are
           actually self-healing)
