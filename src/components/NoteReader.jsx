import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { Clock, Shield, Tag, Bookmark, Star, X, FileText, Code2, Eye, Code, Maximize2, Minimize2 } from 'lucide-react';
import { markdownToHtml } from '../utils/markdownParser';
import SearchOverlay from './SearchOverlay';
import '../styles/Editor.css';

/**
 * Check if HTML content from Tiptap actually contains raw markdown text.
 */
function htmlContainsRawMarkdown(html) {
  if (!html) return false;
  let text = html.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(p|div|h[1-6]|li|blockquote|pre)>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
  
  const mdPatterns = [
    /^#{1,6}\s/m, /^```/m, /^>\s/m, /^[-*+]\s/m, /^\d+\.\s/m,
    /\*\*[^*]+\*\*/, /\[.+\]\(.+\)/, /^---$/m, /^- \[[ x]\]/m,
    /^\|.+\|.+\|/m, // Markdown table rows
  ];
  let matches = 0;
  for (const pattern of mdPatterns) {
    if (pattern.test(text)) matches++;
  }
  return matches >= 1;
}

function extractTextFromHtml(html) {
  if (!html) return '';
  let text = html.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(p|div|h[1-6]|li|blockquote|pre)>/gi, '\n');
  text = text.replace(/<(p|div|h[1-6]|li|blockquote|pre)[^>]*>/gi, '');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
  return text.trim();
}

export default function NoteReader({ note, onClose, showSearchOverlay, setShowSearchOverlay }) {
  if (!note) return null;

  const metadata = note.metadata || {};
  const tags = metadata.tags || note.tags || [];
  const severity = metadata.severity || note.severity || 'info';
  const contentRef = useRef(null);
  const readerRef = useRef(null);
  const [viewMode, setViewMode] = useState('rendered'); // 'rendered' | 'raw'
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!readerRef.current) return;
    if (!document.fullscreenElement) {
      readerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Get the raw source content for raw view
  const rawSource = useMemo(() => {
    if (note.rawContent) return note.rawContent;
    if (note.html) return note.html;
    if (note.content) return JSON.stringify(note.content, null, 2);
    return 'No content available.';
  }, [note]);

  // Determine how to render the note content
  const { renderedHtml, detectedType } = useMemo(() => {
    const renderType = note.renderType || 'tiptap';

    if (renderType === 'markdown' && note.rawContent) {
      return { renderedHtml: markdownToHtml(note.rawContent), detectedType: 'markdown' };
    }
    if (renderType === 'html' && note.rawContent) {
      // Inject dark base styles so the iframe matches our app theme
      const darkBase = '<style>body{background:#0A0E17;color:#E8ECF4;font-family:Inter,system-ui,sans-serif;padding:24px;margin:0}a{color:#00D4FF}h1,h2,h3,h4,h5,h6{color:#fff}</style>';
      let html = note.rawContent;
      // Insert before </head> if it exists, otherwise prepend
      if (html.includes('</head>')) {
        html = html.replace('</head>', darkBase + '</head>');
      } else {
        html = darkBase + html;
      }
      return { renderedHtml: html, detectedType: 'html' };
    }
    if (renderType === 'plain' && note.rawContent) {
      const escaped = note.rawContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const lines = escaped.split('\n').map(l => `<p style="font-family: var(--font-mono); margin-bottom: 2px;">${l || '<br>'}</p>`).join('');
      return { renderedHtml: lines, detectedType: 'plain' };
    }
    if (renderType === 'code' && note.rawContent) {
      const ext = note.filePath?.split('.').pop()?.toLowerCase();
      if (ext === 'js' || ext === 'cjs' || ext === 'mjs') {
        // Render Javascript visually as a webpage!
        const darkBase = '<style>body{background:#0A0E17;color:#E8ECF4;font-family:Inter,system-ui,sans-serif;padding:24px;margin:0}a{color:#00D4FF}h1,h2,h3,h4,h5,h6{color:#fff}</style>';
        const htmlShell = `<!DOCTYPE html><html><head><title>JS Runner</title>${darkBase}</head><body><script>\n${note.rawContent}\n</script></body></html>`;
        return { renderedHtml: htmlShell, detectedType: 'html' };
      }
      if (ext === 'css') {
        const darkBase = '<style>body{background:#0A0E17;color:#E8ECF4;font-family:Inter,system-ui,sans-serif;padding:40px;margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;}a{color:#00D4FF}h1,h2,h3,h4,h5,h6{color:#fff}</style>';
        const htmlShell = `<!DOCTYPE html><html><head><title>CSS Preview</title>${darkBase}<style>\n${note.rawContent}\n</style></head><body><div class="css-preview-box" style="padding:40px;border:1px solid rgba(255,255,255,0.1);border-radius:12px;background:rgba(255,255,255,0.02);box-shadow:0 8px 32px rgba(0,0,0,0.2);max-width:600px;width:100%;text-align:center;"><h1>CSS Preview Active</h1><p style="color:#8B949E;margin-top:10px;line-height:1.6;">The styles from your CSS file are injected into this document. Any global styles (like body, h1, etc.) or specific classes applied to standard elements will be reflected here.</p><div style="margin-top:30px;display:flex;gap:15px;justify-content:center;"><button class="btn" style="padding:10px 20px;border-radius:6px;cursor:pointer;">Sample Button</button><input type="text" placeholder="Sample Input" class="input" style="padding:10px;border-radius:6px;" /></div></div></body></html>`;
        return { renderedHtml: htmlShell, detectedType: 'html' };
      }
      if (ext === 'svg') {
        const htmlShell = `<!DOCTYPE html><html><head><title>SVG Preview</title><style>body{background:#0A0E17;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;}</style></head><body>${note.rawContent}</body></html>`;
        return { renderedHtml: htmlShell, detectedType: 'html' };
      }

      const escaped = note.rawContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const tag = note.metadata?.tags?.[0] || ext || 'text';
      return { renderedHtml: `<pre><code class="language-${tag}">${escaped}</code></pre>`, detectedType: 'code' };
    }
    if (renderType === 'csv' && note.rawContent) {
      const rows = note.rawContent.trim().split('\n').map(r => r.split(','));
      if (rows.length === 0) return { renderedHtml: '<p>Empty CSV</p>', detectedType: 'csv' };
      let table = '<table><thead><tr>';
      rows[0].forEach(cell => { table += `<th>${cell.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;')}</th>`; });
      table += '</tr></thead><tbody>';
      rows.slice(1).forEach(row => {
        table += '<tr>';
        row.forEach(cell => { table += `<td>${cell.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;')}</td>`; });
        table += '</tr>';
      });
      table += '</tbody></table>';
      return { renderedHtml: table, detectedType: 'csv' };
    }

    const html = note.html || '<p>No content available.</p>';
    if (htmlContainsRawMarkdown(html)) {
      const plainText = extractTextFromHtml(html);
      return { renderedHtml: markdownToHtml(plainText), detectedType: 'markdown' };
    }
    return { renderedHtml: html, detectedType: 'tiptap' };
  }, [note]);

  // After render: inject copy + download buttons into all <pre> code blocks
  // After render: inject copy + download buttons into all <pre> code blocks
  useEffect(() => {
    if (viewMode !== 'rendered' || !contentRef.current || detectedType === 'html') return;

    // Add Copy/Download headers to all code blocks
    const pres = contentRef.current.querySelectorAll('pre');
    pres.forEach((pre) => {
      // Prevent double-wrapping if the effect re-runs
      if (pre.parentElement?.classList.contains('reader-code-wrapper')) return;

      const codeEl = pre.querySelector('code');
      const langClass = codeEl?.className?.match(/language-(\w+)/);
      const lang = langClass ? langClass[1] : '';

      const wrapper = document.createElement('div');
      wrapper.className = 'reader-code-wrapper';

      const header = document.createElement('div');
      header.className = 'reader-code-header';

      const langLabel = document.createElement('span');
      langLabel.className = 'reader-code-lang';
      langLabel.textContent = lang ? lang.charAt(0).toUpperCase() + lang.slice(1) : 'Code';

      const actions = document.createElement('div');
      actions.className = 'reader-code-actions';

      const code = pre.textContent || '';

      const dlBtn = document.createElement('button');
      dlBtn.className = 'reader-code-btn';
      dlBtn.title = 'Download';
      dlBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
      dlBtn.onclick = () => {
        const ext = lang || 'txt';
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `code.${ext}`; a.click();
        URL.revokeObjectURL(url);
      };

      const cpBtn = document.createElement('button');
      cpBtn.className = 'reader-code-btn';
      cpBtn.title = 'Copy';
      cpBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
      cpBtn.onclick = () => {
        navigator.clipboard.writeText(code);
        cpBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
        setTimeout(() => {
          cpBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
        }, 2000);
      };

      actions.appendChild(dlBtn);
      actions.appendChild(cpBtn);
      header.appendChild(langLabel);
      header.appendChild(actions);

      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);
    });

  }, [renderedHtml, viewMode, detectedType, isFullscreen, showSearchOverlay]);

  // File type badge
  const renderTypeMap = {
    markdown: '.md', html: '.html', plain: '.txt', code: '.code', csv: '.csv', tiptap: '.json',
  };
  const fileType = renderTypeMap[note.renderType] || (detectedType === 'markdown' ? '.md (auto)' : '.json');

  const badgeColors = {
    markdown: { bg: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6', border: 'rgba(139, 92, 246, 0.25)' },
    html: { bg: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', border: 'rgba(245, 158, 11, 0.25)' },
    plain: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: 'rgba(16, 185, 129, 0.25)' },
    code: { bg: 'rgba(236, 72, 153, 0.15)', color: '#EC4899', border: 'rgba(236, 72, 153, 0.25)' },
    csv: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', border: 'rgba(59, 130, 246, 0.25)' },
  };
  const badgeColor = badgeColors[detectedType] || badgeColors[note.renderType] || { bg: 'rgba(59, 130, 246, 0.1)', color: 'var(--text-muted)', border: 'var(--border-subtle)' };

  // Build escaped raw view HTML
  const rawViewHtml = useMemo(() => {
    const escaped = rawSource.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<pre style="background:#000;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:20px;overflow-x:auto;font-family:var(--font-mono);font-size:13px;line-height:1.7;color:#C9D1D9;white-space:pre-wrap;word-break:break-word;margin:0;">${escaped}</pre>`;
  }, [rawSource]);

  const formatColor = note.metadata?.formatColor || localStorage.getItem('hole_format_color') || 'var(--accent-primary)';

  return (
    <div className="note-reader-fullscreen page-enter" ref={readerRef} style={{ ...(isFullscreen ? { background: 'var(--bg-deep)', overflow: 'auto' } : {}), '--accent-primary': formatColor, '--accent-primary-dim': `${formatColor}33` }}>
      <div className="note-reader-container" style={{ position: 'relative' }}>
        {showSearchOverlay && (
          <SearchOverlay 
            onClose={() => setShowSearchOverlay(false)} 
            targetView="read"
          />
        )}
        <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 100, display: 'flex', gap: '8px' }}>
          <button 
            onClick={toggleFullscreen}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          {onClose && (
            <button 
              onClick={onClose} 
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
              className="hover-bg-red"
              title="Close Note"
            >
              <X size={20} />
            </button>
          )}
        </div>
        
        {/* Header Block */}
        <div className="note-reader-header">
          <div className="note-reader-title-row">
            <h1 className="note-reader-title">{note.title || 'Untitled Note'}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Raw / Render toggle */}
              <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                <button
                  onClick={() => setViewMode('rendered')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '6px 14px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                    background: viewMode === 'rendered' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.03)',
                    color: viewMode === 'rendered' ? '#000' : 'var(--text-muted)',
                    transition: 'all 0.15s ease',
                  }}
                  title="Rendered view"
                >
                  <Eye size={13} /> Render
                </button>
                <button
                  onClick={() => setViewMode('raw')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '6px 14px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                    background: viewMode === 'raw' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.03)',
                    color: viewMode === 'raw' ? '#000' : 'var(--text-muted)',
                    transition: 'all 0.15s ease',
                  }}
                  title="Raw source view"
                >
                  <Code size={13} /> Raw
                </button>
              </div>

              {/* File type badge */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '5px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 700,
                background: badgeColor.bg, color: badgeColor.color,
                border: `1px solid ${badgeColor.border}`,
              }}>
                {(detectedType === 'markdown' || note.renderType === 'markdown') ? <FileText size={13} /> : note.renderType === 'html' ? <Code2 size={13} /> : <FileText size={13} />}
                {fileType}
              </span>
              <span className={`reader-badge reader-badge-${severity}`}>
                <Shield size={16} /> {severity.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="note-reader-meta-bar">
            <div className="reader-meta-pill">
              <Clock size={14} />
              {note.savedAt ? new Date(note.savedAt).toLocaleDateString() : new Date().toLocaleDateString()}
            </div>
            
            {tags.length > 0 && (
              <div className="reader-meta-pill tag-group">
                <Tag size={14} />
                {tags.map((tag, i) => (
                  <span key={i} className="reader-tag">#{tag}</span>
                ))}
              </div>
            )}

            {metadata.isImportant && (
              <div className="reader-meta-pill important-pill">
                <Star size={14} fill="#EF4444" /> Important
              </div>
            )}

            {metadata.isFavorite && (
              <div className="reader-meta-pill favorite-pill">
                <Bookmark size={14} fill="#10B981" /> Favorite
              </div>
            )}
          </div>
        </div>

        {/* Content Block */}
        <div className="note-reader-content-wrapper">
          {viewMode === 'rendered' && detectedType === 'html' ? (
            /* HTML files: render in a sandboxed iframe so full documents display properly */
            <iframe
              srcDoc={renderedHtml}
              sandbox="allow-same-origin allow-scripts"
              style={{
                width: '100%',
                height: '100%',
                minHeight: '500px',
                border: 'none',
                borderRadius: '12px',
                background: '#0A0E17',
              }}
              title="HTML Preview"
            />
          ) : viewMode === 'rendered' ? (
            <div 
              ref={contentRef}
              className="tiptap reader-tiptap rendered-content" 
              dangerouslySetInnerHTML={{ __html: renderedHtml }} 
              onClick={(e) => {
                const link = e.target.closest('a');
                if (link) {
                  const href = link.getAttribute('href');
                  if (href && href.startsWith('#')) {
                    e.preventDefault();
                    const targetId = href.substring(1);
                    const targetEl = document.getElementById(targetId);
                    if (targetEl) {
                      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      // Add a brief highlight flash
                      targetEl.style.transition = 'color 0.3s';
                      targetEl.style.color = 'var(--accent-primary)';
                      setTimeout(() => targetEl.style.color = '', 1000);
                    }
                  }
                }
              }}
            />
          ) : (
            <div 
              className="tiptap reader-tiptap" 
              dangerouslySetInnerHTML={{ __html: rawViewHtml }} 
            />
          )}
        </div>

      </div>
    </div>
  );
}
