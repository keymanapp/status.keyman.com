#!/bin/bash
set -e
[ -f ./localenv.sh ] && . ./localenv.sh
../node_modules/.bin/tsc-watch --onSuccess "node ." --onFailure "node ."
# npx nodemon -w src -e ts,js --exec "npm run build-server"
