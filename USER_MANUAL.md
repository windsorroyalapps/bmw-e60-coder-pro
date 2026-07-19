# BMW E60 Coder Pro - User Manual

Welcome to the comprehensive guide for the **BMW E60 Coder Pro**. This tool is designed for BMW enthusiasts to perform diagnostics, live tuning, and even remote vehicle control via Android Auto and mobile interfaces.

---

## ⚠️ Safety Disclaimer
**Tuning and vehicle modification carry inherent risks.**
- Never use the "Controller Drive" feature on public roads.
- Ensure a battery tender is connected during DME Flashing.
- BMW E60 Coder Pro is not responsible for any mechanical failures or legal issues arising from the use of this software.

---

## 1. Hardware Requirements
To use all features, you will need:
- **OBD2 Cable**: A high-quality K+DCAN USB cable (preferably with a Green PCB).
- **Adapter**: USB-C to USB-A OTG adapter for your Android device.
- **Xbox Controller**: Wired or Bluetooth Xbox controller (for the Controller Drive feature).
- **Vehicle**: BMW E60/E61/E63/E64 (2003–2010).

---

## 2. Getting Started
1. **Connect the Cable**: Plug the K+DCAN cable into the vehicle's OBD2 port and your phone.
2. **Ignition ON**: Turn the ignition to Position 2 (Engine OFF) or start the engine for live data.
3. **Launch the App**: Open BMW E60 Coder Pro. Grant USB permissions when prompted.
4. **Select Engine**: Go to **Setup** and select your engine type (N54, N52, M54, or M57).

---

## 3. Android Auto Interface
When connected to a compatible head unit, the app provides a specialized driver-centric interface.

### **Dashboard (Immersive Gauges)**
- View real-time Boost, Oil Temp, AFR, and Ignition Timing in a high-visibility layout.
- Designed to run in the background like Google Maps.

### **Live Tuning**
Adjust vehicle parameters on the fly:
- **Max Cooling**: Forces the electric water pump to 100% duty cycle (ideal for track use).
- **Burble Intensity**: Choose between OEM, Soft, GTS Style, or Aggressive pops.
- **Launch Control**: Set your desired stationary RPM (3000–4500 RPM).
- **M-Track Mode**: Adjusts DSC intervention for more spirited driving without fully disabling traction control.
- **Exhaust Flap**: Manually open or close the vacuum-actuated exhaust valve.

### **DTC Reader**
- Scan all modules for fault codes.
- Tap **Clear All** to reset the DME and other module memories.

---

## 4. Mobile App Features

### **AI Tuning & DME Flash**
- **Map Selection**: Choose from Stage 0 (Stock) to Stage 3 performance maps.
- **Injector Coding**: Set flow rates for Bosch, EV14, or Siemens Deka injectors.
- **Flashing**: Use "Quick Flash" for map changes (2 mins) or "Full Flash" for complete ROM updates (12 mins).

### **Controller Drive**
- Connect an Xbox Controller to your phone or the AA USB port.
- **Controls**:
    - **Left Trigger/Stick**: Steering.
    - **Right Trigger**: Throttle.
    - **Bumpers**: Gear shifts (EGS).
    - **A/B/X/Y Buttons**: Mapped to VO (Vehicle Order) shortcuts like AFS Toggle.

### **AI Analysis**
- Monitor engine health in real-time.
- The AI detects knock patterns and automatically suggests timing retard or boost adjustments to prevent engine damage.

### **NFC Fuel Payment**
- **Setup**: Add your card details in the Secure Token Vault.
- **Usage**: Hold the back of your phone to any contactless fuel pump to pay. The app emulates a physical card using HCE (Host Card Emulation).

---

## 5. Multi-Language Support
The app automatically detects your system language. Supported languages include:
- English, German, Russian, Polish, Chinese, French, Spanish, Italian, Portuguese, Dutch, and Arabic.

---

## 6. Troubleshooting
- **No Connection**: Ensure the K+DCAN cable switch is in the correct position (for E60, usually the right position).
- **USB Not Recognized**: Unplug and replug the OTG adapter. Ensure "USB Debugging" is disabled in Android Developer Options.
- **Laggy Gauges**: Close background apps to free up CPU for the 60fps Canvas renderer.

---

For technical support or to contribute, visit the [GitHub Repository](https://github.com/windsorroyalapps/bmw-e60-coder-pro).
