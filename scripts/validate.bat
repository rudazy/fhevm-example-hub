@echo off
echo.
echo FHEVM Example Hub - Validating All Examples
echo.
cd /d "%~dp0..\automation-tools"
call npx ts-node src/validate-all-examples.ts
pause