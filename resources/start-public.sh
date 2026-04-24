#!/bin/sh

set -eu

if [ -z "${DOCKER_RUNTIME_PUBLIC+x}" ]; then
  echo "ERROR: resources/start-public.sh should only be run in the public container"
  exit 1
fi

if [ "$BUILDER_CONFIGURATION" = release ]; then
  echo "ERROR: resources/start-public.sh should only be run in debug configurations"
  exit 1
fi

# Configuration

echo "Initializing debug frontend"

cd public
npm install
cd ..

echo "Starting debug frontend"

export NODE_ENV=development

cd public
./node_modules/.bin/ng serve --configuration development --verbose --watch=true --host=0.0.0.0 --poll 1000 --port 80
