import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Trash2, Radar, Shield, Globe, Server, FileCode2, Cloud, Eye, Hash, Activity, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import ReconEngine from './ReconEngine';
import '../styles/Tools.css';

const SCANNERS = [
  { id: 'recon',    name: 'Recon Engine',     icon: Radar,     color: '#8B5CF6', desc: 'Subdomains, DNS, Ports, SSL, WHOIS, Headers' },
  { id: 'waf',      name: 'WAF Detector',     icon: Shield,    color: '#EF4444', desc: 'Fingerprint 30+ WAFs & bypass tests' },
  { id: 'js',       name: 'JS Spider',        icon: FileCode2, color: '#3B82F6', desc: 'Extract JS files, secrets & endpoints' },
  { id: 'exposure', name: 'Exposure Hunter',   icon: Eye,       color: '#F59E0B', desc: 'Sensitive files (.env, .git, config)' },
  { id: 'buckets',  name: 'Bucket Finder',     icon: Cloud,     color: '#22C55E', desc: 'Discover misconfigured cloud buckets' },
  { id: 'favicon',  name: 'Favicon Hunter',    icon: Hash,      color: '#EC4899', desc: 'Favicon hash intelligence' },
];

export default function WildcardScanner({ domain, programName, storageDir, onBack }) {
  const [scanStatus, setScanStatus] = useState({}); // 'idle' | 'scanning' | 'done' | 'error'
  const [scanResults, setScanResults] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [activeDetail, setActiveDetail] = useState(null); // which scanner detail to show
  const [savedScans, setSavedScans] = useState(null);
  const abortRef = useRef(false);

  const getScanDir = () => `${storageDir}/TargetCommand/Scans/${domain.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  const hasInitialized = useRef(false);

  // Load saved scans on mount, auto-scan if none exist
  useEffect(() => {
    hasInitialized.current = false;
    loadSavedScans().then((foundSaved) => {
      if (!foundSaved && !hasInitialized.current) {
        hasInitialized.current = true;
        runAllScans();
      }
    });
  }, [domain]);

  const loadSavedScans = async () => {
    if (!storageDir || !window.electronAPI) return false;
    const dir = getScanDir();
    try {
      const res = await window.electronAPI.listFiles({ dirPath: dir, extensions: ['.json'] });
      if (res.success && res.files?.length > 0) {
        const loaded = {};
        const status = {};
        for (const file of res.files) {
          try {
            const content = await window.electronAPI.readFileDirect(`${dir}/${file.name}`);
            if (content.success) {
              const data = JSON.parse(content.content);
              const scannerId = file.name.replace('.json', '');
              loaded[scannerId] = data;
              status[scannerId] = 'done';
            }
          } catch(e) {}
        }
        setScanResults(loaded);
        setScanStatus(status);
        setSavedScans(loaded);
        return Object.keys(loaded).length > 0;
      }
    } catch(e) {}
    return false;
  };

  const saveScanResult = async (scannerId, data) => {
    if (!storageDir || !window.electronAPI) return;
    const dir = getScanDir();
    try {
      await window.electronAPI.saveFileDirect({
        filePath: `${dir}/${scannerId}.json`,
        content: JSON.stringify({ scannerId, domain, scannedAt: new Date().toISOString(), ...data }, null, 2)
      });
    } catch(e) { console.error('Save failed:', e); }
  };

  const deleteScanData = async () => {
    if (!storageDir || !window.electronAPI) return;
    const dir = getScanDir();
    try {
      await window.electronAPI.deleteDir(dir);
      setScanResults({});
      setScanStatus({});
      setSavedScans(null);
    } catch(e) { console.error('Delete failed:', e); }
  };

  const runAllScans = async () => {
    abortRef.current = false;
    setIsRunning(true);
    setActiveDetail(null);

    const api = window.electronAPI;
    const runners = [
      { id: 'recon',    fn: () => api.reconScan({ domain }) },
      { id: 'waf',      fn: () => api.wafDetect({ domain }) },
      { id: 'js',       fn: () => api.jsSpider({ domain }) },
      { id: 'exposure', fn: () => api.exposureHunt({ domain }) },
      { id: 'buckets',  fn: () => api.findBuckets({ company: domain.split('.')[0] }) },
      { id: 'favicon',  fn: () => api.faviconHunt({ domain }) },
    ];

    // Set all to idle first
    const initStatus = {};
    SCANNERS.forEach(s => { initStatus[s.id] = 'idle'; });
    setScanStatus(initStatus);
    setScanResults({});

    for (const runner of runners) {
      if (abortRef.current) break;
      setScanStatus(prev => ({ ...prev, [runner.id]: 'scanning' }));
      try {
        const res = await runner.fn();
        if (res.success !== false) {
          setScanResults(prev => ({ ...prev, [runner.id]: res }));
          setScanStatus(prev => ({ ...prev, [runner.id]: 'done' }));
          await saveScanResult(runner.id, res);
        } else {
          setScanResults(prev => ({ ...prev, [runner.id]: { error: res.error } }));
          setScanStatus(prev => ({ ...prev, [runner.id]: 'error' }));
        }
      } catch(err) {
        setScanResults(prev => ({ ...prev, [runner.id]: { error: err.message } }));
        setScanStatus(prev => ({ ...prev, [runner.id]: 'error' }));
      }
    }
    setIsRunning(false);
  };

  // Detail view for a specific scanner
  if (activeDetail) {
    const scanner = SCANNERS.find(s => s.id === activeDetail);
    const data = scanResults[activeDetail];
    return (
      <div className="pro-section">
        <div className="pro-header" style={{ paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setActiveDetail(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
              <ArrowLeft size={20} />
            </button>
            <div className="pro-icon-container" style={{ background: `${scanner.color}20` }}>
              <scanner.icon size={20} color={scanner.color} />
            </div>
            <div>
              <h1 className="pro-title">{scanner.name} — {domain}</h1>
              <p className="pro-subtitle">{scanner.desc}</p>
            </div>
          </div>
        </div>
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          {activeDetail === 'recon' && data && <ReconEngine preLoadedData={data} />}
          {activeDetail === 'waf' && data && renderWAFDetail(data)}
          {activeDetail === 'js' && data && renderJSDetail(data, domain)}
          {activeDetail === 'exposure' && data && renderExposureDetail(data, domain)}
          {activeDetail === 'buckets' && data && renderBucketsDetail(data)}
          {activeDetail === 'favicon' && data && renderFaviconDetail(data, domain)}
        </div>
      </div>
    );
  }

  // Main scanning dashboard
  const doneCount = Object.values(scanStatus).filter(s => s === 'done').length;
  const hasResults = Object.keys(scanResults).length > 0;

  return (
    <div className="pro-section">
      <div className="pro-header" style={{ paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
            <ArrowLeft size={20} />
          </button>
          <div className="pro-icon-container"><Activity size={20} color="#8B5CF6" /></div>
          <div style={{ flex: 1 }}>
            <h1 className="pro-title">Wildcard Scan — {domain}</h1>
            <p className="pro-subtitle">{programName} • Running all built-in scanners sequentially</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!isRunning && (
              <button onClick={runAllScans} className="pro-button primary" style={{ height: '38px', padding: '0 20px' }}>
                <Radar size={16} /> {hasResults ? 'Re-Scan All' : 'Start Scan'}
              </button>
            )}
            {hasResults && !isRunning && (
              <button onClick={deleteScanData} className="pro-button" style={{ height: '38px', padding: '0 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }}>
                <Trash2 size={16} /> Delete All
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
        
        {/* Progress Bar */}
        {isRunning && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#8B5CF6', fontWeight: 700 }}>Scanning in progress...</span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{doneCount}/{SCANNERS.length}</span>
            </div>
            <div style={{ height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(doneCount / SCANNERS.length) * 100}%`, background: 'linear-gradient(90deg, #8B5CF6, #EC4899)', borderRadius: '3px', transition: 'width 0.5s ease' }} />
            </div>
          </div>
        )}

        {/* Scanner Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {SCANNERS.map(scanner => {
            const status = scanStatus[scanner.id] || 'idle';
            const data = scanResults[scanner.id];
            const hasData = status === 'done' && data && !data.error;
            const isActive = status === 'scanning';

            return (
              <div
                key={scanner.id}
                onClick={() => hasData ? setActiveDetail(scanner.id) : null}
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: `1px solid ${isActive ? scanner.color : hasData ? 'rgba(139,92,246,0.3)' : 'var(--border-color)'}`,
                  borderRadius: '12px',
                  padding: '24px',
                  cursor: hasData ? 'pointer' : 'default',
                  transition: 'all 0.3s',
                  position: 'relative',
                  overflow: 'hidden',
                  animation: isActive ? 'pulse 2s infinite' : 'none',
                }}
                className={hasData ? 'hover-lift' : ''}
              >
                {/* Scanning glow effect */}
                {isActive && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, transparent, ${scanner.color}, transparent)`, animation: 'shimmer 1.5s infinite' }} />
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: `${scanner.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${scanner.color}30` }}>
                    <scanner.icon size={22} color={scanner.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '15px', fontWeight: 700 }}>{scanner.name}</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{scanner.desc}</p>
                  </div>
                  <div>
                    {status === 'idle' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }} />}
                    {status === 'scanning' && <Loader2 size={20} color={scanner.color} style={{ animation: 'spin 1s linear infinite' }} />}
                    {status === 'done' && !data?.error && <CheckCircle2 size={20} color="#22C55E" />}
                    {(status === 'error' || data?.error) && <XCircle size={20} color="#EF4444" />}
                  </div>
                </div>

                {/* Result summary */}
                {hasData && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {scanner.id === 'recon' && <>
                      <span style={pillStyle('#8B5CF6')}>{data.subdomains?.length || 0} Subdomains</span>
                      <span style={pillStyle('#3B82F6')}>{data.ports?.length || 0} Ports</span>
                    </>}
                    {scanner.id === 'waf' && <>
                      <span style={pillStyle(data.wafs?.length > 0 ? '#EF4444' : '#22C55E')}>{data.wafs?.length || 0} WAFs</span>
                    </>}
                    {scanner.id === 'js' && <>
                      <span style={pillStyle('#3B82F6')}>{data.jsFiles?.length || 0} JS Files</span>
                      <span style={pillStyle('#EF4444')}>{data.jsFiles?.filter(j => j.secrets?.length > 0).length || 0} With Secrets</span>
                    </>}
                    {scanner.id === 'exposure' && <>
                      <span style={pillStyle(data.exposures?.length > 0 ? '#EF4444' : '#22C55E')}>{data.exposures?.length || 0} Exposures</span>
                    </>}
                    {scanner.id === 'buckets' && <>
                      <span style={pillStyle('#22C55E')}>{data.buckets?.length || 0} Buckets</span>
                    </>}
                    {scanner.id === 'favicon' && <>
                      <span style={pillStyle('#EC4899')}>{data.hash ? 'Hash Found' : 'No Hash'}</span>
                    </>}
                  </div>
                )}

                {data?.error && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#EF4444' }}>{data.error}</div>
                )}

                {hasData && (
                  <div style={{ marginTop: '12px', fontSize: '12px', color: '#8B5CF6', fontWeight: 600 }}>Click to view details →</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const pillStyle = (color) => ({
  padding: '3px 10px',
  borderRadius: '100px',
  fontSize: '11px',
  fontWeight: 700,
  backgroundColor: `${color}15`,
  color,
  border: `1px solid ${color}30`,
});

// ---- Detail Renderers (same style as individual scanners) ----

function renderWAFDetail(data) {
  const wafs = data.wafs || [];
  const payloads = data.payloadTests || [];
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: wafs.length > 0 ? '#EF4444' : '#22C55E' }}>{wafs.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>WAFs Detected</div>
        </div>
        <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#F59E0B' }}>{payloads.filter(p => p.blocked).length}/{payloads.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Blocked</div>
        </div>
        <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#EF4444' }}>{(data.bypasses || []).filter(b => !b.blocked).length}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Bypasses</div>
        </div>
      </div>
      {wafs.map((w, i) => (
        <div key={i} style={{ marginBottom: '10px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={18} color="#EF4444" />
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{w.name}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{w.vendor}</span>
          </div>
          {w.evidence?.map((e, j) => (
            <div key={j} style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)', paddingLeft: '28px', marginTop: '4px' }}>• {e}</div>
          ))}
        </div>
      ))}
      {wafs.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: '#22C55E', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>✅ No WAF detected</div>}
    </div>
  );
}

function renderJSDetail(data, domain) {
  const files = data.jsFiles || [];
  const endpoints = data.endpoints || [];
  
  return (
    <div>
      <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
        <div style={{ fontSize: '28px', fontWeight: 800, color: '#3B82F6' }}>{files.length}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>JavaScript Files Found</div>
      </div>
      
      {files.map((jsUrl, i) => {
        // Support both old recon_engine shape and new js_spider shape
        const urlStr = typeof jsUrl === 'string' ? jsUrl : jsUrl.url;
        const secrets = jsUrl.secrets || [];
        const eps = jsUrl.endpoints || [];
        
        return (
          <div key={i} style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '12px' }}>
            <a href={urlStr?.startsWith('http') ? urlStr : `https://${domain}${urlStr?.startsWith('/') ? '' : '/'}${urlStr}`} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#3B82F6', fontFamily: 'monospace', wordBreak: 'break-all', display: 'block', marginBottom: '8px' }}>{urlStr}</a>
            {secrets?.length > 0 && <div style={{ marginBottom: '8px' }}><strong style={{ fontSize: '12px', color: '#EF4444' }}>SECRETS:</strong>{secrets.map((s, j) => <span key={j} style={{ display: 'block', fontFamily: 'monospace', fontSize: '11px', color: '#F87171', backgroundColor: 'rgba(239,68,68,0.1)', padding: '4px 8px', borderRadius: '4px', marginTop: '4px' }}>{s}</span>)}</div>}
            {eps?.length > 0 && <div><strong style={{ fontSize: '12px', color: '#8B5CF6' }}>ENDPOINTS:</strong><div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>{eps.map((ep, j) => <span key={j} style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-tertiary)', padding: '3px 8px', borderRadius: '4px' }}>{ep}</span>)}</div></div>}
          </div>
        );
      })}
      
      {endpoints.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h4 style={{ color: '#8B5CF6', fontSize: '14px', marginBottom: '12px' }}>Extracted Endpoints ({endpoints.length})</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {endpoints.slice(0, 50).map((ep, i) => (
              <div key={i} style={{ padding: '10px 14px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, backgroundColor: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>{ep.method || 'GET'}</span>
                <span style={{ fontSize: '13px', fontFamily: 'monospace', color: '#FFF' }}>{ep.path}</span>
                {ep.hasAuth && <span title="Auth Protected" style={{ fontSize: '12px' }}>🔒</span>}
              </div>
            ))}
            {endpoints.length > 50 && <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>+ {endpoints.length - 50} more endpoints hidden</div>}
          </div>
        </div>
      )}
      
      {files.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>No JS files found.</div>}
    </div>
  );
}

function renderExposureDetail(data, domain) {
  const exposures = data.exposures || [];
  return (
    <div>
      {exposures.length > 0 ? exposures.map((exp, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', marginBottom: '8px' }}>
          <div>
            <strong style={{ color: '#EF4444', fontSize: '15px' }}>{exp.type}</strong>
            <span style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>https://{domain}{exp.url}</span>
          </div>
          <span style={{ padding: '6px 12px', backgroundColor: '#EF4444', color: '#fff', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>EXPOSED ({exp.status})</span>
        </div>
      )) : (
        <div style={{ padding: '40px', textAlign: 'center', color: '#22C55E', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>✅ No sensitive exposures found</div>
      )}
    </div>
  );
}

function renderBucketsDetail(data) {
  const buckets = data.buckets || [];
  return (
    <div>
      {buckets.length > 0 ? buckets.map((b, i) => {
        const isPublic = b.isPublic || b.status === 'open' || b.listable;
        return (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: '#fff', fontFamily: 'monospace' }}>{b.url}</span>
            <span style={{ padding: '4px 12px', backgroundColor: isPublic ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: isPublic ? '#EF4444' : '#22C55E', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>{isPublic ? 'PUBLIC' : 'PRIVATE'}</span>
          </div>
        );
      }) : (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>No buckets found.</div>
      )}
    </div>
  );
}

function renderFaviconDetail(data, domain) {
  return (
    <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '40px', textAlign: 'center' }}>
      <img src={`https://${domain}/favicon.ico`} alt="Favicon" style={{ width: '64px', height: '64px', marginBottom: '16px' }} onError={(e) => e.target.style.display = 'none'} />
      <div style={{ fontSize: '24px', color: '#EC4899', fontFamily: 'monospace', fontWeight: 700 }}>{data.hash || 'No hash found'}</div>
      {data.matches?.length > 0 && (
        <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
          {data.matches.map((m, i) => <span key={i} style={{ padding: '6px 12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '13px', color: '#fff' }}>{m}</span>)}
        </div>
      )}
    </div>
  );
}
