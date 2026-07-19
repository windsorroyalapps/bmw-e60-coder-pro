# Android Auto Car App Screens

This directory contains the screen implementations for the Android Auto interface.

## Current Status
- **Main Dashboard**: Handled by `CarAppActivity.java` in the `:car` module.
- **Development Note**: During the recent build system stabilization, some screens were temporarily moved to ensure core compilation. Ensure all new screens inherit from `androidx.car.app.Screen`.

## UI Components
- **Gauge Grid**: Renders real-time OBD2 data using the Car App library templates.
- **Connection Monitor**: Displays the status of the OBD2 bridge and gamepad connectivity.
