@echo off
REM Local build script for Windows to test before deployment
echo 🔧 Building Value Investor Dashboard...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

REM Install dependencies
echo 📦 Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ❌ npm install failed
    pause
    exit /b 1
)

REM Build CSS
echo 🎨 Building optimized CSS...
npm run build-css
if %errorlevel% neq 0 (
    echo ❌ CSS build failed
    pause
    exit /b 1
)

REM Check if CSS was generated
if exist "css\styles.css" (
    echo ✅ CSS generated successfully
) else (
    echo ❌ CSS generation failed
    pause
    exit /b 1
)

REM Validate JavaScript modules
echo 🔍 Validating JavaScript modules...

if exist "js\app.js" (echo ✅ js\app.js exists) else (echo ❌ js\app.js missing & pause & exit /b 1)
if exist "js\config.js" (echo ✅ js\config.js exists) else (echo ❌ js\config.js missing & pause & exit /b 1)
if exist "js\dom.js" (echo ✅ js\dom.js exists) else (echo ❌ js\dom.js missing & pause & exit /b 1)
if exist "js\toast.js" (echo ✅ js\toast.js exists) else (echo ❌ js\toast.js missing & pause & exit /b 1)
if exist "js\loading.js" (echo ✅ js\loading.js exists) else (echo ❌ js\loading.js missing & pause & exit /b 1)
if exist "js\firebase-loader.js" (echo ✅ js\firebase-loader.js exists) else (echo ❌ js\firebase-loader.js missing & pause & exit /b 1)
if exist "js\api.js" (echo ✅ js\api.js exists) else (echo ❌ js\api.js missing & pause & exit /b 1)
if exist "js\validation.js" (echo ✅ js\validation.js exists) else (echo ❌ js\validation.js missing & pause & exit /b 1)
if exist "js\request-manager.js" (echo ✅ js\request-manager.js exists) else (echo ❌ js\request-manager.js missing & pause & exit /b 1)

REM Check critical files
echo 🔍 Checking critical files...

if exist "index.html" (echo ✅ index.html exists) else (echo ❌ index.html missing & pause & exit /b 1)
if exist "sw.js" (echo ✅ sw.js exists) else (echo ❌ sw.js missing & pause & exit /b 1)
if exist "netlify.toml" (echo ✅ netlify.toml exists) else (echo ❌ netlify.toml missing & pause & exit /b 1)
if exist "package.json" (echo ✅ package.json exists) else (echo ❌ package.json missing & pause & exit /b 1)
if exist "tailwind.config.js" (echo ✅ tailwind.config.js exists) else (echo ❌ tailwind.config.js missing & pause & exit /b 1)
if exist "netlify\functions\gemini-proxy.js" (echo ✅ netlify\functions\gemini-proxy.js exists) else (echo ❌ netlify\functions\gemini-proxy.js missing & pause & exit /b 1)

echo.
echo 🎉 Build completed successfully!
echo.
echo 📋 Deployment checklist:
echo    1. Set GEMINI_API_KEY in Netlify environment variables
echo    2. Connect repository to Netlify
echo    3. Push to main branch for automatic deployment
echo.
echo 🚀 Ready for deployment!
echo.
echo Press any key to exit...
pause >nul