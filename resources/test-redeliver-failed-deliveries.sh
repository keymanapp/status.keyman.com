#!/bin/bash

export TOKEN=$GITHUB_TOKEN
export ORGANIZATION_NAME=keymanapp
export HOOK_ID=288390178
export LAST_REDELIVERY_VARIABLE_NAME=keyman_github_webhook_last_redelivery
export WORKFLOW_REPO_NAME=status.keyman.com
export WORKFLOW_REPO_OWNER=keymanapp

node .github/workflows/scripts/redeliver-failed-deliveries.cjs
