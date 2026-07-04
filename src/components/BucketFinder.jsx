import React, { useState } from 'react';
import { Cloud, Search, Shield, AlertTriangle, Copy, CheckCircle2, ChevronDown, ChevronRight, ExternalLink, Database, Lock, Unlock, FolderOpen } from 'lucide-react';

const severityConfig = {
  critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', label: 'CRITICAL', icon: Unlock },
  high: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'HIGH', icon: Lock },
  info: { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', label: 'INFO', icon: Database },
};

const providerColors = {
  'AWS S3': '#FF9900',
  'Azure Blob': '#0078D4',
  'GCP Storage': '#4285F4',
};

export default function BucketFinder() {
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [filter, setFilter] = useState('all'); // all | open | exists

  const handleScan = async (e) => {
    e.preventDefault();
    if (!company.trim()) { setError('Enter a company name.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const response = await window.electronAPI.findBuckets({ company: company.trim() });
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

  const filtered = result?.buckets?.filter(b => {
    if (filter === 'open') return b.status === 'open';
    if (filter === 'exists') return b.status === 'exists';
    return true;
  }) || [];

  const openCount = result?.buckets?.filter(b => b.status === 'open').length || 0;
  const existsCount = result?.buckets?.filter(b => b.status === 'exists').length || 0;

  return (
    <div className="pro-section">
      <div className="pro-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="pro-icon-container"><Cloud size={20} color="var(--accent-primary)" /></div>
          <div>
            <h1 className="pro-title">Cloud Bucket Finder</h1>
            <p className="pro-subtitle">Discover exposed S3 buckets, Azure blobs, and GCP storage — zero false positives</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
        <form onSubmit={handleScan} style={{ display: 'flex', gap: '12px', marginBottom: '28px', backgroundColor: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Company / Target Name</label>
            <input type="text" className="pro-input" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g., tesla, flipkart, uber" autoFocus />
          </div>
          <button type="submit" className="pro-button primary" disabled={loading} style={{ height: '42px', padding: '0 24px', whiteSpace: 'nowrap' }}>
            {loading ? <><span className="pro-spinner"></span>Scanning...</> : <><Search size={16} />Find Buckets</>}
          </button>
        </form>

        {error && (
          <div style={{ padding: '16px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#EF4444', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Shield size={20} /><span>{error}</span>
          </div>
        )}

        {result && (
          <div>
            {/* Stats */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cloud size={18} color="#22C55E" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#FFF' }}>{result.company}</span>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px' }}>
                <span style={{ fontSize: '12px', color: '#EF4444' }}>Open: <strong>{openCount}</strong></span>
                <span style={{ fontSize: '12px', color: '#F59E0B' }}>Exists (Private): <strong>{existsCount}</strong></span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total: <strong>{result.buckets?.length || 0}</strong></span>
              </div>
            </div>

            {/* Critical Alert */}
            {openCount > 0 && (
              <div style={{ padding: '16px', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '8px', color: '#EF4444', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <AlertTriangle size={22} />
                <div>
                  <strong>🚨 {openCount} Publicly Accessible Bucket(s) Found!</strong>
                  <p style={{ fontSize: '12px', opacity: 0.8, margin: '4px 0 0' }}>These buckets are publicly listable. Contents can be read by anyone on the internet. This is a critical security vulnerability.</p>
                </div>
              </div>
            )}

            {/* Filter buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {[
                { key: 'all', label: `All (${result.buckets?.length || 0})` },
                { key: 'open', label: `Open (${openCount})`, color: '#EF4444' },
                { key: 'exists', label: `Private (${existsCount})`, color: '#F59E0B' },
              ].map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border-subtle)',
                    backgroundColor: filter === f.key ? (f.color ? `${f.color}20` : 'rgba(59,130,246,0.2)') : 'var(--bg-tertiary)',
                    color: filter === f.key ? (f.color || '#3B82F6') : 'var(--text-muted)' }}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Results */}
            {filtered.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <Cloud size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <p style={{ fontSize: '14px' }}>No buckets found matching this filter.</p>
              </div>
            )}

            {filtered.map((bucket, i) => {
              const sev = severityConfig[bucket.severity] || severityConfig.info;
              const SevIcon = sev.icon;
              return (
                <div key={i} style={{ marginBottom: '12px', borderRadius: '8px', border: `1px solid ${bucket.status === 'open' ? 'rgba(239,68,68,0.4)' : 'var(--border-color)'}`, backgroundColor: bucket.status === 'open' ? 'rgba(239,68,68,0.06)' : 'var(--bg-secondary)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <SevIcon size={18} color={sev.color} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, color: '#FFF' }}>{bucket.name}</span>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, backgroundColor: providerColors[bucket.provider] + '20', color: providerColors[bucket.provider], border: `1px solid ${providerColors[bucket.provider]}40` }}>{bucket.provider}</span>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, backgroundColor: sev.bg, color: sev.color }}>{sev.label}</span>
                          {bucket.listable && <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(239,68,68,0.2)', color: '#EF4444' }}>📂 LISTABLE</span>}
                        </div>
                        <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bucket.url}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <a href={bucket.url} target="_blank" rel="noreferrer" style={{ padding: '4px 10px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#FFF', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}><ExternalLink size={11} /> Open</a>
                      <button onClick={() => copyText(bucket.url, `bucket-${i}`)}
                        style={{ padding: '4px 10px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#FFF', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {copied === `bucket-${i}` ? <CheckCircle2 size={11} color="#22C55E" /> : <Copy size={11} />} Copy
                      </button>
                    </div>
                  </div>

                  {/* Show sample files if listable */}
                  {bucket.sampleFiles && bucket.sampleFiles.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '10px 16px', backgroundColor: 'var(--bg-tertiary)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#EF4444', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FolderOpen size={12} /> EXPOSED FILES ({bucket.fileCount} total)
                      </div>
                      {bucket.sampleFiles.map((f, j) => (
                        <div key={j} style={{ fontSize: '12px', fontFamily: 'monospace', color: '#FFF', padding: '2px 0' }}>📄 {f}</div>
                      ))}
                      {bucket.fileCount > 5 && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>... and {bucket.fileCount - 5} more files</div>}
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
