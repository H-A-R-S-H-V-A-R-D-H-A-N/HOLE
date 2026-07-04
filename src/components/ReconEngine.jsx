import React, { useState, useEffect } from 'react';
import { Radar, Search, ShieldAlert, FileText, Share2, ShieldCheck, Mail, Database, Globe, Hash, AlertTriangle, AlertOctagon, Info, Server, Activity, ArrowRight, CheckCircle2 } from 'lucide-react';
import '../styles/Tools.css';

export default function ReconEngine({ storageDir, preLoadedData }) {
  const [domain, setDomain] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('subdomains');

  // If preLoadedData is passed in (like from TargetCommand), use it immediately
  useEffect(() => {
    if (preLoadedData) {
      setResults(preLoadedData);
      setDomain(preLoadedData.domain || '');
    }
  }, [preLoadedData]);

  const handleScan = async (e) => {
    if (e) e.preventDefault();
    if (!domain.trim()) return;

    setIsScanning(true);
    setResults(null);
    setErrorMsg('');

    try {
      const res = await window.electronAPI.reconScan({ domain: domain.trim() });
      if (res.success) {
        setResults(res);
      } else {
        setErrorMsg(res.error || 'Scan failed.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred during scanning.');
    } finally {
      setIsScanning(false);
    }
  };

  const getConfidenceBadge = (conf) => {
    switch(conf) {
      case 'HIGH': return <span style={{ padding: '4px 10px', backgroundColor: 'rgba(239,68,68,0.2)', color: '#EF4444', borderRadius: '12px', fontSize: '11px', fontWeight: 800, animation: 'pulse-red 2s infinite' }}>HIGH PROBABILITY</span>;
      case 'MEDIUM': return <span style={{ padding: '4px 10px', backgroundColor: 'rgba(245,158,11,0.2)', color: '#F59E0B', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>MEDIUM PROBABILITY</span>;
      default: return <span style={{ padding: '4px 10px', backgroundColor: 'rgba(59,130,246,0.2)', color: '#3B82F6', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>LOW PROBABILITY</span>;
    }
  };

  return (
    <div className="pro-section">
      {!preLoadedData && (
        <div className="pro-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="pro-icon-container"><Radar size={20} color="var(--accent-primary)" /></div>
            <div>
              <h1 className="pro-title">Recon Engine</h1>
              <p className="pro-subtitle">Full attack surface intelligence. 8 subdomain sources, nmap, WHOIS, headers, and advanced takeover validation.</p>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: preLoadedData ? '0' : '24px', flex: 1, overflowY: 'auto' }}>
        
        {!preLoadedData && (
          <form onSubmit={handleScan} style={{ display: 'flex', gap: '12px', marginBottom: '32px', backgroundColor: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Target Domain</label>
              <input type="text" className="pro-input" value={domain} onChange={e => setDomain(e.target.value)} placeholder="example.com" />
            </div>
            <button type="submit" className="pro-button primary" disabled={isScanning || !domain} style={{ height: '42px', padding: '0 24px' }}>
              {isScanning ? <><span className="pro-spinner"></span>Scanning...</> : <><Search size={16} />Launch Recon</>}
            </button>
          </form>
        )}

        {errorMsg && (
          <div style={{ padding: '16px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#EF4444', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <ShieldAlert size={20} /><span style={{ fontSize: '14px', fontWeight: 600 }}>{errorMsg}</span>
          </div>
        )}

        {isScanning && !preLoadedData && (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div className="pro-spinner" style={{ width: '40px', height: '40px', borderWidth: '4px', margin: '0 auto 20px', borderColor: '#8B5CF6 transparent #8B5CF6 transparent' }}></div>
            <h3 style={{ color: '#fff', marginBottom: '8px' }}>Gathering Intelligence...</h3>
            <p style={{ color: 'var(--text-muted)' }}>Probing 8 sources, nmap, and security headers. This takes a few minutes.</p>
          </div>
        )}

        {results && (
          <div className="recon-results">
            {/* Intel Dashboard Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)' }}>
                  <Database size={16} /> <span style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: 700 }}>Subdomains</span>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>{results.subdomains?.length || 0}</div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)' }}>
                  <Server size={16} /> <span style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: 700 }}>Open Ports</span>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>{results.ports?.length || 0}</div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)' }}>
                  <ShieldAlert size={16} /> <span style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: 700 }}>Takeovers</span>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#EF4444' }}>{results.subdomains?.filter(s => s.takeover).length || 0}</div>
              </div>
              {results.geoInfo && (
                <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)' }}>
                    <Globe size={16} /> <span style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: 700 }}>Server Geo</span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{results.geoInfo.country}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{results.geoInfo.isp}</div>
                </div>
              )}
            </div>

              <button onClick={() => setActiveTab('subdomains')} style={{ padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'subdomains' ? '2px solid #8B5CF6' : '2px solid transparent', color: activeTab === 'subdomains' ? '#8B5CF6' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Subdomains</button>
              <button onClick={() => setActiveTab('dns')} style={{ padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'dns' ? '2px solid #8B5CF6' : '2px solid transparent', color: activeTab === 'dns' ? '#8B5CF6' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>DNS Records</button>
              <button onClick={() => setActiveTab('ports')} style={{ padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'ports' ? '2px solid #8B5CF6' : '2px solid transparent', color: activeTab === 'ports' ? '#8B5CF6' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Nmap Ports</button>
              <button onClick={() => setActiveTab('headers')} style={{ padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'headers' ? '2px solid #8B5CF6' : '2px solid transparent', color: activeTab === 'headers' ? '#8B5CF6' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Security Headers</button>
              <button onClick={() => setActiveTab('ssl')} style={{ padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'ssl' ? '2px solid #8B5CF6' : '2px solid transparent', color: activeTab === 'ssl' ? '#8B5CF6' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>SSL / TLS</button>
              <button onClick={() => setActiveTab('whois')} style={{ padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'whois' ? '2px solid #8B5CF6' : '2px solid transparent', color: activeTab === 'whois' ? '#8B5CF6' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>WHOIS</button>
              <button onClick={() => setActiveTab('reverseip')} style={{ padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'reverseip' ? '2px solid #8B5CF6' : '2px solid transparent', color: activeTab === 'reverseip' ? '#8B5CF6' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Reverse IP</button>

            {/* TAB CONTENTS */}
            
            {activeTab === 'subdomains' && (
              <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>SUBDOMAIN</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>STATUS</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>CNAME</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>TAKEOVER</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.subdomains?.map((s, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '13px', color: '#fff' }}>{s.name}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {s.status > 0 ? (
                            <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, backgroundColor: s.status === 200 ? 'rgba(34,197,94,0.2)' : s.status >= 400 ? 'rgba(239,68,68,0.2)' : 'rgba(139,92,246,0.2)', color: s.status === 200 ? '#22C55E' : s.status >= 400 ? '#EF4444' : '#8B5CF6' }}>
                              {s.status} {s.statusText}
                            </span>
                          ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Unreachable</span>}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{s.cname || '-'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {s.takeover ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                              <span style={{ color: '#EF4444', fontWeight: 700, fontSize: '12px' }}>{s.takeoverSvc}</span>
                              {getConfidenceBadge(s.confidence)}
                            </div>
                          ) : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'ports' && (
              <div className="terminal-card" style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '24px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#fff', fontSize: '16px' }}>Exhaustive Nmap Scan (-A -p-)</h3>
                {results.ports?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {results.ports.map((p, i) => (
                      <div key={i} style={{ padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', borderLeft: '2px solid #00ffcc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ color: '#00ffcc', fontWeight: 'bold', marginRight: '8px' }}>{p.port}/{p.protocol || 'tcp'}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{p.service || 'unknown'} {p.version ? `(${p.version})` : ''}</span>
                        </div>
                        <span style={{ fontSize: '12px', padding: '2px 6px', background: 'rgba(0, 255, 204, 0.1)', color: '#00ffcc', borderRadius: '4px', textTransform: 'uppercase' }}>
                          open
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)' }}>No open ports found during the scan.</div>
                )}
              </div>
            )}

            {activeTab === 'headers' && (
              <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                {results.securityHeaders?.map((h, i) => (
                  <div key={i} style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {h.present ? <CheckCircle2 size={20} color="#22C55E" /> : <AlertTriangle size={20} color="#EF4444" />}
                      <div>
                        <div style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>{h.name}</div>
                        {h.present && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', wordBreak: 'break-all' }}>{h.value}</div>}
                      </div>
                    </div>
                    {!h.present && <span style={{ padding: '4px 10px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>MISSING</span>}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'ssl' && results.ssl && (
              <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Issuer</label>
                    <div style={{ fontWeight: 600, color: '#fff', marginTop: '4px' }}>{results.ssl.issuer}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Protocol</label>
                    <div style={{ fontWeight: 600, color: '#3B82F6', marginTop: '4px' }}>{results.ssl.protocol}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Valid From</label>
                    <div style={{ color: '#fff', marginTop: '4px', fontSize: '14px' }}>{new Date(results.ssl.notBefore).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Expires</label>
                    <div style={{ color: '#fff', marginTop: '4px', fontSize: '14px' }}>{new Date(results.ssl.notAfter).toLocaleDateString()}</div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Subject Alternative Names (SANs)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                      {results.ssl.sans?.map((s, i) => (
                        <span key={i} style={{ padding: '4px 8px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'whois' && results.whois && (
              <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Registrar</label>
                    <div style={{ fontWeight: 600, color: '#fff', marginTop: '4px' }}>{results.whois.registrar || '-'}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Organization</label>
                    <div style={{ fontWeight: 600, color: '#fff', marginTop: '4px' }}>{results.whois.org || '-'}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Creation Date</label>
                    <div style={{ color: '#fff', marginTop: '4px', fontSize: '14px' }}>{results.whois.createdDate || '-'}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Expiry Date</label>
                    <div style={{ color: '#fff', marginTop: '4px', fontSize: '14px' }}>{results.whois.expiryDate || '-'}</div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Name Servers</label>
                    <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', color: 'var(--text-muted)', fontSize: '14px' }}>
                      {results.whois.nameServers?.map((ns, i) => <li key={i}>{ns}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reverseip' && (
              <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '24px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#fff', fontSize: '16px' }}>Domains sharing the same IP</h3>
                {results.reverseIP?.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {results.reverseIP.map((d, i) => (
                      <span key={i} style={{ padding: '6px 12px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', fontSize: '13px', color: '#fff', fontFamily: 'monospace' }}>{d}</span>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)' }}>No other domains found on this IP.</div>
                )}
              </div>
            )}


            {activeTab === 'dns' && results.dns && (
              <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                  {results.dns.a?.length > 0 && <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>A Records (IPv4)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                      {results.dns.a.map((ip, i) => <span key={i} style={{ padding: '6px 12px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', fontSize: '13px', color: '#fff', fontFamily: 'monospace' }}>{ip}</span>)}
                    </div>
                  </div>}
                  {results.dns.mx?.length > 0 && <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>MX Records (Mail)</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                      {results.dns.mx.map((mx, i) => <div key={i} style={{ padding: '8px 12px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', fontSize: '13px', color: '#fff', fontFamily: 'monospace' }}>{mx.pref} {mx.host}</div>)}
                    </div>
                  </div>}
                  {results.dns.txt?.length > 0 && <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>TXT Records (SPF/DMARC)</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                      {results.dns.txt.map((txt, i) => <div key={i} style={{ padding: '8px 12px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{txt}</div>)}
                    </div>
                  </div>}
                  {results.dns.ns?.length > 0 && <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>NS Records (Nameservers)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                      {results.dns.ns.map((ns, i) => <span key={i} style={{ padding: '6px 12px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', fontSize: '13px', color: '#fff', fontFamily: 'monospace' }}>{ns}</span>)}
                    </div>
                  </div>}
                </div>
              </div>
            )}


          </div>
        )}
      </div>
    </div>
  );
}
