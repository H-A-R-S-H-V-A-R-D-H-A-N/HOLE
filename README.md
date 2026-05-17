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

## 🔥 Features & Tool Arsenal

HOLE is packed with an extensive suite of natively integrated hacking modules. 

### 🛡️ Tor Engine & Privacy (Ghost Mode)
A built-in native Tor proxy controller that secures your entire workflow. 
- **System-Wide Ghost Mode**: Hijack your OS routing to force all system traffic (browsers, external terminals, background apps) through the Tor network.
- **Magic IP Rotator**: Automatically rotates your Exit Node IP every 5, 10, or 30 minutes.
- **Kill-Switch**: Drops all connections instantly if the Tor daemon fails, preventing IP leaks.
- **Censorship Bypass**: Native support for **obfs4** and **snowflake** bridges to bypass ISP firewalls.
- **Country Picker**: Select specific exit node countries (US, UK, DE, RU).

### 🕸️ n8n-Style Visual Workflows (GraphQL Viz & Parallel Reality)
Forget reading massive JSON blobs. HOLE includes an **n8n-style node-based visual editor** for mapping out attack surfaces.
- **Drag-and-Drop Nodes**: Connect inputs, endpoints, and payloads visually.
- **GraphQL Introspection**: Paste a GraphQL schema and instantly generate a beautifully mapped, interactive node diagram of all queries and mutations.

### 🥷 WAF Evasion & Payload Library
- **HTTP Request Smuggling**: Pre-calculated chunks and CL.TE / TE.CL generators.
- **String Analyzer & Obfuscator**: Convert standard payloads into heavily encoded variants (URL, Hex, Base64, Unicode) to bypass Web Application Firewalls.
- **Payload Library**: A massive offline database of payloads for XSS, SQLi, SSRF, LFI, and RCE.

### 🔑 Crypto, Stego & JWT Forger
- **JWT Forger**: Decode JSON Web Tokens, modify headers/claims on the fly, and re-sign them. Includes a built-in brute-forcer to crack weak JWT secrets (`HMAC` / `RSA`).
- **Crypto Toolkit**: Perform complex AES, DES, ChaCha20 encryption/decryption entirely offline.
- **Steganography**: Hide and extract encrypted payloads within standard image files.

### 📊 Recon & Methodology Tracker
- **Bounty Tracker**: A fully-fledged Kanban board specifically designed to track targets, bounties, and vulnerability statuses.
- **Methodology Checklists**: Built-in OWASP Top 10 checklists to ensure you never miss an endpoint during manual testing.
- **Hacker Journal**: A markdown-based daily journaling system. All notes are saved as plain `.md` files in your local workspace.

### 💻 Integrated Native Terminal
- **xterm.js Integration**: A native, highly-customizable shell environment built directly into the UI. No need to tab out to your OS terminal.

---

## ⚙️ Installation

HOLE is designed to run natively via source to ensure complete transparency of the code you are executing. 

### Prerequisites
- **Node.js** v20+ (v22 LTS highly recommended)
- **Git**

### 🐧 Linux (Ubuntu / Pop!_OS / Kali / Debian)
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

### 🍏 macOS
```bash
# 1. Download the repository
git clone https://github.com/H-A-R-S-H-V-A-R-D-H-A-N/HOLE.git
cd HOLE

# 2. Run the automated installer
bash install.sh

# 3. Launch the Workstation
npm run electron:dev
```

### 🪟 Windows
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

## 🔄 Updating HOLE

Since HOLE runs natively from the source repository, updating is incredibly simple. Whenever a new feature drops, just pull the latest changes and restart:

```bash
cd HOLE
git pull origin main
npm install
npm run electron:dev
```

---

## 🔒 Security & Privacy Architecture

HOLE was built with absolute paranoia in mind.
- **Zero Analytics**: There are no tracking scripts, no crash reporters, and no analytics engines. 
- **Offline First**: The application makes **zero network requests** unless explicitly routed through the Tor Engine tool.
- **Data Sovereignty**: Your findings, API keys, and journals are saved locally in the `HOLE_Workspace` folder on your hard drive. There is no database.

---

## ⌨️ Keyboard Shortcuts
Master the workstation without touching your mouse:
- `Ctrl + N` : Create a new recon note
- `Ctrl + S` : Save current file/payload
- `Ctrl + Shift + P` : Open global command palette
- `Ctrl + \` : Toggle integrated terminal

---

## ⚖️ Disclaimer

HOLE is designed for authorized security testing, bug bounty hunting on platforms like HackerOne/Bugcrowd, and educational purposes. The developers are not responsible for any misuse or illegal activity. Always obtain proper authorization before testing any system or endpoint you do not own.

<div align="center">
  <br/>
  <i>Built by hackers, for hackers.</i>
  <br/>
</div>
