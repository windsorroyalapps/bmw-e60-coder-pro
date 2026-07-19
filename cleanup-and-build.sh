#!/bin/bash

# BMW E60 Coder Pro - Cleanup & Build Script
# This script cleans up unused code, removes dependencies, and builds APK

set -e

echo "================================"
echo "BMW E60 Coder Pro - Build Script"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Clean up node modules and dependencies
log_info "Step 1: Cleaning up npm dependencies..."
if [ -d "node_modules" ]; then
    rm -rf node_modules
    log_info "Removed node_modules"
else
    log_warn "node_modules not found"
fi

# Step 2: Clean up Android build artifacts
log_info "Step 2: Cleaning Android build artifacts..."
if [ -d "android" ]; then
    cd android
    
    # Clean Gradle builds
    if [ -f "gradlew" ]; then
        chmod +x gradlew
        ./gradlew clean
        log_info "Gradle cleaned"
    else
        log_warn "gradlew not found, skipping Gradle clean"
    fi
    
    # Remove build directories
    find . -name "build" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name ".gradle" -type d -exec rm -rf {} + 2>/dev/null || true
    
    log_info "Android build artifacts cleaned"
    cd ..
else
    log_warn "android directory not found"
fi

# Step 3: Remove dist/build directories
log_info "Step 3: Removing distribution directories..."
rm -rf dist build www 2>/dev/null || true
log_info "Cleaned old build outputs"

# Step 4: Remove cache directories
log_info "Step 4: Removing cache files..."
rm -rf .vite .tsc-output 2>/dev/null || true
find . -name "*.cache" -delete 2>/dev/null || true
find . -name "*.log" -delete 2>/dev/null || true
log_info "Cache files cleaned"

# Step 5: Install fresh dependencies
log_info "Step 5: Installing npm dependencies..."
npm install
if [ $? -eq 0 ]; then
    log_info "npm dependencies installed successfully"
else
    log_error "Failed to install npm dependencies"
    exit 1
fi

# Step 6: Run TypeScript type checking
log_info "Step 6: Running TypeScript type checking..."
npx tsc --noEmit
if [ $? -eq 0 ]; then
    log_info "TypeScript validation passed"
else
    log_warn "TypeScript validation warnings found (non-blocking)"
fi

# Step 7: Build web assets
log_info "Step 7: Building web assets with Vite..."
npm run build
if [ $? -eq 0 ]; then
    log_info "Web build completed successfully"
else
    log_error "Web build failed"
    exit 1
fi

# Step 8: Sync Capacitor files to Android
log_info "Step 8: Syncing Capacitor to Android..."
npx cap sync
if [ $? -eq 0 ]; then
    log_info "Capacitor sync completed"
else
    log_error "Capacitor sync failed"
    exit 1
fi

# Step 9: Build Android release APK
log_info "Step 9: Building Android modules (app and car)..."
cd android

if [ -f "gradlew" ]; then
    chmod +x gradlew

    # Run linting and unit tests to ensure stability
    log_info "Running quality checks (Lint & Tests)..."
    ./gradlew :app:lintRelease :car:lintRelease test

    # Build release APK
    log_info "Executing assembleRelease..."
    ./gradlew assembleRelease
    
    if [ $? -eq 0 ]; then
        log_info "Build completed successfully!"
        
        # Find and report APK location
        APK_PATH="app/build/outputs/apk/release/app-release.apk"
        if [ -f "$APK_PATH" ]; then
            log_info "Main APK Location: $(pwd)/$APK_PATH"
            APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
            log_info "Main APK Size: $APK_SIZE"
        fi

        # Check for car module output (AAR)
        AAR_PATH="car/build/outputs/aar/car-release.aar"
        if [ -f "$AAR_PATH" ]; then
            log_info "Car Library (AAR) Location: $(pwd)/$AAR_PATH"
        fi

        # Optional: Copy to root for easy access
        cp "$APK_PATH" ../BMW-E60-Coder-Pro-Release.apk
        log_info "Copied release APK to root directory"
    else
        log_error "Android build failed"
        exit 1
    fi
else
    log_error "gradlew not found in android directory"
    exit 1
fi

cd ..

echo ""
echo "================================"
log_info "BUILD COMPLETE!"
echo "================================"
echo ""
log_info "Next steps:"
echo "  1. Sign the APK (if needed for production)"
echo "  2. Test on Android device: adb install app-release.apk"
echo "  3. Upload to Play Store or distribute as needed"
echo ""
