import React, { useState } from 'react';
import { Mail, Search, Shield, Globe, Clock, Server, Copy, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

function parseEmailHeaders(raw) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const headers = [];
  let current = null;

  for (const line of lines) {
    if (/^[A-Za-z0-9-]+:/.test(line)) {
      if (current) headers.push(current);
      const idx = line.indexOf(':');
      current = { name: line.substring(0, idx).trim(), value: line.substring(idx + 1).trim() };
    } else if (current && /^\s+/.test(line)) {
      current.value += ' ' + line.trim();
    }
  }
  if (current) headers.push(current);

  // Extract hops from Received headers (bottom-up = chronological)
  const received = headers.filter(h => h.name.toLowerCase() === 'received').reverse();
  const hops = received.map((r, i) => {
    const fromMatch = r.value.match(/from\s+([^\s(;]+)/i);
    const byMatch = r.value.match(/by\s+([^\s(;]+)/i);
    const ipMatch = r.value.match(/\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]/);
    const dateMatch = r.value.match(/;\s*(.+)$/);
    return {
      hop: i + 1,
      from: fromMatch ? fromMatch[1] : '—',
      by: byMatch ? byMatch[1] : '—',
      ip: ipMatch ? ipMatch[1] : null,
      date: dateMatch ? dateMatch[1].trim() : '—',
      raw: r.value,
    };
  });

  // Extract key fields
  const get = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
  const authResults = get('Authentication-Results') || get('ARC-Authentication-Results');

  const spf = /spf=(\w+)/i.exec(authResults);
  const dkim = /dkim=(\w+)/i.exec(authResults);
  const dmarc = /dmarc=(\w+)/i.exec(authResults);

  return {
    headers,
    hops,
    from: get('From'),
    to: get('To'),
    subject: get('Subject'),
    date: get('Date'),
    messageId: get('Message-ID') || get('Message-Id'),
    returnPath: get('Return-Path'),
    replyTo: get('Reply-To'),
    xMailer: get('X-Mailer') || get('User-Agent'),
    contentType: get('Content-Type'),
    spf: spf ? spf[1] : null,
    dkim: dkim ? dkim[1] : null,
    dmarc: dmarc ? dmarc[1] : null,
    senderIP: hops.length > 0 ? hops[0].ip : null,
  };
}

const AuthBadge = ({ label, status }) => {
  if (!status) return <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>{label}: N/A</span>;
  const pass = status.toLowerCase() === 'pass';
  const color = pass ? '#22C55E' : '#EF4444';
  return (
    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}>
      {label}: {status.toUpperCase()}
    </span>
  );
};

export default function EmailHeaderAnalyzer() {
  const [raw, setRaw] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [expandedHop, setExpandedHop] = useState(null);

  const handleAnalyze = (e) => {
    e.preventDefault();
    if (!raw.trim()) { setError('Please paste email headers.'); return; }
    setError('');
    try {
      const parsed = parseEmailHeaders(raw.trim());
      if (parsed.headers.length === 0) { setError('No valid headers found. Make sure you pasted the full raw headers.'); return; }
      setResult(parsed);
    } catch (err) { setError('Failed to parse headers: ' + err.message); }
  };

  const handleCopy = () => {
    if (!result) return;
    const lines = [
      `From: ${result.from}`, `To: ${result.to}`, `Subject: ${result.subject}`,
      `Date: ${result.date}`, `Sender IP: ${result.senderIP || 'Hidden'}`,
      `SPF: ${result.spf || 'N/A'}`, `DKIM: ${result.dkim || 'N/A'}`, `DMARC: ${result.dmarc || 'N/A'}`,
      '', '--- Route ---',
      ...result.hops.map(h => `Hop ${h.hop}: ${h.from} → ${h.by}${h.ip ? ` [${h.ip}]` : ''}`),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const InfoRow = ({ icon: Icon, label, value, color, mono }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
      <Icon size={16} color={color || 'var(--accent-primary)'} />
      <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: '100px' }}>{label}</span>
      <span style={{ fontSize: '14px', color: '#FFF', fontWeight: 500, fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value || '—'}</span>
    </div>
  );

  return (
    <div className="pro-section">
      <div className="pro-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="pro-icon-container"><Mail size={20} color="var(--accent-primary)" /></div>
          <div>
            <h1 className="pro-title">Email Header Analyzer</h1>
            <p className="pro-subtitle">Trace email routes, extract sender IPs, verify SPF/DKIM/DMARC authentication</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
        <form onSubmit={handleAnalyze} style={{ marginBottom: '28px', backgroundColor: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Paste Raw Email Headers
          </label>
          <textarea
            className="pro-input"
            value={raw} onChange={e => setRaw(e.target.value)}
            placeholder={'Paste full email headers here...\n\nGmail: Open email → ⋮ → "Show original"\nOutlook: Open email → ⋮ → "View message source"'}
            style={{ width: '100%', minHeight: '150px', resize: 'vertical', fontFamily: 'monospace', fontSize: '12px', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button type="submit" className="pro-button primary" style={{ padding: '10px 24px' }}>
              <Search size={16} /> Analyze
            </button>
          </div>
        </form>

        {error && (
          <div style={{ padding: '16px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#EF4444', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <AlertTriangle size={20} /><span style={{ fontSize: '14px' }}>{error}</span>
          </div>
        )}

        {result && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Analysis Results</h3>
              <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#FFF', cursor: 'pointer', fontSize: '13px' }}>
                {copied ? <CheckCircle2 size={14} color="#22C55E" /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy Report'}
              </button>
            </div>

            {/* Message Info */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#3B82F6', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={14} /> Message Info
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '8px' }}>
                <InfoRow icon={Mail} label="From" value={result.from} />
                <InfoRow icon={Mail} label="To" value={result.to} />
                <InfoRow icon={Mail} label="Subject" value={result.subject} />
                <InfoRow icon={Clock} label="Date" value={result.date} />
                {result.returnPath && <InfoRow icon={Mail} label="Return-Path" value={result.returnPath} mono />}
                {result.xMailer && <InfoRow icon={Server} label="Mailer" value={result.xMailer} />}
              </div>
            </div>

            {/* Authentication */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#22C55E', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={14} /> Authentication
              </h4>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <AuthBadge label="SPF" status={result.spf} />
                <AuthBadge label="DKIM" status={result.dkim} />
                <AuthBadge label="DMARC" status={result.dmarc} />
              </div>
              {result.senderIP && (
                <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Globe size={16} color="#EF4444" />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>SENDER IP:</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#EF4444', fontFamily: 'monospace' }}>{result.senderIP}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>— Use IP Tracker to geolocate</span>
                </div>
              )}
            </div>

            {/* Email Route */}
            {result.hops.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#8B5CF6', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Globe size={14} /> Email Route ({result.hops.length} hops)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {result.hops.map((hop, idx) => (
                    <div key={idx}>
                      <div
                        onClick={() => setExpandedHop(expandedHop === idx ? null : idx)}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#8B5CF6'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                      >
                        {expandedHop === idx ? <ChevronDown size={14} color="#8B5CF6" /> : <ChevronRight size={14} color="var(--text-muted)" />}
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#8B5CF6', minWidth: '50px' }}>Hop {hop.hop}</span>
                        <span style={{ fontSize: '13px', color: '#FFF', fontFamily: 'monospace' }}>{hop.from}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>→</span>
                        <span style={{ fontSize: '13px', color: '#FFF', fontFamily: 'monospace' }}>{hop.by}</span>
                        {hop.ip && <span style={{ fontSize: '12px', color: '#EF4444', fontFamily: 'monospace', marginLeft: 'auto' }}>[{hop.ip}]</span>}
                      </div>
                      {expandedHop === idx && (
                        <div style={{ padding: '12px 16px 12px 48px', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace', wordBreak: 'break-all', backgroundColor: 'var(--bg-secondary)', borderRadius: '0 0 8px 8px', borderLeft: '2px solid #8B5CF6' }}>
                          {hop.raw}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Headers */}
            <details style={{ marginBottom: '24px' }}>
              <summary style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px 0' }}>
                All Headers ({result.headers.length})
              </summary>
              <div style={{ marginTop: '8px', maxHeight: '300px', overflowY: 'auto', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', padding: '16px', border: '1px solid var(--border-subtle)' }}>
                {result.headers.map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', padding: '4px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                    <span style={{ color: '#3B82F6', fontWeight: 700, minWidth: '180px', fontFamily: 'monospace' }}>{h.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{h.value}</span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
