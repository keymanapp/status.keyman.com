#!/bin/sh

set -eu

# Configuration

echo "Initializing server with $BUILDER_CONFIGURATION configuration"

if [ -z "${DOCKER_RUNTIME_SERVER+x}" ]; then
  echo "ERROR: resources/start-server.sh should only be run in the server container"
  exit 1
fi

rm -f _control/ready

if [ "$BUILDER_CONFIGURATION" = release ]; then
  # For a release build, we need to build public/ because it is served from the
  # same container
  echo "- Building public for release"
  cd public
  npm ci
  ./node_modules/.bin/ng build --configuration production
  cd ..

  echo "- Building server for release"
  cd server
  npm ci
  ./node_modules/.bin/tsc
  cd ..
else
  # For a debug build, we only need to build server/, because public/ is served
  # from a separate container, and we don't need to build first, because that is
  # done with tsc-watch
  echo "- Preparing server for debug"
  cd server
  npm ci
  cd ..
fi

echo "Starting server with $BUILDER_CONFIGURATION configuration"

if [ -f ./server/localenv.sh ]; then
  . ./server/localenv.sh
fi

touch _control/ready

if [ "$BUILDER_CONFIGURATION" = release ]; then
  # TODO: support staging env
  export NODE_ENV=production
  cd server/dist/server/

  # TODO: make code.js pwd-safe
  node code.js
else
  export NODE_ENV=development
  cd server
  ./node_modules/.bin/tsc-watch --onSuccess "node ." --onFailure "node ."
fi
