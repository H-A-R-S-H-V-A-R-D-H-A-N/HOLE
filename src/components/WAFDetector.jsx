import React, { useState } from 'react';
import { Shield, Search, Copy, CheckCircle2, AlertTriangle, ShieldAlert, ShieldCheck, ShieldX, Lock, Unlock, ChevronDown, ChevronRight } from 'lucide-react';

const sevColors = { high: '#EF4444', medium: '#F59E0B', low: '#22C55E' };
const catColors = { xss: '#A855F7', sqli: '#EF4444', rce: '#DC2626', lfi: '#F59E0B', xxe: '#EC4899', ssrf: '#3B82F6', ssti: '#6366F1', header: '#6B7280' };

export default function WAFDetector() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [tab, setTab] = useState('wafs');
  const [expandedBypass, setExpandedBypass] = useState({});

  const handleScan = async (e) => {
    e.preventDefault();
    if (!domain.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await window.electronAPI.wafDetect({ domain: domain.trim() });
      if (r.success) setResult(r); else setError(r.error || 'Failed');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const copyText = (t, k) => { navigator.clipboard.writeText(t); setCopied(k); setTimeout(() => setCopied(''), 2000); };
  const wafs = result?.wafs || [];
  const payloads = result?.payloadTests || [];
  const bypasses = result?.bypasses || [];
  const blockedCount = payloads.filter(p => p.blocked).length;
  const passedCount = payloads.filter(p => !p.blocked).length;
  const bypassSuccess = bypasses.filter(b => !b.blocked).length;

  return (
    <div className="pro-section">
      <div className="pro-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="pro-icon-container"><ShieldAlert size={20} color="var(--accent-primary)" /></div>
          <div>
            <h1 className="pro-title">WAF Detector & Bypasser</h1>
            <p className="pro-subtitle">Fingerprint 30+ WAFs, test attack payloads, and discover bypass techniques</p>
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
            {loading ? <><span className="pro-spinner"></span>Detecting...</> : <><Search size={16} />Detect WAF</>}
          </button>
        </form>

        {error && <div style={{ padding: '16px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#EF4444', marginBottom: '24px' }}><AlertTriangle size={16} style={{ display: 'inline', marginRight: 8 }} />{error}</div>}

        {result && (
          <div>
            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'WAFs Detected', value: wafs.length, color: wafs.length > 0 ? '#EF4444' : '#22C55E', icon: wafs.length > 0 ? ShieldAlert : ShieldCheck },
                { label: 'Payloads Blocked', value: `${blockedCount}/${payloads.length}`, color: '#F59E0B', icon: Lock },
                { label: 'Payloads Passed', value: passedCount, color: passedCount > 0 ? '#EF4444' : '#22C55E', icon: passedCount > 0 ? Unlock : Lock },
                { label: 'Bypasses Found', value: bypassSuccess, color: bypassSuccess > 0 ? '#EF4444' : '#6B7280', icon: ShieldX },
              ].map((s, i) => (
                <div key={i} style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <s.icon size={20} color={s.color} style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontSize: '24px', fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', backgroundColor: 'var(--bg-secondary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              {[
                { id: 'wafs', label: `WAFs (${wafs.length})` },
                { id: 'payloads', label: `Payloads (${payloads.length})` },
                { id: 'bypasses', label: `Bypasses (${bypassSuccess})` },
                { id: 'headers', label: 'Headers' },
              ].map(t2 => (
                <button key={t2.id} onClick={() => setTab(t2.id)} style={{ flex: 1, padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none', backgroundColor: tab === t2.id ? 'var(--accent-primary)' : 'transparent', color: tab === t2.id ? '#FFF' : 'var(--text-muted)' }}>{t2.label}</button>
              ))}
            </div>

            {/* WAFs Tab */}
            {tab === 'wafs' && (
              <div>
                {wafs.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>✅ No WAF detected — target may be unprotected!</div>}
                {wafs.map((w, i) => (
                  <div key={i} style={{ marginBottom: '10px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: `1px solid ${w.confidence === 'high' ? 'rgba(239,68,68,0.4)' : 'var(--border-color)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <ShieldAlert size={18} color={sevColors[w.confidence]} />
                      <span style={{ fontSize: '16px', fontWeight: 700, color: '#FFF' }}>{w.name}</span>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, backgroundColor: `${sevColors[w.confidence]}20`, color: sevColors[w.confidence] }}>{w.confidence.toUpperCase()}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{w.vendor}</span>
                    </div>
                    {w.evidence.map((e, j) => (
                      <div key={j} style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)', padding: '2px 0', paddingLeft: '28px' }}>• {e}</div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Payloads Tab */}
            {tab === 'payloads' && (
              <div>
                {payloads.map((p, i) => (
                  <div key={i} style={{ marginBottom: '6px', padding: '10px 14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {p.blocked ? <Lock size={14} color="#22C55E" /> : <Unlock size={14} color="#EF4444" />}
                    <span style={{ padding: '2px 6px', borderRadius: '3px', fontSize: '9px', fontWeight: 700, backgroundColor: `${catColors[p.category] || '#6B7280'}20`, color: catColors[p.category] || '#6B7280' }}>{p.category.toUpperCase()}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#FFF', minWidth: '140px' }}>{p.name}</span>
                    <code style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.payload}</code>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: p.blocked ? '#22C55E' : '#EF4444' }}>{p.blocked ? 'BLOCKED' : 'PASSED'}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{p.statusCode || '—'}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Bypasses Tab */}
            {tab === 'bypasses' && (
              <div>
                {bypasses.filter(b => !b.blocked).length > 0 && (
                  <div style={{ padding: '14px', backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '8px', marginBottom: '16px', color: '#EF4444' }}>
                    <strong>🚨 {bypasses.filter(b => !b.blocked).length} bypass(es) succeeded!</strong> — WAF can be evaded.
                  </div>
                )}
                {bypasses.map((b, i) => (
                  <div key={i} style={{ marginBottom: '6px', padding: '10px 14px', backgroundColor: !b.blocked ? 'rgba(239,68,68,0.06)' : 'var(--bg-secondary)', borderRadius: '6px', border: `1px solid ${!b.blocked ? 'rgba(239,68,68,0.3)' : 'var(--border-color)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setExpandedBypass(p => ({ ...p, [i]: !p[i] }))}>
                      {expandedBypass[i] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      {!b.blocked ? <Unlock size={14} color="#EF4444" /> : <Lock size={14} color="#22C55E" />}
                      <span style={{ padding: '2px 6px', borderRadius: '3px', fontSize: '9px', fontWeight: 700, backgroundColor: `${catColors[b.category] || '#6B7280'}20`, color: catColors[b.category] || '#6B7280' }}>{b.category.toUpperCase()}</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#FFF' }}>{b.technique}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', flex: 1 }}>{b.description}</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: !b.blocked ? '#EF4444' : '#22C55E' }}>{!b.blocked ? '✓ BYPASS' : 'BLOCKED'}</span>
                    </div>
                    {expandedBypass[i] && (
                      <div style={{ marginTop: '8px', paddingLeft: '36px' }}>
                        <code style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{b.payload}</code>
                        <button onClick={() => copyText(b.payload, `bp-${i}`)} style={{ marginLeft: '8px', padding: '2px 8px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#FFF', cursor: 'pointer', fontSize: '10px' }}>
                          {copied === `bp-${i}` ? <CheckCircle2 size={10} color="#22C55E" /> : <Copy size={10} />}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Headers Tab */}
            {tab === 'headers' && (
              <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                {Object.entries(result.rawHeaders || {}).map(([k, v], i) => (
                  <div key={i} style={{ display: 'flex', padding: '8px 14px', borderBottom: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                    <span style={{ fontWeight: 600, color: '#A855F7', minWidth: '220px', fontFamily: 'monospace' }}>{k}</span>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
