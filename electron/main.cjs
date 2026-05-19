const { app, BrowserWindow, shell, dialog, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const net = require('net');
const http = require('http');
const os = require('os');
const chokidar = require('chokidar');

let mainWindow;
let torProcess = null;
let torControlPort = 9051;
let torControlPassword = 'kroma_tor_' + Date.now().toString(36);

const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'HOLE',
    icon: path.join(__dirname, '..', 'public', 'hole-icon.jpg'),
    backgroundColor: '#060A13',
    titleBarStyle: 'default',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const currentURL = mainWindow.webContents.getURL();
    if (url !== currentURL && (url.startsWith('http://') || url.startsWith('https://'))) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

let activeWatcher = null;

// ---- IPC Handlers ---- //

// Pick a folder (used on first launch to choose storage location)
ipcMain.handle('pick-folder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose where HOLE should store your files',
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: 'Select Folder',
    });

    if (result.canceled) {
      return { success: false, cancelled: true };
    }

    const chosenDir = result.filePaths[0];
    // Create a HOLE subfolder inside the chosen directory
    const kromaDir = path.join(chosenDir, 'HOLE');
    if (!fs.existsSync(kromaDir)) {
      fs.mkdirSync(kromaDir, { recursive: true });
    }
    
    // Create ALL section subdirectories
    const sectionDirs = ['Notes', 'Code', 'Journal', 'Workflow', 'Methodology', 'Payloads', 'ContextVault', 'UnknownSpace', 'TimeTracker', 'Kanban', 'BountyTracker'];
    sectionDirs.forEach(dir => {
      const dirPath = path.join(kromaDir, dir);
      if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    });

    return { success: true, path: kromaDir };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Ensure all section directories exist on startup
ipcMain.handle('ensure-dirs', async (event, kromaDir) => {
  try {
    const sectionDirs = ['Notes', 'Code', 'Journal', 'Workflow', 'Methodology', 'Payloads', 'ContextVault', 'UnknownSpace', 'TimeTracker', 'Kanban', 'BountyTracker', 'Screenshots', 'Videos'];
    sectionDirs.forEach(dir => {
      const dirPath = path.join(kromaDir, dir);
      if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    });

    // Start watching this directory
    if (activeWatcher) {
      activeWatcher.close();
    }
    
    activeWatcher = chokidar.watch(kromaDir, {
      ignored: /(^|[\/\\])\.\./, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
      depth: 2
    });

    activeWatcher.on('all', (event, pathStr) => {
      if (mainWindow && mainWindow.webContents) {
        // Send event to renderer
        mainWindow.webContents.send('fs-change', { event, path: pathStr });
      }
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Save file directly to a path (no dialog, used after storage dir is set)
ipcMain.handle('save-file-direct', async (event, { filePath, content }) => {
  try {
    // Ensure parent directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true, name: path.basename(filePath), path: filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Save file with dialog (fallback / manual "Save As")
ipcMain.handle('save-file', async (event, { content, suggestedName, filters }) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: suggestedName || 'note.md',
      filters: filters || [
        { name: 'Markdown Files', extensions: ['md'] },
        { name: 'HTML Files', extensions: ['html'] },
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled) {
      return { success: false, cancelled: true };
    }

    fs.writeFileSync(result.filePath, content, 'utf-8');
    return { success: true, name: path.basename(result.filePath), path: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Pick arbitrary directory
ipcMain.handle('pick-directory', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled) return { success: false, cancelled: true };
    return { success: true, path: result.filePaths[0] };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Open file with dialog
ipcMain.handle('open-file', async (event, { filters }) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: filters || [
        { name: 'Supported Files', extensions: ['md', 'html', 'json', 'txt'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled) {
      return { success: false, cancelled: true };
    }

    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    const stats = fs.statSync(filePath);

    return {
      success: true,
      content,
      name: path.basename(filePath),
      path: filePath,
      lastModified: stats.mtimeMs,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Read file directly from path
ipcMain.handle('read-file-direct', async (event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const stats = fs.statSync(filePath);
    return {
      success: true,
      content,
      name: path.basename(filePath),
      path: filePath,
      lastModified: stats.mtimeMs,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Delete file from drive
ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    }
    return { success: false, error: 'File not found' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// List files in a directory (flat)
ipcMain.handle('list-files', async (event, args) => {
  try {
    const dirPath = typeof args === 'string' ? args : args.dirPath;
    const extension = typeof args === 'object' ? args.extension : undefined;

    if (!fs.existsSync(dirPath)) {
      return { success: true, files: [] };
    }
    const files = fs.readdirSync(dirPath)
      .filter(f => extension ? f.endsWith(extension) : true)
      .map(f => {
        const fullPath = path.join(dirPath, f);
        const stats = fs.statSync(fullPath);
        return { name: f, path: fullPath, lastModified: stats.mtimeMs, isDirectory: stats.isDirectory() };
      })
      .sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
    return { success: true, files };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// List file tree recursively (for Code Studio explorer)
ipcMain.handle('list-tree', async (event, dirPath) => {
  function buildTree(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .map(name => {
        const fullPath = path.join(dir, name);
        try {
          const stats = fs.statSync(fullPath);
          const isDir = stats.isDirectory();
          return {
            name,
            path: fullPath,
            isDirectory: isDir,
            lastModified: stats.mtimeMs,
            children: isDir ? buildTree(fullPath) : undefined,
          };
        } catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
  }
  try {
    return { success: true, tree: buildTree(dirPath) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Create a directory
ipcMain.handle('create-dir', async (event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return { success: true, path: dirPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Delete a directory recursively
ipcMain.handle('delete-dir', async (event, dirPath) => {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Fetch API (CORS Bypass for Platform integrations)
ipcMain.handle('fetch-platform-api', async (event, { url, options }) => {
  try {
    const response = await fetch(url, options);
    
    const status = response.status;
    const headers = Object.fromEntries(response.headers.entries());
    let data;
    
    // Attempt to parse JSON, fallback to text
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    return { success: true, status, headers, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Save media natively
ipcMain.handle('save-media', async (event, { workspacePath, filename, base64Data }) => {
  try {
    const mediaDir = path.join(workspacePath, 'HOLE_Media');
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }
    const finalFilename = `${Date.now()}_${filename}`;
    const filePath = path.join(mediaDir, finalFilename);
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);
    return { success: true, path: `file://${filePath.replace(/\\/g, '/')}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ---- Tor Mode ---- //

function getTorPath() {
  const isWin = process.platform === 'win32';
  const torBin = isWin ? 'tor.exe' : 'tor';
  const locations = [
    path.join(__dirname, '..', 'bin', 'tor', torBin),
    path.join(process.resourcesPath || '', 'bin', 'tor', torBin),
    path.join(__dirname, '..', 'tor', torBin),
    path.join(__dirname, '..', 'tor', 'Tor', torBin),
  ];
  // On Linux/macOS, also check system-installed tor
  if (!isWin) {
    locations.push('/usr/bin/tor', '/usr/local/bin/tor');
  }
  for (const loc of locations) {
    if (fs.existsSync(loc)) return loc;
  }
  return null;
}

function getGeoIPDir() {
  const locations = [
    path.join(__dirname, '..', 'bin', 'data'),
    path.join(process.resourcesPath || '', 'bin', 'data'),
  ];
  for (const loc of locations) {
    if (fs.existsSync(loc)) return loc;
  }
  return null;
}

ipcMain.handle('check-tor-installed', () => {
  const torPath = getTorPath();
  return { installed: !!torPath, path: torPath };
});

ipcMain.handle('start-tor', async () => {
  if (torProcess) return { success: false, error: 'Tor is already running.' };

  const torPath = getTorPath();
  if (!torPath) return { success: false, error: 'tor.exe not found. Please install the Tor Expert Bundle.' };

  const torDir = path.dirname(torPath);
  const dataDir = path.join(app.getPath('userData'), 'tor_data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  // Write a torrc config
  const torrc = path.join(dataDir, 'torrc');
  const geoipDir = getGeoIPDir();
  const torrcLines = [
    'SocksPort 0.0.0.0:9050',
    'ControlPort ' + torControlPort,
    'CookieAuthentication 1',
    'DataDirectory ' + dataDir.replace(/\\/g, '/'),
  ];
  if (geoipDir) {
    const gf = path.join(geoipDir, 'geoip');
    const g6 = path.join(geoipDir, 'geoip6');
    if (fs.existsSync(gf)) torrcLines.push('GeoIPFile ' + gf.replace(/\\/g, '/'));
    if (fs.existsSync(g6)) torrcLines.push('GeoIPv6File ' + g6.replace(/\\/g, '/'));
  }
  fs.writeFileSync(torrc, torrcLines.join('\n'));

  return new Promise((resolve) => {
    try {
      torProcess = spawn(torPath, ['-f', torrc], {
        cwd: torDir,
        windowsHide: true,
      });

      let bootstrapped = false;

      torProcess.stdout.on('data', (data) => {
        const msg = data.toString().trim();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('tor-event', { type: 'log', message: msg });
        }
        if (msg.includes('Bootstrapped 100%') && !bootstrapped) {
          bootstrapped = true;
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('tor-event', { type: 'status', status: 'connected' });
          }
        }
      });

      torProcess.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('tor-event', { type: 'log', message: msg });
        }
      });

      torProcess.on('error', (err) => {
        torProcess = null;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('tor-event', { type: 'status', status: 'error' });
          mainWindow.webContents.send('tor-event', { type: 'log', message: `Process error: ${err.message}` });
        }
      });

      torProcess.on('exit', (code) => {
        torProcess = null;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('tor-event', { type: 'status', status: 'disconnected' });
          mainWindow.webContents.send('tor-event', { type: 'log', message: `Tor exited with code ${code}` });
        }
      });

      // Give it a moment, then report connecting
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('tor-event', { type: 'status', status: 'connecting' });
        }
      }, 500);

      resolve({ success: true });
    } catch (err) {
      torProcess = null;
      resolve({ success: false, error: err.message });
    }
  });
});

ipcMain.handle('stop-tor', async () => {
  if (torProcess) {
    torProcess.kill();
    torProcess = null;
  }
  return { success: true };
});

ipcMain.handle('tor-new-identity', async () => {
  // Send SIGNAL NEWNYM via control port using cookie auth
  const dataDir = path.join(app.getPath('userData'), 'tor_data');
  const cookiePath = path.join(dataDir, 'control_auth_cookie');

  return new Promise((resolve) => {
    try {
      let authHex = '';
      if (fs.existsSync(cookiePath)) {
        const cookieData = fs.readFileSync(cookiePath);
        authHex = cookieData.toString('hex');
      }

      const client = new net.Socket();
      let response = '';

      client.connect(torControlPort, '127.0.0.1', () => {
        client.write(`AUTHENTICATE ${authHex}\r\n`);
      });

      let step = 0;
      client.on('data', (data) => {
        response += data.toString();
        if (step === 0 && response.includes('250')) {
          step = 1;
          response = '';
          client.write('SIGNAL NEWNYM\r\n');
        } else if (step === 1) {
          client.destroy();
          if (response.includes('250')) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: response.trim() });
          }
        }
      });

      client.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      setTimeout(() => {
        client.destroy();
        resolve({ success: false, error: 'Control port timeout' });
      }, 5000);
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
});

ipcMain.handle('get-tor-ip', async () => {
  try {
    // Use Node's built-in fetch through Tor SOCKS proxy isn't directly possible,
    // so we use curl if available, or a simple HTTP request through the proxy
    return new Promise((resolve) => {
      exec('curl --socks5-hostname 127.0.0.1:9050 -s https://check.torproject.org/api/ip', { timeout: 15000 }, (error, stdout) => {
        if (error) {
          // Fallback: try httpbin
          exec('curl --socks5-hostname 127.0.0.1:9050 -s https://httpbin.org/ip', { timeout: 15000 }, (err2, stdout2) => {
            if (err2) return resolve({ success: false, error: 'Could not determine IP. Is curl installed?' });
            try {
              const data = JSON.parse(stdout2);
              resolve({ success: true, ip: data.origin || 'Unknown' });
            } catch {
              resolve({ success: false, error: 'Failed to parse IP response' });
            }
          });
          return;
        }
        try {
          const data = JSON.parse(stdout);
          resolve({ success: true, ip: data.IP || 'Unknown' });
        } catch {
          resolve({ success: false, error: 'Failed to parse IP response' });
        }
      });
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-anonymous-browser', async (event, preferredBrowser = 'auto') => {
  try {
    const isWin = process.platform === 'win32';
    const isMac = process.platform === 'darwin';

    const browsers = isWin ? {
      chrome: [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      ],
      edge: [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      ],
      brave: [
        'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      ],
      firefox: [
        'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
        'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe',
      ],
      opera: [
        (process.env.LOCALAPPDATA || '') + '\\Programs\\Opera\\opera.exe',
        (process.env.LOCALAPPDATA || '') + '\\Programs\\Opera GX\\opera.exe',
      ]
    } : isMac ? {
      chrome: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
      brave: ['/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'],
      firefox: ['/Applications/Firefox.app/Contents/MacOS/firefox'],
      edge: ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'],
      opera: ['/Applications/Opera.app/Contents/MacOS/Opera'],
    } : {
      chrome: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser', '/usr/bin/chromium'],
      brave: ['/usr/bin/brave-browser', '/usr/bin/brave-browser-stable'],
      firefox: ['/usr/bin/firefox', '/usr/bin/firefox-esr'],
      edge: ['/usr/bin/microsoft-edge', '/usr/bin/microsoft-edge-stable'],
      opera: ['/usr/bin/opera'],
    };

    let browserPath = null;
    let isFirefox = false;

    if (preferredBrowser !== 'auto' && browsers[preferredBrowser]) {
      for (const b of browsers[preferredBrowser]) {
        if (b && fs.existsSync(b)) {
          browserPath = b;
          isFirefox = preferredBrowser === 'firefox';
          break;
        }
      }
      if (!browserPath) {
        return { success: false, error: `Preferred browser (${preferredBrowser}) not found. Please install it or use Auto-detect.` };
      }
    } else {
      const allCandidates = [...(browsers.chrome||[]), ...(browsers.brave||[]), ...(browsers.edge||[]), ...(browsers.firefox||[]), ...(browsers.opera||[])];
      for (const b of allCandidates) {
        if (b && fs.existsSync(b)) {
          browserPath = b;
          isFirefox = b.toLowerCase().includes('firefox');
          break;
        }
      }
    }

    if (!browserPath) {
      return { success: false, error: 'No supported browser found. Install Chrome, Edge, Firefox, Brave, or Opera.' };
    }

    // Firefox proxy config
    if (isFirefox) {
      const profileDir = path.join(app.getPath('userData'), 'tor_firefox_profile');
      if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });
      const userJs = [
        'user_pref("network.proxy.type", 1);',
        'user_pref("network.proxy.socks", "127.0.0.1");',
        'user_pref("network.proxy.socks_port", 9050);',
        'user_pref("network.proxy.socks_remote_dns", true);', // Prevent DNS leaks
        'user_pref("network.proxy.socks_version", 5);',
        'user_pref("browser.shell.checkDefaultBrowser", false);',
        'user_pref("media.peerconnection.enabled", false);' // Prevent WebRTC leaks
      ].join('\n');
      fs.writeFileSync(path.join(profileDir, 'user.js'), userJs);
      spawn(browserPath, [
        '-profile', profileDir,
        '-private-window',
        '-no-remote',
        'https://check.torproject.org'
      ], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    } else {
      // Chromium proxy config (Chrome, Edge, Brave, Opera)
      const torProfileDir = path.join(app.getPath('userData'), 'tor_browser_profile');
      if (!fs.existsSync(torProfileDir)) fs.mkdirSync(torProfileDir, { recursive: true });
      spawn(browserPath, [
        '--proxy-server=socks5://127.0.0.1:9050',
        '--host-resolver-rules="MAP * ~NOTFOUND , EXCLUDE 127.0.0.1"', // Prevent DNS leaks
        '--force-webrtc-ip-handling-policy=disable-non-proxied-udp', // Prevent WebRTC leaks
        '--user-data-dir=' + torProfileDir,
        '--incognito',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions',
        'https://check.torproject.org'
      ], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    }

    return { success: true, browser: path.basename(browserPath) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});



// ---- Advanced Tor Features ---- //

// Update Tor config and restart with new settings (bridges, exit nodes)
ipcMain.handle('update-tor-config', async (event, { exitCountry, bridges, bridgeType }) => {
  const dataDir = path.join(app.getPath('userData'), 'tor_data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const torrc = path.join(dataDir, 'torrc');

  const geoipDir = getGeoIPDir();
  const lines = [
    'SocksPort 0.0.0.0:9050',
    'ControlPort ' + torControlPort,
    'CookieAuthentication 1',
    'DataDirectory ' + dataDir.replace(/\\/g, '/'),
  ];

  if (geoipDir) {
    const gf = path.join(geoipDir, 'geoip');
    const g6 = path.join(geoipDir, 'geoip6');
    if (fs.existsSync(gf)) lines.push('GeoIPFile ' + gf.replace(/\\/g, '/'));
    if (fs.existsSync(g6)) lines.push('GeoIPv6File ' + g6.replace(/\\/g, '/'));
  }

  // Exit country selection
  if (exitCountry && exitCountry !== 'any') {
    lines.push('ExitNodes {' + exitCountry + '}');
    lines.push('StrictNodes 1');
  }

  // Bridge configuration
  if (bridges && bridges.length > 0 && bridgeType) {
    lines.push('UseBridges 1');
    lines.push('ClientTransportPlugin ' + bridgeType + ' exec ' + getPluggableTransportPath(bridgeType));
    bridges.forEach(b => lines.push('Bridge ' + b));
  }

  fs.writeFileSync(torrc, lines.join('\n'));
  return { success: true, config: lines.join('\n') };
});

// Get path to pluggable transport binaries
function getPluggableTransportPath(type) {
  const ptDir = path.join(__dirname, '..', 'bin', 'tor', 'pluggable_transports');
  const ext = process.platform === 'win32' ? '.exe' : '';
  const map = {
    'obfs4': path.join(ptDir, 'lyrebird' + ext),
    'snowflake': path.join(ptDir, 'snowflake-client' + ext),
    'conjure': path.join(ptDir, 'conjure-client' + ext),
  };
  return (map[type] || map['obfs4']).replace(/\\/g, '/');
}

// Restart Tor with updated config
ipcMain.handle('restart-tor', async () => {
  // Kill existing
  if (torProcess) {
    torProcess.kill();
    torProcess = null;
  }
  // Wait a moment for cleanup
  await new Promise(r => setTimeout(r, 1000));
  
  const torPath = getTorPath();
  if (!torPath) return { success: false, error: 'tor.exe not found' };

  const torDir = path.dirname(torPath);
  const dataDir = path.join(app.getPath('userData'), 'tor_data');
  const torrc = path.join(dataDir, 'torrc');

  if (!fs.existsSync(torrc)) return { success: false, error: 'No torrc config found. Update config first.' };

  return new Promise((resolve) => {
    try {
      torProcess = spawn(torPath, ['-f', torrc], {
        cwd: torDir,
        windowsHide: true,
      });

      let bootstrapped = false;

      torProcess.stdout.on('data', (data) => {
        const msg = data.toString().trim();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('tor-event', { type: 'log', message: msg });
        }
        if (msg.includes('Bootstrapped 100%') && !bootstrapped) {
          bootstrapped = true;
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('tor-event', { type: 'status', status: 'connected' });
          }
        }
      });

      torProcess.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('tor-event', { type: 'log', message: msg });
        }
      });

      torProcess.on('error', (err) => {
        torProcess = null;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('tor-event', { type: 'status', status: 'error' });
        }
      });

      torProcess.on('exit', (code) => {
        torProcess = null;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('tor-event', { type: 'status', status: 'disconnected' });
          mainWindow.webContents.send('tor-event', { type: 'log', message: 'Tor exited with code ' + code });
        }
      });

      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('tor-event', { type: 'status', status: 'connecting' });
        }
      }, 500);

      resolve({ success: true });
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
});

// Health check — verify SOCKS5 proxy is alive
ipcMain.handle('tor-health-check', async () => {
  return new Promise((resolve) => {
    const client = new net.Socket();
    client.setTimeout(3000);
    client.connect(9050, '127.0.0.1', () => {
      client.destroy();
      resolve({ alive: true });
    });
    client.on('error', () => {
      client.destroy();
      resolve({ alive: false });
    });
    client.on('timeout', () => {
      client.destroy();
      resolve({ alive: false });
    });
  });
});

// Fetch .onion or regular URL through Tor proxy
ipcMain.handle('tor-fetch-url', async (event, url) => {
  return new Promise((resolve) => {
    const curlBin = process.platform === 'win32' ? 'curl.exe' : 'curl';
    const args = ['--socks5-hostname', '127.0.0.1:9050', '-sS', '-L', '--max-time', '30', url];
    execFile(curlBin, args, { timeout: 35000, maxBuffer: 5 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          const cleanError = stderr ? stderr.toString().replace('curl: ', '').trim() : 'Target offline or unreachable.';
          return resolve({ success: false, error: `Connection Failed: ${cleanError}` });
        }
        resolve({ success: true, html: stdout, length: stdout.length });
    });
  });
});



// ---- Global Ghost Mode (SAFE Implementation) ---- //
let isGlobalGhostActive = false;

// CRITICAL: Use REG DELETE to fully remove ProxyServer, not just disable it.
// Use 'set' (volatile) instead of 'setx' (permanent) for env vars.
// The env vars only affect child processes of THIS app, which is the safe approach.

function cleanupGhostProxySync() {
  try {
    const { execSync } = require('child_process');

    if (process.platform === 'win32') {
      // Windows: clear registry proxy
      execSync('reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f', { windowsHide: true });
      try {
        execSync('reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /f', { windowsHide: true });
      } catch (e) {}
      try { execSync('reg delete "HKCU\\Environment" /v HTTP_PROXY /f', { windowsHide: true }); } catch (e) {}
      try { execSync('reg delete "HKCU\\Environment" /v HTTPS_PROXY /f', { windowsHide: true }); } catch (e) {}
      try { execSync('reg delete "HKCU\\Environment" /v ALL_PROXY /f', { windowsHide: true }); } catch (e) {}
      try {
        execSync('powershell -NoProfile -Command "[Environment]::SetEnvironmentVariable(\'HTTP_PROXY\', $null, \'User\'); [Environment]::SetEnvironmentVariable(\'HTTPS_PROXY\', $null, \'User\'); [Environment]::SetEnvironmentVariable(\'ALL_PROXY\', $null, \'User\')"', { windowsHide: true });
      } catch (e) {}
    }

    // Clear from current process tree (all platforms)
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
    delete process.env.ALL_PROXY;
    delete process.env.http_proxy;
    delete process.env.https_proxy;
    delete process.env.all_proxy;

    isGlobalGhostActive = false;
    console.log('[HOLE] Ghost Mode cleanup complete — all proxy traces removed.');
  } catch (e) {
    console.error('[HOLE] Ghost cleanup error:', e.message);
  }
}

// Startup Ghost Check: detect leftover proxy from a previous crash
function checkForGhostLeftovers() {
  // Only relevant on Windows (registry-based proxy)
  if (process.platform !== 'win32') return false;
  try {
    const { execSync } = require('child_process');
    let hasGhost = false;

    try {
      const regCheck = execSync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable', { windowsHide: true, encoding: 'utf-8' });
      if (regCheck.includes('0x1')) {
        hasGhost = true;
      }
    } catch (e) {}

    try {
      const envCheck = execSync('reg query "HKCU\\Environment" /v ALL_PROXY', { windowsHide: true, encoding: 'utf-8' });
      if (envCheck.includes('socks5')) {
        hasGhost = true;
      }
    } catch (e) {}

    if (hasGhost) {
      console.log('[HOLE] WARNING: Ghost proxy leftovers detected from previous session. Cleaning up...');
      cleanupGhostProxySync();
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

ipcMain.handle('check-ghost-leftovers', async () => {
  const found = checkForGhostLeftovers();
  return { found };
});

ipcMain.handle('enable-global-ghost', async () => {
  return new Promise((resolve) => {
    try {
      const enableProxy = () => {
        process.env.HTTP_PROXY = 'socks5h://127.0.0.1:9050';
        process.env.HTTPS_PROXY = 'socks5h://127.0.0.1:9050';
        process.env.ALL_PROXY = 'socks5h://127.0.0.1:9050';
        isGlobalGhostActive = true;
        resolve({ success: true });
      };

      if (process.platform === 'win32') {
        exec('reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 1 /f && reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d "socks=127.0.0.1:9050" /f', { windowsHide: true }, (err) => {
          if (err) return resolve({ success: false, error: err.message });
          enableProxy();
        });
      } else {
        // On Linux/macOS, just set env vars (no system registry)
        enableProxy();
      }
    } catch(e) { resolve({ success: false, error: e.message }); }
  });
});

ipcMain.handle('disable-global-ghost', async () => {
  return new Promise((resolve) => {
    try {
      cleanupGhostProxySync();
      resolve({ success: true });
    } catch(e) { resolve({ success: false, error: e.message }); }
  });
});


// ---- Context-Aware Wordlist Generator ---- //
const STOP_WORDS = new Set(['about','above','after','again','against','all','am','an','and','any','are','aren','as','at','be','because','been','before','being','below','between','both','but','by','can','cannot','could','couldn','did','didn','do','does','doesn','doing','don','down','during','each','few','for','from','further','had','hadn','has','hasn','have','haven','having','he','her','here','hers','herself','him','himself','his','how','if','in','into','is','isn','it','its','itself','let','me','more','most','mustn','my','myself','no','nor','not','of','off','on','once','only','or','other','ought','our','ours','ourselves','out','over','own','same','shan','she','should','shouldn','so','some','such','than','that','the','their','theirs','them','themselves','then','there','these','they','this','those','through','to','too','under','until','up','very','was','wasn','we','were','weren','what','when','where','which','while','who','whom','why','with','won','would','wouldn','you','your','yours','yourself','yourselves', 'true', 'false', 'null', 'undefined', 'http', 'https', 'www', 'com', 'org', 'net', 'function', 'return', 'class', 'const', 'let', 'var']);

ipcMain.handle('generate-wordlist', async (event, { url, useTor, doPermutations, minLength }) => {
  return new Promise((resolve) => {
    const curlBin = process.platform === 'win32' ? 'curl.exe' : 'curl';
    let args = ['-sS', '-L', '--max-time', '20', url];
    if (useTor) {
      args = ['--socks5-hostname', '127.0.0.1:9050', '-sS', '-L', '--max-time', '30', url];
    }

    execFile(curlBin, args, { timeout: 35000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        const cleanError = stderr ? stderr.toString().replace('curl: ', '').trim() : error.message;
        return resolve({ success: false, error: 'Connection Failed: ' + cleanError });
      }

      try {
        // Strip out scripts and styles safely to avoid catastrophic backtracking
        let text = stdout.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');
        text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
        // Strip HTML tags
        text = text.replace(/<[^>]+>/g, ' ');

        // Extract words (letters and numbers only)
        const words = text.match(/[a-zA-Z0-9_]{3,30}/g) || [];
        
        let uniqueWords = new Set();
        for (let w of words) {
          const lower = w.toLowerCase();
          // Filter length and stop words
          if (lower.length >= minLength && !STOP_WORDS.has(lower) && !/^\d+$/.test(lower)) {
            uniqueWords.add(lower);
          }
        }

        let baseWords = Array.from(uniqueWords);
        
        if (doPermutations) {
          const suffixes = ['_api', '-api', 'api', 'dev', '_dev', 'test', '_test', 'admin', '2023', '2024', '.bak', '.old', '.zip', '.tar.gz', 'v1', 'v2'];
          const prefixes = ['api_', 'dev_', 'test_', 'admin_'];
          let permuted = new Set(baseWords);
          
          for (let w of baseWords) {
            for (let s of suffixes) permuted.add(w + s);
            for (let p of prefixes) permuted.add(p + w);
          }
          baseWords = Array.from(permuted);
        }

        // Sort alphabetically
        baseWords.sort();

        resolve({ success: true, count: baseWords.length, words: baseWords });
      } catch (err) {
        resolve({ success: false, error: 'Parsing Error: ' + err.message });
      }
    });
  });
});

ipcMain.handle('export-wordlist', async (event, wordsArray) => {
  if (!mainWindow) return { success: false, error: 'No main window' };
  
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Wordlist',
    defaultPath: 'custom_wordlist.txt',
    filters: [{ name: 'Text Files', extensions: ['txt'] }]
  });

  if (canceled || !filePath) return { success: false, canceled: true };

  try {
    fs.writeFileSync(filePath, wordsArray.join('\n'), 'utf8');
    return { success: true, path: filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});


// ---- OS Clipboard Monitor ---- //
const { clipboard } = require('electron');
let lastClip = '';

// Poll the clipboard every 1000ms
setInterval(() => {
  try {
    const text = clipboard.readText();
    // Only broadcast if the text is new and not empty
    if (text && text !== lastClip) {
      lastClip = text;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('clipboard-update', text);
      }
    }
  } catch (e) {
    // Ignore clipboard read errors (e.g., if clipboard is locked by OS)
  }
}, 1000);

ipcMain.handle('write-clipboard', async (event, text) => {
  try {
    clipboard.writeText(text);
    lastClip = text; // Prevent echoing back to the frontend immediately
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ---- App Lifecycle ---- //

app.whenReady().then(() => {
  // FIRST THING: Check for ghost proxy leftovers from a previous crash
  const hadGhosts = checkForGhostLeftovers();
  if (hadGhosts) {
    console.log('[HOLE] Cleaned up ghost proxy leftovers from previous session.');
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Multi-layer crash protection: cleanup runs on EVERY possible exit path
app.on('before-quit', () => cleanupGhostProxySync());
app.on('quit', () => cleanupGhostProxySync());
process.on('exit', () => cleanupGhostProxySync());
process.on('SIGINT', () => { cleanupGhostProxySync(); process.exit(0); });
process.on('SIGTERM', () => { cleanupGhostProxySync(); process.exit(0); });
process.on('uncaughtException', (err) => { cleanupGhostProxySync(); console.error(err); process.exit(1); });

app.on('window-all-closed', () => {
  cleanupGhostProxySync();
  // Kill Tor on app exit
  if (torProcess) {
    torProcess.kill();
    torProcess = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
// ---- Integrated Terminal (node-pty) ---- //
const pty = require('node-pty');

let ptyProcess = null;

function getAvailableShells() {
  if (process.platform === 'win32') {
    const shells = [
      { name: 'PowerShell', path: 'powershell.exe' },
      { name: 'Command Prompt', path: 'cmd.exe' }
    ];
    const wslPath = path.join(process.env.windir || 'C:\\Windows', 'System32', 'wsl.exe');
    if (fs.existsSync(wslPath)) {
      shells.unshift({ name: 'WSL (Linux)', path: wslPath });
    }
    const gitBashPath = 'C:\\Program Files\\Git\\bin\\bash.exe';
    if (fs.existsSync(gitBashPath)) {
      shells.unshift({ name: 'Git Bash', path: gitBashPath });
    }
    return shells;
  } else {
    // Linux / macOS
    const shells = [{ name: 'Bash', path: '/bin/bash' }];
    if (fs.existsSync('/usr/bin/zsh') || fs.existsSync('/bin/zsh')) {
      shells.unshift({ name: 'Zsh', path: fs.existsSync('/usr/bin/zsh') ? '/usr/bin/zsh' : '/bin/zsh' });
    }
    if (fs.existsSync('/usr/bin/fish')) {
      shells.push({ name: 'Fish', path: '/usr/bin/fish' });
    }
    return shells;
  }
}

ipcMain.handle('get-available-shells', () => {
  return getAvailableShells();
});

ipcMain.handle('pty-start', (event, { shellPath, cols, rows, useTor }) => {
  if (ptyProcess) {
    ptyProcess.kill();
    ptyProcess = null;
  }
  
  try {
    const env = Object.assign({}, process.env);
    
    // For WSL, we might just pass the wsl.exe path directly.
    ptyProcess = pty.spawn(shellPath, [], {
      name: 'xterm-color',
      cols: cols || 80,
      rows: rows || 24,
      cwd: process.env.HOME || process.env.USERPROFILE,
      env: env
    });

    if (useTor) {
      setTimeout(() => {
        if (!ptyProcess) return;
        const isLinux = shellPath.toLowerCase().includes('wsl') || shellPath.toLowerCase().includes('bash');
        if (isLinux) {
          // For WSL/Bash, we dynamically extract the Windows Host IP (from resolv.conf) to guarantee the proxy is reachable in WSL2, and fallback to 127.0.0.1
          ptyProcess.write('export HOST_IP=$(grep nameserver /etc/resolv.conf | awk \'{print $2}\'); if [ -z "$HOST_IP" ]; then HOST_IP="127.0.0.1"; fi; export all_proxy="socks5h://$HOST_IP:9050" ALL_PROXY="socks5h://$HOST_IP:9050" http_proxy="socks5h://$HOST_IP:9050" https_proxy="socks5h://$HOST_IP:9050"; clear\r');
        } else {
          ptyProcess.write('$env:ALL_PROXY="socks5h://127.0.0.1:9050"; $env:HTTP_PROXY="socks5h://127.0.0.1:9050"; $env:HTTPS_PROXY="socks5h://127.0.0.1:9050"; clear\r');
        }
      }, 1500); // Give shell time to initialize
    }
    
    ptyProcess.onData((data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('pty-data', data);
      }
    });
    
    ptyProcess.onExit(({ exitCode, signal }) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('pty-exit', { exitCode, signal });
      }
    });
    
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.on('pty-write', (event, data) => {
  if (ptyProcess) ptyProcess.write(data);
});

ipcMain.on('pty-resize', (event, { cols, rows }) => {
  if (ptyProcess) {
    try { ptyProcess.resize(cols, rows); } catch (e) {}
  }
});

ipcMain.handle('pty-kill', () => {
  if (ptyProcess) {
    ptyProcess.kill();
    ptyProcess = null;
  }
  return { success: true };
});

// ============================================================
// Network Utilities
// ============================================================

ipcMain.handle('get-local-ip', () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
});

ipcMain.handle('listener-status', () => {
  return {
    listening: listenerServer !== null,
    connected: activeShellSocket !== null && !activeShellSocket.destroyed,
    connInfo: activeShellSocket ? {
      remoteAddress: activeShellSocket.remoteAddress?.replace('::ffff:', '') || 'unknown',
      remotePort: activeShellSocket.remotePort,
    } : null,
  };
});

// ============================================================
// Reverse Shell Listener — Local TCP Server
// ============================================================
let listenerServer = null;
let activeShellSocket = null;

ipcMain.handle('start-listener', (event, port) => {
  if (listenerServer) {
    try { listenerServer.close(); } catch (e) {}
  }
  if (activeShellSocket) {
    try { activeShellSocket.destroy(); } catch (e) {}
    activeShellSocket = null;
  }

  return new Promise((resolve) => {
    try {
      listenerServer = net.createServer((socket) => {
        activeShellSocket = socket;

        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('shell-connect', {
            remoteAddress: socket.remoteAddress?.replace('::ffff:', '') || 'unknown',
            remotePort: socket.remotePort,
          });
        }

        socket.on('data', (data) => {
          if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('shell-data', data.toString());
          }
        });

        socket.on('close', () => {
          activeShellSocket = null;
          if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('shell-disconnect');
          }
        });

        socket.on('error', (err) => {
          console.error('Shell socket error:', err.message);
          activeShellSocket = null;
        });
      });

      listenerServer.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      listenerServer.listen(port || 4444, '0.0.0.0', () => {
        resolve({ success: true, port: port || 4444 });
      });
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
});

ipcMain.handle('stop-listener', () => {
  if (activeShellSocket) {
    try { activeShellSocket.destroy(); } catch (e) {}
    activeShellSocket = null;
  }
  if (listenerServer) {
    listenerServer.close();
    listenerServer = null;
  }
  return { success: true };
});

ipcMain.on('shell-write', (event, data) => {
  if (activeShellSocket && !activeShellSocket.destroyed) {
    activeShellSocket.write(data);
  }
});
