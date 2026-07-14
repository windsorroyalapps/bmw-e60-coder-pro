# BMW E60 Coder Pro - Cleanup & Build Guide

## Overview
This guide covers cleaning up the BMW E60 Coder Pro Android app and building a production-ready APK.

## Quick Start

### Option 1: Automated Build (Recommended)
```bash
chmod +x cleanup-and-build.sh
./cleanup-and-build.sh
```

### Option 2: Using npm Scripts
```bash
# Clean everything and rebuild
npm run build:all

# Or build Android APK only
npm run android:build
```

### Option 3: Manual Steps
Follow the steps below for granular control.

---

## Detailed Cleanup Steps

### 1. **Clean Node Modules & Dependencies**
```bash
npm run clean
# or manually:
rm -rf node_modules package-lock.json yarn.lock
npm install
```
**Why:** Removes any corrupted or outdated dependencies.

### 2. **Clean Android Build Artifacts**
```bash
npm run clean:android
# or manually:
cd android
./gradlew clean
find . -name "build" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name ".gradle" -type d -exec rm -rf {} + 2>/dev/null || true
cd ..
```
**Why:** Removes stale Gradle builds and cached files.

### 3. **Remove Old Build Outputs**
```bash
rm -rf dist build www
```
**Why:** Ensures fresh web build with latest code.

### 4. **Clean Cache & Logs**
```bash
rm -rf .vite .tsc-output
find . -name "*.cache" -delete
find . -name "*.log" -delete
```
**Why:** Prevents cached code from affecting new builds.

### 5. **Full Clean & Reinstall**
```bash
npm run clean:all && npm install
```
**Why:** Complete reset of all dependencies and build artifacts.

---

## Available npm Scripts

| Command | Purpose |
|---------|----------|
| `npm run dev` | Start development server |
| `npm run build` | Build web assets |
| `npm run type-check` | Check TypeScript types |
| `npm run clean` | Clean node_modules and build files |
| `npm run clean:android` | Clean Android build artifacts |
| `npm run clean:all` | Clean everything (node_modules + Android) |
| `npm run reinstall` | Clean and reinstall dependencies |
| `npm run cap:sync` | Sync web assets to Android |
| `npm run cap:build-android` | Build Android APK release |
| `npm run android:build` | Full Android build pipeline |
| `npm run build:all` | Complete clean build (recommended) |
| `npm run android:install` | Install APK on connected device |
| `npm run android:logs` | View app logs |
| `npm run android:check` | Check Android environment |

---

## Build Process

### Step-by-Step Build

#### 1. Type Check
```bash
npm run type-check
```
**Why:** Catches TypeScript errors before building.

#### 2. Build Web Assets
```bash
npm run build
```
**Why:** Generates optimized HTML, CSS, and JS for Android.

#### 3. Sync to Android
```bash
npm run cap:sync
```
**Why:** Copies web assets to Android app.

#### 4. Build APK
```bash
npm run cap:build-android
```
**Why:** Generates release APK without signing.

**Output:** `android/app/build/outputs/apk/release/app-release.apk`

### Complete Automated Build
```bash
npm run android:build
```
This runs all steps in sequence:
1. Type checking
2. Web build
3. Capacitor sync
4. Android APK build

### Full Clean + Build
```bash
npm run build:all
```
This performs:
1. Complete cleanup
2. Fresh dependency installation
3. Type checking
4. Web build
5. Capacitor sync

---

## Production APK Signing

For Play Store release, sign the APK:

### Create Keystore (First Time Only)
```bash
keytool -genkey -v -keystore my-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias my-key-alias
```

### Sign APK
```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore my-key.jks \
  android/app/build/outputs/apk/release/app-release.apk \
  my-key-alias
```

### Verify Signature
```bash
jarsigner -verify -verbose -certs android/app/build/outputs/apk/release/app-release.apk
```

### Optimize APK Size (Optional)
```bash
# Enable minification in android/app/build.gradle
# Change: minifyEnabled false to minifyEnabled true
# Then rebuild
```

---

## Testing & Installation

### Install on Device
```bash
npm run android:install
```

### View Logs
```bash
npm run android:logs
```

### Check Setup
```bash
npm run android:check
```

### Manual ADB Commands
```bash
# List connected devices
adb devices

# Install APK
adb install -r android/app/build/outputs/apk/release/app-release.apk

# Uninstall
adb uninstall com.bmwe60.coderpro

# View logs
adb logcat | grep bmwe60
```

---

## Troubleshooting

### Build Fails with Gradle Error
```bash
npm run clean:android
npm run android:build
```

### TypeScript Errors
```bash
npm run type-check
# Review errors and fix source files
npm run build
```

### APK Too Large
- Enable ProGuard/R8 minification
- Remove unused Radix UI components
- Check for large assets in `www/` directory

### Capacitor Sync Issues
```bash
npm run android:check
npx cap update
npm run cap:sync
```

### Node Modules Issues
```bash
npm run reinstall
```

### Still Having Issues?
```bash
npm run clean:all
npm install
npm run android:build
```

---

## Project Structure

```
bmw-e60-coder-pro/
├── src/                          # React source code
│   ├── components/              # UI components
│   ├── pages/                   # Page components
│   └── App.tsx                  # Main app
├── android/                     # Android native code
│   ├── app/
│   │   └── build/              # Build outputs (APK here)
│   └── gradlew                 # Gradle wrapper
├── dist/                        # Built web assets (generated)
├── www/                         # Web assets for Capacitor (generated)
├── package.json                # npm scripts and dependencies
├── tsconfig.json              # TypeScript config
├── vite.config.ts             # Vite build config
└── tailwind.config.js         # Tailwind CSS config
```

---

## Key Dependencies

### Runtime Dependencies
| Package | Version | Purpose |
|---------|---------|----------|
| React | 18.3.1 | UI Framework |
| React Router | 6.26.0 | Navigation |
| Capacitor | 5.7.0 | Android Bridge |
| Radix UI | Latest | Component Library |
| Tailwind CSS | 3.4.10 | Styling |
| Recharts | 2.13.0 | Charting/Graphs |
| Zustand | 4.5.2 | State Management |

### Build Tools
| Tool | Version |
|------|----------|
| Vite | 5.3.4 |
| TypeScript | 5.2.2 |
| Gradle | 8.7.2 |
| Android SDK | 35 (min: 23) |
| Node.js | 16+ |

---

## Final Checklist

Before releasing:
- [ ] Run `npm run type-check` - no errors
- [ ] Run `npm run build` - builds successfully
- [ ] Run `npm run android:build` - APK created
- [ ] Test on device with `npm run android:install`
- [ ] Check logs with `npm run android:logs`
- [ ] Version updated in `package.json` and `android/app/build.gradle`
- [ ] APK signed for production (if Play Store)
- [ ] Release notes prepared

---

## Environment Requirements

- **Node.js**: 16+
- **npm**: 7+
- **Java**: 11+ (for Gradle)
- **Android SDK**: API level 35 (min: 23)
- **Android Studio**: Recommended for testing

---

## References

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Build Guide](https://developer.android.com/studio/build)
- [Vite Documentation](https://vitejs.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)

---

**Last Updated:** 2026-07-14  
**Version:** 3.0.0  
**Status:** Ready for Production Build
