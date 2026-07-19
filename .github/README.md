# GitHub Workflows & CI/CD

This directory contains the automation configuration for the BMW E60 Coder Pro project.

## CI/CD Pipeline (`.github/workflows/build.yml`)
The project uses GitHub Actions to automate the build process:
1. **Frontend Build**: Installs dependencies and runs `vite build`.
2. **Android Sync**: Uses Capacitor CLI to sync the web assets to the Android project.
3. **Gradle Build**: Executes `./gradlew assembleDebug` using **Java 17**.
4. **Artifacts**: Uploads the generated `app-debug.apk` to the workflow run.

## Repository Configuration
- **Branch Protection**: `main` is the primary branch.
- **Releases**: Tagged commits automatically trigger a release build.
