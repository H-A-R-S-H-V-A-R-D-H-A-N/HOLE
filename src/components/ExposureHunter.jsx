import React, { useState } from 'react';
import { Search, Shield, AlertTriangle, Copy, CheckCircle2, ExternalLink, Lock, Unlock, FileWarning, Code2, Database, Server, Key, Bug, FolderOpen, Info, Filter } from 'lucide-react';

const severityConfig = {
  critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', label: 'CRITICAL' },
  high: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'HIGH' },
  medium: { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', label: 'MEDIUM' },
  low: { color: '#6B7280', bg: 'rgba(107,114,128,0.12)', label: 'LOW' },
};

const categoryIcons = {
  'Source Code': Code2, 'Secrets': Key, 'Database': Database, 'Keys': Lock,
  'Debug': Bug, 'API Docs': Server, 'Package': FolderOpen, 'Infra': Server,
  'Admin': Shield, 'Info': Info,
};

const categoryColors = {
  'Source Code': '#A855F7', 'Secrets': '#EF4444', 'Database': '#F59E0B', 'Keys': '#EF4444',
  'Debug': '#F97316', 'API Docs': '#3B82F6', 'Package': '#22C55E', 'Infra': '#6366F1',
  'Admin': '#EC4899', 'Info': '#6B7280',
};

export default function ExposureHunter() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [sevFilter, setSevFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');

  const handleScan = async (e) => {
    e.preventDefault();
    if (!domain.trim()) { setError('Enter a domain.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const response = await window.electronAPI.exposureHunt({ domain: domain.trim() });
      if (response.success) { setResult(response); }
      else { setError(response.error || 'Scan failed.'); }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const findings = result?.findings || [];
  const filtered = findings.filter(f => {
    if (sevFilter !== 'all' && f.severity !== sevFilter) return false;
    if (catFilter !== 'all' && f.category !== catFilter) return false;
    return true;
  });

  const critCount = findings.filter(f => f.severity === 'critical').length;
  const highCount = findings.filter(f => f.severity === 'high').length;
  const categories = [...new Set(findings.map(f => f.category))];

  return (
    <div className="pro-section">
      <div className="pro-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="pro-icon-container"><FileWarning size={20} color="var(--accent-primary)" /></div>
          <div>
            <h1 className="pro-title">Exposure Hunter</h1>
            <p className="pro-subtitle">Scan for leaked source code, secrets, database dumps, debug endpoints, and sensitive files</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
        <form onSubmit={handleScan} style={{ display: 'flex', gap: '12px', marginBottom: '28px', backgroundColor: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Target Domain</label>
            <input type="text" className="pro-input" value={domain} onChange={e => setDomain(e.target.value)} placeholder="e.g., example.com" autoFocus />
          </div>
          <button type="submit" className="pro-button primary" disabled={loading} style={{ height: '42px', padding: '0 24px', whiteSpace: 'nowrap' }}>
            {loading ? <><span className="pro-spinner"></span>Scanning {result ? '' : '300+ paths'}...</> : <><Search size={16} />Hunt Exposures</>}
          </button>
        </form>

        {error && (
          <div style={{ padding: '16px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#EF4444', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Shield size={20} /><span>{error}</span>
          </div>
        )}

        {result && (
          <div>
            {/* Stats Bar */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#FFF' }}>{result.domain}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', fontSize: '12px' }}>
                <span style={{ color: '#EF4444' }}>Critical: <strong>{critCount}</strong></span>
                <span style={{ color: '#F59E0B' }}>High: <strong>{highCount}</strong></span>
                <span style={{ color: '#FFF' }}>Total: <strong>{findings.length}</strong></span>
                <span style={{ color: 'var(--text-muted)' }}>Scanned: {result.scanned} paths</span>
              </div>
            </div>

            {critCount > 0 && (
              <div style={{ padding: '16px', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '8px', color: '#EF4444', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <AlertTriangle size={22} />
                <div>
                  <strong>🚨 {critCount} Critical Exposure(s) Found!</strong>
                  <p style={{ fontSize: '12px', opacity: 0.8, margin: '4px 0 0' }}>Sensitive files are publicly accessible. These are high-value bug bounty findings.</p>
                </div>
              </div>
            )}

            {/* Filters */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {['all', 'critical', 'high', 'medium', 'low'].map(s => (
                <button key={s} onClick={() => setSevFilter(s)}
                  style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border-subtle)',
                    backgroundColor: sevFilter === s ? (severityConfig[s]?.bg || 'rgba(59,130,246,0.2)') : 'var(--bg-tertiary)',
                    color: sevFilter === s ? (severityConfig[s]?.color || '#3B82F6') : 'var(--text-muted)' }}>
                  {s === 'all' ? `All (${findings.length})` : `${s.charAt(0).toUpperCase()+s.slice(1)} (${findings.filter(f=>f.severity===s).length})`}
                </button>
              ))}
              {categories.length > 1 && <>
                <div style={{ width: '1px', backgroundColor: 'var(--border-subtle)', margin: '0 4px' }} />
                {categories.map(c => (
                  <button key={c} onClick={() => setCatFilter(catFilter === c ? 'all' : c)}
                    style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border-subtle)',
                      backgroundColor: catFilter === c ? `${categoryColors[c]}20` : 'var(--bg-tertiary)',
                      color: catFilter === c ? categoryColors[c] : 'var(--text-muted)' }}>
                    {c}
                  </button>
                ))}
              </>}
            </div>

            {/* Results */}
            {filtered.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                {findings.length === 0 ? '✅ No exposures found — target appears secure.' : 'No findings match this filter.'}
              </div>
            )}

            {filtered.map((f, i) => {
              const sev = severityConfig[f.severity] || severityConfig.medium;
              const CatIcon = categoryIcons[f.category] || Info;
              const catColor = categoryColors[f.category] || '#6B7280';
              return (
                <div key={i} style={{ marginBottom: '10px', borderRadius: '8px', border: `1px solid ${f.severity === 'critical' ? 'rgba(239,68,68,0.4)' : 'var(--border-color)'}`, backgroundColor: f.severity === 'critical' ? 'rgba(239,68,68,0.06)' : 'var(--bg-secondary)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <CatIcon size={16} color={catColor} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <code style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>{f.path}</code>
                          <span style={{ padding: '1px 6px', borderRadius: '3px', fontSize: '9px', fontWeight: 700, backgroundColor: `${catColor}20`, color: catColor }}>{f.category}</span>
                          <span style={{ padding: '1px 6px', borderRadius: '3px', fontSize: '9px', fontWeight: 700, backgroundColor: sev.bg, color: sev.color }}>{sev.label}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{f.statusCode} • {f.size}B</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <a href={f.url} target="_blank" rel="noreferrer" style={{ padding: '4px 8px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#FFF', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}><ExternalLink size={10} />Open</a>
                      <button onClick={() => copyText(f.url, `f-${i}`)} style={{ padding: '4px 8px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#FFF', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        {copied === `f-${i}` ? <CheckCircle2 size={10} color="#22C55E" /> : <Copy size={10} />}Copy
                      </button>
                    </div>
                  </div>
                  {f.preview && (
                    <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '8px 16px', backgroundColor: 'var(--bg-tertiary)' }}>
                      <pre style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '80px', overflow: 'hidden' }}>{f.preview}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
