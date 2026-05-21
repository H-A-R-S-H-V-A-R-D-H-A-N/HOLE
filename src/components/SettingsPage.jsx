import { useState } from 'react';
import {
  Settings as SettingsIcon,
  Palette,
  Type,
  Save,
  FolderOpen,
  Keyboard,
  Shield,
  Info,
  Monitor,
  Bell,
  Key,
  Trash2,
  Eye,
  EyeOff,
  CloudUpload,
  CloudDownload,
  Share,
  HardDrive
} from 'lucide-react';
import { getStorageDir, pickStorageFolder, listFilesOnDrive, readFileDirect } from '../utils/fileSystem';
import '../styles/Settings.css';

const defaultSettings = {
  fontSize: 15,
  lineHeight: 1.8,
  spellCheck: true,
  autoSave: true,
  autoSaveInterval: 30,
  showLineNumbers: false,
  showWordCount: true,
  defaultFormat: 'json',
  theme: 'midnight',
  editorFont: 'Inter',
  monoFont: 'JetBrains Mono',
  askSaveLocation: true,
  notifications: true,
  clipboardMonitor: true,
};

const shortcuts = [
  { label: 'Bold', keys: ['Ctrl', 'B'] },
  { label: 'Italic', keys: ['Ctrl', 'I'] },
  { label: 'Underline', keys: ['Ctrl', 'U'] },
  { label: 'Undo', keys: ['Ctrl', 'Z'] },
  { label: 'Redo', keys: ['Ctrl', 'Y'] },
  { label: 'Save', keys: ['Ctrl', 'S'] },
  { label: 'Code Block', keys: ['Ctrl', 'Alt', 'C'] },
  { label: 'Heading 1', keys: ['Ctrl', 'Alt', '1'] },
  { label: 'Heading 2', keys: ['Ctrl', 'Alt', '2'] },
  { label: 'Bullet List', keys: ['Ctrl', 'Shift', '8'] },
  { label: 'Task List', keys: ['Ctrl', 'Shift', '9'] },
  { label: 'Blockquote', keys: ['Ctrl', 'Shift', 'B'] },
];

export default function SettingsPage({ settings: propSettings, onSettingsChange }) {
  const [settings, setSettings] = useState({ ...defaultSettings, ...propSettings });

  const updateSetting = (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    if (onSettingsChange) onSettingsChange(updated);
    localStorage.setItem('kroma_settings', JSON.stringify(updated));
  };

  const updateApiKey = (platform, key) => {
    const currentKeys = settings.apiKeys || {};
    const updatedKeys = { ...currentKeys, [platform]: key };
    updateSetting('apiKeys', updatedKeys);
  };

  const deleteApiKey = (platform) => {
    const currentKeys = settings.apiKeys || {};
    const updatedKeys = { ...currentKeys };
    delete updatedKeys[platform];
    updateSetting('apiKeys', updatedKeys);
  };

  const [showKey, setShowKey] = useState({});
  const toggleKeyVisibility = (platform) => {
    setShowKey(prev => ({ ...prev, [platform]: !prev[platform] }));
  };

  const apiKeys = settings.apiKeys || {};

  const handleExportVault = async () => {
    // Export everything in localStorage that belongs to HOLE
    const backup = { localData: {}, notes: [] };
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('kroma_') || key.startsWith('hole_'))) {
        backup.localData[key] = localStorage.getItem(key);
      }
    }
    
    // Export all physical notes
    const storageDir = getStorageDir();
    if (storageDir && window.electronAPI) {
      const notesResult = await listFilesOnDrive(`${storageDir}/Notes`, '.json');
      if (notesResult.success && notesResult.files) {
        for (const file of notesResult.files) {
          if (file.isDirectory) continue;
          const fileContent = await readFileDirect(file.path);
          if (fileContent.success) {
            backup.notes.push({ name: file.name, content: fileContent.content });
          }
        }
      }
    }

    const content = JSON.stringify(backup, null, 2);
    
    if (window.electronAPI) {
      const result = await window.electronAPI.saveFile({ 
        content,
        suggestedName: `Hole_Backup_${new Date().toISOString().split('T')[0]}.hole`,
        filters: [{ name: 'HOLE Backup', extensions: ['hole'] }]
      });
      if (result.success) alert("Vault Exported Successfully!");
    } else {
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Hole_Backup_${new Date().toISOString().split('T')[0]}.hole`;
      a.click();
    }
  };

  const handleImportVault = async () => {
    if (!window.electronAPI) return alert("Desktop app required for easy import.");
    const result = await window.electronAPI.openFile({
      properties: ['openFile'],
      filters: [{ name: 'HOLE Backup', extensions: ['hole', 'json'] }]
    });
    
    if (result.success && result.content) {
      try {
        const backup = JSON.parse(result.content);
        
        // Handle backwards compatibility (if it was an old backup format)
        const isNewFormat = backup.localData !== undefined;
        const localData = isNewFormat ? backup.localData : backup;
        
        for (const [key, val] of Object.entries(localData)) {
          if (key.startsWith('kroma_') || key.startsWith('hole_')) {
            localStorage.setItem(key, val);
          }
        }
        
        // Restore notes
        if (backup.notes && backup.notes.length > 0) {
          const storageDir = getStorageDir();
          if (storageDir) {
            for (const note of backup.notes) {
              await window.electronAPI.saveFileDirect({
                filePath: `${storageDir}/Notes/${note.name}`,
                content: note.content
              });
            }
          }
        }
        
        alert("Vault imported successfully! Reloading HOLE to apply changes...");
        window.location.reload();
      } catch (err) {
        alert("Invalid backup file.");
      }
    }
  };

  const handleExportPackage = async () => {
    const pkg = {
      notes: localStorage.getItem('hole_notes'),
      methodology: localStorage.getItem('hole_methodology'),
      recondb: localStorage.getItem('hole_recondb'),
      kanban: localStorage.getItem('hole_kanban'),
      payloads: localStorage.getItem('hole_payloads')
    };
    const content = JSON.stringify(pkg, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Hole_Project_${new Date().toISOString().split('T')[0]}.bounty`;
    a.click();
  };

  const handleImportPackage = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.bounty,.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const pkg = JSON.parse(e.target.result);
          if (pkg.notes) localStorage.setItem('hole_notes', pkg.notes);
          if (pkg.methodology) localStorage.setItem('hole_methodology', pkg.methodology);
          if (pkg.recondb) localStorage.setItem('hole_recondb', pkg.recondb);
          if (pkg.kanban) localStorage.setItem('hole_kanban', pkg.kanban);
          if (pkg.payloads) localStorage.setItem('hole_payloads', pkg.payloads);
          alert("Project Package imported successfully! Reloading HOLE...");
          window.location.reload();
        } catch {
          alert("Invalid .bounty package file.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleChangeStorage = async () => {
    const result = await pickStorageFolder();
    if (result.success) {
      alert("Storage folder updated successfully! HOLE will now reload.");
      window.location.reload();
    }
  };

  return (
    <div className="settings-page page-enter">
      <div className="settings-header">
        <h1 className="settings-title">⚙️ Settings</h1>
        <p className="settings-subtitle">Customize your HOLE experience</p>
      </div>

      <div className="settings-sections">
        {/* Editor Settings */}
        <div className="settings-section">
          <div className="settings-section-header">
            <Type size={20} className="settings-section-icon" />
            <h2 className="settings-section-title">Editor</h2>
          </div>

          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Font Size</span>
              <span className="settings-row-desc">Adjust the editor text size (12–24px)</span>
            </div>
            <input
              type="number"
              className="settings-input"
              value={settings.fontSize}
              min={12}
              max={24}
              onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
            />
          </div>

          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Line Height</span>
              <span className="settings-row-desc">Space between lines (1.4–2.4)</span>
            </div>
            <input
              type="number"
              className="settings-input"
              value={settings.lineHeight}
              min={1.4}
              max={2.4}
              step={0.1}
              onChange={(e) => updateSetting('lineHeight', parseFloat(e.target.value))}
            />
          </div>



          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Show Word Count</span>
              <span className="settings-row-desc">Display word and character count in the editor footer</span>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={settings.showWordCount} onChange={(e) => updateSetting('showWordCount', e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>

        {/* Save & Export Settings */}
        <div className="settings-section">
          <div className="settings-section-header">
            <Save size={20} className="settings-section-icon" />
            <h2 className="settings-section-title">Save & Export</h2>
          </div>



          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Default Export Format</span>
              <span className="settings-row-desc">The default file format when saving</span>
            </div>
            <select
              className="settings-select"
              value={settings.defaultFormat}
              onChange={(e) => updateSetting('defaultFormat', e.target.value)}
            >
              <option value="json">HOLE JSON (.json)</option>
              <option value="md">Markdown (.md)</option>
              <option value="html">HTML (.html)</option>
            </select>
          </div>


        </div>



        {/* Appearance */}
        <div className="settings-section">
          <div className="settings-section-header">
            <Palette size={20} className="settings-section-icon" />
            <h2 className="settings-section-title">Appearance</h2>
          </div>

          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Theme</span>
              <span className="settings-row-desc">Choose your visual theme</span>
            </div>
            <select
              className="settings-select"
              value={settings.theme}
              onChange={(e) => updateSetting('theme', e.target.value)}
            >
              <option value="ultra-black">Ultra Black</option>
              <option value="clean-white">Clean White</option>
            </select>
          </div>
        </div>

        {/* App Effects */}
        <div className="settings-section">
          <div className="settings-section-header">
            <Monitor size={20} className="settings-section-icon" />
            <h2 className="settings-section-title">App Effects (Snake Light)</h2>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>Customize the animated glowing borders for different areas of your workstation.</p>
          
          {['sidebar', 'cards'].map((area) => {
            const labels = {
              sidebar: 'Sidebar Snake Light',
              cards: 'All Panels & Cards Snake Light'
            };
            const prefix = `${area}Snake`;
            const enabled = settings[`${prefix}Enabled`] ?? true;
            
            return (
              <div key={area} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-default)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: enabled ? '16px' : '0' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{labels[area]}</h3>
                  <label className="toggle">
                    <input type="checkbox" checked={enabled} onChange={(e) => updateSetting(`${prefix}Enabled`, e.target.checked)} />
                    <span className="toggle-slider" />
                  </label>
                </div>

                {enabled && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Glow Color</span>
                      <input
                        type="color"
                        value={settings[`${prefix}Color`] || '#8B5CF6'}
                        onChange={(e) => updateSetting(`${prefix}Color`, e.target.value)}
                        style={{ width: '32px', height: '32px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                      />
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Speed (1-10s)</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          type="range" min="1" max="10" step="0.5"
                          value={settings[`${prefix}Speed`] || 3}
                          onChange={(e) => updateSetting(`${prefix}Speed`, parseFloat(e.target.value))}
                          style={{ width: '100px' }}
                        />
                        <span style={{ fontSize: '12px', width: '24px', textAlign: 'right' }}>{settings[`${prefix}Speed`] || 3}s</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Width (1-10px)</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          type="range" min="1" max="10" step="1"
                          value={settings[`${prefix}Width`] || 2}
                          onChange={(e) => updateSetting(`${prefix}Width`, parseInt(e.target.value))}
                          style={{ width: '100px' }}
                        />
                        <span style={{ fontSize: '12px', width: '24px', textAlign: 'right' }}>{settings[`${prefix}Width`] || 2}px</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sync & Backup Settings */}
        <div className="settings-section">
          <div className="settings-section-header">
            <CloudDownload size={20} className="settings-section-icon" />
            <h2 className="settings-section-title">Data Sync & Backup</h2>
          </div>

          <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
              Securely export your entire workspace (settings, payloads, drafts) to a local <code>.hole</code> backup file. You can import this file on any other PC to pick up exactly where you left off, without ever sending your data to a cloud server!
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={handleExportVault}>
                <CloudUpload size={16} /> Export Vault Backup
              </button>
              <button className="btn btn-primary" onClick={handleImportVault}>
                <CloudDownload size={16} /> Import Vault Backup
              </button>
            </div>
          </div>
        </div>

        {/* About & PRO Upsell */}
        <div className="settings-section" style={{ border: '1px solid rgba(124, 58, 237, 0.3)', background: 'rgba(124, 58, 237, 0.03)' }}>
          <div className="settings-section-header">
            <Shield size={20} className="settings-section-icon" style={{ color: '#7c3aed' }} />
            <h2 className="settings-section-title" style={{ color: '#7c3aed', fontWeight: '600' }}>HOLE PRO — The Ultimate Arsenal</h2>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6' }}>
            <p style={{ marginBottom: '16px' }}>Ready to take your bug bounty game to the elite level? <strong>HOLE PRO</strong> is the fully-unlocked version of the workstation, packed with exclusive high-end features designed for professional security researchers.</p>
            
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Premium Features Included:</h4>
              <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                <li>✓ CVE Mapper</li>
                <li>✓ Advanced IP Tracker</li>
                <li>✓ Email Header Analyzer</li>
                <li>✓ Infrastructure Harvester</li>
                <li>✓ Cloud Bucket Finder</li>
                <li>✓ Favicon Hunter</li>
                <li>✓ Exposure Hunter</li>
                <li>✓ WAF Detector & Bypasser</li>
                <li style={{ gridColumn: '1 / -1', color: '#10b981' }}>✓ Direct Priority Support from the Developer</li>
              </ul>
              <p style={{ marginTop: '12px', fontSize: '12px', fontStyle: 'italic', color: '#a78bfa' }}>...and many more premium features coming exclusively for PRO users!</p>
            </div>

            <p style={{ marginBottom: '16px' }}><strong>Lifetime Access. Pay once, own it forever.</strong></p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <strong style={{ color: '#10b981' }}>Special Launch Offer: 50% OFF for the first 50 users!</strong>
              <span>To purchase your PRO license, send an email to:</span>
              <code style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '4px', userSelect: 'all', cursor: 'pointer', color: '#fff' }}>harshvardhansinghrathore611@gmail.com</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
