@echo off
echo Starting Test Server...
cd %~dp0server
node test-server.js
pause 