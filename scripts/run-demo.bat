@echo off
echo.
echo FHEVM Example Hub - Quick Demo
echo.
cd /d "%~dp0..\automation-tools"
call npx ts-node src/demo-runner.ts
pause