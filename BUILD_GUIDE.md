# BMW E60 Coder Pro - Build & Environment Guide

This guide details the setup and build process for the BMW E60 Coder Pro project, covering the React frontend, Capacitor bridge, and native Android modules.

## Environment Requirements

- **Node.js**: 18+ (Required for Vite & Capacitor 5+)
- **npm**: 9+
- **Java Development Kit (JDK)**: **Version 17** (Strictly required for all Gradle modules)
- **Android SDK**: API Level 35 (minSdk 26)
- **Android Studio**: Ladybug (2024.2.1) or newer recommended

## Project Architecture

- **Frontend**: React + TypeScript + Vite (located in `/src`)
- **Native Android**: Capacitor-managed project (located in `/android`)
  - `:app`: Main Capacitor activity, USB management, and NFC HCE services.
  - `:car`: Android Auto integration module for head unit display.

## Step-by-Step Build Process

### 1. Frontend Preparation
Install dependencies and build the web assets:
```bash
npm install
npm run build
```

### 2. Capacitor Synchronization
Sync the built web assets into the Android project:
```bash
npx cap sync android
```

### 3. Native Android Build
Build the debug APK using the Gradle wrapper. Ensure your `JAVA_HOME` points to JDK 17.
```bash
cd android
./gradlew.bat assembleDebug
```
The resulting APK will be located at:
`android/app/build/outputs/apk/debug/app-debug.apk`

## Critical Build Fixes (Reference)

- **Java Version**: If you encounter `invalid source release: 21`, ensure your IDE and shell are using Java 17. All `build.gradle` files are configured for `VERSION_17`.
- **JitPack**: The project requires JitPack for the `usb-serial-for-android` dependency. This is configured in the root `android/build.gradle`.
- **NFC HCE**: The app emulates a physical fuel card. Ensure NFC is enabled on the target device for testing.

## Testing

Run unit tests to verify the EMV kernel and logic:
```bash
cd android
./gradlew.bat testDebugUnitTest
```

---
**Version**: 1.0.1  
**Last Updated**: 2026-07-14
