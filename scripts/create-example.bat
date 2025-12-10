@echo off
echo.
echo FHEVM Example Hub - Create New Example
echo.
echo Usage: create-example.bat [name] [category] [description]
echo Categories: basic, encryption, decryption, access-control, anti-patterns, advanced
echo.
if "%1"=="" (
    echo Error: Please provide an example name
    echo Example: create-example.bat my-example basic "My example description"
    pause
    exit /b 1
)
if "%2"=="" (
    echo Error: Please provide a category
    echo Example: create-example.bat my-example basic "My example description"
    pause
    exit /b 1
)
cd /d "%~dp0..\automation-tools"
call npx ts-node src/create-fhevm-example.ts create -n %1 -c %2 -d %3
pause