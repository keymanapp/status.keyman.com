#!/bin/sh
# This script is called from the k8s init container. Not used in Docker setups

set -eu

rm -f _control/ready

echo "- Building public for release"
cd public
npm ci
./node_modules/.bin/ng build --configuration production
cd -

echo "- Building server for release"
cd server
npm ci
./node_modules/.bin/tsc
cd -

touch _control/ready
