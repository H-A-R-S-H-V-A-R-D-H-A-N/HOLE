import { useState, useEffect } from 'react';
import { GitBranch, RotateCcw, Target, Shield, Key, FileWarning, Zap, Database as DbIcon, Globe, Layers, CheckCircle2, Circle, Edit2, Trash2, Plus, X } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import PromptModal from './PromptModal';
import { readFileDirect } from '../utils/fileSystem';
import '../styles/Tools.css';

const defaultMethodology = [
  {
    id: 'recon', label: 'Reconnaissance', icon: Globe, color: '#3B82F6', children: [
      { id: 'recon-1', label: 'Subdomain Enumeration', checked: false },
      { id: 'recon-2', label: 'Directory Brute Force', checked: false },
      { id: 'recon-3', label: 'Technology Fingerprinting', checked: false },
      { id: 'recon-4', label: 'JavaScript Analysis', checked: false },
      { id: 'recon-5', label: 'API Endpoint Discovery', checked: false },
    ]
  },
  {
    id: 'auth', label: 'Authentication', icon: Key, color: '#F59E0B', children: [
      { id: 'auth-1', label: 'SQL Injection on Login', checked: false },
      { id: 'auth-2', label: 'Brute Force / Rate Limiting', checked: false },
      { id: 'auth-3', label: 'OAuth / SSO Bypass', checked: false },
      { id: 'auth-4', label: 'Password Reset Flow', checked: false },
      { id: 'auth-5', label: '2FA Bypass', checked: false },
    ]
  },
  {
    id: 'authz', label: 'Authorization', icon: Shield, color: '#10B981', children: [
      { id: 'authz-1', label: 'IDOR (Insecure Direct Object Ref)', checked: false },
      { id: 'authz-2', label: 'Horizontal Privilege Escalation', checked: false },
      { id: 'authz-3', label: 'Vertical Privilege Escalation', checked: false },
      { id: 'authz-4', label: 'Missing Function-Level Access', checked: false },
    ]
  },
  {
    id: 'injection', label: 'Injection', icon: Zap, color: '#EF4444', children: [
      { id: 'inj-1', label: 'Reflected XSS', checked: false },
      { id: 'inj-2', label: 'Stored XSS', checked: false },
      { id: 'inj-3', label: 'SQL Injection', checked: false },
      { id: 'inj-4', label: 'Command Injection', checked: false },
      { id: 'inj-5', label: 'SSRF', checked: false },
    ]
  },
];

export default function MethodologyTracker({ storageDir, fsUpdateTrigger }) {
  const [categories, setCategories] = useState(defaultMethodology);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const [confirmState, setConfirmState] = useState(null);
  const [promptState, setPromptState] = useState(null); // { title, message, defaultValue, onConfirm }

  const getMethodologyPath = () => {
    return storageDir ? `${storageDir}/Methodology/data.json` : null;
  };

  useEffect(() => {
    const loadMethodology = async () => {
      const path = getMethodologyPath();
      if (!path) {
        setIsLoaded(true);
        return;
      }
      try {
        const result = await readFileDirect(path);
        if (result.success) {
          const parsed = JSON.parse(result.content);
          if (parsed && Array.isArray(parsed)) {
            setCategories(parsed.map(c => ({
              ...c,
              icon: defaultMethodology.find(dm => dm.id === c.id)?.icon || Layers
            })));
          }
        }
      } catch (e) {
        console.warn('Failed to parse Methodology:', e);
      }
      setIsLoaded(true);
    };
    loadMethodology();
  }, [storageDir, fsUpdateTrigger]);

  useEffect(() => {
    if (!isLoaded || !storageDir) return;
    const saveMethodology = async () => {
      const path = getMethodologyPath();
      if (!path || !window.electronAPI) return;
      setSaveStatus('saving');
      try {
        const toSave = categories.map(({ icon, ...rest }) => rest);
        await window.electronAPI.saveFileDirect({
          filePath: path,
          content: JSON.stringify(toSave, null, 2)
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(''), 2000);
      } catch (e) {
        setSaveStatus('error');
      }
    };
    const timer = setTimeout(saveMethodology, 500);
    return () => clearTimeout(timer);
  }, [categories, isLoaded, storageDir]);

  const toggleCheck = (categoryId, taskId) => {
    setCategories(cats => cats.map(c => {
      if (c.id === categoryId) {
        return {
          ...c,
          children: c.children.map(t => t.id === taskId ? { ...t, checked: !t.checked } : t)
        };
      }
      return c;
    }));
  };

  const deleteCategory = (cat) => {
    setConfirmState({
      type: 'category',
      title: 'Delete Category',
      message: `Delete the category "${cat.label}" and all its tasks?`,
      onConfirm: () => {
        setCategories(prev => prev.filter(c => c.id !== cat.id));
        setConfirmState(null);
      }
    });
  };

  const handleEdit = (cat) => {
    setPromptState({
      title: 'Rename Category',
      message: 'Enter new name for this category:',
      defaultValue: cat.label,
      onConfirm: (newLabel) => {
        setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, label: newLabel } : c));
        setPromptState(null);
      }
    });
  };

  const addCategory = () => {
    setPromptState({
      title: 'New Category',
      message: 'Enter category name:',
      defaultValue: '',
      onConfirm: (label) => {
        const newCat = {
          id: Date.now().toString(),
          label,
          icon: Layers,
          color: '#3B82F6',
          children: []
        };
        setCategories(prev => [...prev, newCat]);
        setPromptState(null);
      }
    });
  };

  const addTask = (catId) => {
    setPromptState({
      title: 'New Task',
      message: 'Enter task name:',
      defaultValue: '',
      onConfirm: (label) => {
        setCategories(prev => prev.map(c => {
          if (c.id === catId) {
            return {
              ...c,
              children: [...c.children, { id: Date.now().toString(), label, checked: false }]
            };
          }
          return c;
        }));
        setPromptState(null);
      }
    });
  };

  const editTask = (catId, task) => {
    setPromptState({
      title: 'Edit Task',
      message: 'Update the task name:',
      defaultValue: task.label,
      onConfirm: (newLabel) => {
        setCategories(prev => prev.map(c => {
          if (c.id === catId) {
            return {
              ...c,
              children: c.children.map(t => t.id === task.id ? { ...t, label: newLabel } : t)
            };
          }
          return c;
        }));
        setPromptState(null);
      }
    });
  };

  const deleteTask = (catId, task) => {
    setConfirmState({
      type: 'task',
      title: 'Delete Task',
      message: `Delete the task "${task.label}"?`,
      onConfirm: () => {
        setCategories(prev => prev.map(c => {
          if (c.id === catId) {
            return {
              ...c,
              children: c.children.filter(t => t.id !== task.id)
            };
          }
          return c;
        }));
        setConfirmState(null);
      }
    });
  };

  const getStats = (cat) => {
    const total = cat.children.length;
    const done = cat.children.filter(c => c.checked).length;
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  };

  const globalStats = categories.reduce((acc, cat) => {
    const s = getStats(cat);
    acc.total += s.total;
    acc.done += s.done;
    return acc;
  }, { total: 0, done: 0 });
  const globalPct = globalStats.total > 0 ? Math.round((globalStats.done / globalStats.total) * 100) : 0;

  return (
    <div className="tool-page page-enter">
      <div className="tool-header">
        <div className="tool-header-left">
          <GitBranch size={28} />
          <div>
            <h1 className="tool-title">Methodology Tracker</h1>
            <p className="tool-subtitle">Professional testing checklists — fully customizable.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" onClick={addCategory}>
            <Plus size={16} /> New Category
          </button>
          <button className="btn btn-ghost" onClick={() => {
            setConfirmState({
              type: 'reset',
              title: 'Reset Methodology',
              message: 'Reset all methodologies to default? You will lose custom tasks.',
              onConfirm: () => {
                setCategories(defaultMethodology);
                setConfirmState(null);
              }
            });
          }}>
            <RotateCcw size={16} /> Reset
          </button>
        </div>
      </div>

      <div className="method-overall" style={{ marginBottom: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', padding: '16px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>Master Progress</span>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{globalPct}% ({globalStats.done}/{globalStats.total})</span>
        </div>
        <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${globalPct}%`, height: '100%', background: 'var(--accent-primary)', boxShadow: '0 0 10px var(--accent-primary-glow)' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {categories.map((cat) => {
          const Icon = cat.icon || Layers;
          const stats = getStats(cat);
          return (
            <div key={cat.id} className="pro-card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '16px', background: `${cat.color}10`, borderBottom: `1px solid ${cat.color}20`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: `${cat.color}20`, color: cat.color, padding: '8px', borderRadius: '8px', flexShrink: 0 }}><Icon size={18} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.label}</h3>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{stats.done}/{stats.total} Tasks Complete</div>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button className="btn-icon-sm" onClick={() => handleEdit(cat)} title="Edit Category"><Edit2 size={14} /></button>
                  <button className="btn-icon-sm delete" onClick={() => deleteCategory(cat)} title="Delete Category"><Trash2 size={14} /></button>
                </div>
              </div>

              <div style={{ padding: '12px' }}>
                {cat.children.map(task => (
                  <div key={task.id} className="method-task-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', borderRadius: '6px', cursor: 'default' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, cursor: 'pointer', minWidth: 0 }} onClick={() => toggleCheck(cat.id, task.id)}>
                      {task.checked ? <CheckCircle2 size={16} color="#10B981" style={{ flexShrink: 0 }} /> : <Circle size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
                      <span style={{ fontSize: '13px', textDecoration: task.checked ? 'line-through' : 'none', color: task.checked ? 'var(--text-muted)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.label}</span>
                    </div>
                    <div className="task-actions" style={{ display: 'flex', gap: '4px', opacity: 0, transition: 'opacity 0.2s', flexShrink: 0 }}>
                      <button className="btn-icon-sm" onClick={(e) => { e.stopPropagation(); editTask(cat.id, task); }} title="Edit Task"><Edit2 size={12} /></button>
                      <button className="btn-icon-sm delete" onClick={(e) => { e.stopPropagation(); deleteTask(cat.id, task); }} title="Delete Task"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={() => addTask(cat.id)} style={{ width: '100%', marginTop: '8px', border: '1px dashed var(--border-subtle)' }}>
                  + Add Step
                </button>
              </div>
            </div>
          );
        })}
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
        .btn-icon-sm { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; border-radius: 4px; transition: all 0.2s; }
        .btn-icon-sm:hover { background: var(--bg-hover); color: var(--text-primary); }
        .btn-icon-sm.delete:hover { color: #EF4444; }
        .method-task-item:hover { background: var(--bg-tertiary); }
        .method-task-item:hover .task-actions { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
