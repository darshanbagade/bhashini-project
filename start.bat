@echo off
echo Starting Women Safety System...

start cmd /k "cd %~dp0 && npm start"
start cmd /k "cd %~dp0server && npx nodemon server.js"

echo Started both frontend and backend servers.
echo Frontend: http://localhost:3000
echo Backend: http://localhost:5000 