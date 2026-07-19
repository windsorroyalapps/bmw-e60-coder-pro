# BMW E60 Coder Pro

Complete BMW E60 tuning, diagnostics, and Xbox controller drive platform for Android Automotive OS and standard Android devices.

## Documentation

- **[User Manual](USER_MANUAL.md)**: Detailed instructions for using all features, including Live Tuning, Android Auto, and Controller Drive.
- **[Build Guide](BUILD_GUIDE.md)**: Technical details for developers and building from source.

## Features

- **NFC HCE Fuel Payment**: Contactless fuel payment emulation (MasterCard/Visa/Amex) with secure token vault.
- **7-Screen Interface**: Home, Gauges, AI Tuning, AI Analysis, DME Flash, Controller Drive, Setup.
- **Android Auto Integration**: Dedicated `:car` module for live OBD2 gauge display on vehicle head units.
- **4 Engines**: N54 (Twin-Turbo), N52 (NA), M54 (NA), M57 (Turbo Diesel).
- **9 Map Types**: Stock through Stage 3, plus Economy, Valet, Custom, Anti-Theft.
- **18 Injectors**: Bosch, EV14, ID, Siemens Deka with sizing calculator.
- **Xbox Controller Drive**: Full vehicle control via gamepad through AA USB port.
- **VO Editor**: Enable AFS (2VB) and 30+ factory options.
- **AI Analysis**: Real-time knock, AFR, boost, IAT monitoring with auto-tune.
- **DME Flash**: Quick/Full/Live flash with 7-step safety checks.

## Screens

| Screen | Description |
|--------|-------------|
| **Home** | Vehicle profile, OBD2 status, ECU grid, live data cards. |
| **Gauges** | Canvas-rendered circular gauges at 60fps, 3 switchable layouts. |
| **AI Tuning** | Map selection, injector calculator, timing/boost/throttle tables. |
| **AI Analysis** | Real-time diagnostics with severity classification. |
| **Controller Drive** | Xbox gamepad vehicle control + VO editor for AFS. |
| **Data Logs** | Session recording, knock detection, data browser. |
| **Setup** | Engine/transmission selection, modification tracking. |

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite, Tailwind CSS + shadcn/ui.
- **State**: Zustand (state management).
- **Graphics**: Canvas API (gauge rendering).
- **Native Bridge**: Capacitor (Android bridge) with custom `OBD2BridgePlugin`.
- **Android**: Java 17, Android SDK 35, AndroidX Car App library.

## Build Requirements

- **Java**: JDK 17 (Standardized across all modules).
- **Repositories**: JitPack (required for `usb-serial-for-android`).

## Build Instructions

```bash
# Frontend Build
npm install
npm run build    # Output: dist/

# Android Build
npx cap sync android
cd android
./gradlew.bat assembleDebug
```

## Testing

Unit tests are located in `android/app/src/test`. Run them using:
```bash
cd android
./gradlew.bat testDebugUnitTest
```

## GitHub Actions Setup

1. Go to **Actions** tab in your repo.
2. Click **New workflow** > **set up a workflow yourself**.
3. Copy the content from `workflows/build.yml` in this repo.
4. Paste it into `.github/workflows/build.yml`.
5. Commit — the workflow will auto-build on every push and create releases on tags.

## License

MIT
