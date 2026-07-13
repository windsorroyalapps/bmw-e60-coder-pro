# BMW E60 Coder Pro

Complete BMW E60 tuning, diagnostics, and Xbox controller drive platform for Android Automotive OS headunits.

## Features

- **7-Screen Interface**: Home, Gauges, AI Tuning, AI Analysis, DME Flash, Controller Drive, Setup
- **4 Engines**: N54 (Twin-Turbo), N52 (NA), M54 (NA), M57 (Turbo Diesel)
- **9 Map Types**: Stock through Stage 3, plus Economy, Valet, Custom, Anti-Theft
- **18 Injectors**: Bosch, EV14, ID, Siemens Deka with sizing calculator
- **Xbox Controller Drive**: Full vehicle control via gamepad through AA USB port
- **VO Editor**: Enable AFS (2VB) and 30+ factory options
- **AI Analysis**: Real-time knock, AFR, boost, IAT monitoring with auto-tune
- **DME Flash**: Quick/Full/Live flash with 7-step safety checks

## Screens

| Screen | Description |
|--------|-------------|
| **Home** | Vehicle profile, OBD2 status, ECU grid, live data cards |
| **Gauges** | Canvas-rendered circular gauges at 60fps, 3 switchable layouts |
| **AI Tuning** | Map selection, injector calculator, timing/boost/throttle tables |
| **AI Analysis** | Real-time diagnostics with severity classification |
| **Controller Drive** | Xbox gamepad vehicle control + VO editor for AFS |
| **Data Logs** | Session recording, knock detection, data browser |
| **Setup** | Engine/transmission selection, modification tracking |

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Zustand (state management)
- Canvas API (gauge rendering)
- Capacitor (Android bridge)

## Build

```bash
npm install
npm run build    # Output: dist/
```

## Android Build

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

## GitHub Actions Setup

1. Go to **Actions** tab in your repo
2. Click **New workflow** > **set up a workflow yourself**
3. Copy the content from `workflows/build.yml` in this repo
4. Paste it into `.github/workflows/build.yml`
5. Commit — the workflow will auto-build on every push and create releases on tags

## Release

Download the latest release from the [Releases](../../releases) page.

## License

MIT
