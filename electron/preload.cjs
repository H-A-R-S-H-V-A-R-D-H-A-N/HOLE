const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Pick a folder (first launch setup)
  pickFolder: () => ipcRenderer.invoke('pick-folder'),

  // Ensure Notes and Code directories exist
  ensureDirs: (kromaDir) => ipcRenderer.invoke('ensure-dirs', kromaDir),

  // Save file directly to a path (no dialog)
  saveFileDirect: (options) => ipcRenderer.invoke('save-file-direct', options),

  // Save file with OS dialog (manual Save As)
  saveFile: (options) => ipcRenderer.invoke('save-file', options),

  // Open file with OS dialog
  openFile: (options) => ipcRenderer.invoke('open-file', options || {}),

  // Delete file from drive
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),

  // List files in a directory
  listFiles: (dirPath) => ipcRenderer.invoke('list-files', dirPath),

  // Read file directly
  readFileDirect: (filePath) => ipcRenderer.invoke('read-file-direct', filePath),

  // List file tree recursively
  listTree: (dirPath) => ipcRenderer.invoke('list-tree', dirPath),

  // Create a directory
  createDir: (dirPath) => ipcRenderer.invoke('create-dir', dirPath),

  // Delete a directory recursively
  deleteDir: (dirPath) => ipcRenderer.invoke('delete-dir', dirPath),

  // Save media
  saveMedia: (data) => ipcRenderer.invoke('save-media', data),

  // Platform API Fetcher
  fetchPlatformApi: (url, options) => ipcRenderer.invoke('fetch-platform-api', { url, options }),

  // Check if running inside Electron
  isElectron: true,

  // Platform info
  platform: process.platform,

  // Event Listeners
  onFsChange: (callback) => {
    ipcRenderer.on('fs-change', (event, data) => callback(data));
  },
  offFsChange: () => {
    ipcRenderer.removeAllListeners('fs-change');
  },

  // Tor Mode
  checkTorInstalled: () => ipcRenderer.invoke('check-tor-installed'),
  startTor: () => ipcRenderer.invoke('start-tor'),
  stopTor: () => ipcRenderer.invoke('stop-tor'),
  torNewIdentity: () => ipcRenderer.invoke('tor-new-identity'),
  getTorIP: () => ipcRenderer.invoke('get-tor-ip'),
  openAnonymousBrowser: (preferredBrowser) => ipcRenderer.invoke('open-anonymous-browser', preferredBrowser),
  updateTorConfig: (config) => ipcRenderer.invoke('update-tor-config', config),
  restartTor: () => ipcRenderer.invoke('restart-tor'),
  torHealthCheck: () => ipcRenderer.invoke('tor-health-check'),
  enableGlobalGhost: () => ipcRenderer.invoke('enable-global-ghost'),
  disableGlobalGhost: () => ipcRenderer.invoke('disable-global-ghost'),
  checkGhostLeftovers: () => ipcRenderer.invoke('check-ghost-leftovers'),
  generateWordlist: (config) => ipcRenderer.invoke('generate-wordlist', config),
  exportWordlist: (words) => ipcRenderer.invoke('export-wordlist', words),
  onClipboardUpdate: (callback) => ipcRenderer.on('clipboard-update', (event, text) => callback(text)),
  writeClipboardToOS: (text) => ipcRenderer.invoke('write-clipboard', text),
  torFetchUrl: (url) => ipcRenderer.invoke('tor-fetch-url', url),
  getAvailableShells: () => ipcRenderer.invoke('get-available-shells'),
  ptyStart: (config) => ipcRenderer.invoke('pty-start', config),
  ptyWrite: (data) => ipcRenderer.send('pty-write', data),
  ptyResize: (dims) => ipcRenderer.send('pty-resize', dims),
  ptyKill: () => ipcRenderer.invoke('pty-kill'),
  onPtyData: (callback) => {
    ipcRenderer.on('pty-data', (e, data) => callback(data));
  },
  offPtyData: () => ipcRenderer.removeAllListeners('pty-data'),
  onPtyExit: (callback) => {
    ipcRenderer.on('pty-exit', (e, data) => callback(data));
  },
  offPtyExit: () => ipcRenderer.removeAllListeners('pty-exit'),
  onTorEvent: (callback) => {
    ipcRenderer.on('tor-event', (event, data) => callback(data));
  },
  offTorEvent: () => {
    ipcRenderer.removeAllListeners('tor-event');
  },

  getLocalIP: () => ipcRenderer.invoke('get-local-ip'),

  // Reverse Shell Listener
  startListener: (port) => ipcRenderer.invoke('start-listener', port),
  stopListener: () => ipcRenderer.invoke('stop-listener'),
  getListenerStatus: () => ipcRenderer.invoke('listener-status'),
  shellWrite: (data) => ipcRenderer.send('shell-write', data),
  onShellData: (callback) => {
    ipcRenderer.on('shell-data', (e, data) => callback(data));
  },
  offShellData: () => {
    ipcRenderer.removeAllListeners('shell-data');
  },
  onShellConnect: (callback) => {
    ipcRenderer.on('shell-connect', (e, data) => callback(data));
  },
  onShellDisconnect: (callback) => {
    ipcRenderer.on('shell-disconnect', (e) => callback());
  },
});
