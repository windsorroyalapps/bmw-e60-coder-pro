# BMW E60 Coder Pro

Complete BMW E60 tuning, diagnostics, and Xbox controller drive platform for Android Automotive OS headunits.

![Version](https://img.shields.io/badge/version-3.0--AAOS-blue)
![Platform](https://img.shields.io/badge/platform-Android%20Automotive-green)

## Features

- **7-Screen Interface**: Home, Gauges, AI Tuning, AI Analysis, DME Flash, Controller Drive, Setup
- **4 Engines**: N54 (Twin-Turbo), N52 (NA), M54 (NA), M57 (Turbo Diesel)
- **9 Map Types**: Stock through Stage 3, plus Economy, Valet, Custom, Anti-Theft
- **18 Injectors**: Bosch, EV14, ID, Siemens Deka with sizing calculator
- **Xbox Controller Drive**: Full vehicle control via gamepad through AA USB port
- **VO Editor**: Enable AFS (2VB) and 30+ factory options
- **AI Analysis**: Real-time knock, AFR, boost, IAT monitoring with auto-tune
- **DME Flash**: Quick/Full/Live flash with 7-step safety checks
- **Data Logging**: Session-based recording with export

## Controller Drive

| Input | Function |
|-------|----------|
| Left Stick | Steering (up to 540deg via AFS) |
| RT | Throttle |
| LT | Brake |
| Start | Enable drive |
| Back | Disable drive |
| Xbox Button | Emergency stop |
| X | Toggle headlights |
| Y | Horn |
| LB/RB | Left/Right blinkers |
| D-Pad Up/Down | Sport/Eco mode |

## Tech Stack

React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Zustand + Canvas gauges

## Install on Headunit

```bash
adb install BMW-E60-Coder-Pro-AAOS.apk
```

Or sideload via USB stick.

## License

MIT - Use at your own risk.
