import React, { useState } from 'react';
import { Search, AlertTriangle, ShieldAlert, Bug, Copy, ChevronLeft, CheckCircle2 } from 'lucide-react';

const CWE_NAMES = {
  'CWE-79': 'Cross-site Scripting (XSS)',
  'CWE-89': 'SQL Injection',
  'CWE-94': 'Code Injection',
  'CWE-200': 'Exposure of Sensitive Information',
  'CWE-209': 'Error Message Information Leak',
  'CWE-22': 'Path Traversal',
  'CWE-77': 'Command Injection',
  'CWE-78': 'OS Command Injection',
  'CWE-120': 'Buffer Overflow',
  'CWE-125': 'Out-of-bounds Read',
  'CWE-190': 'Integer Overflow',
  'CWE-269': 'Improper Privilege Management',
  'CWE-276': 'Incorrect Default Permissions',
  'CWE-284': 'Improper Access Control',
  'CWE-285': 'Improper Authorization',
  'CWE-287': 'Improper Authentication',
  'CWE-288': 'Authentication Bypass Using Alternate Path',
  'CWE-295': 'Improper Certificate Validation',
  'CWE-306': 'Missing Authentication for Critical Function',
  'CWE-311': 'Missing Encryption of Sensitive Data',
  'CWE-312': 'Cleartext Storage of Sensitive Information',
  'CWE-319': 'Cleartext Transmission of Sensitive Info',
  'CWE-326': 'Inadequate Encryption Strength',
  'CWE-330': 'Use of Insufficiently Random Values',
  'CWE-345': 'Insufficient Verification of Data Authenticity',
  'CWE-352': 'Cross-Site Request Forgery (CSRF)',
  'CWE-362': 'Race Condition',
  'CWE-384': 'Session Fixation',
  'CWE-400': 'Uncontrolled Resource Consumption',
  'CWE-401': 'Memory Leak',
  'CWE-416': 'Use After Free',
  'CWE-434': 'Unrestricted File Upload',
  'CWE-451': 'UI Misrepresentation of Critical Info',
  'CWE-476': 'NULL Pointer Dereference',
  'CWE-502': 'Deserialization of Untrusted Data',
  'CWE-532': 'Information Exposure Through Log Files',
  'CWE-601': 'URL Redirection to Untrusted Site',
  'CWE-611': 'XML External Entity (XXE)',
  'CWE-613': 'Insufficient Session Expiration',
  'CWE-639': 'Insecure Direct Object Reference (IDOR)',
  'CWE-668': 'Exposure of Resource to Wrong Sphere',
  'CWE-706': 'Use of Incorrectly-Resolved Name',
  'CWE-732': 'Incorrect Permission Assignment',
  'CWE-770': 'Allocation of Resources Without Limits',
  'CWE-776': 'XML Entity Expansion (Billion Laughs)',
  'CWE-787': 'Out-of-bounds Write',
  'CWE-798': 'Use of Hard-coded Credentials',
  'CWE-862': 'Missing Authorization',
  'CWE-863': 'Incorrect Authorization',
  'CWE-918': 'Server-Side Request Forgery (SSRF)',
  'CWE-1321': 'Prototype Pollution',
  'CWE-1333': 'Inefficient Regular Expression (ReDoS)',
};

function getSeverityColor(severity) {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL': return '#EF4444';
    case 'HIGH': return '#F97316';
    case 'MEDIUM': case 'MODERATE': return '#EAB308';
    case 'LOW': return '#22C55E';
    default: return '#6B7280';
  }
}

function parseCVSSVector(vector) {
  if (!vector || vector === 'N/A') return null;
  const parts = vector.split('/');
  const map = {};
  parts.forEach(p => {
    const [k, v] = p.split(':');
    if (k && v) map[k] = v;
  });
  return map;
}

function MetricRow({ label, value }) {
  const color = value === 'NONE' || value === 'LOW' ? '#22C55E' : value === 'HIGH' || value === 'CRITICAL' ? '#EF4444' : '#EAB308';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color }}>{value || 'N/A'}</span>
    </div>
  );
}

export default function CVEMapper() {
  const [service, setService] = useState('');
  const [version, setVersion] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [selectedCVE, setSelectedCVE] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!service || !version) { setError('Please provide both service name and version.'); return; }
    setLoading(true);
    setError('');
    setResults(null);
    setSelectedCVE(null);
    try {
      const response = await window.electronAPI.mapCves({ service, version });
      if (response.success) { setResults(response.data || []); }
      else { setError(response.error || 'Failed to fetch CVE data.'); }
    } catch (err) { setError(err.message || 'An unexpected error occurred.'); }
    finally { setLoading(false); }
  };

  // ── LIST VIEW ──
  const renderList = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Identified Vulnerabilities ({results.length})</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {results.map((cve, i) => (
          <div key={i} onClick={() => setSelectedCVE(cve)}
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px 20px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'none'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#FFF' }}>{cve.id}</span>
                {cve.severity && cve.severity !== 'UNKNOWN' && (
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', backgroundColor: `${getSeverityColor(cve.severity)}20`, color: getSeverityColor(cve.severity), border: `1px solid ${getSeverityColor(cve.severity)}40` }}>
                    {cve.severity} {cve.score > 0 ? `(${cve.score.toFixed(1)})` : ''}
                  </span>
                )}
                {cve.cwes && cve.cwes.map((c, idx) => (
                  <span key={idx} style={{ fontSize: '11px', color: '#A855F7', backgroundColor: 'rgba(168,85,247,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{c}</span>
                ))}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Click for details →</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', margin: 0 }}>
              {cve.title && cve.title !== cve.id ? <strong style={{ color: 'var(--text-primary)' }}>{cve.title} — </strong> : null}
              {cve.description || 'No description available.'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  // ── DETAIL VIEW ──
  const renderDetail = () => {
    const cve = selectedCVE;
    const cvssMap = cve.cvssMetrics || {};
    const hasMetrics = cvssMap.attackVector || (cve.cvssVector && cve.cvssVector !== 'N/A' && cve.cvssVector !== '');
    const vectorParsed = !cvssMap.attackVector ? parseCVSSVector(cve.cvssVector) : null;

    const av = cvssMap.attackVector || vectorParsed?.AV || '';
    const ac = cvssMap.attackComplexity || vectorParsed?.AC || '';
    const pr = cvssMap.privilegesRequired || vectorParsed?.PR || '';
    const ui = cvssMap.userInteraction || vectorParsed?.UI || '';
    const scope = cvssMap.scope || vectorParsed?.S || '';
    const conf = cvssMap.confidentiality || vectorParsed?.C || '';
    const integ = cvssMap.integrity || vectorParsed?.I || '';
    const avail = cvssMap.availability || vectorParsed?.A || '';

    const copyReport = () => {
      const lines = [
        `## ${cve.id}${cve.title && cve.title !== cve.id ? ' — ' + cve.title : ''}`,
        `**Severity:** ${cve.severity} (${cve.score}/10)`,
        cve.cwes?.length ? `**CWE:** ${cve.cwes.map(c => `${c} (${CWE_NAMES[c] || 'Unknown'})`).join(', ')}` : '',
        `**Affected:** ${cve.affectedVersions}`,
        `**Patched:** ${cve.patchedVersions}`,
        cve.cvssVector ? `**CVSS Vector:** ${cve.cvssVector}` : '',
        '',
        `### Description`,
        cve.description,
        '',
        cve.references?.length ? `### References\n${cve.references.map(r => `- ${r}`).join('\n')}` : '',
      ].filter(Boolean).join('\n');
      handleCopy(lines);
    };

    return (
      <div>
        <button onClick={() => setSelectedCVE(null)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: 0, marginBottom: '20px', fontSize: '14px', fontWeight: 600 }}>
          <ChevronLeft size={16} /> Back to results ({results.length})
        </button>

        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(0,0,0,0.3), rgba(0,0,0,0.1))', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#FFF', marginBottom: '12px', lineHeight: 1.3 }}>
                  {cve.title && cve.title !== cve.id ? cve.title : cve.id}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#FFF', backgroundColor: 'var(--bg-tertiary)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>{cve.id}</span>
                  {cve.severity && cve.severity !== 'UNKNOWN' && (
                    <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '4px', backgroundColor: `${getSeverityColor(cve.severity)}20`, color: getSeverityColor(cve.severity), border: `1px solid ${getSeverityColor(cve.severity)}40` }}>
                      {cve.severity} severity
                    </span>
                  )}
                  {cve.score > 0 && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>CVSS: <strong style={{ color: '#FFF' }}>{cve.score.toFixed(1)} / 10</strong></span>}
                </div>
              </div>
              <button onClick={copyReport}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#FFF', cursor: 'pointer', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {copied ? <CheckCircle2 size={16} color="#22C55E" /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy Report'}
              </button>
            </div>
          </div>

          {/* CWE Section */}
          {cve.cwes && cve.cwes.length > 0 && (
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(168,85,247,0.03)' }}>
              <h4 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '10px' }}>Weakness Classification (CWE)</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {cve.cwes.map((cwe, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#A855F7', backgroundColor: 'rgba(168,85,247,0.12)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(168,85,247,0.25)' }}>{cwe}</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{CWE_NAMES[cwe] || 'Unknown Weakness Type'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Version Info */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ flex: 1, padding: '16px 24px', borderRight: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '8px' }}>Affected Versions</h4>
              <div style={{ fontSize: '14px', color: '#EF4444', fontFamily: 'monospace' }}>{cve.affectedVersions || 'Unknown'}</div>
            </div>
            <div style={{ flex: 1, padding: '16px 24px' }}>
              <h4 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '8px' }}>Patched Versions</h4>
              <div style={{ fontSize: '14px', color: '#22C55E', fontFamily: 'monospace' }}>{cve.patchedVersions || 'No fix available'}</div>
            </div>
          </div>

          {/* CVSS Metrics */}
          {hasMetrics && (
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '12px' }}>CVSS v3 Base Metrics</h4>
              {cve.cvssVector && <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: '12px', wordBreak: 'break-all' }}>{cve.cvssVector}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                <MetricRow label="Attack Vector" value={av} />
                <MetricRow label="Attack Complexity" value={ac} />
                <MetricRow label="Privileges Required" value={pr} />
                <MetricRow label="User Interaction" value={ui} />
                <MetricRow label="Scope" value={scope} />
                <MetricRow label="Confidentiality Impact" value={conf} />
                <MetricRow label="Integrity Impact" value={integ} />
                <MetricRow label="Availability Impact" value={avail} />
              </div>
            </div>
          )}

          {/* Description */}
          <div style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#FFF', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>Vulnerability Details</h3>
            <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.8', whiteSpace: 'pre-wrap', backgroundColor: 'rgba(0,0,0,0.15)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              {cve.description || 'No detailed description available.'}
            </div>
          </div>

          {/* References */}
          {cve.references && cve.references.length > 0 && (
            <div style={{ padding: '0 24px 24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#FFF', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>References</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {cve.references.map((ref, idx) => (
                  <a key={idx} href={ref} target="_blank" rel="noreferrer"
                    style={{ fontSize: '13px', color: 'var(--accent-primary)', textDecoration: 'none', wordBreak: 'break-all', display: 'flex', alignItems: 'flex-start', gap: '8px' }}
                    onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px', minWidth: '16px' }}>↗</span> {ref}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="pro-section">
      <div className="pro-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="pro-icon-container"><Bug size={20} color="var(--accent-primary)" /></div>
          <div>
            <h1 className="pro-title">CVE Mapper</h1>
            <p className="pro-subtitle">Map vulnerabilities for specific services and versions</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
        {!selectedCVE && (
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '16px', marginBottom: '32px', backgroundColor: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Service Name</label>
              <input type="text" className="pro-input" value={service} onChange={e => setService(e.target.value)} placeholder="e.g., Next.js, nginx, openssh" autoFocus />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Version</label>
              <input type="text" className="pro-input" value={version} onChange={e => setVersion(e.target.value)} placeholder="e.g., 13.8.3" />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" className="pro-button primary" disabled={loading} style={{ height: '42px', padding: '0 24px' }}>
                {loading ? <><span className="pro-spinner"></span>Scanning...</> : <><Search size={16} />Map CVEs</>}
              </button>
            </div>
          </form>
        )}

        {error && (
          <div style={{ padding: '16px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#EF4444', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <ShieldAlert size={20} /><span style={{ fontSize: '14px' }}>{error}</span>
          </div>
        )}

        {results && results.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
            <AlertTriangle size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <h3>No Vulnerabilities Found</h3>
            <p>No CVEs mapped to {service} version {version}.</p>
          </div>
        )}

        {results && results.length > 0 && !selectedCVE && renderList()}
        {selectedCVE && renderDetail()}
      </div>
    </div>
  );
}
