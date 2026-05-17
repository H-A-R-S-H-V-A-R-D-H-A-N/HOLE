import { useState, useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Code2, Copy, Save, FolderOpen, Trash2, CheckCircle2, FileCode, Search, FileText, Plus, X, FolderPlus, Folder, ChevronRight, ChevronDown, Database } from 'lucide-react';
import { getStorageDir, readFileDirect } from '../utils/fileSystem';
import ConfirmModal from './ConfirmModal';
import PromptModal from './PromptModal';
import '../styles/Tools.css';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', ext: 'js' },
  { id: 'typescript', label: 'TypeScript', ext: 'ts' },
  { id: 'python', label: 'Python', ext: 'py' },
  { id: 'go', label: 'Go', ext: 'go' },
  { id: 'rust', label: 'Rust', ext: 'rs' },
  { id: 'cpp', label: 'C++', ext: 'cpp' },
  { id: 'c', label: 'C', ext: 'c' },
  { id: 'csharp', label: 'C#', ext: 'cs' },
  { id: 'java', label: 'Java', ext: 'java' },
  { id: 'php', label: 'PHP', ext: 'php' },
  { id: 'ruby', label: 'Ruby', ext: 'rb' },
  { id: 'swift', label: 'Swift', ext: 'swift' },
  { id: 'kotlin', label: 'Kotlin', ext: 'kt' },
  { id: 'bash', label: 'Bash', ext: 'sh' },
  { id: 'powershell', label: 'PowerShell', ext: 'ps1' },
  { id: 'json', label: 'JSON', ext: 'json' },
  { id: 'html', label: 'HTML', ext: 'html' },
  { id: 'css', label: 'CSS', ext: 'css' },
  { id: 'sql', label: 'SQL', ext: 'sql' },
  { id: 'yaml', label: 'YAML', ext: 'yaml' },
  { id: 'xml', label: 'XML', ext: 'xml' },
  { id: 'markdown', label: 'Markdown', ext: 'md' },
  { id: 'plaintext', label: 'Text', ext: 'txt' },
  { id: 'dockerfile', label: 'Dockerfile', ext: 'Dockerfile' },
  { id: 'ini', label: 'ENV / INI', ext: 'env' },
];

export default function CodeEditor() {
  const [code, setCode] = useState(() => localStorage.getItem('kroma_ide_code') || '// Write your code here...');
  const [language, setLanguage] = useState(() => localStorage.getItem('kroma_ide_lang') || 'javascript');
  const [copied, setCopied] = useState(false);
  
  // Repo & Tree State
  const [repos, setRepos] = useState([]);
  const [currentRepo, setCurrentRepo] = useState(() => localStorage.getItem('kroma_ide_repo') || null);
  const [fileTree, setFileTree] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [selectedFolder, setSelectedFolder] = useState(null); // Path of currently selected folder
  
  const [currentFile, setCurrentFile] = useState(null);
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [showLangSelect, setShowLangSelect] = useState(false);
  const [showRepoSelect, setShowRepoSelect] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  
  const [confirmState, setConfirmState] = useState(null);
  const [promptState, setPromptState] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');
  const editorRef = useRef(null);

  const loadRepos = useCallback(async () => {
    const dir = getStorageDir();
    if (dir && window.electronAPI?.listTree) {
      const codeDir = `${dir}\\Code`;
      const result = await window.electronAPI.listTree(codeDir);
      if (result.success) {
        // Find top-level directories
        const repoList = result.tree.filter(item => item.isDirectory);
        setRepos(repoList);
        
        // If current repo no longer exists or none selected, pick the first one
        if (!currentRepo || !repoList.find(r => r.path === currentRepo)) {
          if (repoList.length > 0) {
            setCurrentRepo(repoList[0].path);
          } else {
            setCurrentRepo(null);
            setFileTree([]);
          }
        }
      }
    }
  }, [currentRepo]);

  const loadTree = useCallback(async () => {
    if (!currentRepo || !window.electronAPI?.listTree) return;
    const result = await window.electronAPI.listTree(currentRepo);
    if (result.success) {
      setFileTree(result.tree);
      // Auto-expand root
      setExpandedFolders(prev => ({ ...prev, [currentRepo]: true }));
    }
  }, [currentRepo]);

  // Initial load
  useEffect(() => {
    loadRepos();
  }, []);

  // When repos or current repo changes, save and load tree
  useEffect(() => {
    if (currentRepo) {
      localStorage.setItem('kroma_ide_repo', currentRepo);
      setSelectedFolder(currentRepo);
      loadTree();
    } else {
      localStorage.removeItem('kroma_ide_repo');
      setFileTree([]);
    }
  }, [currentRepo, loadTree]);

  // Reload when explorer toggles open
  useEffect(() => {
    if (explorerOpen) loadTree();
  }, [explorerOpen, loadTree]);

  // Editor states
  const handleEditorChange = (value) => setCode(value || '');
  useEffect(() => localStorage.setItem('kroma_ide_code', code), [code]);
  useEffect(() => localStorage.setItem('kroma_ide_lang', language), [language]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monaco.editor.defineTheme('kroma-pro-black', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff79c6' },
        { token: 'identifier', foreground: 'f8f8f2' },
        { token: 'string', foreground: 'f1fa8c' },
        { token: 'number', foreground: 'bd93f9' },
        { token: 'operator', foreground: '50fa7b' },
      ],
      colors: {
        'editor.background': '#000000',
        'editor.foreground': '#F8F8F2',
        'editor.lineHighlightBackground': '#111111',
        'editor.selectionBackground': '#44475a55',
        'editorCursor.foreground': '#3B82F6',
        'editorLineNumber.foreground': '#44475a',
        'editorLineNumber.activeForeground': '#3B82F6',
        'editorIndentGuide.background': '#111111',
        'editor.border': '#111111',
      }
    });
    monaco.editor.setTheme('kroma-pro-black');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFolder = (path) => {
    setExpandedFolders(prev => ({ ...prev, [path]: !prev[path] }));
    setSelectedFolder(path);
  };

  const handleFileClick = async (file) => {
    const result = await readFileDirect(file.path);
    if (result.success) {
      setCode(result.content);
      setCurrentFile(file.path);
      const ext = file.name.split('.').pop();
      const matched = LANGUAGES.find(l => l.ext === ext);
      if (matched) setLanguage(matched.id);
    }
  };

  // Create Repo (or open an existing one)
  const handleCreateRepo = async () => {
    const res = await window.electronAPI.pickDirectory();
    if (res.success && res.path) {
      // Add the chosen directory as a repo if it's not already in the list
      setRepos(prev => {
        if (!prev.find(r => r.path === res.path)) {
          return [...prev, { name: res.path.split(/[\\/]/).pop(), path: res.path, isDirectory: true }];
        }
        return prev;
      });
      setCurrentRepo(res.path);
    }
  };

  // Create Folder
  const handleCreateFolder = async () => {
    if (!currentRepo) {
      const res = await window.electronAPI.pickDirectory();
      if (!res.success) return;
      setPromptState({
        title: 'New Folder',
        message: `Create folder in ${res.path}:`,
        defaultValue: 'new_folder',
        onConfirm: async (name) => {
          setPromptState(null);
          if (!name) return;
          const newPath = `${res.path}\\${name}`;
          await window.electronAPI.createDir(newPath);
          alert(`Created folder: ${newPath}`);
        }
      });
      return;
    }
    const targetDir = selectedFolder || currentRepo;
    
    setPromptState({
      title: 'New Folder',
      message: `Create folder in ${targetDir.split('\\').pop()}:`,
      defaultValue: 'new_folder',
      onConfirm: async (name) => {
        setPromptState(null);
        if (!name) return;
        const newPath = `${targetDir}\\${name}`;
        await window.electronAPI.createDir(newPath);
        // Expand the parent so we can see the new folder
        setExpandedFolders(prev => ({ ...prev, [targetDir]: true }));
        loadTree();
      }
    });
  };

  // SAVE
  const handleSave = async () => {
    if (!window.electronAPI) return;
    
    if (currentFile) {
      await window.electronAPI.saveFileDirect({ filePath: currentFile, content: code });
      setSaveStatus('Saved!');
      setTimeout(() => setSaveStatus(''), 2000);
      loadTree();
    } else {
      const lang = LANGUAGES.find(l => l.id === language);
      const defaultName = `script.${lang ? lang.ext : 'txt'}`;

      if (!currentRepo) {
        const result = await window.electronAPI.saveFile({ content: code, suggestedName: defaultName });
        if (result.success) {
          setCurrentFile(result.path);
          setSaveStatus('Saved!');
          setTimeout(() => setSaveStatus(''), 2000);
        }
        return;
      }
      
      const targetDir = selectedFolder || currentRepo;
      
      setPromptState({
        title: 'Save File',
        message: `Enter filename (saving to ${targetDir.split('\\').pop()}):`,
        defaultValue: defaultName,
        onConfirm: async (fileName) => {
          setPromptState(null);
          const filePath = `${targetDir}\\${fileName}`;
          await window.electronAPI.saveFileDirect({ filePath, content: code });
          setCurrentFile(filePath);
          setExpandedFolders(prev => ({ ...prev, [targetDir]: true }));
          setSaveStatus('Saved!');
          setTimeout(() => setSaveStatus(''), 2000);
          loadTree();
        }
      });
    }
  };

  // IMPORT
  const handleOpenFile = async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.openFile({
      filters: [{ name: 'All Files', extensions: ['*'] }]
    });
    if (result.success) {
      setCode(result.content);
      
      // If we are in a repo, save a copy there
      if (currentRepo) {
        const targetDir = selectedFolder || currentRepo;
        const destPath = `${targetDir}\\${result.name}`;
        await window.electronAPI.saveFileDirect({ filePath: destPath, content: result.content });
        setCurrentFile(destPath);
        setExpandedFolders(prev => ({ ...prev, [targetDir]: true }));
        loadTree();
      } else {
        setCurrentFile(result.path);
      }
      
      const ext = result.name.split('.').pop();
      const matched = LANGUAGES.find(l => l.ext === ext);
      if (matched) setLanguage(matched.id);
    }
  };

  // DELETE
  const handleDeleteNode = (nodePath, isDirectory) => {
    setConfirmState({
      title: `Delete ${isDirectory ? 'Folder' : 'File'}`,
      message: `Are you sure you want to delete ${nodePath.split('\\').pop()}?`,
      onConfirm: async () => {
        if (isDirectory) {
          await window.electronAPI.deleteDir(nodePath);
          if (selectedFolder === nodePath) setSelectedFolder(currentRepo);
          if (nodePath === currentRepo) {
             setCurrentRepo(null);
             loadRepos();
          }
        } else {
          await window.electronAPI.deleteFile(nodePath);
          if (currentFile === nodePath) {
            setCode('');
            setCurrentFile(null);
          }
        }
        loadTree();
        setConfirmState(null);
      }
    });
  };

  // Render tree recursively
  const renderTree = (nodes, level = 0) => {
    if (!nodes) return null;
    
    // Sort directories first
    const sorted = [...nodes].sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return sorted.filter(n => n.name.toLowerCase().includes(fileSearchQuery.toLowerCase())).map((node) => {
      const isExpanded = expandedFolders[node.path];
      const isSelectedDir = selectedFolder === node.path;
      
      if (node.isDirectory) {
        return (
          <div key={node.path}>
            <div 
              className={`pro-file-item ${isSelectedDir ? 'active-folder' : ''}`}
              style={{ paddingLeft: `${16 + level * 12}px` }}
              onClick={(e) => { e.stopPropagation(); toggleFolder(node.path); }}
            >
              {isExpanded ? <ChevronDown size={14} style={{ marginRight: '4px', opacity: 0.5 }} /> : <ChevronRight size={14} style={{ marginRight: '4px', opacity: 0.5 }} />}
              <Folder size={14} style={{ marginRight: '8px', color: '#EAB308', fill: isExpanded ? '#EAB308' : 'none' }} />
              <span style={{ flex: 1, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {node.name}
              </span>
              <Trash2 size={12} className="pro-tree-action hover-only" onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.path, true); }} />
            </div>
            {isExpanded && node.children && renderTree(node.children, level + 1)}
          </div>
        );
      } else {
        return (
          <div 
            key={node.path} 
            className={`pro-file-item ${currentFile === node.path ? 'active' : ''}`}
            style={{ paddingLeft: `${36 + level * 12}px` }}
            onClick={(e) => { e.stopPropagation(); handleFileClick(node); }}
          >
            <FileCode size={14} style={{ marginRight: '8px', opacity: 0.7 }} />
            <span style={{ flex: 1, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={node.name}>
              {node.name}
            </span>
            <Trash2 size={12} className="pro-tree-action hover-only" onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.path, false); }} />
          </div>
        );
      }
    });
  };

  return (
    <div className="tool-page page-enter" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <div className="tool-header" style={{ marginBottom: '16px' }}>
        <div className="tool-header-left">
          <div className="pro-icon-glow">
            <Code2 size={28} color="var(--accent-primary)" />
          </div>
          <div>
            <h1 className="tool-title" style={{ letterSpacing: '1px' }}>CODE STUDIO PRO</h1>
            <p className="tool-subtitle">Elite Integrated Development Environment for Vulnerability Research.</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Repo Selector */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <div className="pro-select-wrapper" style={{ position: 'relative' }}>
              <Database size={14} className="pro-select-icon" />
              <div 
                className="pro-select" 
                onClick={() => setShowRepoSelect(!showRepoSelect)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: '120px', justifyContent: 'space-between' }}
              >
                <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                  {currentRepo ? currentRepo.split('\\').pop() : 'No Repo'}
                </span>
                <span style={{ fontSize: '10px', opacity: 0.5 }}>▼</span>
              </div>
              {showRepoSelect && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setShowRepoSelect(false)} />
                  <div className="pro-select-dropdown">
                    <div className="pro-select-option" style={{ color: 'var(--accent-primary)', fontWeight: 600 }} onClick={() => { handleCreateRepo(); setShowRepoSelect(false); }}>
                      <Plus size={12} style={{ display: 'inline', marginRight: '6px' }}/> New Repository...
                    </div>
                    {repos.length > 0 && <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />}
                    {repos.map(repo => (
                      <div 
                        key={repo.path} 
                        className={`pro-select-option ${currentRepo === repo.path ? 'selected' : ''}`}
                        onClick={() => { setCurrentRepo(repo.path); setShowRepoSelect(false); }}
                      >
                        {repo.name}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            {currentRepo && (
              <button 
                className="pro-action-btn delete" 
                style={{ padding: '6px', borderRadius: '8px' }} 
                onClick={() => handleDeleteNode(currentRepo, true)} 
                title="Delete Repository"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>

          <div className="pro-toolbar-sep" />

          {currentFile && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentFile.split('\\Code\\').pop()}
            </span>
          )}
          <div className="pro-select-wrapper" style={{ position: 'relative' }}>
            <FileCode size={14} className="pro-select-icon" />
            <div 
              className="pro-select" 
              onClick={() => setShowLangSelect(!showLangSelect)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: '80px', justifyContent: 'space-between' }}
            >
              <span>{LANGUAGES.find(l => l.id === language)?.label || 'Select'}</span>
              <span style={{ fontSize: '10px', opacity: 0.5 }}>▼</span>
            </div>
            {showLangSelect && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setShowLangSelect(false)} />
                <div className="pro-select-dropdown">
                  {LANGUAGES.map(lang => (
                    <div 
                      key={lang.id} 
                      className={`pro-select-option ${language === lang.id ? 'selected' : ''}`}
                      onClick={() => { setLanguage(lang.id); setShowLangSelect(false); }}
                    >
                      {lang.label}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          
          <div className="pro-toolbar-sep" />
          
          <div className="pro-action-group">
            <button className="pro-action-btn" onClick={handleSave} title="Save (Ctrl+S)">
              {saveStatus ? <CheckCircle2 size={16} color="#10B981" /> : <Save size={16} />}
            </button>
            {saveStatus && <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>{saveStatus}</span>}
            <button className="pro-action-btn" onClick={handleOpenFile} title="Import File to Repo">
              <FolderOpen size={16} />
            </button>
            <button className="pro-action-btn" onClick={handleCopy} title="Copy Code">
              {copied ? <CheckCircle2 size={16} color="#10B981" /> : <Copy size={16} />}
            </button>
            <button className="pro-action-btn delete" onClick={() => {
              if (currentFile) {
                handleDeleteNode(currentFile, false);
              } else {
                setCode('');
              }
            }} title={currentFile ? "Delete File" : "Clear Terminal"}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="pro-editor-container">
        {/* Activity Bar */}
        <div className="pro-editor-sidebar">
          <div className={`pro-sidebar-item ${explorerOpen ? 'active' : ''}`} onClick={() => setExplorerOpen(!explorerOpen)} title="Explorer">
            <FileText size={18} />
          </div>
          <div className="pro-sidebar-item" onClick={handleOpenFile} title="Import File">
            <FolderOpen size={18} />
          </div>
        </div>

        {/* Explorer Panel */}
        {explorerOpen && (
          <div className="pro-explorer-panel">
            <div className="pro-explorer-header" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {currentRepo ? currentRepo.split('\\').pop() : 'Explorer'}
                </span>
                <div style={{ display: 'flex', gap: '2px' }}>
                  <button 
                    className="pro-sidebar-item" 
                    style={{ padding: '4px', fontSize: 0 }} 
                    title="New File"
                    onClick={() => {
                      setCode('');
                      setCurrentFile(null);
                    }}
                  >
                    <Plus size={14} />
                  </button>
                  <button 
                    className="pro-sidebar-item" 
                    style={{ padding: '4px', fontSize: 0 }} 
                    title="New Folder"
                    onClick={handleCreateFolder}
                  >
                    <FolderPlus size={14} />
                  </button>
                  <button 
                    className="pro-sidebar-item" 
                    style={{ padding: '4px', fontSize: 0 }} 
                    title="Import from PC"
                    onClick={handleOpenFile}
                  >
                    <FolderOpen size={14} />
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-tertiary)', borderRadius: '4px', padding: '4px 8px' }}>
                <Search size={12} style={{ color: 'var(--text-muted)', marginRight: '6px' }} />
                <input 
                  type="text" 
                  placeholder="Search files..." 
                  value={fileSearchQuery}
                  onChange={(e) => setFileSearchQuery(e.target.value)}
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '12px', width: '100%' }}
                />
              </div>
            </div>
            <div 
              className="pro-explorer-content"
              onClick={() => setSelectedFolder(currentRepo)} // Click empty space to target root
            >
              {!currentRepo ? (
                 <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Database size={32} style={{ opacity: 0.5, marginBottom: '12px', display: 'inline-block' }} />
                  <p style={{ fontSize: '12px', lineHeight: 1.5 }}>
                    No repository selected.
                  </p>
                  <button className="btn btn-primary btn-sm" style={{ marginTop: '12px', width: '100%' }} onClick={handleCreateRepo}>
                    Create Repository
                  </button>
                </div>
              ) : fileTree.length === 0 ? (
                <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <FolderOpen size={32} style={{ opacity: 0.5, marginBottom: '12px', display: 'inline-block' }} />
                  <p style={{ fontSize: '12px', lineHeight: 1.5 }}>
                    This repo is empty.
                  </p>
                  <button className="btn btn-secondary btn-sm" style={{ marginTop: '12px', width: '100%' }} onClick={handleCreateFolder}>
                    New Folder
                  </button>
                </div>
              ) : (
                <div className="pro-file-list">
                  {renderTree(fileTree)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Editor */}
        <div className="pro-editor-main">
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              fontFamily: '"Fira Code", Consolas, "Courier New", monospace',
              fontLigatures: true,
              wordWrap: 'on',
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: 'expand',
              cursorSmoothCaretAnimation: 'on',
              formatOnPaste: true,
              padding: { top: 16, bottom: 16 },
              backgroundColor: '#000000',
              suggestOnTriggerCharacters: true,
            }}
          />
        </div>
      </div>
      
      <style>{`
        .pro-icon-glow {
          background: var(--accent-primary-dim);
          padding: 8px;
          border-radius: 12px;
          box-shadow: 0 0 20px var(--accent-primary-dim);
        }
        .pro-select-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          padding: 0 12px;
        }
        .pro-select-icon {
          color: var(--text-muted);
          margin-right: 8px;
        }
        .pro-select {
          background: transparent;
          border: none;
          color: var(--text-primary);
          padding: 8px 4px;
          font-size: 13px;
          font-weight: 500;
          outline: none;
          cursor: pointer;
        }
        .pro-select-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          width: 100%;
          min-width: 150px;
          max-height: 300px;
          overflow-y: auto;
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          z-index: 1000;
          margin-top: 4px;
        }
        .pro-select-option {
          padding: 8px 12px;
          font-size: 13px;
          cursor: pointer;
          color: var(--text-secondary);
        }
        .pro-select-option:hover, .pro-select-option.selected {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .pro-toolbar-sep {
          width: 1px;
          height: 24px;
          background: var(--border-subtle);
        }
        .pro-action-group {
          display: flex;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          overflow: hidden;
        }
        .pro-action-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          padding: 8px 12px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
        }
        .pro-action-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .pro-action-btn.delete:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #EF4444;
        }
        .pro-editor-container {
          flex: 1;
          display: flex;
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          overflow: hidden;
          background: #000000;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .pro-editor-sidebar {
          width: 48px;
          background: #050505;
          border-right: 1px solid #111;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 16px;
          gap: 16px;
        }
        .pro-sidebar-item {
          color: #444;
          cursor: pointer;
          transition: color 0.2s;
          padding: 8px;
          border-radius: 8px;
        }
        .pro-sidebar-item:hover, .pro-sidebar-item.active {
          color: var(--accent-primary);
        }
        .pro-explorer-panel {
          width: 250px;
          background: #0A0A0A;
          border-right: 1px solid #111;
          display: flex;
          flex-direction: column;
        }
        .pro-explorer-header {
          padding: 12px 16px;
          border-bottom: 1px solid #111;
          color: #888;
        }
        .pro-explorer-content {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
        }
        .pro-file-list {
          padding: 8px 0;
        }
        .pro-file-item {
          display: flex;
          align-items: center;
          padding: 6px 16px;
          cursor: pointer;
          color: var(--text-secondary);
          transition: background 0.2s, color 0.2s;
        }
        .pro-file-item:hover, .pro-file-item.active {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }
        .pro-file-item.active-folder {
          background: rgba(59, 130, 246, 0.1);
        }
        .pro-tree-action {
          opacity: 0;
          transition: opacity 0.2s;
          color: var(--text-muted);
        }
        .pro-file-item:hover .pro-tree-action {
          opacity: 1;
        }
        .pro-tree-action:hover {
          color: #EF4444;
        }
        .pro-editor-main {
          flex: 1;
          min-width: 0;
        }
      `}</style>

      {confirmState && (
        <ConfirmModal
          title={confirmState.title}
          message={confirmState.message}
          confirmText="Delete"
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}

      {promptState && (
        <PromptModal
          title={promptState.title}
          message={promptState.message}
          defaultValue={promptState.defaultValue}
          onConfirm={promptState.onConfirm}
          onCancel={() => setPromptState(null)}
        />
      )}
    </div>
  );
}
