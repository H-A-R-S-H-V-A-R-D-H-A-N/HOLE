import React, { useState } from 'react';
import { Search, Copy, CheckCircle2, ExternalLink, Lock, Unlock, Globe, Code2, CreditCard, Shield, Settings, Upload, Webhook, Database, ChevronDown, ChevronRight, FileCode2, Bug } from 'lucide-react';

const catConfig = {
  Internal: { color: '#EF4444', icon: Bug, label: '🔴 Hidden/Internal' },
  Admin: { color: '#DC2626', icon: Shield, label: '🔴 Admin' },
  Auth: { color: '#F59E0B', icon: Lock, label: '🟡 Auth' },
  'User Data': { color: '#F97316', icon: Database, label: '🟠 User Data' },
  Payment: { color: '#EC4899', icon: CreditCard, label: '💳 Payment' },
  'File Ops': { color: '#8B5CF6', icon: Upload, label: '📁 File Ops' },
  Config: { color: '#EF4444', icon: Settings, label: '⚙️ Config' },
  Webhook: { color: '#06B6D4', icon: Webhook, label: '🔗 Webhook' },
  API: { color: '#3B82F6', icon: Globe, label: '🔵 API' },
  GraphQL: { color: '#E535AB', icon: Code2, label: 'GraphQL' },
  WebSocket: { color: '#22C55E', icon: Globe, label: 'WebSocket' },
  Search: { color: '#6B7280', icon: Search, label: 'Search' },
  Route: { color: '#A855F7', icon: Globe, label: 'Route' },
  Other: { color: '#6B7280', icon: Globe, label: 'Other' },
};

const methodColors = { GET: '#22C55E', POST: '#3B82F6', PUT: '#F59E0B', DELETE: '#EF4444', PATCH: '#8B5CF6', WS: '#06B6D4' };

export default function JSSpider() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [expanded, setExpanded] = useState({});
  const [showAuthOnly, setShowAuthOnly] = useState(false);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!domain.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await window.electronAPI.jsSpider({ domain: domain.trim() });
      if (r.success) setResult(r); else setError(r.error || 'Failed');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const copyText = (t, k) => { navigator.clipboard.writeText(t); setCopied(k); setTimeout(() => setCopied(''), 2000); };
  const endpoints = result?.endpoints || [];
  const filtered = endpoints.filter(e => {
    if (catFilter !== 'all' && e.category !== catFilter) return false;
    if (showAuthOnly && !e.hasAuth) return false;
    return true;
  });
  const categories = [...new Set(endpoints.map(e => e.category))];
  const authCount = endpoints.filter(e => e.hasAuth).length;

  return (
    <div className="pro-section">
      <div className="pro-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="pro-icon-container"><FileCode2 size={20} color="var(--accent-primary)" /></div>
          <div>
            <h1 className="pro-title">JS Endpoint Spider</h1>
            <p className="pro-subtitle">Extract hidden API endpoints, routes, and attack surface from JavaScript files</p>
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
            {loading ? <><span className="pro-spinner"></span>Crawling JS...</> : <><Search size={16} />Spider JS</>}
          </button>
        </form>

        {error && <div style={{ padding: '16px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#EF4444', marginBottom: '24px' }}>{error}</div>}

        {result && (
          <div>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'JS Files Crawled', value: result.totalJs, color: '#3B82F6' },
                { label: 'Endpoints Found', value: endpoints.length, color: '#22C55E' },
                { label: 'Auth-Protected', value: authCount, color: '#F59E0B' },
                { label: 'Data Analyzed', value: (result.totalBytes / 1024).toFixed(0) + ' KB', color: '#A855F7' },
              ].map((s, i) => (
                <div key={i} style={{ padding: '14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Auth-only toggle + Category filters */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={() => setShowAuthOnly(!showAuthOnly)} style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border-subtle)', backgroundColor: showAuthOnly ? 'rgba(239,68,68,0.2)' : 'var(--bg-tertiary)', color: showAuthOnly ? '#EF4444' : 'var(--text-muted)' }}>
                🎯 Auth Endpoints Only
              </button>
              <div style={{ width: '1px', backgroundColor: 'var(--border-subtle)', height: '20px' }} />
              <button onClick={() => setCatFilter('all')} style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border-subtle)', backgroundColor: catFilter === 'all' ? 'rgba(59,130,246,0.2)' : 'var(--bg-tertiary)', color: catFilter === 'all' ? '#3B82F6' : 'var(--text-muted)' }}>All ({endpoints.length})</button>
              {categories.map(c => {
                const conf = catConfig[c] || catConfig.Other;
                const count = endpoints.filter(e => e.category === c).length;
                return (
                  <button key={c} onClick={() => setCatFilter(catFilter === c ? 'all' : c)} style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border-subtle)', backgroundColor: catFilter === c ? `${conf.color}20` : 'var(--bg-tertiary)', color: catFilter === c ? conf.color : 'var(--text-muted)' }}>
                    {conf.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Endpoints */}
            {filtered.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>No endpoints match filter.</div>}

            {filtered.map((ep, i) => {
              const conf = catConfig[ep.category] || catConfig.Other;
              const CatIcon = conf.icon;
              return (
                <div key={i} style={{ marginBottom: '6px', borderRadius: '6px', border: `1px solid ${ep.hasAuth ? 'rgba(239,68,68,0.25)' : 'var(--border-color)'}`, backgroundColor: ep.category === 'Internal' ? 'rgba(239,68,68,0.05)' : 'var(--bg-secondary)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', cursor: 'pointer' }} onClick={() => setExpanded(p => ({ ...p, [i]: !p[i] }))}>
                    {expanded[i] ? <ChevronDown size={12} color="var(--text-muted)" /> : <ChevronRight size={12} color="var(--text-muted)" />}
                    <span style={{ padding: '2px 6px', borderRadius: '3px', fontSize: '9px', fontWeight: 800, fontFamily: 'monospace', backgroundColor: `${methodColors[ep.method] || '#6B7280'}20`, color: methodColors[ep.method] || '#6B7280' }}>{ep.method}</span>
                    <code style={{ fontSize: '12px', fontWeight: 600, color: '#FFF', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.path}</code>
                    <span style={{ padding: '2px 6px', borderRadius: '3px', fontSize: '9px', fontWeight: 600, backgroundColor: `${conf.color}15`, color: conf.color }}>{ep.category}</span>
                    {ep.hasAuth && <Lock size={12} color="#F59E0B" title="Auth-protected — test for bypass!" />}
                    <button onClick={(e) => { e.stopPropagation(); copyText(ep.fullUrl || `https://${result.domain}${ep.path}`, `ep-${i}`); }} style={{ padding: '3px 6px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#FFF', cursor: 'pointer', fontSize: '10px' }}>
                      {copied === `ep-${i}` ? <CheckCircle2 size={10} color="#22C55E" /> : <Copy size={10} />}
                    </button>
                  </div>
                  {expanded[i] && (
                    <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '10px 14px 10px 36px', backgroundColor: 'var(--bg-tertiary)' }}>
                      {ep.fullUrl && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}><strong>Full URL:</strong> {ep.fullUrl}</div>}
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}><strong>Source:</strong> {ep.source.split('/').pop()}</div>
                      {ep.context && <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-muted)', backgroundColor: 'var(--bg-secondary)', padding: '6px 8px', borderRadius: '4px', wordBreak: 'break-all' }}>{ep.context}</div>}
                      {ep.hasAuth && <div style={{ fontSize: '11px', color: '#F59E0B', marginTop: '6px' }}>⚠️ This endpoint likely requires auth — test for bypass!</div>}
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
