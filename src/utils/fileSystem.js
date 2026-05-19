// File System utilities — uses Electron native dialogs when available,
// falls back to browser File System Access API otherwise.

const isElectron = () => window.electronAPI?.isElectron === true;

/**
 * Get the storage directory from localStorage.
 */
export function getStorageDir() {
  return localStorage.getItem('kroma_storage_dir') || null;
}

/**
 * Set the storage directory in localStorage.
 */
export function setStorageDir(dir) {
  localStorage.setItem('kroma_storage_dir', dir);
}

/**
 * Check if storage directory has been configured.
 */
export function isStorageConfigured() {
  return !!getStorageDir();
}

/**
 * List files on drive (Electron only)
 */
export async function listFilesOnDrive(dirPath, extension) {
  if (isElectron()) {
    return await window.electronAPI.listFiles({ dirPath, extension });
  }
  return { success: false, error: 'Not supported' };
}

/**
 * Read file directly (Electron only)
 */
export async function readFileDirect(filePath) {
  if (isElectron()) {
    return await window.electronAPI.readFileDirect(filePath);
  }
  return { success: false, error: 'Not supported' };
}

/**
 * Ask user to pick a folder (first-time setup).
 * Returns the path to the KROMA folder created inside their chosen directory.
 */
export async function pickStorageFolder() {
  if (isElectron()) {
    const result = await window.electronAPI.pickFolder();
    if (result.success) {
      setStorageDir(result.path);
      return result;
    }
    return result;
  }

  return { success: false, error: 'Folder picking requires the desktop app' };
}

/**
 * Save content to a file.
 * If storage directory is configured, saves directly there (no dialog).
 * Otherwise falls back to dialog.
 */
export async function saveMedia(filename, base64Data) {
  const storageDir = getStorageDir();
  if (isElectron() && storageDir) {
    return await window.electronAPI.saveMedia({ workspacePath: storageDir, filename, base64Data });
  }
  return { success: false, error: 'Cannot save media without configured storage directory' };
}

export async function saveToFile(content, suggestedName = 'note.md', types = null) {
  const storageDir = getStorageDir();

  if (isElectron() && storageDir) {
    const filePath = `${storageDir}/${suggestedName}`;
    return await window.electronAPI.saveFileDirect({ filePath, content });
  }

  if (isElectron()) {
    const filters = [];
    if (suggestedName.endsWith('.md')) filters.push({ name: 'Markdown Files', extensions: ['md'] });
    else if (suggestedName.endsWith('.html')) filters.push({ name: 'HTML Files', extensions: ['html'] });
    else if (suggestedName.endsWith('.json')) filters.push({ name: 'JSON Files', extensions: ['json'] });
    filters.push({ name: 'All Files', extensions: ['*'] });

    const result = await window.electronAPI.saveFile({ content, suggestedName, filters });
    return result;
  }

  const fileTypes = types || [
    { description: 'Markdown Files', accept: { 'text/markdown': ['.md'] } },
    { description: 'HTML Files', accept: { 'text/html': ['.html'] } },
    { description: 'JSON Files', accept: { 'application/json': ['.json'] } },
    { description: 'Text Files', accept: { 'text/plain': ['.txt'] } },
  ];

  try {
    const handle = await window.showSaveFilePicker({ suggestedName, types: fileTypes });
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
    return { success: true, name: handle.name };
  } catch (err) {
    if (err.name === 'AbortError') return { success: false, cancelled: true };
    return { success: false, error: err.message };
  }
}

/**
 * Open and read a file.
 */
export async function openFile(types = null) {
  if (isElectron()) {
    return await window.electronAPI.openFile({
      filters: [
        { name: 'Supported Files', extensions: ['md', 'html', 'json', 'txt'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
  }

  const fileTypes = types || [
    {
      description: 'Supported Files',
      accept: {
        'text/markdown': ['.md'],
        'text/html': ['.html'],
        'application/json': ['.json'],
        'text/plain': ['.txt'],
      },
    },
  ];

  try {
    const [handle] = await window.showOpenFilePicker({ types: fileTypes, multiple: false });
    const file = await handle.getFile();
    const content = await file.text();
    return { success: true, content, name: file.name, type: file.type, lastModified: file.lastModified };
  } catch (err) {
    if (err.name === 'AbortError') return { success: false, cancelled: true };
    return { success: false, error: err.message };
  }
}

/**
 * Delete a file from drive (Electron only).
 */
export async function deleteFileFromDrive(filePath) {
  if (isElectron() && filePath) {
    return await window.electronAPI.deleteFile(filePath);
  }
  return { success: false, error: 'Not supported' };
}

/**
 * Fetch API via native IPC (CORS bypass).
 */
export async function fetchPlatformApi(url, options = {}) {
  if (isElectron()) {
    return await window.electronAPI.fetchPlatformApi(url, options);
  }

  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type');
    const data = contentType?.includes('application/json') ? await res.json() : await res.text();
    return {
      success: true,
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      data,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Convert Tiptap HTML to Markdown.
 */
export function htmlToMarkdown(html) {
  let md = html;
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  md = md.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<em>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<u>(.*?)<\/u>/gi, '__$1__');
  md = md.replace(/<s>(.*?)<\/s>/gi, '~~$1~~');
  md = md.replace(/<code>(.*?)<\/code>/gi, '`$1`');
  md = md.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n');
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  md = md.replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, (_, c) => c.split('\n').map(l => `> ${l}`).join('\n') + '\n\n');
  md = md.replace(/<li>(.*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<\/?[uo]l[^>]*>/gi, '\n');
  md = md.replace(/<p>(.*?)<\/p>/gi, '$1\n\n');
  md = md.replace(/<hr\s*\/?>/gi, '---\n\n');
  md = md.replace(/<[^>]+>/g, '');
  md = md.replace(/\n{3,}/g, '\n\n');
  return md.trim();
}

/**
 * Create a JSON export with metadata.
 */
export function createNoteExport(title, editorJSON, editorHTML, metadata = {}) {
  return JSON.stringify({
    version: '1.0',
    app: 'KROMA',
    title,
    content: editorJSON,
    html: editorHTML,
    metadata: {
      severity: metadata.severity || 'info',
      tags: metadata.tags || [],
      createdAt: metadata.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...metadata,
    },
  }, null, 2);
}

/**
 * Parse a KROMA JSON file.
 */
export function parseNoteImport(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (data.app === 'KROMA' && data.content) {
      return { success: true, data };
    }
    return { success: false, error: 'Not a valid KROMA file' };
  } catch {
    return { success: false, error: 'Invalid JSON' };
  }
}
