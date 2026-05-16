import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import './index.css'
import { loadStateFromDisk, setupStateSync } from './utils/stateManager.js'
import { getStorageDir } from './utils/fileSystem.js'

async function init() {
  const dir = getStorageDir();
  if (dir) {
    // Wait for the state from this folder to load into localStorage
    await loadStateFromDisk(dir);
  }
  
  // Start the background sync engine
  setupStateSync();

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  )
}

init();
