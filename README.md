<div align="center">
  <img src="https://raw.githubusercontent.com/H-A-R-S-H-V-A-R-D-H-A-N/HOLE/main/public/hole-icon.png" width="150" alt="HOLE Logo">
  <h1>H O L E</h1>
  <p><b>The Ultimate Anonymous Bug Bounty Workstation</b></p>

  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Status-Active-purple?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Data-Local_Only-red?style=for-the-badge" />
</div>

<br />

**HOLE** is a fully offline, native desktop workstation built exclusively for elite bug bounty hunters and penetration testers. Unlike scattered CLI scripts or web-based SaaS tools that track your data, HOLE combines **39 professional security tools** into a single, unified, dark-themed dashboard. 

Every single operation happens **100% locally** on your machine. Zero telemetry. Zero cloud tracking. No data leaves your computer.

---

## Features and Tool Arsenal

HOLE is packed with an extensive suite of natively integrated hacking modules. 

### Tor Engine and Privacy (Ghost Mode)
A built-in native Tor proxy controller that secures your entire workflow. 

![Tor Engine Screenshot](screenshots/tor-engine.png)

* **System-Wide Ghost Mode**: Hijack your OS routing to force all system traffic (browsers, external terminals, background apps) through the Tor network.
* **Magic IP Rotator**: Automatically rotates your Exit Node IP every 5, 10, or 30 minutes.

### Dashboard & Analytics
Get a high-level view of your bounties, reports, and knowledge base.

![Dashboard Screenshot](screenshots/dashboard.png)

### Recon and Methodology Tracker
* **Hacker Journal**: A markdown-based daily journaling system.
![Hacker Journal Screenshot](screenshots/hacker-journal.png)

* **Workflow (Recon Database)**: An n8n-style node-based visual editor for mapping out attack surfaces.
![Workflow Screenshot](screenshots/workflow.png)

* **Time Tracker**: Keep track of the exact time spent on specific HackerOne or Bugcrowd targets.
![Time Tracker Screenshot](screenshots/time-tracker.png)

### Code Studio PRO & Diff Scope
* **Code Studio**: An elite Integrated Development Environment for Vulnerability Research. Create and save files directly to any folder on your PC.
![Code Studio Screenshot](screenshots/code-studio.png)

* **Diff Scope**: Character-level analysis to easily spot differences in server responses or payloads.
![Diff Scope Screenshot](screenshots/diff-scope.png)

### WAF Evasion, Payloads & Networking
* **Terminal**: A native, highly-customizable shell environment built directly into the UI.
![Terminal Screenshot](screenshots/terminal.png)

* **Reverse Shell Hub**: Generate payloads in 20+ formats and catch connections locally using the raw TCP listener.
![Rev Shell Payloads](screenshots/rev-shell-payloads.png)
![Rev Shell Listener](screenshots/rev-shell-listener.png)

* **CORS Exploit Generator**: Analyze response headers and craft weaponized HTML payloads.
![CORS Exploit Screenshot](screenshots/cors-exploit.png)

* **Secret Sniper**: Zero-lag regex de-obfuscator for Minified JavaScript to hunt for API keys.
![Secret Sniper Screenshot](screenshots/secret-sniper.png)

### Crypto, Stego and JWT Forger
* **JWT Forger**: Decode JSON Web Tokens, modify headers/claims on the fly, and re-sign them.
![JWT Forger Screenshot](screenshots/jwt-forger.png)

* **Crypto & Stego Engine**: Perform complex AES, DES, ChaCha20 encryption/decryption entirely offline, and hide payloads in images using LSB Steganography.
![Cryptography Screenshot](screenshots/crypto-engine.png)
![Steganography Screenshot](screenshots/stego-engine.png)

---

## Installation

HOLE is designed to run natively via source to ensure complete transparency of the code you are executing. 

### Prerequisites
* **Node.js** v20+ (v22 LTS highly recommended)
* **Git**

### Linux (Ubuntu / Pop!_OS / Kali / Debian)
Our installer will automatically install Tor and configure the environment for you.
```bash
# 1. Download the repository
git clone https://github.com/H-A-R-S-H-V-A-R-D-H-A-N/HOLE.git
cd HOLE

# 2. Run the automated installer
bash install.sh

# 3. Launch the Workstation
npm run electron:dev
```

### macOS
```bash
# 1. Download the repository
git clone https://github.com/H-A-R-S-H-V-A-R-D-H-A-N/HOLE.git
cd HOLE

# 2. Run the automated installer
bash install.sh

# 3. Launch the Workstation
npm run electron:dev
```

### Windows
```cmd
# 1. Download the repository
git clone https://github.com/H-A-R-S-H-V-A-R-D-H-A-N/HOLE.git
cd HOLE

# 2. Run the automated installer
install.bat

# 3. Launch the Workstation
npm run electron:dev
```

---

## Updating HOLE

Since HOLE runs natively from the source repository, updating is incredibly simple. Whenever a new feature drops, just pull the latest changes and restart:

```bash
cd HOLE
git pull origin main
npm install
npm run electron:dev
```

---

## Security and Privacy Architecture

HOLE was built with absolute paranoia in mind.
* **Zero Analytics**: There are no tracking scripts, no crash reporters, and no analytics engines. 
* **Offline First**: The application makes **zero network requests** unless explicitly routed through the Tor Engine tool.
* **Data Sovereignty**: Your findings, API keys, and journals are saved locally in the `HOLE_Workspace` folder on your hard drive. There is no database.

---

## Keyboard Shortcuts
Master the workstation without touching your mouse:
* `Ctrl + N` : Create a new recon note
* `Ctrl + S` : Save current file/payload
* `Ctrl + Shift + P` : Open global command palette
* `Ctrl + \` : Toggle integrated terminal

---

## Disclaimer

HOLE is designed for authorized security testing, bug bounty hunting on platforms like HackerOne/Bugcrowd, and educational purposes. The developers are not responsible for any misuse or illegal activity. Always obtain proper authorization before testing any system or endpoint you do not own.

<div align="center">
  <br/>
  <i>Built by hackers, for hackers.</i>
  <br/>
</div>
