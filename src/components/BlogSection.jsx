import { useState, useEffect } from 'react';
import { BookOpen, Search, ArrowRight, Clock } from 'lucide-react';

export default function BlogSection({ setActiveView, setViewId }) {
  const [blogs, setBlogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('official');

  useEffect(() => {
    fetch('/src/data/blogs.json')
      .then(res => res.json())
      .then(data => setBlogs(data))
      .catch(err => console.error("Error loading blogs:", err));
  }, []);

  const filteredBlogs = blogs.filter(b => 
    (b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))) &&
    (b.type === activeTab || (!b.type && activeTab === 'official'))
  );

  return (
    <div className="page-enter" style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div className="pro-icon-glow">
              <BookOpen size={28} color="var(--accent-primary)" />
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Bug Bounty Writeups</h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px', margin: 0 }}>Exclusive vulnerability research, exploits, and PoCs by Harshvardhan.</p>
        </div>
        
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search writeups, tags..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', padding: '10px 10px 10px 36px', 
              background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', 
              borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' 
            }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '32px' }}>
        <button 
          className={`tab-btn ${activeTab === 'official' ? 'active' : ''}`}
          onClick={() => setActiveTab('official')}
        >
          My Writeups
        </button>
        <button 
          className={`tab-btn ${activeTab === 'sponsored' ? 'active' : ''}`}
          onClick={() => setActiveTab('sponsored')}
        >
          Community & Sponsored
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
        {filteredBlogs.map(blog => (
          <div key={blog.id} className="blog-card" onClick={() => { setViewId(blog.id); setActiveView('blog-reader'); }} data-level={blog.difficulty}>
            <div className="blog-cover" style={{ backgroundImage: `url(/${blog.coverImage})`, backgroundColor: 'var(--bg-tertiary)' }}>
              <div className="blog-difficulty" data-level={blog.difficulty}>{blog.difficulty}</div>
            </div>
            <div className="blog-content">
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {blog.tags.slice(0,3).map(tag => (
                  <span key={tag} className="blog-tag">{tag}</span>
                ))}
              </div>
              <h2 className="blog-title">{blog.title}</h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  <Clock size={14} /> {blog.readTime}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-primary)', fontSize: '14px', fontWeight: 600 }}>
                  Read <ArrowRight size={16} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Sponsor CTA for the Community Tab */}
      {activeTab === 'sponsored' && (
        <div style={{ marginTop: '48px', padding: '48px', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--accent-primary-dim)', borderRadius: '16px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--accent-primary)' }} />
          <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>Showcase Your Research</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px', margin: '0 auto 32px auto', maxWidth: '600px', lineHeight: 1.6 }}>
            Want to reach an audience of elite hackers and security researchers? Sponsor a post to feature your writeups directly in the HOLE Workstation.
          </p>
          <a 
            href="mailto:holeworkstation@gmail.com?subject=Sponsor%20a%20Blog%20Post" 
            className="btn btn-primary" 
            style={{ display: 'inline-flex', padding: '12px 32px', fontSize: '16px', textDecoration: 'none' }}
          >
            Contact to Sponsor
          </a>
        </div>
      )}

      <style>{`
        .tab-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 16px;
          font-weight: 700;
          padding: 0 0 12px 0;
          margin-bottom: -1px;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s ease;
        }
        .tab-btn:hover {
          color: var(--text-primary);
        }
        .tab-btn.active {
          color: var(--accent-primary);
          border-bottom-color: var(--accent-primary);
        }
        .blog-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .blog-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        }
        .blog-card[data-level="Beginner"]:hover { border-color: var(--accent-primary); box-shadow: 0 8px 30px rgba(59, 130, 246, 0.2); }
        .blog-card[data-level="Intermediate"]:hover { border-color: #F59E0B; box-shadow: 0 8px 30px rgba(245, 158, 11, 0.2); }
        .blog-card[data-level="Advanced"]:hover { border-color: #F97316; box-shadow: 0 8px 30px rgba(249, 115, 22, 0.2); }
        .blog-card[data-level="Critical"]:hover { border-color: #EF4444; box-shadow: 0 8px 30px rgba(239, 68, 68, 0.3); }
        .blog-cover {
          height: 180px;
          background-size: cover;
          background-position: center;
          position: relative;
          border-bottom: 1px solid var(--border-subtle);
        }
        .blog-difficulty {
          position: absolute;
          top: 12px;
          right: 12px;
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
        
        .blog-content {
          padding: 20px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .blog-tag {
          font-size: 11px;
          padding: 2px 8px;
          background: var(--bg-tertiary);
          color: var(--text-muted);
          border-radius: 4px;
          font-weight: 600;
        }
        .blog-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 16px 0;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}
