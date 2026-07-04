import React, { useState } from 'react';
import { Fingerprint, Search, Copy, CheckCircle2, ExternalLink, Hash, Server, Shield, Globe } from 'lucide-react';

export default function FaviconHunter() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const handleScan = async (e) => {
    e.preventDefault();
    if (!domain.trim()) { setError('Enter a domain.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const response = await window.electronAPI.faviconHunt({ domain: domain.trim() });
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

  const dorks = result ? [
    { name: 'Shodan', query: result.shodanDork, url: `https://www.shodan.io/search?query=${encodeURIComponent(result.shodanDork)}`, color: '#EF4444' },
    { name: 'Censys', query: result.censysDork, url: `https://search.censys.io/search?resource=hosts&q=${encodeURIComponent(result.censysDork)}`, color: '#3B82F6' },
    { name: 'FOFA', query: result.fofaDork, url: `https://fofa.info/result?qbase64=${btoa(result.fofaDork)}`, color: '#22C55E' },
    { name: 'ZoomEye', query: result.zoomeyeDork, url: `https://www.zoomeye.org/searchResult?q=${encodeURIComponent(result.zoomeyeDork)}`, color: '#F59E0B' },
  ] : [];

  return (
    <div className="pro-section">
      <div className="pro-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="pro-icon-container"><Fingerprint size={20} color="var(--accent-primary)" /></div>
          <div>
            <h1 className="pro-title">Favicon Hunter</h1>
            <p className="pro-subtitle">Identify technologies and discover hidden infrastructure via favicon fingerprinting</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
        <form onSubmit={handleScan} style={{ display: 'flex', gap: '12px', marginBottom: '28px', backgroundColor: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Target Domain</label>
            <input type="text" className="pro-input" value={domain} onChange={e => setDomain(e.target.value)} placeholder="e.g., tesla.com, hackerone.com" autoFocus />
          </div>
          <button type="submit" className="pro-button primary" disabled={loading} style={{ height: '42px', padding: '0 24px', whiteSpace: 'nowrap' }}>
            {loading ? <><span className="pro-spinner"></span>Hunting...</> : <><Search size={16} />Hunt Favicon</>}
          </button>
        </form>

        {error && (
          <div style={{ padding: '16px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#EF4444', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Shield size={20} /><span>{error}</span>
          </div>
        )}

        {result && (
          <div>
            {/* Favicon Info Card */}
            <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '12px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <img src={result.faviconUrl} alt="favicon" style={{ width: '48px', height: '48px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#FFF', marginBottom: '4px' }}>{result.domain}</div>
                  <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{result.faviconUrl}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Size: {result.faviconSize} bytes</div>
                </div>
              </div>
            </div>

            {/* Hash Card */}
            <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <Hash size={18} color="#A855F7" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#FFF' }}>MMH3 Favicon Hash</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <code style={{ fontSize: '28px', fontWeight: 800, color: '#A855F7', letterSpacing: '1px' }}>{result.mmh3Hash}</code>
                <button onClick={() => copyText(String(result.mmh3Hash), 'hash')}
                  style={{ padding: '6px 12px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: '#FFF', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {copied === 'hash' ? <CheckCircle2 size={12} color="#22C55E" /> : <Copy size={12} />} Copy
                </button>
              </div>
            </div>

            {/* Tech Detection */}
            {result.techMatch && (
              <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Server size={20} color="#A855F7" />
                <div>
                  <div style={{ fontSize: '12px', color: '#A855F7', fontWeight: 600, marginBottom: '2px' }}>TECHNOLOGY DETECTED</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#FFF' }}>{result.techMatch}</div>
                </div>
              </div>
            )}

            {/* Search Dorks */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Globe size={16} color="#22C55E" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#FFF' }}>Find Servers With Same Favicon</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Use these search queries to find other servers using the same favicon — reveals hidden infrastructure, staging servers, and internal tools.
              </p>

              {dorks.map((dork, i) => (
                <div key={i} style={{ marginBottom: '10px', padding: '14px 16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <span style={{ padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, backgroundColor: `${dork.color}20`, color: dork.color, border: `1px solid ${dork.color}40`, whiteSpace: 'nowrap' }}>{dork.name}</span>
                    <code style={{ fontSize: '13px', fontFamily: 'monospace', color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dork.query}</code>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '12px' }}>
                    <a href={dork.url} target="_blank" rel="noreferrer" style={{ padding: '5px 10px', backgroundColor: `${dork.color}15`, border: `1px solid ${dork.color}40`, borderRadius: '4px', color: dork.color, cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontWeight: 600 }}>
                      <ExternalLink size={11} /> Search
                    </a>
                    <button onClick={() => copyText(dork.query, `dork-${i}`)}
                      style={{ padding: '5px 10px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#FFF', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {copied === `dork-${i}` ? <CheckCircle2 size={11} color="#22C55E" /> : <Copy size={11} />} Copy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
