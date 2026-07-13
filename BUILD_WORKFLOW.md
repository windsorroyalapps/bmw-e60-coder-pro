# GitHub Actions Build Workflow

To enable automatic builds and releases, add this workflow to `.github/workflows/build.yml`:

```yaml
name: Build & Release

on:
  push:
    branches: [main]
    tags: ['v*']
  workflow_dispatch:

jobs:
  build-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: web-dist
          path: dist/
      - if: startsWith(github.ref, 'refs/tags/v')
        run: cd dist && zip -r ../BMW-E60-Coder-Pro-web.zip .
      - if: startsWith(github.ref, 'refs/tags/v')
        uses: softprops/action-gh-release@v1
        with:
          files: BMW-E60-Coder-Pro-web.zip
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: npx cap sync android
      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
      - uses: android-actions/setup-android@v3
      - run: chmod +x android/gradlew
      - run: cd android && ./gradlew assembleDebug
      - uses: actions/upload-artifact@v4
        with:
          name: android-apk
          path: android/app/build/outputs/apk/debug/app-debug.apk
      - if: startsWith(github.ref, 'refs/tags/v')
        run: |
          mkdir -p release
          cp android/app/build/outputs/apk/debug/app-debug.apk release/BMW-E60-Coder-Pro.apk
      - if: startsWith(github.ref, 'refs/tags/v')
        uses: softprops/action-gh-release@v1
        with:
          files: release/BMW-E60-Coder-Pro.apk
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Manual Release Steps

1. Go to **Releases** > **Create a new release**
2. Create a new tag (e.g., `v1.0.0`)
3. Title: `BMW E60 Coder Pro v1.0.0`
4. Attach the built `BMW-E60-Coder-Pro-web.zip` file
5. Publish release
