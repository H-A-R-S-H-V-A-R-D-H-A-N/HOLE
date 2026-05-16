import { getStorageDir, saveToFile, readFileDirect } from './fileSystem';

const STATE_FILE_NAME = '.hole_state.json';

// List of all localStorage keys that contain app data to be synced
const SYNCED_KEYS = [
  'kroma_settings',
  'kroma_recon_workspaces',
  'kroma_kanban',
  'kroma_bounties',
  'kroma_recondb',
  'kroma_payloads',
  'kroma_methodology',
  'kroma_catcher_captures',
  'kroma_clipboard',
  'kroma_master_email',
  'kroma_identities',
  'hole_settings',
  'hole_notes',
  'hole_methodology',
  'hole_recondb',
  'hole_kanban',
  'hole_payloads',
  'hole_autosave'
];

const originalSetItem = localStorage.setItem;

/**
 * Intercepts localStorage.setItem to auto-sync to disk when relevant keys change.
 */
export function setupStateSync() {
  let syncTimeout = null;
  
  localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    
    if (SYNCED_KEYS.includes(key)) {
      if (syncTimeout) clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        syncStateToDisk();
      }, 500);
    }
  };
}

/**
 * Gathers all relevant state from localStorage and saves it to .hole_state.json in the current storage directory.
 */
export async function syncStateToDisk() {
  const dir = getStorageDir();
  if (!dir || !window.electronAPI) return false;

  const stateData = {};
  for (const key of SYNCED_KEYS) {
    const val = localStorage.getItem(key);
    if (val !== null) {
      stateData[key] = val;
    }
  }

  const content = JSON.stringify(stateData, null, 2);
  const filePath = `${dir}\\${STATE_FILE_NAME}`;
  
  try {
    const result = await window.electronAPI.saveFileDirect({ filePath, content });
    return result.success;
  } catch (err) {
    console.error('[KROMA] Failed to sync state to disk:', err);
    return false;
  }
}

/**
 * Reads .hole_state.json from the specified directory and loads it into localStorage.
 * Does not overwrite existing keys if the state file doesn't have them, unless explicitly clearing.
 * @param {string} dir - The directory to load from.
 * @returns {Promise<boolean>} True if state was loaded successfully.
 */
export async function loadStateFromDisk(dir) {
  if (!dir || !window.electronAPI) return false;

  const filePath = `${dir}\\${STATE_FILE_NAME}`;
  try {
    const result = await readFileDirect(filePath);
    if (result.success && result.content) {
      const stateData = JSON.parse(result.content);
      
      // Clear all synced keys first to prevent data bleed from the previous folder
      for (const key of SYNCED_KEYS) {
        localStorage.removeItem(key);
      }

      // Inject the state data into localStorage
      for (const [key, val] of Object.entries(stateData)) {
        if (SYNCED_KEYS.includes(key)) {
          localStorage.setItem(key, val);
        }
      }
      return true;
    }
  } catch (err) {
    // File might not exist yet, which is fine for new folders.
    console.warn('[KROMA] No state file found to load or error reading it:', err);
  }
  return false;
}
