import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Calendar, FlaskConical, AlertTriangle } from 'lucide-react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import mermaid from 'mermaid';
import 'highlight.js/styles/atom-one-dark.css';

mermaid.initialize({ startOnLoad: false, theme: 'dark' });

// Configure marked v18+ with custom code renderer
marked.use({
  breaks: true,
  gfm: true,
  renderer: {
    code(token) {
      const { text, lang } = token;
      
      if (lang === 'mermaid') {
        return `<div class="mermaid">${text}</div>`;
      }
      
      let highlighted;
      if (lang && hljs.getLanguage(lang)) {
        highlighted = hljs.highlight(text, { language: lang }).value;
      } else {
        highlighted = hljs.highlightAuto(text).value;
      }
      
      return `<pre><code class="hljs ${lang || ''}">${highlighted}</code></pre>`;
    }
  }
});

export default function BlogReader({ setActiveView, viewId, setViewId }) {
  const id = viewId;
  const [blog, setBlog] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch metadata
    fetch('/src/data/blogs.json')
      .then(res => res.json())
      .then(data => {
        const found = data.find(b => b.id === id);
        setBlog(found);
        if (found) {
          // 2. Fetch markdown content
          fetch(`/${found.contentFile}`)
            .then(res => res.text())
            .then(text => {
              // Parse the markdown using the global configuration
              setContent(marked.parse(text));
              setLoading(false);
              
              // Give DOM time to update, then initialize mermaid if it exists in content
              if (text.includes('```mermaid')) {
                setTimeout(() => {
                  try {
                    mermaid.run({ querySelector: '.mermaid' });
                  } catch (e) {
                    console.error("Mermaid error:", e);
                  }
                }, 100);
              }
            });
        } else {
          setLoading(false);
        }
      })
      .catch(err => {
        console.error("Error loading blog:", err);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="page-enter" style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading writeup...</div>;
  if (!blog) return <div className="page-enter" style={{ padding: '64px', textAlign: 'center', color: '#EF4444' }}><AlertTriangle size={48} style={{ margin: '0 auto 16px' }} />Writeup not found.</div>;

  return (
    <div className="page-enter" style={{ height: '100%', overflowY: 'auto', backgroundColor: 'var(--bg-primary)' }}>
      
      {/* Header / Hero */}
      <div style={{ position: 'relative', height: '400px', width: '100%', display: 'flex', alignItems: 'flex-end', padding: '64px' }}>
        {/* Background Image & Overlay */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(/${blog.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.2 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg-primary) 0%, transparent 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, var(--bg-primary) 0%, transparent 100%)', opacity: 0.8 }} />
        
        {/* Navigation & Metadata */}
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <button 
            onClick={() => setActiveView('blog')}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '24px', padding: 0, fontSize: '14px', fontWeight: 600 }}
          >
            <ArrowLeft size={16} /> Back to Writeups
          </button>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <span className="blog-difficulty" data-level={blog.difficulty}>{blog.difficulty}</span>
            {blog.tags.slice(0,3).map(tag => (
              <span key={tag} style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>{tag}</span>
            ))}
          </div>
          
          <h1 style={{ fontSize: '42px', fontWeight: 900, letterSpacing: '-1px', color: 'var(--text-primary)', margin: '0 0 16px 0', lineHeight: 1.1 }}>
            {blog.title}
          </h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>
            <span style={{ color: 'var(--text-primary)' }}>By {blog.author}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> {blog.date}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> {blog.readTime} read</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 64px 64px 64px' }}>
        <div 
          className="markdown-body" 
          dangerouslySetInnerHTML={{ __html: content }} 
        />
        
        {/* Lab CTA */}
        {blog.labId && (
          <div style={{ marginTop: '64px', padding: '32px', background: 'var(--bg-secondary)', border: '1px solid var(--accent-primary-dim)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FlaskConical size={20} color="var(--accent-primary)" />
                Practice this Vulnerability
              </h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>Launch a local simulated environment to exploit this exactly as described.</p>
            </div>
            <button 
              className="btn btn-primary"
              onClick={() => { setViewId(blog.labId); setActiveView('lab-runner'); }}
              style={{ padding: '12px 24px', fontSize: '16px' }}
            >
              Start Lab Challenge
            </button>
          </div>
        )}
      </div>

      <style>{`
        .markdown-body {
          color: var(--text-secondary);
          font-size: 17px;
          line-height: 1.8;
          font-family: 'Inter', system-ui, sans-serif;
        }
        .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4 {
          color: var(--text-primary);
          font-weight: 800;
          letter-spacing: -0.5px;
          margin-top: 2em;
          margin-bottom: 1em;
          line-height: 1.3;
        }
        .markdown-body h1 { font-size: 32px; }
        .markdown-body h2 { font-size: 28px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px; }
        .markdown-body h3 { font-size: 22px; }
        .markdown-body p { margin-bottom: 1.5em; }
        .markdown-body strong { color: var(--text-primary); font-weight: 700; }
        .markdown-body em { color: var(--text-primary); font-style: italic; }
        .markdown-body a { color: var(--accent-primary); text-decoration: none; font-weight: 600; border-bottom: 1px solid transparent; transition: border-color 0.2s ease; }
        .markdown-body a:hover { border-bottom-color: var(--accent-primary); }
        .markdown-body ul, .markdown-body ol { margin-bottom: 1.5em; padding-left: 24px; }
        .markdown-body li { margin-bottom: 8px; }
        .markdown-body blockquote {
          margin: 0 0 1.5em 0;
          padding: 16px 24px;
          border-left: 4px solid var(--accent-primary);
          background: var(--bg-secondary);
          border-radius: 0 8px 8px 0;
          color: var(--text-secondary);
          font-style: italic;
        }
        .markdown-body blockquote p:last-child { margin-bottom: 0; }
        .markdown-body hr {
          border: none;
          border-top: 1px solid var(--border-subtle);
          margin: 3em 0;
        }
        .markdown-body pre {
          background: var(--bg-deep) !important;
          border: 1px solid var(--accent-primary-dim);
          border-radius: 16px;
          padding: 20px;
          overflow-x: auto;
          margin-bottom: 24px;
          box-shadow: 0 0 25px var(--accent-primary-glow), 0 0 5px var(--accent-primary-dim);
          position: relative;
          z-index: 1;
        }
        .markdown-body code {
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
        }
        .markdown-body p code, .markdown-body li code {
          background: var(--bg-tertiary);
          padding: 3px 6px;
          border-radius: 6px;
          color: #EF4444;
          font-size: 14px;
          font-weight: 600;
          border: 1px solid var(--border-subtle);
        }
        .mermaid {
          background: var(--bg-deep);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
          display: flex;
          justify-content: center;
        }
        .blog-difficulty {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .blog-difficulty[data-level="Beginner"] { color: #22C55E; }
        .blog-difficulty[data-level="Intermediate"] { color: #F59E0B; }
        .blog-difficulty[data-level="Advanced"] { color: #F43F5E; }
        .blog-difficulty[data-level="Critical"] { color: #EF4444; text-shadow: 0 0 10px rgba(239,68,68,0.5); }
      `}</style>
    </div>
  );
}
