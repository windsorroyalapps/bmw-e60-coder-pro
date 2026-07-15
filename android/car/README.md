# BMW E60 Coder Pro - Android Auto Module

This module provides Android Auto integration for the BMW E60 Coder Pro app.

## Features

- Live OBD2 gauge display on car head unit
- RPM, Boost, AFR, IAT readouts
- Connection status indicator

## Setup

1. The car module is included as a Gradle subproject in `android/settings.gradle`
2. Build with: `./gradlew :car:build`
3. The app service is declared in `AndroidManifest.xml`

## Architecture

- `BMWCoderProCarAppService` - Main CarAppService host
- `CarAppActivity` - Main screen with gauge grid
- Uses AndroidX Car App library v1.4.0

## Requirements

- Android Auto compatible head unit
- USB connection to vehicle
- Android 8.0+ (API 26+)
