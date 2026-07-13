# BMW E60 Coder Pro v1.0.0

## Release Date
2026-07-14

## What's Included

### Web App
- Full React 18 + TypeScript + Vite build
- 7 screens: Home, Gauges, AI Tuning, AI Analysis, Controller Drive, Data Logs, Setup
- 4 engine support: N54, N52, M54, M57
- 9 map types: Stock, Stage 1-3, Stage 2+, Custom, Economy, Valet, Anti-Theft
- 18 injector database with sizing calculator
- Canvas-rendered circular gauges at 60fps (3 layouts)
- AI tuning engine with real-time analysis
- 5-step DME flash wizard (Quick/Full/Live)
- Xbox controller drive mode with safety dialog
- VO editor: 30+ BMW options including AFS (Active Front Steering)
- OBD2 K+DCAN cable connection with 9 ECU auto-scan
- Live data simulation and logging

### Android Project
- Capacitor-based Android app
- Native USB K+DCAN cable detection (FTDI, CH340, CP2102)
- Xbox gamepad native bridge (Java)
- Full USB device filters for OBD2 adapters
- Optimized for Android Automotive OS headunits

## Assets

| File | Description |
|------|-------------|
| `dist/` | Web build output (deploy to any static host) |
| `android/` | Full Android Studio project |
| `workflows/build.yml` | GitHub Actions CI workflow |

## Quick Start

```bash
# Install dependencies
npm install

# Build web app
npm run build

# Build Android APK
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

## Enable Auto-Builds (30 seconds)

1. Go to **Actions** tab in your repo
2. Click **New workflow** > **set up a workflow yourself**
3. Copy the content from `workflows/build.yml`
4. Paste into `.github/workflows/build.yml`
5. Commit — done! Auto-builds on every push, auto-releases on `v*` tags

## Download

Built release: `BMW-E60-Coder-Pro-v1.0.0-web.zip` (135KB)

Build from source: `git clone https://github.com/windsorroyalapps/bmw-e60-coder-pro.git`

## Screenshots

| Home | Gauges | AI Tuning |
|------|--------|-----------|
| Vehicle profile, OBD2 status, ECU grid | 60fps Canvas gauges, 3 layouts | Map selection, injector calc, tables |

| Controller Drive | VO Editor | Data Logs |
|------------------|-----------|-----------|
| Xbox gamepad control, safety dialog | AFS (2VB) + 30+ options | Session recording, knock detection |

## Next Steps

- Connect K+DCAN cable and flash your first map
- Pair Xbox controller via USB for drive mode
- Enable AFS through VO editor
- Log a pull and review AI recommendations

---
Built with React 18 + TypeScript + Vite + Tailwind CSS + Zustand
