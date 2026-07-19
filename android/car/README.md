# BMW E60 Coder Pro - Android Auto Module

This module provides Android Auto integration for the BMW E60 Coder Pro app, allowing drivers to view critical vehicle data directly on their car's head unit.

## Features

- **Live OBD2 Gauges**: Real-time display of RPM, Boost, AFR, and IAT.
- **Connection Status**: Visual indicator of OBD2 and controller connectivity.
- **Debug Mode**: Host validation is currently set to `ALLOW_ALL_HOSTS_VALIDATOR` for easier testing on non-production head units.

## Technical Details

- **Java Version**: Standardized to Java 17 for compatibility with the project's build environment.
- **Library**: Uses `androidx.car.app:app:1.4.0`.
- **Service**: `BMWCoderProCarAppService` manages the lifecycle and screen transitions.
- **Entry Point**: `CarAppActivity` serves as the primary dashboard.

## Build & Deployment

The car module is a Gradle subproject. To build it independently:
```bash
cd android
./gradlew.bat :car:assembleDebug
```

## Requirements

- Android Auto compatible head unit or DHU (Desktop Head Unit).
- Minimum API Level 26 (Android 8.0).
- The `:app` module must be installed on the same device to provide the data bridge.
