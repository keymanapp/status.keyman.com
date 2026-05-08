@echo off
for /f %%i in ('git rev-parse HEAD') do set NEWVERSION=%%i
echo "Setting build version to %NEWVERSION%"
echo export const buildVersion = '%NEWVERSION%'; > shared\version.ts
