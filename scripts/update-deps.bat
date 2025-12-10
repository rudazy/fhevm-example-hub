@echo off
echo.
echo FHEVM Example Hub - Update Dependencies
echo.
cd /d "%~dp0..\automation-tools"
call npx ts-node src/update-dependencies.ts
pause