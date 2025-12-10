@echo off
echo.
echo FHEVM Example Hub - Generating Documentation
echo.
cd /d "%~dp0..\automation-tools"
call npx ts-node src/generate-docs.ts
pause