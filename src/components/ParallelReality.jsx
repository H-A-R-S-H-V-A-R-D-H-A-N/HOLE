import { useState, useEffect } from 'react';
import { Columns3, Plus, Trash2, Save, Type, Code, Key, AlignLeft, GripVertical, Settings2, Shield, Lock, Fingerprint, Database } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { readFileDirect } from '../utils/fileSystem';
import '../styles/Tools.css';

export default function ParallelReality({ storageDir, fsUpdateTrigger }) {
  const [contexts, setContexts] = useState([]);
  const [saveStatus, setSaveStatus] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [confirmState, setConfirmState] = useState(null);

  const getVaultPath = () => {
    return storageDir ? `${storageDir}\\ContextVault\\data.json` : null;
  };

  useEffect(() => {
    const loadVault = async () => {
      const path = getVaultPath();
      if (!path) {
        setIsLoaded(true);
        return;
      }
      const result = await readFileDirect(path);
      if (result.success) {
        try {
          const data = JSON.parse(result.content);
          if (data.contexts && data.contexts.length > 0) {
            // Migrate old contexts to new dynamic fields format
            const migrated = data.contexts.map(ctx => {
              if (ctx.fields) return ctx; // Already migrated
              
              // Map old static fields to dynamic fields
              const fields = [];
              if (ctx.role) fields.push({ id: 'f1', label: 'Target Role / User', value: ctx.role, type: 'text', icon: 'shield' });
              if (ctx.token) fields.push({ id: 'f2', label: 'Auth Token / Cookie', value: ctx.token, type: 'code', icon: 'lock' });
              if (ctx.payload) fields.push({ id: 'f3', label: 'Example Request / Data', value: ctx.payload, type: 'code', icon: 'code' });
              if (ctx.notes) fields.push({ id: 'f4', label: 'Context Notes', value: ctx.notes, type: 'textarea', icon: 'text' });
              
              return { id: ctx.id, name: ctx.name, fields };
            });
            setContexts(migrated);
          } else {
            initializeDefaultContexts();
          }
        } catch (e) {
          initializeDefaultContexts();
        }
      } else {
        initializeDefaultContexts();
      }
      setIsLoaded(true);
    };
    loadVault();
  }, [storageDir, fsUpdateTrigger]);

  const initializeDefaultContexts = () => {
    setContexts([
      { 
        id: '1', 
        name: 'Admin Context', 
        fields: [
          { id: 'f1', label: 'Target Role', value: 'Administrator', type: 'text', icon: 'shield' },
          { id: 'f2', label: 'Auth Token', value: 'eyJhbG...', type: 'code', icon: 'lock' }
        ]
      }
    ]);
  };

  useEffect(() => {
    if (!isLoaded || !storageDir) return;
    const saveVault = async () => {
      const path = getVaultPath();
      if (!path || !window.electronAPI) return;
      setSaveStatus('saving');
      try {
        await window.electronAPI.saveFileDirect({
          filePath: path,
          content: JSON.stringify({ version: '2.0', contexts }, null, 2)
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(''), 2000);
      } catch (e) {
        setSaveStatus('error');
      }
    };
    const timer = setTimeout(saveVault, 500);
    return () => clearTimeout(timer);
  }, [contexts, isLoaded, storageDir]);

  const addContext = () => {
    const newCtx = {
      id: Date.now().toString(),
      name: `New Context ${contexts.length + 1}`,
      fields: [
        { id: Date.now() + '1', label: 'Auth Token', value: '', type: 'code', icon: 'lock' }
      ]
    };
    setContexts([...contexts, newCtx]);
  };

  const removeContext = (id) => {
    setConfirmState({
      title: 'Delete Context',
      message: 'Are you sure you want to delete this entire context and all its fields?',
      onConfirm: () => {
        setContexts(contexts.filter(c => c.id !== id));
        setConfirmState(null);
      }
    });
  };

  const updateContextName = (id, name) => {
    setContexts(contexts.map(c => c.id === id ? { ...c, name } : c));
  };

  const addField = (contextId) => {
    setContexts(contexts.map(c => {
      if (c.id === contextId) {
        return {
          ...c,
          fields: [...c.fields, { id: Date.now().toString(), label: 'New Field', value: '', type: 'text', icon: 'text' }]
        };
      }
      return c;
    }));
  };

  const updateField = (contextId, fieldId, updates) => {
    setContexts(contexts.map(c => {
      if (c.id === contextId) {
        return {
          ...c,
          fields: c.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f)
        };
      }
      return c;
    }));
  };

  const removeField = (contextId, fieldId) => {
    setConfirmState({
      title: 'Delete Field',
      message: 'Are you sure you want to delete this field?',
      onConfirm: () => {
        setContexts(contexts.map(c => {
          if (c.id === contextId) {
            return { ...c, fields: c.fields.filter(f => f.id !== fieldId) };
          }
          return c;
        }));
        setConfirmState(null);
      }
    });
  };

  const renderIcon = (iconName) => {
    switch (iconName) {
      case 'shield': return <Shield size={14} />;
      case 'lock': return <Lock size={14} />;
      case 'key': return <Key size={14} />;
      case 'code': return <Code size={14} />;
      case 'fingerprint': return <Fingerprint size={14} />;
      default: return <AlignLeft size={14} />;
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="tool-page page-enter" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0 20px 0', borderBottom: '1px solid var(--border-default)', marginBottom: '20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)' }}>
            <Columns3 size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.5px' }}>Context Vault</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Fully dynamic multi-role context comparison.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={addContext}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 0 15px rgba(245, 158, 11, 0.3)',
              transition: 'all 0.2s'
            }}
          >
            <Plus size={16} /> Add Context
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, overflowX: 'auto', paddingBottom: '20px' }}>
        {contexts.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: 'var(--text-muted)', gap: '16px' }}>
            <Database size={48} style={{ opacity: 0.2 }} />
            <p style={{ fontSize: '14px', fontWeight: 500 }}>No contexts saved. Create one to start storing multi-role data.</p>
          </div>
        ) : (
          contexts.map(ctx => (
            <div key={ctx.id} style={{
              flex: '0 0 360px',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-secondary)',
              borderRadius: '14px',
              border: '1px solid var(--border-default)',
              overflow: 'hidden'
            }}>
              {/* Context Header */}
              <div style={{ padding: '16px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <input
                  value={ctx.name}
                  onChange={(e) => updateContextName(ctx.id, e.target.value)}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', color: '#F59E0B',
                    fontSize: '16px', fontWeight: 800, outline: 'none'
                  }}
                />
                <button
                  onClick={() => removeContext(ctx.id)}
                  style={{ padding: '6px', background: '#EF444420', borderRadius: '6px', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Context Body - Dynamic Fields */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {ctx.fields.map((field) => (
                  <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }} className="vault-field-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ color: '#F59E0B', background: '#F59E0B20', padding: '4px', borderRadius: '4px' }}>
                          {renderIcon(field.icon)}
                        </div>
                        <input
                          value={field.label}
                          onChange={(e) => updateField(ctx.id, field.id, { label: e.target.value })}
                          style={{
                            background: 'transparent', border: 'none', color: 'var(--text-primary)',
                            fontSize: '13px', fontWeight: 700, outline: 'none', textTransform: 'uppercase', letterSpacing: '0.5px'
                          }}
                        />
                      </div>
                      
                      <div className="field-actions" style={{ display: 'flex', gap: '4px', opacity: 1, transition: 'opacity 0.2s' }}>
                        <select 
                          value={field.icon} 
                          onChange={(e) => updateField(ctx.id, field.id, { icon: e.target.value })}
                          style={{ background: 'var(--bg-deep)', color: 'var(--text-muted)', border: '1px solid var(--border-default)', borderRadius: '4px', fontSize: '11px', outline: 'none' }}
                        >
                          <option value="text">Text Icon</option>
                          <option value="lock">Lock Icon</option>
                          <option value="shield">Shield Icon</option>
                          <option value="code">Code Icon</option>
                          <option value="fingerprint">Fingerprint Icon</option>
                          <option value="key">Key Icon</option>
                        </select>
                        <select 
                          value={field.type} 
                          onChange={(e) => updateField(ctx.id, field.id, { type: e.target.value })}
                          style={{ background: 'var(--bg-deep)', color: 'var(--text-muted)', border: '1px solid var(--border-default)', borderRadius: '4px', fontSize: '11px', outline: 'none' }}
                        >
                          <option value="text">Single Line</option>
                          <option value="textarea">Multi Line</option>
                          <option value="code">Code Block</option>
                        </select>
                        <button onClick={() => removeField(ctx.id, field.id)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '2px' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {field.type === 'text' ? (
                      <input
                        value={field.value}
                        onChange={(e) => updateField(ctx.id, field.id, { value: e.target.value })}
                        placeholder="Enter value..."
                        style={{
                          width: '100%', padding: '10px 12px', background: 'var(--bg-deep)',
                          border: '1px solid var(--border-default)', borderRadius: '8px',
                          color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box'
                        }}
                      />
                    ) : (
                      <textarea
                        value={field.value}
                        onChange={(e) => updateField(ctx.id, field.id, { value: e.target.value })}
                        placeholder="Enter value..."
                        rows={field.type === 'code' ? 4 : 3}
                        style={{
                          width: '100%', padding: '10px 12px', background: 'var(--bg-deep)',
                          border: '1px solid var(--border-default)', borderRadius: '8px',
                          color: field.type === 'code' ? '#10B981' : 'var(--text-primary)', 
                          fontSize: '13px', fontFamily: field.type === 'code' ? 'monospace' : 'inherit',
                          resize: 'vertical', outline: 'none', boxSizing: 'border-box', wordBreak: field.type === 'code' ? 'break-all' : 'normal'
                        }}
                      />
                    )}
                  </div>
                ))}

                <button 
                  onClick={() => addField(ctx.id)}
                  style={{ 
                    marginTop: '8px', padding: '10px', background: 'transparent', border: '1px dashed var(--border-subtle)', 
                    borderRadius: '8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  <Plus size={14} /> Add Custom Field
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .vault-field-group:hover .field-actions { opacity: 1 !important; }
      `}</style>
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
