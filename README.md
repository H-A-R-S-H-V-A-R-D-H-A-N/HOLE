<div align="center">
  
<table>
  <tr>
    <td align="center" width="50%">
      <h2>🤝 Support HOLE Development</h2>
      <p>If you find this project useful, please consider supporting it!</p>
      <br/>
      <a href="https://www.paypal.com/paypalme/harshvardhansingh611">
        <img src="https://img.shields.io/badge/Donate_via_PayPal-00457C?style=for-the-badge&logo=paypal&logoColor=white" alt="PayPal">
      </a>
      <br/><br/>
      <a href="https://www.instagram.com/__h_a_r_s_h_v_a_r_d_h_a_n_">
        <img src="https://img.shields.io/badge/Follow_on_Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white" alt="Instagram">
      </a>
    </td>
    <td align="center" width="50%">
      <b>Scan to Donate (UPI)</b><br/><br/>
      <img src="public/upi-qr.jpg" width="220" alt="UPI QR Code">
    </td>
  </tr>
</table>
  <br/>
  <img src="public/hole-icon.png" width="120" alt="HOLE">
  <h1>H O L E</h1>
  <p><strong>The Anonymous Bug Bounty Workstation</strong></p>
  <p>A fully offline, native desktop arsenal built for elite penetration testers and bug bounty hunters.<br/>An ever-growing arsenal of integrated security tools. Zero telemetry. Complete local data sovereignty.</p>

  <br/>

  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-0D1117?style=for-the-badge&labelColor=161B22&color=7C3AED" />
  <img src="https://img.shields.io/badge/License-MIT-0D1117?style=for-the-badge&labelColor=161B22&color=10B981" />
  <img src="https://img.shields.io/badge/Network-100%25_Offline-0D1117?style=for-the-badge&labelColor=161B22&color=EF4444" />
  <img src="https://img.shields.io/badge/Tor-Ghost_Mode-0D1117?style=for-the-badge&labelColor=161B22&color=06B6D4" />

  <br/><br/>

  <img src="screenshots/dashboard.png" width="90%" alt="HOLE Dashboard" />
</div>

<br/>

---

<br/>

## Why HOLE Exists

Every serious hunter knows the pain. You have 15 terminal tabs open, five browser extensions fighting each other, scattered notes across three apps, and your recon data lives in random folders you will never find again.

HOLE kills that workflow chaos. It is a single native Electron application that replaces your entire fragmented toolkit with one unified dark-themed interface. Everything from subdomain mapping to JWT forgery to reverse shell generation happens inside one window, and nothing ever touches the internet unless you explicitly route it through the built-in Tor engine.

Your data stays on your hard drive. Period.

<br/>

---

<br/>

## Comprehensive Feature List

HOLE combines dozens of separate hacking utilities into a single, cohesive ecosystem.

### Tor Engine and Ghost Mode

A native Tor daemon controller embedded directly into the workstation. Start, stop, and manage Tor circuits without ever opening a terminal. Force your entire operating system through the Tor network with a single button.

<div align="center">
  <img src="screenshots/tor-engine.png" width="90%" alt="Tor Engine" />
</div>

**Benefits:**
- **System-Wide Ghost Mode** hijacks your OS proxy settings to force ALL system traffic (browsers, terminals, background apps) through the active Tor connection, preventing IP leaks entirely.
- Rotates exit node circuits on demand or on a timer (every 5, 10, or 30 minutes).
- Native support for `obfs4` and `snowflake` bridges to bypass ISP-level censorship.

<br/>

### Code Studio PRO

A full IDE with Monaco Editor (the same engine behind VS Code) built directly into the workstation. 

<div align="center">
  <img src="screenshots/code-studio.png" width="90%" alt="Code Studio PRO" />
</div>

**Benefits:**
- **Save ANY file type:** Fully supports writing, editing, and saving HTML, CSS, JS, Python, Go, Rust, and SQL directly to your local file system.
- **Instant HTML Rendering:** Write a malicious landing page or phishing template in HTML, and when you open the file, HOLE will render the link as a live HTML preview directly in the editor in full detail!
- 25+ language modes with full syntax highlighting.

<br/>

### Visual Workflow Builder (Recon Database)

An n8n-style drag-and-drop node editor for mapping out attack surfaces visually. 

<div align="center">
  <img src="screenshots/workflow.png" width="90%" alt="Workflow Builder" />
</div>

**Benefits:**
- Stop reading massive JSON blobs. Connect subdomains, endpoints, and services into interactive maps that actually make sense.
- GraphQL schema introspection: paste a schema and auto-generate a full node map of all queries and mutations.

<br/>

### Hacker Journal

A calendar-based daily logging system.

<div align="center">
  <img src="screenshots/hacker-journal.png" width="90%" alt="Hacker Journal" />
</div>

**Benefits:**
- Pick any date, type what you tested, and it saves instantly as a plain markdown file on your disk. No accounts, no sync, no nonsense.

<br/>

### Integrated Terminal

A native xterm.js terminal embedded in the UI. 

<div align="center">
  <img src="screenshots/terminal.png" width="90%" alt="Terminal" />
</div>

**Benefits:**
- Run any shell command without tabbing out. Supports Bash, Zsh, Fish, and PowerShell with full ANSI color rendering.
- Inject Tor proxy into the terminal environment with one checkbox.

<br/>

### Advanced Scanners & Engines

HOLE now includes all previously PRO-exclusive scanners, running entirely from your local machine.

<div align="center">
  <img src="screenshots/pro_features/tool_js_spider.png" width="90%" alt="JS Spider" />
  <br/><br/>
  <img src="screenshots/pro_features/tool_bucket_finder.png" width="90%" alt="Cloud Bucket Finder" />
  <br/><br/>
  <img src="screenshots/pro_features/tool_waf_detector.png" width="90%" alt="WAF Detector" />
</div>

**Included Engines:**
- **CVE Mapper:** Instantly map emerging CVEs directly to your defined attack surface.
- **Email Header Analyzer:** Trace email routes, extract sender IPs, and verify SPF/DKIM/DMARC.
- **Infrastructure Harvester:** Harvest emails, subdomains, URLs, social profiles.
- **Favicon Hunter:** Identify technologies and discover hidden infrastructure via favicon fingerprinting.
- **Exposure Hunter:** Scan target domains for leaked source code and database dumps.

<br/>

### Technique Vault

A comprehensive, offline library of advanced exploitation techniques and methodologies.

<div align="center">
  <img src="screenshots/pro_features/pro_4.png" width="90%" alt="Technique Vault" />
</div>

**Benefits:**
- Never forget a bypass again. Access categorized write-ups and bypass payloads for standard vulnerabilities entirely offline.

<br/>

### Reverse Shell Hub

Generate reverse shell payloads in 20+ formats and catch incoming connections with a built-in raw TCP listener. 

<div align="center">
  <img src="screenshots/rev-shell-payloads.png" width="90%" alt="Reverse Shell Payloads" />
  <br/><br/>
  <img src="screenshots/rev-shell-listener.png" width="90%" alt="Reverse Shell Listener" />
</div>

<br/>

### JWT Forger

Decode, modify, re-sign, and brute-force JSON Web Tokens entirely offline.

<div align="center">
  <img src="screenshots/jwt-forger.png" width="90%" alt="JWT Forger" />
</div>

**Benefits:**
- Modify claims and re-sign with a custom secret key, or execute the `alg: none` attack with one click.
- Built-in secret brute-forcer with a customizable wordlist.

<br/>

### Auto-Detect & Encoder

Instantly analyze obfuscated strings or manually encode/decode them using built-in hex, base64, HTML, and URL operations.

<div align="center">
  <img src="screenshots/auto-detect.png" width="90%" alt="Auto Detect" />
  <br/><br/>
  <img src="screenshots/encoder-decoder.png" width="90%" alt="Encoder / Decoder" />
</div>

<br/>

### CORS Exploit Generator

Paste raw HTTP response headers and instantly generate a weaponized `index.html` exploit payload ready for proof-of-concept submissions.

<div align="center">
  <img src="screenshots/cors-exploit.png" width="90%" alt="CORS Exploit Generator" />
</div>

<br/>

### Secret Sniper Engine

Paste massive, chaotic, minified JavaScript bundles and instantly extract every API key, token, endpoint, and secret hiding inside.

<div align="center">
  <img src="screenshots/secret-sniper.png" width="90%" alt="Secret Sniper" />
</div>

**Benefits:**
- Zero-lag regex de-obfuscator purpose-built for minified JavaScript.
- Detects AWS keys, Google API keys, Stripe tokens, JWTs, Bearer tokens, and dozens more.

<br/>

### Payload Library

A massive, categorized library of ready-to-use payloads for XSS, SQLi, SSRF, LFI, and RCE.

<div align="center">
  <img src="screenshots/payloads.png" width="90%" alt="Payload Library" />
</div>

<br/>

### Crypto and Stego Engine

A dual-mode cryptography and steganography workbench. Encrypt and decrypt data with military-grade algorithms, or hide secret messages inside images using LSB pixel manipulation.

<div align="center">
  <img src="screenshots/crypto-engine.png" width="90%" alt="Crypto Engine" />
  <br/><br/>
  <img src="screenshots/stego-engine.png" width="90%" alt="Steganography Engine" />
</div>

<br/>

### Diff Scope & Time Tracker

<div align="center">
  <img src="screenshots/diff-scope.png" width="90%" alt="Diff Scope" />
  <br/><br/>
  <img src="screenshots/time-tracker.png" width="90%" alt="Time Tracker" />
</div>

**Benefits:**
- **Diff Scope:** Character-level comparison tool for spotting differences between server responses or configuration changes.
- **Time Tracker:** A focused session timer for tracking exactly how many hours you spend on each bug bounty target.

<br/>

### IP Tracker

Trace, map, and analyze any IP address globally to reveal ASN, geolocation, and ISP data instantly.

<div align="center">
  <img src="screenshots/pro_features/pro_1.png" width="90%" alt="IP Tracker" />
</div>

<br/>

<br/>

---

<br/>

## Installation

HOLE runs natively from source. No pre-built binaries, no hidden code. You can read every single line before you execute it.

### Prerequisites

- **Node.js** v20 or higher (v22 LTS recommended)
- **Git**
- **Build tools** for native modules (`build-essential` on Debian/Ubuntu, Xcode CLT on macOS)

### Linux

```bash
git clone https://github.com/H-A-R-S-H-V-A-R-D-H-A-N/HOLE.git
cd HOLE
bash install.sh
npm run electron:dev
```

### macOS

```bash
git clone https://github.com/H-A-R-S-H-V-A-R-D-H-A-N/HOLE.git
cd HOLE
bash install.sh
npm run electron:dev
```

### Windows

```cmd
git clone https://github.com/H-A-R-S-H-V-A-R-D-H-A-N/HOLE.git
cd HOLE
install.bat
npm run electron:dev
```

<br/>

---

<br/>

## Security Architecture

| Principle | Implementation |
|---|---|
| **Zero Analytics** | No tracking scripts, no crash reporters, no telemetry of any kind |
| **Offline First** | The application makes zero network requests unless explicitly routed through the Tor engine |
| **Local Storage** | All data (notes, workflows, payloads, journals) is saved as plain files in your `HOLE_Workspace` directory |
| **No Database** | No SQLite, no MongoDB, no remote DB. Everything is flat files you can read, move, and delete |
| **Open Source** | Every line of code is visible in this repository |

<br/>

---

<br/>

## Disclaimer

HOLE is built for authorized security testing, bug bounty programs (HackerOne, Bugcrowd, Intigriti), and educational purposes. The developers assume no liability for misuse. Always obtain explicit written authorization before testing systems you do not own.

<br/>

<div align="center">
  <sub>Built by hunters, for hunters.</sub>
</div>
