import React, { useState, useRef } from 'react';
import { Target, Shield, AlertTriangle, Key, Link as LinkIcon, Search, CheckCircle2, Loader2, Code2 } from 'lucide-react';
import '../styles/Tools.css';

const REGEX_RULES = {
  secrets: [
    { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g, severity: 'Critical' },
    { name: 'Google Cloud API Key', pattern: /AIza[0-9A-Za-z\-_]{35}/g, severity: 'High' },
    { name: 'Stripe Secret Key', pattern: /sk_live_[0-9a-zA-Z]{24}/g, severity: 'Critical' },
    { name: 'GitHub Access Token', pattern: /ghp_[0-9a-zA-Z]{36}/g, severity: 'Critical' },
    { name: 'Slack Bot Token', pattern: /xoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}/g, severity: 'High' },
    { name: 'Square Access Token', pattern: /sq0atp-[0-9A-Za-z\-_]{22}/g, severity: 'High' },
    { name: 'RSA Private Key', pattern: /-----BEGIN RSA PRIVATE KEY-----[\s\S]+?-----END RSA PRIVATE KEY-----/g, severity: 'Critical' },
    { name: 'JSON Web Token (JWT)', pattern: /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, severity: 'High' }
  ],
  endpoints: [
    { name: 'Absolute URLs', pattern: /https?:\/\/[a-zA-Z0-9.\-_]+/g },
    { name: 'Relative API Endpoints', pattern: /(?:"|')(\/api\/[a-zA-Z0-9_/?=&.-]+)(?:"|')/g },
    { name: 'Hidden Paths', pattern: /(?:"|')(\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)(?:"|')/g }
  ]
};

export default function SecretSniper() {
  const inputRef = useRef(null);
  const [results, setResults] = useState({ secrets: [], endpoints: [] });
  const [isScanning, setIsScanning] = useState(false);
  const [stats, setStats] = useState({ scanned: 0, found: 0 });

  const executeScan = () => {
    const code = inputRef.current ? inputRef.current.value : '';
    if (!code.trim()) return;
    
    setIsScanning(true);
    setResults({ secrets: [], endpoints: [] });
    setStats({ scanned: 0, found: 0 });

    const allRules = [
      ...REGEX_RULES.secrets.map(r => ({ ...r, category: 'secret' })),
      ...REGEX_RULES.endpoints.map(r => ({ ...r, category: 'endpoint' }))
    ];
    
    let ruleIndex = 0;
    const foundSecrets = [];
    const foundEndpoints = [];
    const seen = new Set();

    const processRule = () => {
      if (ruleIndex >= allRules.length) {
        setResults({ secrets: foundSecrets, endpoints: foundEndpoints });
        setStats({ scanned: code.length, found: foundSecrets.length + foundEndpoints.length });
        setIsScanning(false);
        return;
      }
      
      const rule = allRules[ruleIndex];
      const matches = code.matchAll(rule.pattern);
      
      let matchCount = 0;
      for (const match of matches) {
        if (matchCount++ > 5000) break;
        const val = match[1] || match[0];
        if (!seen.has(val) && val.length > 2) {
          seen.add(val);
          if (rule.category === 'secret') {
            foundSecrets.push({ type: rule.name, value: val, severity: rule.severity });
          } else {
            foundEndpoints.push({ type: rule.name, value: val });
          }
        }
      }
      
      ruleIndex++;
      setTimeout(processRule, 10);
    };

    setTimeout(processRule, 10);
  };

  const getSeverityColor = (severity) => {
    if (severity === 'Critical') return '#EF4444';
    if (severity === 'High') return '#F59E0B';
    return '#3B82F6';
  };

  return (
    <div className="tool-page page-enter" style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
      <div className="tool-header">
        <div className="tool-header-left">
          <Target size={28} style={{ color: '#EF4444' }} />
          <div>
            <h1 className="tool-title">Secret Sniper Engine</h1>
            <p className="tool-subtitle">Zero-Lag Regex De-obfuscator for Minified JavaScript</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {/* LEFT PANEL: INPUT */}
        <div style={{ flex: 1, minWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <label className="tool-label" style={{ margin: 0 }}><Code2 size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }}/> TARGET JAVASCRIPT</label>
              {stats.scanned > 0 && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Scanned {(stats.scanned / 1024 / 1024).toFixed(2)} MB
                </span>
              )}
            </div>
            <textarea 
              className="tool-input" 
              ref={inputRef}
              placeholder="Paste massive, chaotic app.min.js files here..."
              style={{ height: '400px', fontFamily: 'var(--font-mono)', fontSize: '12px', whiteSpace: 'pre' }}
            />
            <button 
              className="btn btn-primary" 
              onClick={executeScan} 
              disabled={isScanning}
              style={{ width: '100%', justifyContent: 'center', marginTop: '16px', background: '#EF4444', color: '#fff', border: 'none' }}
            >
              {isScanning ? (
                <><Loader2 size={16} className="spin" /> Scanning Application Memory...</>
              ) : (
                <><Target size={16} /> Execute Sniper Scan</>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: RESULTS */}
        <div style={{ flex: 1, minWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* SECRETS TRAY */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px', flex: 1 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={16} style={{ color: '#EF4444' }} /> High-Value Secrets ({results.secrets.length})
            </h3>
            
            {results.secrets.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', padding: '20px', textAlign: 'center', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                No API keys or tokens detected.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto', paddingRight: '8px' }}>
                {results.secrets.map((sec, i) => (
                  <div key={i} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{sec.type}</span>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: `${getSeverityColor(sec.severity)}20`, color: getSeverityColor(sec.severity) }}>
                        {sec.severity}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-green)', wordBreak: 'break-all' }}>
                      {sec.value}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ENDPOINTS TRAY */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px', flex: 1 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LinkIcon size={16} style={{ color: '#3B82F6' }} /> Attack Surface & Endpoints ({results.endpoints.length})
            </h3>
            
            {results.endpoints.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', padding: '20px', textAlign: 'center', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                No internal endpoints or URLs detected.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto', paddingRight: '8px' }}>
                {results.endpoints.map((ep, i) => (
                  <div key={i} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', minWidth: '60px' }}>{ep.type.split(' ')[0]}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                      {ep.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
