import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Globe, Trash2, Edit, Check, X } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { readFileDirect } from '../utils/fileSystem';
import '../styles/Tools.css';

export default function UnknownSpace({ storageDir, fsUpdateTrigger }) {
  const [mysteries, setMysteries] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const [activeTab, setActiveTab] = useState('investigating');
  const [isAdding, setIsAdding] = useState(false);
  
  const [form, setForm] = useState({ id: null, title: '', anomaly: '', hypothesis: '', context: '', status: 'investigating' });
  const [confirmState, setConfirmState] = useState(null);

  const getSpacePath = () => {
    return storageDir ? `${storageDir}/UnknownSpace/data.json` : null;
  };

  useEffect(() => {
    const loadSpace = async () => {
      const path = getSpacePath();
      if (!path) {
        setIsLoaded(true);
        return;
      }
      try {
        const result = await readFileDirect(path);
        if (result.success) {
          const parsed = JSON.parse(result.content);
          if (parsed && Array.isArray(parsed)) {
            setMysteries(parsed);
          }
        }
      } catch (e) {
        console.warn('Failed to parse UnknownSpace:', e);
      }
      setIsLoaded(true);
    };
    loadSpace();
  }, [storageDir, fsUpdateTrigger]);

  // Explicit save helper — no auto-save to avoid chokidar infinite loop
  const saveSpace = async (updatedMysteries) => {
    const path = getSpacePath();
    if (!path || !window.electronAPI) return;
    setSaveStatus('saving');
    try {
      await window.electronAPI.saveFileDirect({
        filePath: path,
        content: JSON.stringify(updatedMysteries, null, 2)
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (e) {
      setSaveStatus('error');
    }
  };

  const handleSave = () => {
    if (!form.title.trim()) return;

    let updated;
    if (form.id) {
      updated = mysteries.map(m => m.id === form.id ? { ...m, ...form, updatedAt: Date.now() } : m);
    } else {
      updated = [{
        id: Date.now().toString(),
        ...form,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }, ...mysteries];
    }
    setMysteries(updated);
    saveSpace(updated);
    
    setIsAdding(false);
    setForm({ id: null, title: '', anomaly: '', hypothesis: '', context: '', status: 'investigating' });
  };

  const handleDelete = (id) => {
    setConfirmState({
      title: 'Delete Mystery',
      message: 'Are you sure you want to delete this entry?',
      onConfirm: () => {
        const updated = mysteries.filter(m => m.id !== id);
        setMysteries(updated);
        saveSpace(updated);
        setConfirmState(null);
      }
    });
  };

  const updateStatus = (id, newStatus) => {
    const updated = mysteries.map(m => m.id === id ? { ...m, status: newStatus, updatedAt: Date.now() } : m);
    setMysteries(updated);
    saveSpace(updated);
  };

  const openEdit = (mystery) => {
    setForm({ ...mystery }); // ensure full copy
    setIsAdding(true);
  };

  // Ensure robust filtering based on activeTab
  const filteredMysteries = mysteries.filter(m => (m.status || 'investigating') === activeTab);

  return (
    <div className="tool-page page-enter" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)' }}>
      <div className="tool-header" style={{ marginBottom: '16px', flexShrink: 0 }}>
        <div className="tool-header-left">
          <AlertTriangle size={28} />
          <div>
            <h1 className="tool-title">Unknown Space</h1>
            <p className="tool-subtitle">Structured uncertainty tracker. Don't lose track of weird behavior.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {saveStatus && (
            <span style={{ fontSize: '12px', color: saveStatus === 'saved' ? '#10B981' : saveStatus === 'error' ? '#EF4444' : 'var(--text-muted)' }}>
              {saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Error Saving' : 'Saving...'}
            </span>
          )}
          <button className="btn btn-primary" onClick={() => { setForm({ id: null, title: '', anomaly: '', hypothesis: '', context: '', status: activeTab }); setIsAdding(true); }}>
            <Plus size={16} /> Track Anomaly
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)', marginBottom: '24px', flexShrink: 0 }}>
        {['investigating', 'parked', 'exploitable', 'false_positive'].map(tab => (
          <div 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 24px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
              textTransform: 'capitalize'
            }}
          >
            {tab.replace('_', ' ')} ({mysteries.filter(m => (m.status || 'investigating') === tab).length})
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
        {isAdding && (
          <div className="settings-card" style={{ padding: '24px', marginBottom: '24px', borderLeft: '3px solid var(--accent-primary)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>{form.id ? 'Edit Anomaly' : 'Log New Anomaly'}</h3>
            
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label className="tool-label">Title / Endpoint</label>
                <input 
                  className="tool-input" 
                  value={form.title} 
                  onChange={(e) => setForm({...form, title: e.target.value})} 
                  placeholder="e.g. Weird 403 on /api/internal"
                />
              </div>
              <div>
                <label className="tool-label">Initial Status</label>
                <select 
                  className="settings-select" 
                  value={form.status} 
                  onChange={(e) => setForm({...form, status: e.target.value})}
                  style={{ height: '42px' }}
                >
                  <option value="investigating">Investigating</option>
                  <option value="parked">Parked</option>
                  <option value="exploitable">Exploitable (Resolved)</option>
                  <option value="false_positive">False Positive</option>
                </select>
              </div>
            </div>

            <label className="tool-label">The Anomaly (What happened?)</label>
            <textarea 
              className="tool-textarea" 
              value={form.anomaly} 
              onChange={(e) => setForm({...form, anomaly: e.target.value})} 
              placeholder="When I send a valid JWT but change the case of the token, it returns a blank 200 instead of 401..."
              rows={3}
              style={{ marginBottom: '16px' }}
            />

            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label className="tool-label">Hypothesis (Why?)</label>
                <textarea 
                  className="tool-textarea" 
                  value={form.hypothesis} 
                  onChange={(e) => setForm({...form, hypothesis: e.target.value})} 
                  placeholder="Maybe they do a case-insensitive check but the upstream parser fails..."
                  rows={3}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="tool-label">Context / HTTP Snippet</label>
                <textarea 
                  className="tool-textarea code-font" 
                  value={form.context} 
                  onChange={(e) => setForm({...form, context: e.target.value})} 
                  placeholder="GET /api/v1/user HTTP/1.1\n..."
                  rows={3}
                  style={{ fontSize: '12px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setIsAdding(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>{form.id ? 'Save Changes' : 'Log Anomaly'}</button>
            </div>
          </div>
        )}

        {filteredMysteries.length === 0 && !isAdding ? (
          <div className="recon-empty" style={{ marginTop: '40px' }}>
            <Globe size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            No anomalies found in this sector.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredMysteries.map(m => (
              <div key={m.id} className="settings-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{m.title}</h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-icon" onClick={() => openEdit(m)} title="Edit"><Edit size={16} /></button>
                    <button className="btn-icon" onClick={() => handleDelete(m.id)} style={{ color: 'var(--accent-red)' }} title="Delete"><Trash2 size={16} /></button>
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'var(--bg-deep)', borderRadius: 'var(--radius-md)', borderLeft: '2px solid var(--text-muted)' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>The Anomaly</span>
                  <p style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{m.anomaly}</p>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  {m.hypothesis && (
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Hypothesis</span>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{m.hypothesis}</p>
                    </div>
                  )}
                  {m.context && (
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Context Snippet</span>
                      <pre className="code-font" style={{ margin: 0, padding: '8px', background: 'var(--bg-deep)', borderRadius: '4px', fontSize: '12px', overflowX: 'auto', color: 'var(--text-secondary)' }}>
                        {m.context}
                      </pre>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-default)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Logged: {new Date(m.createdAt).toLocaleDateString()}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select 
                      className="settings-select" 
                      value={m.status || 'investigating'} 
                      onChange={(e) => updateStatus(m.id, e.target.value)}
                      style={{ padding: '4px 24px 4px 12px', fontSize: '12px', height: '28px' }}
                    >
                      <option value="investigating">Investigating</option>
                      <option value="parked">Parked</option>
                      <option value="exploitable">Exploitable (Resolved)</option>
                      <option value="false_positive">False Positive</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {confirmState && (
        <ConfirmModal
          title={confirmState.title}
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}
