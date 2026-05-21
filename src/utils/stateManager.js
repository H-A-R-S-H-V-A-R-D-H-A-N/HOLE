import { getStorageDir, saveToFile, readFileDirect } from './fileSystem';

const STATE_FILE_NAME = 'hole_workspace.json';

// We just grab ALL keys in localStorage and sync them to one file!
// This makes the app ultra-portable and foolproof.
let isSyncing = false;
let syncTimeout = null;

export async function syncStateToDisk() {
  if (isSyncing) return;
  const dir = getStorageDir();
  if (!dir || !window.electronAPI) return;

  isSyncing = true;
  try {
    // Collect all data from localStorage
    const stateData = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('kroma_') || key.startsWith('hole_'))) {
        try {
          const val = localStorage.getItem(key);
          if (val) {
             stateData[key] = val.startsWith('{') || val.startsWith('[') ? JSON.parse(val) : val;
          }
        } catch(e) {
          stateData[key] = val; // fallback to string if JSON.parse fails somehow
        }
      }
    }

    // Save everything to a single file in the app directory
    const statePath = `${dir}/${STATE_FILE_NAME}`;
    await window.electronAPI.saveFileDirect({ 
      filePath: statePath, 
      content: JSON.stringify(stateData, null, 2) 
    });

  } catch (error) {
    console.error('[HOLE] State Sync Error:', error);
  } finally {
    isSyncing = false;
  }
}

export function setupStateSync() {
  // Overwrite setItem and removeItem to auto-sync
  const originalSetItem = localStorage.setItem;
  const originalRemoveItem = localStorage.removeItem;
  const originalClear = localStorage.clear;

  localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    triggerSync();
  };

  localStorage.removeItem = function(key) {
    originalRemoveItem.apply(this, arguments);
    triggerSync();
  };

  localStorage.clear = function() {
    originalClear.apply(this, arguments);
    triggerSync();
  };
}

function triggerSync() {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    syncStateToDisk();
  }, 1500); 
}

export async function loadStateFromDisk() {
  const dir = getStorageDir();
  if (!dir || !window.electronAPI) return false;

  console.log('[HOLE] Booting Workspace...');
  const statePath = `${dir}/${STATE_FILE_NAME}`;
  
  // WIPE LOCAL STORAGE FIRST to mathematically prove we are loading from the JSON file!
  const storageDirValue = localStorage.getItem('kroma_storage_dir');
  localStorage.clear();
  if (storageDirValue) {
    localStorage.setItem('kroma_storage_dir', storageDirValue); // Keep the dir pointer
  }

  try {
    const result = await readFileDirect(statePath);
    if (result.success && result.content) {
      const stateData = JSON.parse(result.content);
      
      // Hydrate local storage purely from the single file
      for (const [key, val] of Object.entries(stateData)) {
        if (typeof val === 'object') {
          localStorage.setItem(key, JSON.stringify(val));
        } else {
          localStorage.setItem(key, val);
        }
      }
      
      console.log(`[HOLE] Successfully hydrated ${Object.keys(stateData).length} sections from ${STATE_FILE_NAME}`);
      return true;
    }
  } catch (err) {
    console.error('[HOLE] Failed to load workspace:', err);
  }
  
  return false;
}
