#!/bin/bash
NEWVERSION="$(git rev-parse HEAD)"
echo "Writing version '$NEWVERSION' to version.ts"
echo "export const buildVersion = '$NEWVERSION';" > shared/version.ts
