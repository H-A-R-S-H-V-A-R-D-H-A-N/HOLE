import { useState } from 'react';
import { Scan, Copy, CheckCheck, Trash2 } from 'lucide-react';
import '../styles/Tools.css';

const detectors = [
  // === Hashes (15+) ===
  { name: 'MD5', regex: /^[a-f0-9]{32}$/i, category: 'Hash', description: 'MD5 (128-bit). Broken — collisions are trivial.' },
  { name: 'SHA-1', regex: /^[a-f0-9]{40}$/i, category: 'Hash', description: 'SHA-1 (160-bit). Broken (SHAttered).' },
  { name: 'SHA-224', regex: /^[a-f0-9]{56}$/i, category: 'Hash', description: 'SHA-224 hash (224-bit).' },
  { name: 'SHA-256', regex: /^[a-f0-9]{64}$/i, category: 'Hash', description: 'SHA-256 (256-bit). Standard modern hash.' },
  { name: 'SHA-384', regex: /^[a-f0-9]{96}$/i, category: 'Hash', description: 'SHA-384 (384-bit).' },
  { name: 'SHA-512', regex: /^[a-f0-9]{128}$/i, category: 'Hash', description: 'SHA-512 (512-bit).' },
  { name: 'NTLM Hash', regex: /^[a-f0-9]{32}$/i, category: 'Hash', description: 'Windows NTLM (same length as MD5).' },
  { name: 'bcrypt', regex: /^\$2[ayb]\$.{56}$/, category: 'Hash', description: 'bcrypt adaptive hash. Resistant to GPU brute-force.' },
  { name: 'Argon2', regex: /^\$argon2(i|d|id)\$/, category: 'Hash', description: 'Argon2 hash. Memory-hard algorithm.' },
  { name: 'Unix Crypt (MD5)', regex: /^\$1\$/, category: 'Hash', description: 'MD5-based Unix crypt hash.' },
  { name: 'Unix Crypt (SHA-256)', regex: /^\$5\$/, category: 'Hash', description: 'SHA-256 based Unix crypt hash.' },
  { name: 'Unix Crypt (SHA-512)', regex: /^\$6\$/, category: 'Hash', description: 'SHA-512 based Unix crypt hash.' },
  { name: 'MySQL4+ Hash', regex: /^\*[A-F0-9]{40}$/i, category: 'Hash', description: 'MySQL 4.1+ password hash.' },
  { name: 'RIPEMD-160', regex: /^[a-f0-9]{40}$/i, category: 'Hash', description: 'RIPEMD-160 hash (same length as SHA-1).' },
  { name: 'CRC32', regex: /^[a-f0-9]{8}$/i, category: 'Hash', description: 'CRC32 checksum.' },

  // === Encodings (10+) ===
  { name: 'Base64', regex: /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/, category: 'Encoding', description: 'Base64 encoding.', validate: (s) => { try { return btoa(atob(s)) === s; } catch { return false; } } },
  { name: 'Base32', regex: /^[A-Z2-7]+=*$/, category: 'Encoding', description: 'Base32 encoding (RFC 4648).' },
  { name: 'Base58', regex: /^[1-9A-HJ-NP-Za-km-z]+$/, category: 'Encoding', description: 'Base58 encoding (often used in cryptocurrency).' },
  { name: 'Hex String', regex: /^(0x)?[a-f0-9]{2,}$/i, category: 'Encoding', description: 'Hexadecimal data.', validate: (s) => s.replace(/^0x/i, '').length % 2 === 0 },
  { name: 'URL Encoded', regex: /(?:%[0-9A-Fa-f]{2})+/, category: 'Encoding', description: 'URL (percent) encoded string.' },
  { name: 'HTML Entity', regex: /&(#\d+|#x[a-f0-9]+|[a-z]+);/i, category: 'Encoding', description: 'HTML entity.' },
  { name: 'Unicode Escape', regex: /(\\u[0-9a-fA-F]{4})+/, category: 'Encoding', description: 'Unicode escape sequence (\\uXXXX).' },

  // === Cloud & API Tokens (20+) ===
  { name: 'JWT (JSON Web Token)', regex: /^eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/, category: 'Token', description: 'JSON Web Token.' },
  { name: 'AWS Access Key', regex: /^(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}$/, category: 'Token', description: 'AWS Access Key ID. Immediately rotate if exposed!' },
  { name: 'AWS Secret Key', regex: /^[A-Za-z0-9/+=]{40}$/, category: 'Token', description: 'AWS Secret Access Key (40 chars).' },
  { name: 'GitHub Token (classic)', regex: /^ghp_[a-zA-Z0-9]{36}$/, category: 'Token', description: 'GitHub PAT (classic).' },
  { name: 'GitHub Token (fine-grained)', regex: /^github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}$/, category: 'Token', description: 'GitHub PAT (fine-grained).' },
  { name: 'Slack Bot Token', regex: /^xoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}$/, category: 'Token', description: 'Slack Bot Token.' },
  { name: 'Slack User Token', regex: /^xoxp-[0-9]{11}-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{32}$/, category: 'Token', description: 'Slack User Token.' },
  { name: 'Google Cloud API Key', regex: /^AIza[0-9A-Za-z_-]{35}$/, category: 'Token', description: 'Google Cloud / Maps API Key.' },
  { name: 'Google OAuth Token', regex: /^ya29\.[0-9A-Za-z_-]+$/, category: 'Token', description: 'Google OAuth Access Token.' },
  { name: 'Stripe Secret Key', regex: /^sk_(live|test)_[a-zA-Z0-9]{24,}$/, category: 'Token', description: 'Stripe Secret Key. Critical exposure.' },
  { name: 'Stripe Publishable Key', regex: /^pk_(live|test)_[a-zA-Z0-9]{24,}$/, category: 'Token', description: 'Stripe Publishable Key.' },
  { name: 'Twilio API Key', regex: /^SK[0-9a-fA-F]{32}$/, category: 'Token', description: 'Twilio API Key.' },
  { name: 'Mailgun API Key', regex: /^key-[0-9a-zA-Z]{32}$/, category: 'Token', description: 'Mailgun API Key.' },
  { name: 'SendGrid API Key', regex: /^SG\.[0-9a-zA-Z_-]{22}\.[0-9a-zA-Z_-]{43}$/, category: 'Token', description: 'SendGrid API Key.' },
  { name: 'Square Access Token', regex: /^sq0atp-[0-9A-Za-z\-_]{22}$/, category: 'Token', description: 'Square Access Token.' },
  { name: 'Square OAuth Secret', regex: /^sq0csp-[0-9A-Za-z\-_]{43}$/, category: 'Token', description: 'Square OAuth Secret.' },
  { name: 'Telegram Bot API Key', regex: /^[0-9]{9,10}:[a-zA-Z0-9_-]{35}$/, category: 'Token', description: 'Telegram Bot API Key.' },
  { name: 'Discord Bot Token', regex: /^[MN][A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}$/, category: 'Token', description: 'Discord Bot Token.' },
  { name: 'RSA Private Key', regex: /-----BEGIN RSA PRIVATE KEY-----/, category: 'Token', description: 'RSA Private Key Block.' },
  { name: 'OpenSSH Private Key', regex: /-----BEGIN OPENSSH PRIVATE KEY-----/, category: 'Token', description: 'OpenSSH Private Key.' },
  { name: 'PGP Private Key', regex: /-----BEGIN PGP PRIVATE KEY BLOCK-----/, category: 'Token', description: 'PGP Private Key.' },

  // === Network / Infrastructure (10+) ===
  { name: 'IPv4 Address', regex: /^(\d{1,3}\.){3}\d{1,3}$/, category: 'Network', description: 'IPv4 address. Check for internal/external.', validate: (s) => s.split('.').every(n => parseInt(n) >= 0 && parseInt(n) <= 255) },
  { name: 'IPv6 Address', regex: /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/, category: 'Network', description: 'Full IPv6 address.' },
  { name: 'MAC Address', regex: /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/, category: 'Network', description: 'MAC hardware address.' },
  { name: 'URL', regex: /^https?:\/\/[^\s]+$/, category: 'Network', description: 'HTTP/HTTPS URL.' },
  { name: 'Email Address', regex: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, category: 'Network', description: 'Email address format.' },
  { name: 'Domain Name', regex: /^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, category: 'Network', description: 'Domain name.' },
  { name: 'Bitcoin Address', regex: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/, category: 'Network', description: 'Bitcoin wallet address.' },
  { name: 'Ethereum Address', regex: /^0x[a-fA-F0-9]{40}$/, category: 'Network', description: 'Ethereum wallet address.' },
  { name: 'Monero Address', regex: /^4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}$/, category: 'Network', description: 'Monero wallet address.' },

  // === Data Formats & PII (10+) ===
  { name: 'UUID v4', regex: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, category: 'Data', description: 'UUID v4 (Random).' },
  { name: 'UUID (generic)', regex: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, category: 'Data', description: 'Generic UUID.' },
  { name: 'Unix Timestamp', regex: /^1[0-9]{9}$/, category: 'Data', description: 'Unix timestamp.' },
  { name: 'JSON Object', regex: /^\{[\s\S]*\}$/, category: 'Data', description: 'JSON object.', validate: (s) => { try { JSON.parse(s); return true; } catch { return false; } } },
  { name: 'Credit Card (Visa)', regex: /^4[0-9]{12}(?:[0-9]{3})?$/, category: 'PII', description: 'Visa card number.' },
  { name: 'Credit Card (Mastercard)', regex: /^5[1-5][0-9]{14}$/, category: 'PII', description: 'Mastercard number.' },
  { name: 'Credit Card (Amex)', regex: /^3[47][0-9]{13}$/, category: 'PII', description: 'American Express card number.' },
  { name: 'SSN (US)', regex: /^\d{3}-\d{2}-\d{4}$/, category: 'PII', description: 'US Social Security Number.' },
  { name: 'Phone Number (Intl)', regex: /^\+?[1-9]\d{1,14}$/, category: 'PII', description: 'International phone number (E.164).' },
  { name: 'IBAN', regex: /^[a-zA-Z]{2}[0-9]{2}[a-zA-Z0-9]{4}[0-9]{7}([a-zA-Z0-9]?){0,16}$/, category: 'PII', description: 'International Bank Account Number (IBAN).' },
];

const categoryColors = {
  Hash: { bg: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', border: 'rgba(239, 68, 68, 0.25)' },
  Encoding: { bg: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', border: 'rgba(245, 158, 11, 0.25)' },
  Token: { bg: 'rgba(239, 68, 68, 0.12)', color: '#FF6B6B', border: 'rgba(239, 68, 68, 0.25)' },
  Network: { bg: 'rgba(96, 165, 250, 0.12)', color: '#60A5FA', border: 'rgba(96, 165, 250, 0.25)' },
  Data: { bg: 'rgba(139, 92, 246, 0.12)', color: '#A78BFA', border: 'rgba(139, 92, 246, 0.25)' },
  PII: { bg: 'rgba(236, 72, 153, 0.12)', color: '#EC4899', border: 'rgba(236, 72, 153, 0.25)' },
};

export default function StringAnalyzer() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState([]);
  const [copied, setCopied] = useState(false);

  const analyze = (value) => {
    setInput(value);
    if (!value.trim()) { setResults([]); return; }
    
    const trimmed = value.trim();
    const matches = [];
    
    for (const d of detectors) {
      if (d.regex.test(trimmed)) {
        if (d.validate && !d.validate(trimmed)) continue;
        matches.push({ ...d, confidence: d.validate ? 'High' : 'Medium' });
      }
    }
    
    if (matches.length === 0 && trimmed.includes('\n')) {
      const lines = trimmed.split('\n').filter(l => l.trim());
      lines.forEach((line, idx) => {
        const lt = line.trim();
        for (const d of detectors) {
          if (d.regex.test(lt)) {
            if (d.validate && !d.validate(lt)) continue;
            matches.push({ ...d, confidence: d.validate ? 'High' : 'Medium', lineNum: idx + 1, lineValue: lt });
          }
        }
      });
    }
    
    setResults(matches);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="tool-page page-enter">
      <div className="tool-header">
        <div className="tool-header-left">
          <Scan size={28} />
          <div>
            <h1 className="tool-title">Auto-Detect (50+ Rules)</h1>
            <p className="tool-subtitle">String, Hash, Token & Encoding Identifier</p>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={() => { setInput(''); setResults([]); }}>
          <Trash2 size={16} /> Clear
        </button>
      </div>

      <div className="analyzer-layout">
        <div className="analyzer-input-section">
          <label className="tool-label">INPUT STRING</label>
          <textarea
            className="tool-textarea"
            value={input}
            onChange={(e) => analyze(e.target.value)}
            placeholder="Paste any string, hash, token, key, or encoded data here..."
            rows={8}
          />
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Supports 50+ definitions: Hashes, Cloud Keys (AWS, GCP, Slack, Stripe, SendGrid), Crypto, PII, and encodings.
          </p>
        </div>

        <div className="analyzer-results-section" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
          <label className="tool-label">DETECTION RESULTS ({results.length})</label>
          {results.length === 0 && input.trim() && (
            <div className="analyzer-empty">
              <p>No known patterns detected. The input may be:</p>
              <ul style={{ marginTop: '8px', paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <li>A custom/proprietary format</li>
                <li>Plain text or random data</li>
                <li>An unsupported hash algorithm</li>
              </ul>
            </div>
          )}
          {results.length === 0 && !input.trim() && (
            <div className="analyzer-empty">
              <Scan size={40} strokeWidth={1} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
              <p>Paste a string to auto-detect its type</p>
            </div>
          )}
          {results.map((r, i) => {
            const cat = categoryColors[r.category] || categoryColors.Data;
            return (
              <div key={i} className="analyzer-result-card" style={{ borderLeft: `3px solid ${cat.color}` }}>
                <div className="analyzer-result-header">
                  <span className="analyzer-result-name">{r.name}</span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span className="analyzer-badge" style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}>
                      {r.category}
                    </span>
                    <span className="analyzer-badge" style={{
                      background: r.confidence === 'High' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                      color: r.confidence === 'High' ? '#10B981' : '#F59E0B',
                      border: `1px solid ${r.confidence === 'High' ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`
                    }}>
                      {r.confidence} Confidence
                    </span>
                  </div>
                </div>
                {r.lineNum && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Line {r.lineNum}: <code style={{ color: 'var(--accent-primary)' }}>{r.lineValue}</code>
                  </div>
                )}
                <p className="analyzer-result-desc">{r.description}</p>
                <button className="btn btn-ghost btn-sm" onClick={() => handleCopy(r.description)} style={{ marginTop: '8px', fontSize: '11px' }}>
                  {copied ? <CheckCheck size={12} /> : <Copy size={12} />} Copy Info
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
