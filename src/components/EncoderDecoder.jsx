import { useState, useMemo } from 'react';
import { Binary, Copy, CheckCheck, Search } from 'lucide-react';
import '../styles/Tools.css';

const chars32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const chars58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

const enc32 = (str) => {
  let res = '', i = 0, l = str.length;
  for (; i < l; i += 5) {
    let b = (str.charCodeAt(i) || 0) << 32 | (str.charCodeAt(i + 1) || 0) << 24 | (str.charCodeAt(i + 2) || 0) << 16 | (str.charCodeAt(i + 3) || 0) << 8 | (str.charCodeAt(i + 4) || 0);
    for (let j = 0; j < 8; j++) res += chars32.charAt((b >>> (35 - j * 5)) & 31);
  }
  return res.replace(/(A+)$/, (m) => '='.repeat(m.length));
};

const dec32 = (str) => {
  str = str.replace(/=+$/, '').toUpperCase();
  let res = '', i = 0, l = str.length;
  for (; i < l; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 5) | (chars32.indexOf(str.charAt(i + j)) || 0);
    res += String.fromCharCode((b >>> 32) & 255, (b >>> 24) & 255, (b >>> 16) & 255, (b >>> 8) & 255, b & 255);
  }
  return res.replace(/\0+$/, '');
};

const toHex = (str, space = true) => Array.from(str).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(space ? ' ' : '');
const fromHex = (str) => str.replace(/[^0-9a-fA-F]/g, '').match(/.{1,2}/g)?.map(h => String.fromCharCode(parseInt(h, 16))).join('') || '';

const toBin = (str, space = true) => Array.from(str).map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(space ? ' ' : '');
const fromBin = (str) => str.replace(/[^01]/g, '').match(/.{1,8}/g)?.map(b => String.fromCharCode(parseInt(b, 2))).join('') || '';

const ipToHex = (ip) => ip.split('.').map(o => parseInt(o).toString(16).padStart(2, '0')).join('');
const hexToIp = (hex) => hex.replace(/[^0-9a-fA-F]/g, '').match(/.{1,2}/g)?.map(h => parseInt(h, 16)).join('.') || '';

const morseMap = { 'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--', 'Z': '--..', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----', ' ': '/' };
const revMorseMap = Object.fromEntries(Object.entries(morseMap).map(([k, v]) => [v, k]));

const leetMap = { a: '4', b: '8', e: '3', l: '1', o: '0', s: '5', t: '7', z: '2' };
const revLeetMap = Object.fromEntries(Object.entries(leetMap).map(([k, v]) => [v, k]));

const parseJWT = (token, part) => {
  try { return atob(token.split('.')[part]); } catch { return 'Invalid JWT'; }
};

const transformations = [
  { group: 'Base Encoding', items: [
    { id: 'base64', label: 'Base64', enc: (s) => btoa(unescape(encodeURIComponent(s))), dec: (s) => decodeURIComponent(escape(atob(s))) },
    { id: 'base64url', label: 'Base64 URL', enc: (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), dec: (s) => { let x = s.replace(/-/g, '+').replace(/_/g, '/'); while (x.length % 4) x += '='; return decodeURIComponent(escape(atob(x))); } },
    { id: 'base32', label: 'Base32', enc: enc32, dec: dec32 },
    { id: 'hex', label: 'Hex (Spaces)', enc: s => toHex(s, true), dec: fromHex },
    { id: 'hex_nospace', label: 'Hex (No Space)', enc: s => toHex(s, false), dec: fromHex },
    { id: 'hex_array', label: 'Hex (0x)', enc: s => Array.from(s).map(c => '0x' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(','), dec: s => s.split(',').map(x => String.fromCharCode(parseInt(x.replace('0x',''), 16))).join('') },
    { id: 'binary', label: 'Binary (Spaces)', enc: s => toBin(s, true), dec: fromBin },
    { id: 'binary_nospace', label: 'Binary (No Space)', enc: s => toBin(s, false), dec: fromBin },
    { id: 'octal', label: 'Octal', enc: s => Array.from(s).map(c => c.charCodeAt(0).toString(8).padStart(3, '0')).join(' '), dec: s => s.split(/\s+/).map(o => String.fromCharCode(parseInt(o, 8))).join('') },
    { id: 'ascii', label: 'ASCII (Dec)', enc: s => Array.from(s).map(c => c.charCodeAt(0)).join(' '), dec: s => s.split(/\s+/).map(n => String.fromCharCode(parseInt(n))).join('') },
  ]},
  { group: 'Web & Format', items: [
    { id: 'url', label: 'URL Component', enc: encodeURIComponent, dec: decodeURIComponent },
    { id: 'url_full', label: 'URL Encode (Full)', enc: s => encodeURI(s), dec: decodeURI },
    { id: 'html', label: 'HTML Entity', enc: s => s.replace(/[&<>"'\/]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#47;' }[c])), dec: s => { const e = document.createElement('textarea'); e.innerHTML = s; return e.value; } },
    { id: 'xml', label: 'XML Entity', enc: s => s.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c])), dec: s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&apos;/g, "'").replace(/&quot;/g, '"') },
    { id: 'unicode', label: 'Unicode Escape (\\u)', enc: s => Array.from(s).map(c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).join(''), dec: s => s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))) },
    { id: 'utf16_hex', label: 'UTF-16 Hex', enc: s => Array.from(s).map(c => '\\x' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''), dec: s => s.replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))) },
    { id: 'sql_char', label: 'SQL CHAR()', enc: s => 'CHAR(' + Array.from(s).map(c => c.charCodeAt(0)).join(',') + ')', dec: s => s.replace(/CHAR\((.*?)\)/gi, '$1').split(',').map(n => String.fromCharCode(parseInt(n))).join('') },
    { id: 'jwt_header', label: 'JWT Decode Header', enc: () => 'N/A', dec: s => parseJWT(s, 0) },
    { id: 'jwt_payload', label: 'JWT Decode Payload', enc: () => 'N/A', dec: s => parseJWT(s, 1) },
  ]},
  { group: 'Text Manipulation', items: [
    { id: 'uppercase', label: 'UPPERCASE', enc: s => s.toUpperCase(), dec: s => s.toUpperCase() },
    { id: 'lowercase', label: 'lowercase', enc: s => s.toLowerCase(), dec: s => s.toLowerCase() },
    { id: 'titlecase', label: 'Title Case', enc: s => s.replace(/\b\w/g, c => c.toUpperCase()), dec: s => s.replace(/\b\w/g, c => c.toUpperCase()) },
    { id: 'camelcase', label: 'camelCase', enc: s => s.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()), dec: s => s },
    { id: 'snakecase', label: 'snake_case', enc: s => s.replace(/\s+/g, '_').toLowerCase(), dec: s => s.replace(/_/g, ' ') },
    { id: 'kebabcase', label: 'kebab-case', enc: s => s.replace(/\s+/g, '-').toLowerCase(), dec: s => s.replace(/-/g, ' ') },
    { id: 'reverse', label: 'Reverse String', enc: s => s.split('').reverse().join(''), dec: s => s.split('').reverse().join('') },
    { id: 'reversewords', label: 'Reverse Words', enc: s => s.split(' ').reverse().join(' '), dec: s => s.split(' ').reverse().join(' ') },
    { id: 'rm_whitespace', label: 'Strip Whitespace', enc: s => s.replace(/\s+/g, ''), dec: s => s },
    { id: 'rm_newlines', label: 'Strip Newlines', enc: s => s.replace(/\n|\r/g, ''), dec: s => s },
    { id: 'space_to_tabs', label: 'Spaces -> Tabs', enc: s => s.replace(/ {4}/g, '\t'), dec: s => s.replace(/\t/g, '    ') },
    { id: 'json_escape', label: 'JSON Escape', enc: s => JSON.stringify(s).slice(1, -1), dec: s => { try { return JSON.parse(`"${s}"`); } catch { return s; } } },
    { id: 'csv_escape', label: 'CSV Escape', enc: s => `"${s.replace(/"/g, '""')}"`, dec: s => s.replace(/^"|"$/g, '').replace(/""/g, '"') },
  ]},
  { group: 'Network & System', items: [
    { id: 'ip_to_hex', label: 'IP -> Hex', enc: ipToHex, dec: hexToIp },
    { id: 'ip_to_dec', label: 'IP -> Decimal', enc: s => s.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0).toString(), dec: s => { let d = parseInt(s); return [(d >>> 24) & 255, (d >>> 16) & 255, (d >>> 8) & 255, d & 255].join('.'); } },
    { id: 'ip_to_octal', label: 'IP -> Octal', enc: s => s.split('.').map(o => '0' + parseInt(o).toString(8)).join('.'), dec: s => s.split('.').map(o => parseInt(o, 8)).join('.') },
    { id: 'mac_colon', label: 'MAC (Colon -> Dash)', enc: s => s.replace(/:/g, '-'), dec: s => s.replace(/-/g, ':') },
    { id: 'uuid_dash', label: 'UUID (Strip Dash)', enc: s => s.replace(/-/g, ''), dec: s => s.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5') },
  ]},
  { group: 'Ciphers & Esoteric', items: [
    { id: 'rot13', label: 'Rot13', enc: s => s.replace(/[a-zA-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() < 'n' ? 13 : -13))), dec: s => s.replace(/[a-zA-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() < 'n' ? 13 : -13))) },
    { id: 'rot47', label: 'Rot47', enc: s => s.replace(/[!-~]/g, c => String.fromCharCode(33 + ((c.charCodeAt(0) - 33 + 47) % 94))), dec: s => s.replace(/[!-~]/g, c => String.fromCharCode(33 + ((c.charCodeAt(0) - 33 + 47) % 94))) },
    { id: 'atbash', label: 'Atbash', enc: s => s.replace(/[a-z]/gi, c => String.fromCharCode(c <= 'Z' ? 155 - c.charCodeAt(0) : 219 - c.charCodeAt(0))), dec: s => s.replace(/[a-z]/gi, c => String.fromCharCode(c <= 'Z' ? 155 - c.charCodeAt(0) : 219 - c.charCodeAt(0))) },
    { id: 'caesar_add1', label: 'Caesar Shift (+1)', enc: s => s.replace(/[a-z]/gi, c => String.fromCharCode(c.charCodeAt(0) + 1)), dec: s => s.replace(/[a-z]/gi, c => String.fromCharCode(c.charCodeAt(0) - 1)) },
    { id: 'caesar_sub1', label: 'Caesar Shift (-1)', enc: s => s.replace(/[a-z]/gi, c => String.fromCharCode(c.charCodeAt(0) - 1)), dec: s => s.replace(/[a-z]/gi, c => String.fromCharCode(c.charCodeAt(0) + 1)) },
    { id: 'morse', label: 'Morse Code', enc: s => s.toUpperCase().split('').map(c => morseMap[c] || c).join(' '), dec: s => s.split(' ').map(m => revMorseMap[m] || m).join('') },
    { id: 'leetspeak', label: 'Leetspeak', enc: s => s.toLowerCase().replace(/[abelostz]/g, c => leetMap[c]), dec: s => s.replace(/[12345780]/g, c => revLeetMap[c] || c) },
  ]},
];

const formats = transformations.flatMap(g => g.items);

export default function EncoderDecoder() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState('encode');
  const [activeTransform, setActiveTransform] = useState('base64');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const handleTransform = (type) => {
    setActiveTransform(type);
    if (!input.trim()) { setOutput(''); return; }
    try {
      const tool = formats.find(f => f.id === type);
      setOutput(mode === 'encode' ? tool.enc(input) : tool.dec(input));
    } catch {
      setOutput('Error processing data.');
    }
  };

  const handleInputChange = (val) => {
    setInput(val);
    if (!val.trim()) { setOutput(''); return; }
    try {
      const tool = formats.find(f => f.id === activeTransform);
      setOutput(mode === 'encode' ? tool.enc(val) : tool.dec(val));
    } catch {
      setOutput('Error processing data.');
    }
  };

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    if (!input.trim()) return;
    try {
      const tool = formats.find(f => f.id === activeTransform);
      setOutput(newMode === 'encode' ? tool.enc(input) : tool.dec(input));
    } catch {
      setOutput('Error processing data.');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const filteredTransformations = useMemo(() => {
    if (!searchQuery.trim()) return transformations;
    const q = searchQuery.toLowerCase();
    return transformations.map(g => ({
      group: g.group,
      items: g.items.filter(i => i.label.toLowerCase().includes(q))
    })).filter(g => g.items.length > 0);
  }, [searchQuery]);

  return (
    <div className="tool-page page-enter">
      <div className="tool-header">
        <div className="tool-header-left">
          <Binary size={28} />
          <div>
            <h1 className="tool-title">Encoder / Decoder (50+)</h1>
            <p className="tool-subtitle">Transform payloads between 50+ formats instantly</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '3px' }}>
          <button
            className={`btn btn-sm ${mode === 'encode' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => handleModeSwitch('encode')}
          >ENCODE</button>
          <button
            className={`btn btn-sm ${mode === 'decode' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => handleModeSwitch('decode')}
          >DECODE</button>
        </div>
      </div>

      <div className="encoder-layout">
        <div className="encoder-input-section">
          <label className="tool-label">INPUT DATA</label>
          <textarea
            className="tool-textarea"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={`Paste payload here to ${mode}...`}
            rows={8}
          />

          <label className="tool-label" style={{ marginTop: '16px' }}>OUTPUT RESULT</label>
          <div className="encoder-output" style={{ minHeight: '150px' }}>
            <pre className="encoder-output-text">{output || 'Result will appear here...'}</pre>
            {output && (
              <button className="btn btn-ghost btn-sm encoder-copy-btn" onClick={handleCopy}>
                {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
              </button>
            )}
          </div>
        </div>

        <div className="encoder-transforms-section" style={{ maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', paddingRight: '10px' }}>
          <div className="recondb-search" style={{ marginBottom: '16px' }}>
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              className="recondb-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search formats..."
            />
          </div>

          {filteredTransformations.length === 0 ? (
            <div className="analyzer-empty" style={{ minHeight: '100px' }}>No formats found</div>
          ) : (
            filteredTransformations.map(g => (
              <div key={g.group} style={{ marginBottom: '20px' }}>
                <label className="tool-label" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px', marginBottom: '8px' }}>
                  {g.group}
                </label>
                <div className="encoder-grid">
                  {g.items.map(t => (
                    <button
                      key={t.id}
                      className={`encoder-btn ${activeTransform === t.id ? 'active' : ''}`}
                      onClick={() => handleTransform(t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
