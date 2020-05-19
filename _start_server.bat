@echo off
"%ProgramFiles%\git\bin\bash.exe" --init-file "c:\Program Files\Git\etc\profile" -l "./_start_server.sh"
if errorlevel 1 exit /b 1
exit /b 0
