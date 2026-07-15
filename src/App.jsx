import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, FolderOpen, MapPin, Trash2, X, Plus, Target } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import NoteEditor from './components/NoteEditor';
import NoteReader from './components/NoteReader';
import NotesList from './components/NotesList';
import PlatformDashboard from './components/PlatformDashboard';
import SettingsPage from './components/SettingsPage';
import BountyTracker from './components/BountyTracker';
import PayloadLibrary from './components/PayloadLibrary';
import StringAnalyzer from './components/StringAnalyzer';
import ReconWorkspace from './components/ReconWorkspace';
import KanbanBoard from './components/KanbanBoard';
import TimeTracker from './components/TimeTracker';
import EncoderDecoder from './components/EncoderDecoder';
import DiffScope from './components/DiffScope';
import ScreenshotAnnotator from './components/ScreenshotAnnotator';
import MethodologyTracker from './components/MethodologyTracker';
import IdentityGenerator from './components/IdentityGenerator';
import { markdownToHtml } from './utils/markdownParser';
import ReconDatabase from './components/ReconDatabase';
import CodeEditor from './components/CodeEditor';
import CVSSCalculator from './components/CVSSCalculator';
import HackerJournal from './components/HackerJournal';
import ParallelReality from './components/ParallelReality';
import UnknownSpace from './components/UnknownSpace';
import TorMode from './components/TorMode';
import TerminalView from './components/TerminalView';
import WAFEvasion from './components/WAFEvasion';
import SearchOverlay from './components/SearchOverlay';
import BlogSection from './components/BlogSection';
import BlogReader from './components/BlogReader';
import LabSection from './components/LabSection';
import LabRunner from './components/LabRunner';

import JWTForger from './components/JWTForger';
import CryptoStego from './components/CryptoStego';
import GraphQLVisualizer from './components/GraphQLVisualizer';
import ReverseShell from './components/ReverseShell';
import SecretSniper from './components/SecretSniper';
import CORSExploit from './components/CORSExploit';
import SupportPage from './components/SupportPage';
import CVEMapper from './components/CVEMapper';
import IPTracker from './components/IPTracker';
import EmailHeaderAnalyzer from './components/EmailHeaderAnalyzer';
import ReconEngine from './components/ReconEngine';
import TargetCommand from './components/TargetCommand';
import BucketFinder from './components/BucketFinder';
import FaviconHunter from './components/FaviconHunter';
import ExposureHunter from './components/ExposureHunter';
import WAFDetector from './components/WAFDetector';
import JSSpider from './components/JSSpider';
import TechniqueVault from './components/TechniqueVault';
import TempMail from './components/TempMail';
import SonarCatcher from './components/SonarCatcher';
import BountyInboxes from './components/BountyInboxes';
import DonationBanner from './components/DonationBanner';
import CommunityCounter from './components/CommunityCounter';
import UpdateChecker from './components/UpdateChecker';


import { isStorageConfigured, pickStorageFolder, getStorageDir, deleteFileFromDrive, listFilesOnDrive, readFileDirect } from './utils/fileSystem';
import './App.css';

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [viewId, setViewId] = useState('');
  const [notes, setNotes] = useState([]);
  const [editorContent, setEditorContent] = useState(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorMeta, setEditorMeta] = useState(null);
  const [editorNoteId, setEditorNoteId] = useState(null);
  const [editorFilePath, setEditorFilePath] = useState(null);
  const [settings, setSettings] = useState(() => {
    try {
      const saved = window.electronAPI ? window.electronAPI.storeGetSync('kroma_settings') : localStorage.getItem('kroma_settings');
      return (typeof saved === 'string' ? JSON.parse(saved) : saved) || {};
    } catch {
      return {};
    }
  });
  const [toasts, setToasts] = useState([]);
  const [showSetup, setShowSetup] = useState(false);
  const [storageDir, setStorageDirState] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNoteForRead, setSelectedNoteForRead] = useState(null);
  const [showSectionsModal, setShowSectionsModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionColor, setNewSectionColor] = useState('#3B82F6');
  const [privacyMode, setPrivacyMode] = useState(false);
  const [fsUpdateTrigger, setFsUpdateTrigger] = useState(0);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const appContainerRef = useRef(null);

  const [activeContext, setActiveContext] = useState(() => {
    const saved = window.electronAPI ? window.electronAPI.storeGetSync('kroma_active_context') : localStorage.getItem('kroma_active_context');
    return saved || '';
  });
  const [clipboardHistory, setClipboardHistory] = useState(() => {
    try {
      const saved = window.electronAPI ? window.electronAPI.storeGetSync('kroma_clipboard') : localStorage.getItem('kroma_clipboard');
      const raw = (typeof saved === 'string' ? JSON.parse(saved) : saved) || {};
      
      const migrated = window.electronAPI ? window.electronAPI.storeGetSync('kroma_clipboard_v2_migrated') : localStorage.getItem('kroma_clipboard_v2_migrated');
      if (!migrated) {
        const cleaned = {};
        for (const [key, val] of Object.entries(raw)) {
          if (key.length >= 2 && Array.isArray(val)) {
            cleaned[key] = val;
          }
        }
        if (window.electronAPI) {
          window.electronAPI.storeSetSync('kroma_clipboard', cleaned);
          window.electronAPI.storeSetSync('kroma_clipboard_v2_migrated', '1');
        } else {
          localStorage.setItem('kroma_clipboard', JSON.stringify(cleaned));
          localStorage.setItem('kroma_clipboard_v2_migrated', '1');
        }
        return cleaned;
      }
      return raw;
    } catch { return {}; }
  });

  const activeContextRef = useRef(activeContext);
  useEffect(() => { activeContextRef.current = activeContext; }, [activeContext]);

  useEffect(() => {
    if (window.electronAPI?.onClipboardUpdate) {
      window.electronAPI.onClipboardUpdate((text) => {
        const ctx = activeContextRef.current;
        if (!ctx) return;
        setClipboardHistory(prev => {
          // Only capture if this context actually exists as a key in clipboardHistory
          if (!(ctx in prev)) return prev;
          const currentList = prev[ctx] || [];
          if (currentList[0] === text) return prev;
          const newList = [text, ...currentList].slice(0, 50);
          const next = { ...prev, [ctx]: newList };
          if (window.electronAPI) {
            window.electronAPI.storeSetSync('kroma_clipboard', next);
          } else {
            localStorage.setItem('kroma_clipboard', JSON.stringify(next));
          }
          return next;
        });
      });
    }
  }, []);

  // Only called explicitly by Dashboard's Add button, never on keystrokes
  const setActiveContextDirect = (name) => {
    setActiveContext(name);
    if (window.electronAPI) {
      window.electronAPI.storeSetSync('kroma_active_context', name);
    } else {
      localStorage.setItem('kroma_active_context', name);
    }
  };


  useEffect(() => {
    if (window.electronAPI?.onFsChange) {
      window.electronAPI.onFsChange((data) => {
        setFsUpdateTrigger(prev => prev + 1);
      });
      return () => {
        if (window.electronAPI.offFsChange) window.electronAPI.offFsChange();
      }
    }
  }, []);

  // Global Hotkeys (Ctrl+F for search)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        // Only override default browser search if we are in Editor or Reader
        if (activeView === 'editor' || activeView === 'read') {
          e.preventDefault();
          setShowSearchOverlay(true);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeView]);

  useEffect(() => {
    const root = document.documentElement;

    const themes = {
      'ultra-black': {
        '--bg-deep': '#000000', '--bg-primary': '#050505', '--bg-secondary': '#0A0A0A',
        '--bg-tertiary': '#111111', '--bg-elevated': '#171717', '--bg-hover': '#1F1F1F',
        '--glass-bg': 'rgba(0, 0, 0, 0.8)', '--glass-border': 'rgba(255, 255, 255, 0.05)',
        '--text-primary': '#F5F5F5', '--text-secondary': '#A3A3A3', '--text-muted': '#525252',
        '--accent-primary': '#3B82F6', '--accent-primary-dim': 'rgba(59, 130, 246, 0.15)',
        '--accent-primary-glow': 'rgba(59, 130, 246, 0.3)',
      },
      'clean-white': {
        '--bg-deep': '#F5F7FA', '--bg-primary': '#FFFFFF', '--bg-secondary': '#F0F2F5',
        '--bg-tertiary': '#E4E7EC', '--bg-elevated': '#FFFFFF', '--bg-hover': '#EDF0F4',
        '--glass-bg': 'rgba(255, 255, 255, 0.85)', '--glass-border': 'rgba(0, 0, 0, 0.08)',
        '--text-primary': '#1A1D26', '--text-secondary': '#4B5563', '--text-muted': '#9CA3AF',
        '--border-subtle': 'rgba(0, 0, 0, 0.04)', '--border-default': 'rgba(0, 0, 0, 0.10)',
        '--border-strong': 'rgba(0, 0, 0, 0.16)',
        '--accent-primary': '#6366F1', '--accent-primary-dim': 'rgba(99, 102, 241, 0.10)',
        '--accent-primary-glow': 'rgba(99, 102, 241, 0.20)',
        '--accent-secondary': '#8B5CF6', '--accent-secondary-dim': 'rgba(139, 92, 246, 0.10)',
        '--accent-green': '#059669', '--accent-green-dim': 'rgba(5, 150, 105, 0.10)',
        '--accent-yellow': '#D97706', '--accent-yellow-dim': 'rgba(217, 119, 6, 0.10)',
        '--accent-red': '#DC2626', '--accent-red-dim': 'rgba(220, 38, 38, 0.10)',
        '--shadow-sm': '0 1px 3px rgba(0,0,0,0.06)', '--shadow-md': '0 4px 12px rgba(0,0,0,0.08)',
        '--shadow-lg': '0 8px 24px rgba(0,0,0,0.10)',
        '--shadow-glow': '0 0 16px rgba(99, 102, 241, 0.12)',
        '--shadow-glow-strong': '0 0 32px rgba(99, 102, 241, 0.18)',
      }
    };

    const themeVars = themes[settings.theme] || themes['ultra-black'];
    Object.entries(themeVars).forEach(([prop, val]) => {
      root.style.setProperty(prop, val);
    });

    const accent = themeVars['--accent-primary'];
    if (accent) {
      root.style.setProperty('--border-accent', themeVars['--accent-primary-glow']);
      root.style.setProperty('--shadow-glow', `0 0 20px ${themeVars['--accent-primary-dim']}`);
      root.style.setProperty('--shadow-glow-strong', `0 0 40px ${themeVars['--accent-primary-glow']}`);
      root.style.setProperty('--text-accent', accent);
    }
    
    // Apply Granular Snake Light settings
    const areas = ['sidebar', 'cards'];
    areas.forEach(area => {
      const prefix = `${area}Snake`;
      root.style.setProperty(`--snake-color-${area}`, settings[`${prefix}Color`] || '#8B5CF6');
      root.style.setProperty(`--snake-speed-${area}`, (settings[`${prefix}Speed`] || 3) + 's');
      root.style.setProperty(`--snake-width-${area}`, (settings[`${prefix}Width`] || 2) + 'px');

      if (settings[`${prefix}Enabled`] === false) {
        document.body.classList.add(`snake-disabled-${area}`);
      } else {
        document.body.classList.remove(`snake-disabled-${area}`);
      }
    });
  }, [settings]);

  const customSections = settings.customSections || [];
  const handleAddSection = () => {
    if (!newSectionName.trim()) return;
    const newSection = {
      id: Date.now().toString(),
      name: newSectionName.trim(),
      color: newSectionColor
    };
    const updatedSections = [...customSections, newSection];
    const updatedSettings = { ...settings, customSections: updatedSections };
    setSettings(updatedSettings);
    if (window.electronAPI) {
      window.electronAPI.storeSetSync('kroma_settings', updatedSettings);
    } else {
      localStorage.setItem('kroma_settings', JSON.stringify(updatedSettings));
    }
    setNewSectionName('');
  };

  const handleDeleteSection = (id) => {
    const updatedSections = customSections.filter(s => s.id !== id);
    const updatedSettings = { ...settings, customSections: updatedSections };
    setSettings(updatedSettings);
    if (window.electronAPI) {
      window.electronAPI.storeSetSync('kroma_settings', updatedSettings);
    } else {
      localStorage.setItem('kroma_settings', JSON.stringify(updatedSettings));
    }
  };

  const handleToggleQuickTool = (toolId) => {
    const currentQuickTools = settings.quickTools || [];
    let updatedQuickTools;
    if (currentQuickTools.includes(toolId)) {
      updatedQuickTools = currentQuickTools.filter(id => id !== toolId);
    } else {
      updatedQuickTools = [...currentQuickTools, toolId];
    }
    const updatedSettings = { ...settings, quickTools: updatedQuickTools };
    setSettings(updatedSettings);
    if (window.electronAPI) {
      window.electronAPI.storeSetSync('kroma_settings', updatedSettings);
      localStorage.setItem('kroma_settings', JSON.stringify(updatedSettings));
    }
  };

  const handleUpdateQuickToolsOrder = (newQuickTools) => {
    const updatedSettings = { ...settings, quickTools: newQuickTools };
    setSettings(updatedSettings);
    if (window.electronAPI) {
      window.electronAPI.storeSetSync('kroma_settings', updatedSettings);
      localStorage.setItem('kroma_settings', JSON.stringify(updatedSettings));
    }
  };

  const handleUpdateSidebarOrder = (sectionTitle, newOrder) => {
    const currentOrders = settings.sidebarOrders || {};
    const updatedOrders = { ...currentOrders, [sectionTitle]: newOrder };
    const updatedSettings = { ...settings, sidebarOrders: updatedOrders };
    setSettings(updatedSettings);
    if (window.electronAPI) {
      window.electronAPI.storeSetSync('kroma_settings', updatedSettings);
      localStorage.setItem('kroma_settings', JSON.stringify(updatedSettings));
    }
  };

  // PERSISTENCE ENGINE: Scan /Notes directory on startup and load all supported file types
  const loadNotesFromDrive = async (dir) => {
    if (!dir) return;
    const notesDir = `${dir}/Notes`;
    console.log('[HOLE] Scanning notes from:', notesDir);

    const loadedNotes = [];

    const allFilesResult = await listFilesOnDrive(notesDir, '');
    if (allFilesResult.success) {
      for (const file of allFilesResult.files) {
        if (file.isDirectory) continue;
        
        const fileContent = await readFileDirect(file.path);
        if (!fileContent.success) continue;

        const ext = file.name.split('.').pop()?.toLowerCase();
        const title = file.name.replace(/\.[^.]+$/i, '').replace(/_/g, ' ');
        const savedAt = new Date(file.lastModified || Date.now()).toISOString();

        if (ext === 'json') {
          try {
            const data = JSON.parse(fileContent.content);
            if (data.type === 'doc' || data.content) {
              // It's a Tiptap note
              const noteId = data.id || file.name;
              loadedNotes.push({ ...data, id: noteId, filePath: file.path, renderType: 'tiptap' });
              continue;
            }
          } catch (e) {
            // Not JSON or invalid JSON, fall through to default handling
          }
        }

        const renderTypeMap = {
          md: 'markdown', markdown: 'markdown',
          html: 'html', htm: 'html',
          csv: 'csv',
          txt: 'plain', log: 'plain', rst: 'plain',
        };
        const renderType = renderTypeMap[ext] || 'code';
        const tag = ext || 'text';

        // Retrieve persisted metadata for non-tiptap files (like .md)
        let storedMetadata = { severity: 'info', tags: [tag] };
        try {
          const savedMeta = window.electronAPI ? window.electronAPI.storeGetSync('hole_file_metadata') : localStorage.getItem('hole_file_metadata');
          const metaMap = (typeof savedMeta === 'string' ? JSON.parse(savedMeta) : savedMeta) || {};
          if (metaMap[file.path]) {
            storedMetadata = { ...storedMetadata, ...metaMap[file.path] };
          }
        } catch(e) {}

        loadedNotes.push({
          id: `${renderType}_${file.name}`,
          title,
          rawContent: fileContent.content,
          html: null,
          renderType,
          metadata: storedMetadata,
          savedAt,
          filePath: file.path,
        });
      }
    }

    // Sort loaded notes alphabetically by title as requested
    loadedNotes.sort((a, b) => {
      const titleA = (a.title || '').toLowerCase();
      const titleB = (b.title || '').toLowerCase();
      return titleA.localeCompare(titleB);
    });

    console.log('[HOLE] Loaded', loadedNotes.length, 'notes from disk');
    setNotes(loadedNotes);
  };

  useEffect(() => {
    async function init() {
      // Forcefully set the storage directory to HOLE_WORKSPACE in app root every time
      let dir = getStorageDir();
      if (window.electronAPI) {
        const appPath = await window.electronAPI.getAppPath();
        const expectedDir = `${appPath}/HOLE_WORKSPACE`;
        if (dir !== expectedDir) {
          dir = expectedDir;
          localStorage.setItem('kroma_storage_dir', dir);
        }
      }
      if (dir) {
        setStorageDirState(dir);
        if (window.electronAPI?.ensureDirs) {
          window.electronAPI.ensureDirs(dir);
        }
        loadNotesFromDrive(dir);
      }
    }
    init();
  }, [fsUpdateTrigger]);

  const handlePickFolder = useCallback(async () => {
    // Disabled, now using automatic app root
  }, []);

  // Toast system
  const addToast = useCallback((message, type = 'info', action = null) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, action }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, action ? 6000 : 3000);
  }, []);

  const handleNewNote = useCallback(() => {
    setEditorNoteId(null);
    setEditorContent('');
    setEditorTitle('');
    setEditorMeta({ severity: 'info', tags: [] });
    setEditorFilePath(null);
    setActiveView('editor');
    addToast(`New note created`, 'success');
  }, [addToast]);

  const handleSaveNote = useCallback(async (noteData) => {
    let finalNote = { ...noteData };
    
    if (storageDir && window.electronAPI) {
      if (!finalNote.filePath) {
        // Brand new note without a file path
        const fileName = `${finalNote.title ? finalNote.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'untitled'}_${Date.now()}.json`;
        finalNote.filePath = `${storageDir}/Notes/${fileName}`;
        
        await window.electronAPI.saveFileDirect({
          filePath: finalNote.filePath,
          content: JSON.stringify(finalNote, null, 2)
        });
      } else {
        // Existing note being updated (e.g., from NotesList 'Move to Section' or archiving)
        // We must write the updated metadata to disk so it survives app reloads.
        // We only do this for 'tiptap' (JSON) notes, since we can't write JSON metadata into a raw .md file directly.
        if (finalNote.renderType === 'tiptap') {
          await window.electronAPI.saveFileDirect({
            filePath: finalNote.filePath,
            content: JSON.stringify(finalNote, null, 2)
          });
        }
        
        // Always persist metadata to a localStorage sidecar map so metadata for .md and .txt files survives reloads
        try {
          const savedMeta = window.electronAPI ? window.electronAPI.storeGetSync('hole_file_metadata') : localStorage.getItem('hole_file_metadata');
          const metaMap = (typeof savedMeta === 'string' ? JSON.parse(savedMeta) : savedMeta) || {};
          metaMap[finalNote.filePath] = finalNote.metadata;
          if (window.electronAPI) {
            window.electronAPI.storeSetSync('hole_file_metadata', metaMap);
          } else {
            localStorage.setItem('hole_file_metadata', JSON.stringify(metaMap));
          }
        } catch(e) {}
      }
    }

    setNotes(prev => {
      const exists = prev.findIndex(n => n.id === finalNote.id);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = finalNote;
        return updated;
      }
      return [finalNote, ...prev];
    });
  }, [storageDir]);

  const handleSelectNote = useCallback((note, targetView = 'read') => {
    if (targetView === 'editor') {
      let contentToEdit = note.content;
      if (!contentToEdit && note.rawContent) {
        const langMap = { html: 'html', plain: 'text', csv: 'csv', markdown: 'markdown' };
        const extMatch = (note.filePath || note.id).match(/\.([^.]+)$/);
        const ext = extMatch ? extMatch[1].toLowerCase() : 'text';
        const lang = note.renderType === 'html' ? 'html' : (langMap[note.renderType] || ext);
        if (lang === 'markdown' || lang === 'text') {
          // Do not double escape &gt; and &lt; if they are already present
          const textContent = note.rawContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          contentToEdit = `<p>${textContent.replace(/\n/g, '<br>')}</p>`;
        } else {
          const escapedContent = note.rawContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          contentToEdit = `<pre><code class="language-${lang}">${escapedContent}</code></pre>`;
        }
      }
      setEditorNoteId(note.id);
      setEditorContent(contentToEdit);
      setEditorTitle(note.title);
      setEditorMeta({
        severity: note.severity || note.metadata?.severity || 'info',
        tags: note.tags || note.metadata?.tags || [],
        ...note.metadata
      });
      setEditorFilePath(note.filePath || null);
      setActiveView('editor');
    } else {
      setSelectedNoteForRead(note);
      setActiveView('read');
    }
  }, []);

  // Delete note - accepts either a note object or a note ID string
  const handleDeleteNote = useCallback(async (noteOrId) => {
    const noteId = typeof noteOrId === 'string' ? noteOrId : noteOrId?.id;
    const noteObj = typeof noteOrId === 'string' ? notes.find(n => n.id === noteOrId) : noteOrId;
    setNotes(prev => prev.filter(n => n.id !== noteId));
    if (noteObj?.filePath) await deleteFileFromDrive(noteObj.filePath);
    if (activeView === 'editor') setActiveView('dashboard');
    addToast('Note deleted', 'info');
  }, [activeView, addToast, notes]);

  const getPageTitle = () => {
    if (activeView.startsWith('section-')) return 'Custom Section';
    if (activeView.startsWith('platform-')) {
      const platform = activeView.replace('platform-', '');
      return platform.charAt(0).toUpperCase() + platform.slice(1);
    }
    switch (activeView) {
      case 'dashboard': return 'Dashboard';
      case 'editor': return 'Note Editor';
      case 'read': return 'Read Note';
      case 'settings': return 'Settings';
      case 'bounty': return 'Bounty Tracker';
      case 'all-notes': return 'All Notes';
      case 'favorites': return 'Favorites';
      case 'important': return 'Important';
      case 'recent': return 'Recent Notes';
      case 'auto-detect': return 'Auto-Detect';
      case 'recon': return 'Scope Manager';
      case 'kanban': return 'Bug Kanban';
      case 'timer': return 'Time Tracker';
      case 'encoder': return 'Encoder / Decoder';
      case 'diff': return 'Diff Scope';
      case 'annotator': return 'Screenshot Annotator';
      case 'methodology': return 'Methodology Tracker';
      case 'identity': return 'Identity Generator';
      case 'recondb': return 'Workflow';
      case 'code-editor': return 'Code Studio';
      case 'cvss-calculator': return 'CVSS Calculator';
      case 'journal': return 'Hacker Journal';
      case 'parallel-reality': return 'Context Vault';
      case 'unknown-space': return 'Unknown Space';
      case 'archived-notes': return 'Archived Notes';
      case 'waf-evasion': return 'WAF Bypass';

      case 'catcher': return 'Blind Catcher';
      case 'revshell': return 'Rev Shell';
      case 'cve-mapper': return 'CVE Mapper';
      case 'ip-tracker': return 'IP Tracker';
      case 'email-headers': return 'Email Analyzer';
      case 'target-command': return 'Target Command';
      case 'recon-engine': return 'Recon Engine';
      case 'bucket-finder': return 'Bucket Finder';
      case 'favicon-hunter': return 'Favicon Hunter';
      case 'exposure-hunter': return 'Exposure Hunter';
      case 'waf-detector': return 'WAF Detector';
      case 'js-spider': return 'JS Spider';
      case 'technique-vault': return 'Technique Vault';
      case 'bounty-inboxes': return 'Bounty Inboxes';
      case 'temp-mail': return 'Temp Mail';

      case 'support': return 'About';
      default: return 'HOLE';
    }
  };

  if (showSetup) {
    return (
      <div className="setup-screen">
        <div className="setup-card">
          <div className="setup-logo-container">
            <img src="/hole-icon.jpg" alt="HOLE" className="setup-logo" />
          </div>
          <h1 className="setup-title">
            {'HOLE'.split('').map((letter, i) => (
              <span key={i} className="kroma-letter" style={{ animationDelay: `${i * 0.12}s` }}>{letter}</span>
            ))}
          </h1>
          <p className="setup-subtitle">Bug Bounty Workstation</p>

          <div className="setup-divider" />

          <h2 className="setup-heading">Welcome! Choose your storage folder</h2>
          <p className="setup-desc">
            Pick a folder on your PC where HOLE will store all your notes and data.
            A <strong>"HOLE"</strong> folder will be created inside it automatically.
            You only need to do this once.
          </p>

          <button className="btn btn-primary btn-lg setup-btn" onClick={handlePickFolder}>
            <FolderOpen size={20} />
            Choose Folder
          </button>

          <p className="setup-hint">
            <MapPin size={14} />
            Example: D:\  →  D:\HOLE\
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        notes={notes}
        onNewNote={handleNewNote}
        onSelectNote={(note) => handleSelectNote(note, 'read')}
        onDeleteNote={handleDeleteNote}
        customSections={settings.customSections || []}
        privacyMode={privacyMode}
        setPrivacyMode={setPrivacyMode}
        quickTools={settings.quickTools || []}
        onToggleQuickTool={handleToggleQuickTool}
        onUpdateQuickToolsOrder={handleUpdateQuickToolsOrder}
        sidebarOrders={settings.sidebarOrders || {}}
        onUpdateSidebarOrder={handleUpdateSidebarOrder}
      />

      <div className="main-content">
        <DonationBanner />
        <UpdateChecker />
        <div className="topbar">
          <div className="topbar-left">
            <h2 className="topbar-title">{getPageTitle()}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {(['all-notes', 'favorites', 'important', 'recent', 'archived-notes'].includes(activeView) || activeView.startsWith('section-')) && (
              <div className="topbar-search" style={{ background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', padding: '0 16px', borderRadius: 'var(--radius-full)' }}>
                <Search size={14} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes..."
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', width: '200px', fontSize: '13px' }}
                />
              </div>
            )}
            <div className="topbar-actions"><CommunityCounter /></div>
          </div>
        </div>

        <div className={`main-content-inner ${privacyMode ? 'privacy-active' : ''}`}>
          {activeView === 'dashboard' && <Dashboard notes={notes} onViewChange={setActiveView} onNewNote={handleNewNote} activeContext={activeContext} setActiveContextDirect={setActiveContextDirect} clipboardHistory={clipboardHistory} setClipboardHistory={setClipboardHistory} addToast={addToast} />}
          {['all-notes', 'favorites', 'important', 'recent', 'archived-notes'].includes(activeView) || activeView.startsWith('section-') ? (
            <NotesList 
              view={activeView}
              notes={notes}
              searchQuery={searchQuery}
              onSelectNote={handleSelectNote}
              onUpdateNote={handleSaveNote}
              onNewNote={handleNewNote}
              onDeleteNote={handleDeleteNote}
              customSections={settings.customSections || []}
              onManageSections={() => setShowSectionsModal(true)}
            />
          ) : activeView === 'read' && selectedNoteForRead ? (
            <NoteReader 
              note={selectedNoteForRead} 
              onClose={() => setActiveView('dashboard')} 
              showSearchOverlay={showSearchOverlay}
              setShowSearchOverlay={setShowSearchOverlay}
            />
          ) : activeView === 'editor' ? (
            <NoteEditor
              key={editorTitle + (editorMeta?.severity || '')}
              initialId={editorNoteId}
              initialContent={editorContent}
              initialTitle={editorTitle}
              initialMeta={editorMeta}
              initialFilePath={editorFilePath}
              onSaveNote={handleSaveNote}
              settings={settings}
            />
          ) : null}
          {activeView === 'settings' && <SettingsPage settings={settings} onSettingsChange={setSettings} />}
          {activeView === 'payloads' && <PayloadLibrary storageDir={storageDir} fsUpdateTrigger={fsUpdateTrigger} />}
          {activeView === 'bounty' && <BountyTracker />}
          {activeView === 'auto-detect' && <StringAnalyzer />}
          {activeView === 'recon' && <ReconWorkspace />}
          {activeView === 'kanban' && <KanbanBoard />}
          <div style={{ display: activeView === 'timer' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <TimeTracker storageDir={storageDir} fsUpdateTrigger={fsUpdateTrigger} />
          </div>
          {activeView === 'encoder' && <EncoderDecoder />}
          {activeView === 'diff' && <DiffScope />}
          {activeView === 'annotator' && <ScreenshotAnnotator />}
          {activeView === 'methodology' && <MethodologyTracker storageDir={storageDir} fsUpdateTrigger={fsUpdateTrigger} />}
          {activeView === 'identity' && <IdentityGenerator />}
          {activeView === 'recondb' && <ReconDatabase storageDir={storageDir} fsUpdateTrigger={fsUpdateTrigger} />}
          {activeView === 'code-editor' && <CodeEditor />}
          {activeView === 'cvss-calculator' && <CVSSCalculator />}
          {activeView === 'journal' && <HackerJournal storageDir={storageDir} fsUpdateTrigger={fsUpdateTrigger} />}
          {activeView === 'parallel-reality' && <ParallelReality storageDir={storageDir} fsUpdateTrigger={fsUpdateTrigger} />}
          {activeView === 'unknown-space' && <UnknownSpace storageDir={storageDir} fsUpdateTrigger={fsUpdateTrigger} />}
          <div style={{ display: activeView === 'tor-mode' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <TorMode />
          </div>

          <div style={{ display: activeView === 'terminal' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <TerminalView />
          </div>
          {activeView === 'waf-evasion' && <WAFEvasion />}

          <div style={{ display: activeView === 'jwt-forger' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <JWTForger />
          </div>
          <div style={{ display: activeView === 'crypto-stego' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <CryptoStego />
          </div>
          <div style={{ display: activeView === 'graphql-visualizer' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <GraphQLVisualizer />
          </div>
          <div style={{ display: activeView === 'secret-sniper' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <SecretSniper />
          </div>
          <div style={{ display: activeView === 'cors-exploit' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <CORSExploit />
          </div>
          <div style={{ display: activeView === 'revshell' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <ReverseShell />
          </div>
          <div style={{ display: activeView === 'cve-mapper' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <CVEMapper />
          </div>
          <div style={{ display: activeView === 'ip-tracker' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <IPTracker />
          </div>
          <div style={{ display: activeView === 'email-headers' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <EmailHeaderAnalyzer />
          </div>
          <div style={{ display: activeView === 'target-command' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <TargetCommand storageDir={storageDir} fsUpdateTrigger={fsUpdateTrigger} />
          </div>
          <div style={{ display: activeView === 'recon-engine' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <ReconEngine storageDir={storageDir} fsUpdateTrigger={fsUpdateTrigger} />
          </div>
          <div style={{ display: activeView === 'bucket-finder' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <BucketFinder />
          </div>
          <div style={{ display: activeView === 'favicon-hunter' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <FaviconHunter />
          </div>
          <div style={{ display: activeView === 'exposure-hunter' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <ExposureHunter />
          </div>
          <div style={{ display: activeView === 'waf-detector' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <WAFDetector />
          </div>
          <div style={{ display: activeView === 'js-spider' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <JSSpider />
          </div>
          <div style={{ display: activeView === 'technique-vault' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <TechniqueVault />
          </div>
          <div style={{ display: activeView === 'bounty-inboxes' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <BountyInboxes />
          </div>
          <div style={{ display: activeView === 'temp-mail' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <TempMail />
          </div>
          <div style={{ display: activeView === 'sonar' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <SonarCatcher />
          </div>

          <div style={{ display: activeView === 'blog' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <BlogSection setActiveView={setActiveView} setViewId={setViewId} />
          </div>
          <div style={{ display: activeView === 'blog-reader' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            {activeView === 'blog-reader' && <BlogReader setActiveView={setActiveView} viewId={viewId} setViewId={setViewId} />}
          </div>
          <div style={{ display: activeView === 'labs' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <LabSection setActiveView={setActiveView} setViewId={setViewId} />
          </div>
          <div style={{ display: activeView === 'lab-runner' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            {activeView === 'lab-runner' && <LabRunner setActiveView={setActiveView} viewId={viewId} setViewId={setViewId} />}
          </div>

          {activeView === 'support' && <SupportPage />}
        </div>
      </div>

      {showSectionsModal && (
        <div className="modal-overlay" onClick={() => setShowSectionsModal(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '480px', background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)' }}>
            
            <div style={{ padding: '24px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontWeight: 800, fontSize: '18px', margin: 0, color: 'var(--text-primary)' }}>Manage Custom Sections</h2>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Create custom categories for your bug bounty notes.</p>
              </div>
              <button onClick={() => setShowSectionsModal(false)} style={{ background: 'var(--bg-deep)', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', background: 'var(--bg-deep)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Section Name</label>
                  <input 
                    type="text" 
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="e.g. Exploits, Payloads..."
                    style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Color</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', width: '100px' }}>
                    {['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'].map(c => (
                      <div 
                        key={c}
                        style={{ 
                          width: '24px', height: '24px', borderRadius: '6px', backgroundColor: c, cursor: 'pointer',
                          boxShadow: newSectionColor === c ? `0 0 0 2px var(--bg-deep), 0 0 0 4px ${c}` : 'none',
                          opacity: newSectionColor === c ? 1 : 0.6,
                          transition: 'all 0.2s'
                        }}
                        onClick={() => setNewSectionColor(c)}
                      />
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button onClick={handleAddSection} style={{ padding: '10px', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(59, 130, 246, 0.4)' }}>
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Your Sections</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }}>
                {customSections.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', background: 'var(--bg-deep)', borderRadius: '12px', border: '1px dashed var(--border-subtle)' }}>
                    <FolderOpen size={32} style={{ opacity: 0.3, marginBottom: '12px', margin: '0 auto' }} />
                    <span style={{ display: 'block', fontSize: '14px', fontWeight: 600 }}>No custom sections yet</span>
                    <span style={{ fontSize: '12px' }}>Create one above to organize your notes.</span>
                  </div>
                ) : (
                  customSections.map(section => (
                    <div key={section.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-deep)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-default)', transition: 'all 0.2s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: section.color, boxShadow: `0 0 10px ${section.color}` }} />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{section.name}</span>
                      </div>
                      <button 
                        onClick={() => handleDeleteSection(section.id)}
                        style={{ padding: '6px', background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', opacity: 0.7 }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                        title="Delete Section"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div style={{ padding: '16px 24px', background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSectionsModal(false)} style={{ padding: '8px 24px', background: 'var(--bg-deep)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`toast toast-${toast.type} ${toast.action ? 'toast-clickable' : ''}`}
              onClick={() => {
                if (toast.action) {
                  toast.action();
                  setToasts(prev => prev.filter(t => t.id !== toast.id));
                }
              }}
            >
              {toast.message}
              {toast.action && (
                <span style={{ marginLeft: '8px', opacity: 0.7, fontSize: '11px' }}>Click to act</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Global Search Overlay (Disabled for reader because it is rendered inside NoteReader to support native fullscreen) */}
      {showSearchOverlay && (activeView === 'editor' || activeView === 'read') && (
        <SearchOverlay 
          onClose={() => setShowSearchOverlay(false)} 
          targetView={activeView}
        />
      )}
    </div>
  );
}
