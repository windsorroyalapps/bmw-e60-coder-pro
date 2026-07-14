# BMW E60 Coder Pro - Android Auto Module

This is a **separate Gradle module** (`:car`) that isolates the `androidx.car.app:app` dependency for Android Auto support.

## Why Separate Module?

The `androidx.car.app:app` dependency has caused **silent Gradle build failures** in the past - the build would simply stop without any visible error. By isolating it in a separate module:

- The **main APK build** works regardless of car module status
- The car module can be enabled/disabled independently
- Build debugging is much easier when issues are isolated

## Enabling Android Auto

1. Edit `android/settings.gradle` and uncomment the `:car` include lines:
   ```gradle
   include ':car'
   project(':car').projectDir = new File('./car')
   ```

2. Edit `android/app/build.gradle` and uncomment the car dependency:
   ```gradle
   implementation project(':car')
   ```

3. Sync Gradle and build:
   ```bash
   cd android && ./gradlew :car:build
   cd android && ./gradlew :app:assembleDebug
   ```

## Architecture

```
android/
├── app/                    # Main app (always builds)
│   └── build.gradle        # Conditionally depends on :car
├── car/                    # Android Auto module (optional)
│   ├── build.gradle        # Has androidx.car.app dependency
│   └── src/main/...
│       ├── AndroidManifest.xml
│       ├── BMWCoderProCarAppService.java
│       └── CarAppActivity.java
└── settings.gradle         # Conditionally includes :car
```

## Files

- `BMWCoderProCarAppService.java` - Main CarAppService hosting the dashboard screen
- `CarAppActivity.java` - Entry point for phone-based testing
- `AndroidManifest.xml` - Car app service and activity declarations

## Troubleshooting

If the car module build fails silently:
1. Re-comment the `:car` include in `settings.gradle`
2. Verify the base APK build works: `./gradlew :app:assembleDebug`
3. Check that Google Play Services is available on the target device
4. Verify `compileSdkVersion >= 35` and `minSdkVersion >= 23`
