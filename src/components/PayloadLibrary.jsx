import { useState, useEffect, useMemo, useTransition } from 'react';
import { Copy, Plus, Trash2, Search, Edit2, Code, Terminal, Database, FileCode, Zap, Layers, Folder, AlertCircle, Check, Globe } from 'lucide-react';
import { defaultPayloads, DEFAULT_CATEGORIES } from '../data/defaultPayloads';
import ConfirmModal from './ConfirmModal';
import PromptModal from './PromptModal';

const CAT_ICONS = {
  'Cross-Site Scripting (XSS)': Code,
  'SQL Injection (SQLi)': Database,
  'Remote Code Execution (RCE)': Terminal,
  'Local File Inclusion (LFI)': Folder,
  'XML External Entity (XXE)': FileCode,
  'Server-Side Template Injection (SSTI)': Layers,
  'Insecure Direct Object Reference (IDOR)': Zap,
  'Server-Side Request Forgery (SSRF)': Globe,
};

export default function PayloadLibrary({ storageDir, fsUpdateTrigger }) {
  const [payloads, setPayloads] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const [isAdding, setIsAdding] = useState(false);
  const [newPayload, setNewPayload] = useState({ id: null, title: '', category: '', payload: '', notes: '' });

  const [confirmState, setConfirmState] = useState(null);
  const [promptState, setPromptState] = useState(null);
  const [isPending, startTransition] = useTransition();

  const getPayloadsPath = () => {
    return storageDir ? `${storageDir}/Payloads/data.json` : null;
  };

  useEffect(() => {
    const loadPayloads = async () => {
      const path = getPayloadsPath();
      if (!path) {
        setPayloads(defaultPayloads);
        setIsLoaded(true);
        return;
      }
      try {
        const result = await window.electronAPI.readFileDirect(path);
        if (result.success) {
          const parsed = JSON.parse(result.content);
          if (parsed && Array.isArray(parsed) && parsed.length > 0) {
            setPayloads(parsed);
            setIsLoaded(true);
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to parse Payloads:', e);
      }
      // No file or empty — start clean
      setPayloads([]);
      setIsLoaded(true);
    };
    loadPayloads();
  }, [storageDir, fsUpdateTrigger]);

  const savePayloads = async (newPayloads) => {
    setPayloads(newPayloads);
    const path = getPayloadsPath();
    if (path && window.electronAPI) {
      await window.electronAPI.saveFileDirect({
        filePath: path,
        content: JSON.stringify(newPayloads, null, 2)
      });
    }
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id) => {
    setConfirmState({
      title: 'Delete Payload',
      message: 'Are you sure you want to delete this payload?',
      onConfirm: () => {
        savePayloads(payloads.filter(p => p.id !== id));
        setConfirmState(null);
      }
    });
  };

  const handleSave = () => {
    if (!newPayload.title || !newPayload.payload) return;
    
    let updated;
    if (newPayload.id) {
      updated = payloads.map(p => p.id === newPayload.id ? { ...newPayload } : p);
    } else {
      updated = [...payloads, { ...newPayload, id: Date.now().toString() }];
    }
    
    savePayloads(updated);
    setIsAdding(false);
    setNewPayload({ id: null, title: '', category: activeCategory, payload: '', notes: '' });
  };

  const openEdit = (payload) => {
    setNewPayload(payload);
    setIsAdding(true);
  };

  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  useEffect(() => {
    // Sync dynamic categories from payloads
    if (payloads.length > 0) {
      const cats = new Set([...DEFAULT_CATEGORIES, ...payloads.map(p => p.category)]);
      const catsArray = [...cats];
      setCategories(catsArray);
      if (!activeCategory && catsArray.length > 0) {
        setActiveCategory(catsArray[0]);
      }
    } else {
      setCategories([...DEFAULT_CATEGORIES]);
      if (!activeCategory && DEFAULT_CATEGORIES.length > 0) {
        setActiveCategory(DEFAULT_CATEGORIES[0]);
      } else if (DEFAULT_CATEGORIES.length === 0) {
        setActiveCategory('');
      }
    }
  }, [payloads]);

  const handleDeleteCategory = (cat) => {
    setConfirmState({
      title: 'Delete Category',
      message: `Are you sure you want to delete the category "${cat}" and ALL its payloads?`,
      onConfirm: () => {
        savePayloads(payloads.filter(p => p.category !== cat));
        setCategories(categories.filter(c => c !== cat));
        if (activeCategory === cat) setActiveCategory(categories[0] || '');
        setConfirmState(null);
      }
    });
  };

  const handleEditCategory = (oldCat) => {
    setPromptState({
      title: 'Edit Category',
      message: 'Enter new name for category:',
      defaultValue: oldCat,
      onConfirm: (newCat) => {
        if (newCat && newCat.trim() !== '' && newCat !== oldCat) {
          const updatedPayloads = payloads.map(p => p.category === oldCat ? { ...p, category: newCat } : p);
          savePayloads(updatedPayloads);
          
          const updatedCats = categories.map(c => c === oldCat ? newCat : c);
          setCategories(updatedCats);
          
          if (activeCategory === oldCat) setActiveCategory(newCat);
        }
        setPromptState(null);
      }
    });
  };

  const currentPayloads = useMemo(() => payloads.filter(p => p.category === activeCategory), [payloads, activeCategory]);

  if (!isLoaded) return null;

  return (
    <div className="tool-page page-enter" style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 40px)' }}>
      {/* Sidebar Categories */}
      <div style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'rgba(10, 10, 15, 0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '16px', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>CATEGORIES</span>
          <button className="btn-icon" onClick={() => {
            setPromptState({
              title: 'New Category',
              message: 'Enter new category name:',
              defaultValue: '',
              onConfirm: (cat) => {
                if (cat && cat.trim() !== '') {
                   setCategories([...categories, cat.trim()]);
                   setNewPayload({ id: null, title: '', category: cat.trim(), payload: '', notes: '' });
                   setActiveCategory(cat.trim());
                   setIsAdding(true);
                }
                setPromptState(null);
              }
            });
          }}>
            <Plus size={14} />
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
          {categories.map(cat => {
            const isActive = activeCategory === cat;
            const CatIcon = CAT_ICONS[cat] || Code;
            return (
              <div
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setIsAdding(false);
                }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: isActive ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(139, 92, 246, 0.1))' : 'transparent',
                  border: isActive ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid transparent',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  borderRadius: '10px', cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}}
                onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, overflow: 'hidden' }}>
                  <CatIcon size={14} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.5 }} />
                  <span style={{ fontWeight: isActive ? 700 : 500, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cat.replace(/ \(.*\)/, '')}
                  </span>
                </div>
                
                <div style={{ display: 'flex', gap: '2px', opacity: isActive ? 1 : 0, transition: 'opacity 0.15s' }}>
                  <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleEditCategory(cat); }} style={{ padding: '4px', color: isActive ? '#fff' : 'var(--text-muted)' }}><Edit2 size={11} /></button>
                  <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat); }} style={{ padding: '4px', color: '#EF4444' }}><Trash2 size={11} /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingRight: '8px' }}>
        {!activeCategory ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', padding: '0 40px', textAlign: 'center' }}>
            <Layers size={64} style={{ opacity: 0.2, color: '#8B5CF6', marginBottom: '16px' }} />
            <h2 style={{ margin: 0, fontWeight: 800, color: 'var(--text-primary)', fontSize: '24px' }}>Payload Library is Empty</h2>
            <div style={{ background: 'var(--bg-deep)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-default)', maxWidth: '500px', width: '100%' }}>
              <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)', fontSize: '16px' }}>How to get started:</h4>
              <ol style={{ margin: 0, paddingLeft: '24px', color: 'var(--text-muted)', fontSize: '15px', lineHeight: '1.6', textAlign: 'left' }}>
                <li style={{ marginBottom: '8px' }}>Click the <strong>+</strong> icon in the "CATEGORIES" sidebar on the left.</li>
                <li style={{ marginBottom: '8px' }}>Name your category (e.g., "XSS", "SQLi").</li>
                <li>Once the category is selected, click the <strong>Add Payload</strong> button to save your first payload.</li>
              </ol>
            </div>
          </div>
        ) : (
          <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', padding: '24px', borderRadius: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#8B5CF6', marginBottom: '8px' }}>
              <Code size={24} />
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>{activeCategory} Payloads</h1>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '1px' }}>READY TO DEPLOY</span>
          </div>
          <button className="btn btn-primary" style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-default)' }} onClick={() => {
            setNewPayload({ id: null, title: '', category: activeCategory, payload: '', notes: '' });
            setIsAdding(true);
          }}>
            <Plus size={16} /> Add Payload
          </button>
        </div>

        {isAdding && (
          <div className="settings-card" style={{ padding: '24px', marginBottom: '24px', borderLeft: '3px solid #8B5CF6' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>{newPayload.id ? 'Edit Payload' : 'New Payload'}</h3>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <input 
                className="tool-input" 
                placeholder="Title (e.g. Polyglot)" 
                value={newPayload.title}
                onChange={(e) => setNewPayload({...newPayload, title: e.target.value})}
                style={{ flex: 1 }}
              />
              <input 
                className="tool-input" 
                placeholder="Category" 
                value={newPayload.category}
                onChange={(e) => setNewPayload({...newPayload, category: e.target.value})}
                style={{ width: '200px' }}
              />
            </div>
            <textarea 
              className="tool-textarea code-font" 
              placeholder="Enter your payload here..." 
              value={newPayload.payload}
              onChange={(e) => setNewPayload({...newPayload, payload: e.target.value})}
              rows={4}
              style={{ marginBottom: '16px', color: '#10B981', fontSize: '14px' }}
            />
            <input 
              className="tool-input" 
              placeholder="Notes / Description (Optional)" 
              value={newPayload.notes}
              onChange={(e) => setNewPayload({...newPayload, notes: e.target.value})}
              style={{ marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-ghost" onClick={() => setIsAdding(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} style={{ background: '#8B5CF6', border: 'none' }}>Save Payload</button>
            </div>
          </div>
        )}

        {currentPayloads.length === 0 && !isAdding ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: '16px' }}>
            <Zap size={48} style={{ opacity: 0.15, color: '#8B5CF6' }} />
            <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--text-secondary)' }}>No payloads yet</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>Start adding your first payload to this category.</p>
            <button className="btn btn-primary" style={{ marginTop: '8px', background: '#8B5CF6', border: 'none' }} onClick={() => {
              setNewPayload({ id: null, title: '', category: activeCategory, payload: '', notes: '' });
              setIsAdding(true);
            }}>
              <Plus size={16} /> Add First Payload
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {currentPayloads.map((p) => (
              <div key={p.id} className="pro-card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{p.title}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => handleCopy(p.id, p.payload)}
                      style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-subtle)' }}
                    >
                      {copiedId === p.id ? <Check size={14} color="#10B981" /> : <Copy size={14} />} 
                      {copiedId === p.id ? 'Copied' : 'Copy'}
                    </button>
                    <button className="btn-icon" onClick={() => openEdit(p)} title="Edit"><Edit2 size={16} /></button>
                    <button className="btn-icon" onClick={() => handleDelete(p.id)} title="Delete"><Trash2 size={16} color="var(--accent-red)" /></button>
                  </div>
                </div>
                
                <div style={{ background: '#000000', padding: '24px', position: 'relative' }}>
                  <code style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', color: '#10B981', wordBreak: 'break-all' }}>
                    {p.payload}
                  </code>
                </div>

                {p.notes && (
                  <div style={{ padding: '12px 24px', background: 'var(--bg-deep)', borderTop: '1px solid var(--border-subtle)', fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    // {p.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </>
        )}
      </div>
      {confirmState && (
        <ConfirmModal
          title={confirmState.title}
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
          warning={true}
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
