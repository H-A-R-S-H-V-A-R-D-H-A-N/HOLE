import { useState, useEffect } from 'react';
import { AtSign, Copy, CheckCheck, RefreshCw, Trash2, Plus } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import '../styles/Tools.css';

export default function IdentityGenerator() {
  const [masterEmail, setMasterEmail] = useState(() => localStorage.getItem('kroma_master_email') || '');
  const [generated, setGenerated] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kroma_identities') || '[]'); } catch { return []; }
  });
  const [customTag, setCustomTag] = useState('');
  const [copied, setCopied] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => {
    localStorage.setItem('kroma_master_email', masterEmail);
  }, [masterEmail]);

  useEffect(() => {
    localStorage.setItem('kroma_identities', JSON.stringify(generated));
  }, [generated]);

  const getBaseEmail = () => {
    const parts = masterEmail.split('@');
    if (parts.length !== 2) return null;
    return { local: parts[0].split('+')[0], domain: parts[1] };
  };

  const generateRandom = () => {
    const base = getBaseEmail();
    if (!base) return;
    const tag = 'test' + Math.floor(Math.random() * 9000 + 1000);
    const alias = `${base.local}+${tag}@${base.domain}`;
    addIdentity(alias, tag);
  };

  const generateCustom = () => {
    if (!customTag.trim()) return;
    const base = getBaseEmail();
    if (!base) return;
    const alias = `${base.local}+${customTag.trim()}@${base.domain}`;
    addIdentity(alias, customTag.trim());
    setCustomTag('');
  };

  const generateForProgram = (program) => {
    const base = getBaseEmail();
    if (!base) return;
    const safe = program.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
    const tag = safe + Math.floor(Math.random() * 100);
    const alias = `${base.local}+${tag}@${base.domain}`;
    addIdentity(alias, tag, program);
  };

  const addIdentity = (email, tag, program = '') => {
    setGenerated(prev => [{
      id: Date.now().toString(),
      email,
      tag,
      program,
      createdAt: new Date().toISOString(),
    }, ...prev]);
  };

  const deleteIdentity = (id) => {
    setConfirmState({
      title: 'Delete Identity',
      message: 'Are you sure you want to delete this identity alias?',
      onConfirm: () => {
        setGenerated(prev => prev.filter(i => i.id !== id));
        setConfirmState(null);
      }
    });
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const isValidEmail = masterEmail.includes('@') && masterEmail.includes('.');

  return (
    <>
    <div className="tool-page page-enter">
      <div className="tool-header">
        <div className="tool-header-left">
          <AtSign size={28} />
          <div>
            <h1 className="tool-title">Identity Generator</h1>
            <p className="tool-subtitle">Gmail+ alias trick for unlimited test accounts</p>
          </div>
        </div>
      </div>

      {/* Master Email */}
      <div className="identity-master-card">
        <label className="tool-label">MASTER EMAIL</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            className="tool-input"
            value={masterEmail}
            onChange={(e) => setMasterEmail(e.target.value)}
            placeholder="yourname@gmail.com"
            style={{ flex: 1 }}
          />
        </div>
        <p className="identity-hint">
          All generated aliases will route to this inbox. Works with Gmail, Outlook, and most providers that support + addressing.
        </p>
      </div>

      {isValidEmail && (
        <>
          {/* Generate Options */}
          <div className="identity-gen-row">
            <button className="btn btn-primary" onClick={generateRandom}>
              <RefreshCw size={16} /> Generate Random
            </button>
            <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
              <input
                className="tool-input"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder="Custom tag (e.g., shopify, test1)"
                onKeyDown={(e) => e.key === 'Enter' && generateCustom()}
                style={{ flex: 1 }}
              />
              <button className="btn btn-secondary" onClick={generateCustom}>
                <Plus size={16} /> Custom
              </button>
            </div>
          </div>

          {/* Quick generate for common programs */}
          <div style={{ marginBottom: '24px' }}>
            <label className="tool-label">QUICK GENERATE FOR PROGRAM</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['HackerOne', 'Bugcrowd', 'Intigriti', 'Shopify', 'GitHub', 'Google', 'Meta', 'Twitter'].map(p => (
                <button key={p} className="encoder-btn" onClick={() => generateForProgram(p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Generated List */}
          <div>
            <label className="tool-label">GENERATED IDENTITIES ({generated.length})</label>
            {generated.length === 0 ? (
              <div className="analyzer-empty" style={{ minHeight: '120px' }}>
                <p>No identities generated yet. Click "Generate Random" to start.</p>
              </div>
            ) : (
              <div className="identity-list">
                {generated.map(item => (
                  <div key={item.id} className="identity-item">
                    <div className="identity-item-main">
                      <code className="identity-email">{item.email}</code>
                      {item.program && (
                        <span className="analyzer-badge" style={{ background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)', border: '1px solid rgba(0,212,255,0.2)', marginLeft: '8px' }}>
                          {item.program}
                        </span>
                      )}
                    </div>
                    <div className="identity-item-actions">
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleCopy(item.email, item.id)}>
                        {copied === item.id ? <CheckCheck size={14} /> : <Copy size={14} />}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => deleteIdentity(item.id)} style={{ color: 'var(--accent-red)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
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
    </>
  );
}
