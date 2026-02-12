#!/bin/sh

set -eu

# Test

if [ -z "${DOCKER_RUNTIME_SERVER+x}" ]; then
  echo "ERROR: resources/test.sh should only be run in the server container"
  exit 1
fi

echo "Testing server with $BUILDER_CONFIGURATION configuration"

cd server

npm install
npx mocha --import=./_mocha_register.js