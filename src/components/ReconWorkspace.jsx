import { useState, useEffect } from 'react';
import { Target, Plus, Trash2, ExternalLink, ShieldCheck, ShieldOff, Globe, X, Download, Upload, Save } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import PromptModal from './PromptModal';
import { saveToFile, openFile } from '../utils/fileSystem';
import '../styles/Tools.css';

export default function ReconWorkspace() {
  const [workspaces, setWorkspaces] = useState(() => {
    try { 
      const saved = JSON.parse(localStorage.getItem('kroma_recon_workspaces') || '[]');
      if (saved.length > 0) return saved;
    } catch {}
    return [{ id: 'default', name: 'Target 1', targets: [] }];
  });
  
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(workspaces[0]?.id || 'default');
  const [confirmState, setConfirmState] = useState(null);
  const [promptState, setPromptState] = useState(null);

  const [newUrl, setNewUrl] = useState('');
  const [newScope, setNewScope] = useState('in-scope');
  const [newNotes, setNewNotes] = useState('');

  useEffect(() => {
    localStorage.setItem('kroma_recon_workspaces', JSON.stringify(workspaces));
  }, [workspaces]);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  const handleAddWorkspace = () => {
    setPromptState({
      title: 'New Tab',
      message: 'Enter a name for this target workspace:',
      defaultValue: `Target ${workspaces.length + 1}`,
      onConfirm: (name) => {
        const id = Date.now().toString();
        setWorkspaces(prev => [...prev, { id, name, targets: [] }]);
        setActiveWorkspaceId(id);
        setPromptState(null);
      }
    });
  };

  const handleRemoveWorkspace = (e, id, name) => {
    e.stopPropagation();
    if (workspaces.length === 1) return;
    setConfirmState({
      title: "Delete Tab",
      message: `Are you sure you want to delete "${name}"?`,
      onConfirm: () => {
        const updated = workspaces.filter(w => w.id !== id);
        setWorkspaces(updated);
        if (activeWorkspaceId === id) setActiveWorkspaceId(updated[0].id);
        setConfirmState(null);
      }
    });
  };

  const updateTargets = (updater) => {
    setWorkspaces(prev => prev.map(w => 
      w.id === activeWorkspaceId ? { ...w, targets: updater(w.targets) } : w
    ));
  };

  const addTarget = () => {
    if (!newUrl.trim()) return;
    updateTargets(targets => [...targets, {
      id: Date.now().toString(),
      url: newUrl.trim(),
      scope: newScope,
      notes: newNotes.trim(),
      addedAt: new Date().toISOString(),
    }]);
    setNewUrl('');
    setNewNotes('');
  };

  const removeTarget = (target) => {
    setConfirmState({
      title: "Delete Target",
      message: `Delete target "${target.url}"?`,
      onConfirm: () => {
        updateTargets(targets => targets.filter(t => t.id !== target.id));
        setConfirmState(null);
      }
    });
  };

  const toggleScope = (id) => {
    updateTargets(targets => targets.map(t =>
      t.id === id ? { ...t, scope: t.scope === 'in-scope' ? 'out-of-scope' : 'in-scope' } : t
    ));
  };

  const inScope = activeWorkspace?.targets.filter(t => t.scope === 'in-scope') || [];
  const outScope = activeWorkspace?.targets.filter(t => t.scope === 'out-of-scope') || [];

  const handleExport = async () => {
    const data = JSON.stringify(workspaces, null, 2);
    const result = await saveToFile(data, 'recon_workspace.kroma', [{ description: 'KROMA Recon File', accept: { 'application/json': ['.kroma', '.json'] } }]);
    if (result.success) {
      setPromptState({
        title: 'Success',
        message: 'Workspace exported successfully to PC.',
        onConfirm: () => setPromptState(null),
        onCancel: () => setPromptState(null)
      });
    }
  };

  const handleImport = async () => {
    const result = await openFile([{ description: 'KROMA Recon File', accept: { 'application/json': ['.kroma', '.json'] } }]);
    if (result.success) {
      try {
        const data = JSON.parse(result.content);
        if (Array.isArray(data) && data.length > 0 && data[0].targets) {
          setWorkspaces(data);
          setActiveWorkspaceId(data[0].id);
        } else {
          throw new Error('Invalid format');
        }
      } catch (e) {
        setPromptState({
          title: 'Error',
          message: 'Invalid or corrupted workspace file.',
          onConfirm: () => setPromptState(null),
          onCancel: () => setPromptState(null)
        });
      }
    }
  };

  return (
    <div className="tool-page page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div className="tool-header" style={{ paddingBottom: '0', borderBottom: 'none', flexShrink: 0 }}>
        <div className="tool-header-left">
          <Target size={28} />
          <div>
            <h1 className="tool-title">Recon Workspace</h1>
            <p className="tool-subtitle">Manage in-scope and out-of-scope targets</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={handleImport} title="Load from PC">
            <Upload size={16} /> Import
          </button>
          <button className="btn btn-secondary" onClick={handleExport} title="Save to PC">
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* Internal Tabs */}
      <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-default)', overflowX: 'auto', flexShrink: 0 }}>
        {workspaces.map(w => (
          <div 
            key={w.id} 
            className={`recon-tab ${activeWorkspaceId === w.id ? 'active' : ''}`}
            onClick={() => setActiveWorkspaceId(w.id)}
            style={{
              padding: '12px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              borderBottom: activeWorkspaceId === w.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
              background: activeWorkspaceId === w.id ? 'var(--bg-primary)' : 'transparent',
              color: activeWorkspaceId === w.id ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: '13px', fontWeight: 600, minWidth: '120px', justifyContent: 'space-between'
            }}
          >
            <span>{w.name}</span>
            {workspaces.length > 1 && (
              <X size={14} className="recon-tab-close" onClick={(e) => handleRemoveWorkspace(e, w.id, w.name)} style={{ opacity: 0.5 }} />
            )}
          </div>
        ))}
        <div 
          onClick={handleAddWorkspace}
          style={{ padding: '12px 16px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
        >
          <Plus size={16} />
        </div>
      </div>

      <div style={{ padding: '24px', flex: 1, overflowY: 'auto', minHeight: 0, paddingBottom: '80px' }}>
        {/* Add Target Form */}
        <div className="recon-add-form" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
            <input
              className="tool-input"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://target.example.com"
              onKeyDown={(e) => e.key === 'Enter' && addTarget()}
              style={{ flex: 1 }}
            />
            <select
              className="settings-select"
              value={newScope}
              onChange={(e) => setNewScope(e.target.value)}
              style={{ minWidth: '130px' }}
            >
              <option value="in-scope">In Scope</option>
              <option value="out-of-scope">Out of Scope</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <input
              className="tool-input"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Notes (optional)..."
              style={{ flex: 1 }}
              onKeyDown={(e) => e.key === 'Enter' && addTarget()}
            />
            <button className="btn btn-primary" onClick={addTarget}>
              <Plus size={16} /> Add 
            </button>
          </div>
        </div>

        {/* Scope Sections */}
        <div className="recon-grid">
          <div className="recon-column">
            <div className="recon-column-header recon-in-scope">
              <ShieldCheck size={18} />
              <span>In Scope ({inScope.length})</span>
            </div>
            {inScope.length === 0 && (
              <div className="recon-empty">No in-scope targets added yet</div>
            )}
            {inScope.map(t => (
              <div key={t.id} className="recon-target-card recon-card-in">
                <div className="recon-target-url">
                  <Globe size={14} />
                  <a href={t.url} target="_blank" rel="noopener noreferrer" className="recon-link">{t.url}</a>
                  <ExternalLink size={12} style={{ color: 'var(--text-muted)' }} />
                </div>
                {t.notes && <p className="recon-target-notes">{t.notes}</p>}
                <div className="recon-target-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleScope(t.id)} title="Move to Out of Scope">
                    <ShieldOff size={14} /> Out-of-Scope
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => removeTarget(t)} style={{ color: 'var(--accent-red)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="recon-column">
            <div className="recon-column-header recon-out-scope">
              <ShieldOff size={18} />
              <span>Out of Scope ({outScope.length})</span>
            </div>
            {outScope.length === 0 && (
              <div className="recon-empty">No out-of-scope targets</div>
            )}
            {outScope.map(t => (
              <div key={t.id} className="recon-target-card recon-card-out">
                <div className="recon-target-url">
                  <Globe size={14} />
                  <span className="recon-link-disabled">{t.url}</span>
                </div>
                {t.notes && <p className="recon-target-notes">{t.notes}</p>}
                <div className="recon-target-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleScope(t.id)} title="Move to In Scope">
                    <ShieldCheck size={14} /> In-Scope
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => removeTarget(t)} style={{ color: 'var(--accent-red)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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

      <style>{`
        .recon-tab:hover {
          background: rgba(255, 255, 255, 0.05) !important;
        }
        .recon-tab-close:hover {
          opacity: 1 !important;
          color: var(--accent-red);
        }
      `}</style>
    </div>
  );
}
