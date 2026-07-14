#!/bin/bash
# Diagnostic build script to capture Gradle errors
set -e
cd "$(dirname "$0")/../android"
export ANDROID_HOME=${ANDROID_HOME:-/usr/local/lib/android/sdk}
./gradlew assembleDebug --stacktrace --no-daemon 2>&1 | tee /tmp/gradle-build.log
