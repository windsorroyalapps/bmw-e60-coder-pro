#!/bin/bash
# Local Build Script for BMW E60 Coder Pro
# This script automates the full build pipeline from web assets to Android APK.

set -e

# 1. Frontend Build
echo "Step 1: Building Web Assets..."
npm run build

# 2. Capacitor Sync
echo "Step 2: Syncing with Capacitor..."
npx cap sync android

# 3. Android Build
echo "Step 3: Building Android APK (Debug)..."
cd android
# Ensure Java 17 is used if multiple versions are installed
./gradlew assembleDebug --stacktrace

echo "Build Complete: android/app/build/outputs/apk/debug/app-debug.apk"
