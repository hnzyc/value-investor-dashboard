#!/bin/bash

# Local build script to test before deployment
echo "🔧 Building Value Investor Dashboard..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build CSS
echo "🎨 Building optimized CSS..."
npm run build-css

# Check if CSS was generated
if [ -f "css/styles.css" ]; then
    echo "✅ CSS generated successfully"

    # Show file size
    css_size=$(du -h css/styles.css | cut -f1)
    echo "📊 Generated CSS size: $css_size"
else
    echo "❌ CSS generation failed"
    exit 1
fi

# Validate JavaScript modules
echo "🔍 Validating JavaScript modules..."

js_files=(
    "js/app.js"
    "js/config.js"
    "js/dom.js"
    "js/toast.js"
    "js/loading.js"
    "js/firebase-loader.js"
    "js/api.js"
    "js/validation.js"
    "js/request-manager.js"
)

for file in "${js_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
        exit 1
    fi
done

# Check critical files
echo "🔍 Checking critical files..."

critical_files=(
    "index.html"
    "sw.js"
    "netlify.toml"
    "package.json"
    "tailwind.config.js"
    "netlify/functions/gemini-proxy.js"
)

for file in "${critical_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
        exit 1
    fi
done

echo ""
echo "🎉 Build completed successfully!"
echo ""
echo "📋 Deployment checklist:"
echo "   1. Set GEMINI_API_KEY in Netlify environment variables"
echo "   2. Connect repository to Netlify"
echo "   3. Push to main branch for automatic deployment"
echo ""
echo "🚀 Ready for deployment!"