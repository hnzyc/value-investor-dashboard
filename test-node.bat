@echo off
echo Testing Node.js and npm installation...
echo.

REM Test Node.js
echo Checking Node.js...
node --version
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
) else (
    echo ✅ Node.js is installed
)

echo.

REM Test npm
echo Checking npm...
npm --version
if %errorlevel% neq 0 (
    echo ❌ npm is not installed or not in PATH
) else (
    echo ✅ npm is installed
)

echo.
echo Press any key to continue...
pause >nul