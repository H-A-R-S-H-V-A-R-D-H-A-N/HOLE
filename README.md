<div align="center">
  
<table>
  <tr>
    <td align="center" width="50%">
      <h2>Support HOLE Development</h2>
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

HOLE combines dozens of separate hacking utilities into a single, cohesive ecosystem. Here is every tool and engine included out of the box:

### Core Workstation Features
* **Dashboard:** The central control center providing a high-level view of your workstation, recent files, and active proxy status.
* **Tor Engine and Ghost Mode:** A native Tor daemon controller embedded directly into the workstation. Start, stop, and manage Tor circuits without opening a terminal. The System-Wide Ghost Mode hijacks your OS proxy settings to force ALL system traffic (browsers, terminals, background apps) through the active Tor connection, preventing IP leaks entirely.
* **Integrated Terminal:** A native xterm.js terminal embedded in the UI. Run any shell command without tabbing out. Supports Bash, Zsh, Fish, and PowerShell with full ANSI color rendering. Easily route your terminal environment through the Tor proxy.
* **Code Studio PRO:** A full IDE with Monaco Editor (the same engine behind VS Code) built directly into the workstation. Includes 25+ language modes with full syntax highlighting.

### Reconnaissance & Scanning Engines
* **Target Command & Recon Engine:** The central scanning hub. Perform deep DNS profiling, Subdomain enumeration, Port scanning, SSL certificate extraction, and WHOIS lookups.
* **Wildcard Scanner:** A batch scanning engine capable of executing multiple scanning modules (WAF detection, JS Spidering, Bucket scanning) concurrently across wildcard domains and tracking the real-time status of each.
* **WAF Detector:** Fingerprint over 30+ WAF providers and run automated bypass tests to see which payload mutations bypass the firewall.
* **Cloud Bucket Finder:** Discover and validate misconfigured cloud storage buckets (AWS S3, Google Cloud, Azure).
* **JS Spider:** Automatically extract hidden JavaScript files, API endpoints, and configuration secrets from target domains.
* **Exposure Hunter:** Scan target domains specifically for leaked source code files, `.env` files, `.git` exposures, and database dumps.
* **Favicon Hunter:** Generate MurmurHash3 hashes from favicons to instantly identify underlying technologies and hidden infrastructure.
* **Email Header Analyzer:** Trace email routing infrastructure, extract sender IPs, and verify SPF, DKIM, and DMARC configurations.
* **IP Tracker:** Trace, map, and analyze any IP address globally to reveal ASN, geolocation, and ISP data instantly.

### Exploitation & Payload Crafting
* **Reverse Shell Hub:** Generate reverse shell payloads in 20+ formats (Bash, Python, Perl, PowerShell, etc.) and catch incoming connections with the built-in raw TCP listener.
* **JWT Forger:** Decode, modify, re-sign, and brute-force JSON Web Tokens entirely offline. Supports custom secret signing and the `alg: none` exploit technique.
* **CORS Exploit Generator:** Paste raw HTTP response headers to instantly generate a weaponized `index.html` exploit payload, ready for proof-of-concept submissions.
* **WAF Evasion Engine:** Chain together over 50+ obfuscation mutations (including HTML entities, Case mutations, and URL encodings) to bypass strict Web Application Firewalls.
* **Secret Sniper:** Paste massive, chaotic, minified JavaScript bundles and instantly extract every API key, token, endpoint, and secret. Uses a zero-lag regex de-obfuscator that detects AWS keys, Stripe tokens, JWTs, and dozens more.
* **Payload Library:** A massive, categorized, offline library of ready-to-use payloads for XSS, SQLi, SSRF, LFI, and RCE vulnerabilities.
* **Technique Vault:** A comprehensive, offline repository of advanced exploitation techniques and methodologies, ensuring you never forget a bypass.
* **Wordlist Generator:** Scrape targets to generate highly tailored wordlists for directory brute-forcing and parameter fuzzing.

### Analysis & Cryptography
* **String Analyzer & Auto-Detect:** Automatically analyze obfuscated strings and identify the hash type or encoding format.
* **Encoder & Decoder:** Manually encode or decode strings using built-in Base64, Hex, HTML, and URL operations.
* **Crypto Engine:** Encrypt and decrypt data using military-grade algorithms entirely offline.
* **Steganography Engine:** Hide secret messages and payloads directly inside image files using Least Significant Bit (LSB) pixel manipulation.
* **CVSS Calculator:** Interactive Common Vulnerability Scoring System (CVSS v3) calculator to properly score your bug bounty submissions.
* **Diff Scope:** Character-level visual comparison tool specifically designed for spotting differences between server responses or configuration changes.

### Note Taking & Workflow Management
* **Hacker Journal:** A calendar-based daily logging system. Pick any date, type what you tested, and it saves instantly as a plain file on your disk.
* **Universal Note Editor:** A powerful, standalone editor separate from the journal. It doesn't just support Markdown—write code in HTML, CSS, JS, Python, JSON, or any other extension, and when you open the file, HOLE will instantly render it with full syntax highlighting or as a live preview directly in the editor in full detail! Includes built-in OWASP templates.
* **Visual Workflow Builder:** An n8n-style drag-and-drop node editor for mapping out attack surfaces visually. Includes GraphQL schema introspection to auto-generate a full node map of all queries and mutations.
* **Kanban Board & Methodology Tracker:** Structured checklists and drag-and-drop progress tracking to enforce strict, repeatable bug bounty methodologies.
* **Bounty Tracker:** A financial tracking dashboard to monitor submitted bugs, pending payouts, and overall statistics.
* **Parallel Reality:** A context vault designed for managing multiple testing scenarios and privilege escalation contexts side-by-side.
* **Unknown Space:** A specialized scratchpad for isolating anomalies, tracking hypotheses, and documenting unverified behaviors.
* **Screenshot Annotator:** Capture, crop, and annotate screenshots with highlights and text boxes specifically for vulnerability reports.
* **Time Tracker:** A focused session timer designed to track exactly how many hours you spend hacking each specific target.

### Anonymous Utilities
* **Temp Mail:** Generate disposable email addresses natively through a multi-provider fallback architecture to seamlessly bypass strict registration blocks without revealing internal mechanisms.
* **Identity Generator:** Create tracking identities using plus-addressing (e.g., `email+admin@gmail.com`) to manage multiple user privilege levels across web applications.
* **Bounty Email Hub:** A multi-account aware email command center. Instantly open filtered inbox searches for specific bug bounty platforms (HackerOne, Bugcrowd, Intigriti, etc.) in your default browser with smart Gmail `authuser` routing for multi-account sessions.

### Community & Updates
* **Live Community Counter:** See how many hackers worldwide are using HOLE in real-time via an anonymous, zero-telemetry counter displayed in the top-right corner.
* **Auto-Update Notifications:** HOLE silently checks for new updates via the public GitHub API. When a new commit is pushed, a toast notification appears with the update details and a one-click link to pull the latest version.
* **Bounty Email Hub:** A multi-account aware email command center. Instantly open filtered inbox searches for specific bug bounty platforms (HackerOne, Bugcrowd, Intigriti, etc.) in your default browser with smart Gmail `authuser` routing for multi-account sessions.

### Community & Updates
* **Live Community Counter:** See how many hackers worldwide are using HOLE in real-time via an anonymous, zero-telemetry counter displayed in the top-right corner.
* **Auto-Update Notifications:** HOLE silently checks for new updates via the public GitHub API. When a new commit is pushed, a toast notification appears with the update details and a one-click link to pull the latest version.
* **Bounty Email Hub:** A multi-account aware email command center. Instantly open filtered inbox searches for specific bug bounty platforms (HackerOne, Bugcrowd, Intigriti, etc.) in your default browser with smart Gmail `authuser` routing for multi-account sessions.

### Community & Updates
* **Live Community Counter:** See how many hackers worldwide are using HOLE in real-time via an anonymous, zero-telemetry counter displayed in the top-right corner.
* **Auto-Update Notifications:** HOLE silently checks for new updates via the public GitHub API. When a new commit is pushed, a toast notification appears with the update details and a one-click link to pull the latest version.

<br/>

---

<br/>

## Installation & Updates

HOLE runs natively from source. No pre-built binaries, no hidden code. You can read every single line before you execute it.

### Prerequisites

- **Node.js** v20 or higher (v22 LTS recommended)
- **Git**
- **Build tools** for native modules (`build-essential` on Debian/Ubuntu, Xcode CLT on macOS)

### Initial Installation

#### Linux / macOS
```bash
git clone https://github.com/H-A-R-S-H-V-A-R-D-H-A-N/HOLE.git
cd HOLE
bash install.sh
npm run electron:dev
```

#### Windows
```cmd
git clone https://github.com/H-A-R-S-H-V-A-R-D-H-A-N/HOLE.git
cd HOLE
install.bat
npm run electron:dev
```

### Updating HOLE

To get the latest tools and features, simply pull the latest changes from the repository and run the install script again to update any dependencies.

#### Linux / macOS
```bash
cd HOLE
git pull origin main
bash install.sh
npm run electron:dev
```

#### Windows
```cmd
cd HOLE
git pull origin main
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

## Showcase Gallery

<div align="center">
  <img src="screenshots/dashboard.png" width="90%" />
  <br/><br/>
  <img src="screenshots/tor-engine.png" width="90%" />
  <br/><br/>
  <img src="screenshots/code-studio.png" width="90%" />
  <br/><br/>
  <img src="screenshots/workflow.png" width="90%" />
  <br/><br/>
  <img src="screenshots/hacker-journal.png" width="90%" />
  <br/><br/>
  <img src="screenshots/terminal.png" width="90%" />
  <br/><br/>
  <img src="screenshots/pro_features/tool_js_spider.png" width="90%" />
  <br/><br/>
  <img src="screenshots/pro_features/tool_bucket_finder.png" width="90%" />
  <br/><br/>
  <img src="screenshots/pro_features/tool_waf_detector.png" width="90%" />
  <br/><br/>
  <img src="screenshots/pro_features/pro_4.png" width="90%" />
  <br/><br/>
  <img src="screenshots/rev-shell-payloads.png" width="90%" />
  <br/><br/>
  <img src="screenshots/rev-shell-listener.png" width="90%" />
  <br/><br/>
  <img src="screenshots/jwt-forger.png" width="90%" />
  <br/><br/>
  <img src="screenshots/auto-detect.png" width="90%" />
  <br/><br/>
  <img src="screenshots/encoder-decoder.png" width="90%" />
  <br/><br/>
  <img src="screenshots/cors-exploit.png" width="90%" />
  <br/><br/>
  <img src="screenshots/secret-sniper.png" width="90%" />
  <br/><br/>
  <img src="screenshots/payloads.png" width="90%" />
  <br/><br/>
  <img src="screenshots/crypto-engine.png" width="90%" />
  <br/><br/>
  <img src="screenshots/stego-engine.png" width="90%" />
  <br/><br/>
  <img src="screenshots/diff-scope.png" width="90%" />
  <br/><br/>
  <img src="screenshots/time-tracker.png" width="90%" />
  <br/><br/>
  <img src="screenshots/pro_features/pro_1.png" width="90%" />
</div>

<br/>

---

<br/>

## Disclaimer

HOLE is built for authorized security testing, bug bounty programs (HackerOne, Bugcrowd, Intigriti), and educational purposes. The developers assume no liability for misuse. Always obtain explicit written authorization before testing systems you do not own.

<br/>

<div align="center">
  <sub>Built by hunters, for hunters.</sub>
</div>
