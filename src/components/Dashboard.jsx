import { useState, useEffect } from 'react';
import {
  ClipboardCopy, X, Target, FileText, Shield, DollarSign, Clock, BarChart2, Zap, Plus, TrendingUp, Award, ChevronRight
} from 'lucide-react';
import '../styles/Dashboard.css';

export default function Dashboard({ notes, onViewChange, onNewNote, activeContext, setActiveContextDirect, clipboardHistory, setClipboardHistory, addToast }) {
  const [bounties, setBounties] = useState(() => {
    try {
      const saved = localStorage.getItem('kroma_bounties');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [viewingContext, setViewingContext] = useState(activeContext || '');
  const [newContextInput, setNewContextInput] = useState('');
  const [activeScans, setActiveScans] = useState(() => localStorage.getItem('kroma_active_scans') || '0');

  useEffect(() => {
    localStorage.setItem('kroma_active_scans', activeScans);
  }, [activeScans]);

  // Keep viewingContext in sync when activeContext changes
  useEffect(() => {
    if (activeContext) setViewingContext(activeContext);
  }, [activeContext]);

  const allContextKeys = Object.keys(clipboardHistory || {}).filter(k => (clipboardHistory[k] || []).length > 0);
  const viewingClips = (clipboardHistory && clipboardHistory[viewingContext]) || [];

  const handleAddNewContext = () => {
    const name = newContextInput.trim();
    if (!name) return;
    // Create an empty entry so it shows up as a tab
    setClipboardHistory(prev => {
      if (prev[name]) return prev; // already exists
      const next = { ...prev, [name]: [] };
      localStorage.setItem('kroma_clipboard', JSON.stringify(next));
      return next;
    });
    // Also set it as the active capture context
    setActiveContextDirect(name);
    setViewingContext(name);
    setNewContextInput('');
  };

  const handleDeleteContext = (ctxName) => {
    setClipboardHistory(prev => {
      const next = { ...prev };
      delete next[ctxName];
      localStorage.setItem('kroma_clipboard', JSON.stringify(next));
      return next;
    });
    if (viewingContext === ctxName) {
      const remaining = allContextKeys.filter(k => k !== ctxName);
      setViewingContext(remaining[0] || '');
    }
  };

  const noteCount = notes.length;
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 18 ? 'Good Afternoon' : 'Good Evening';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const totalEarned = bounties.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0);
  const totalSubmitted = bounties.length;
  const recentBounties = [...bounties].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  return (
    <div className="dashboard page-enter">
      <div className="dashboard-header">
        <div className="dashboard-header-main">
          <h1 className="dashboard-greeting">{greeting}, <span>Hunter</span> 🎯</h1>
          <p className="dashboard-date">{dateStr}</p>
        </div>
        <div className="dashboard-header-actions">
          <button className="btn btn-primary" onClick={onNewNote}>
            <Plus size={18} /> New Target Note
          </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="stats-grid">
        <div className="stat-card pro">
          <div className="stat-card-glow" />
          <div className="stat-card-header">
            <div className="stat-card-icon"><FileText size={20} /></div>
          </div>
          <div className="stat-card-value">{noteCount}</div>
          <div className="stat-card-label">Knowledge Base Items</div>
        </div>
        <div className="stat-card pro">
          <div className="stat-card-header">
            <div className="stat-card-icon"><Target size={20} color="#F59E0B" /></div>
          </div>
          <div className="stat-card-value">{totalSubmitted}</div>
          <div className="stat-card-label">Reports Submitted</div>
        </div>
        <div className="stat-card pro">
          <div className="stat-card-header">
            <div className="stat-card-icon"><DollarSign size={20} color="#10B981" /></div>
          </div>
          <div className="stat-card-value">${totalEarned.toLocaleString()}</div>
          <div className="stat-card-label">Total Bounties Earned</div>
        </div>
        <div className="stat-card pro">
          <div className="stat-card-header">
            <div className="stat-card-icon"><Zap size={20} color="#3B82F6" /></div>
          </div>
          <input 
            type="number" 
            value={activeScans}
            onChange={(e) => setActiveScans(e.target.value)}
            className="stat-card-value"
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'inherit', 
              width: '100%', 
              outline: 'none',
              padding: 0,
              fontFamily: 'inherit',
              MozAppearance: 'textfield'
            }}
          />
          <div className="stat-card-label">Active Scans (Manual)</div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Left Column */}
        <div className="dashboard-column">

          {/* ===== Clipboard Vault ===== */}
          <div className="dashboard-section pro-card">
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)' }}>
                <ClipboardCopy size={18} />
                Clipboard Vault
              </h3>
              {/* New context input */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={newContextInput}
                  onChange={(e) => setNewContextInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNewContext()}
                  placeholder="New target name..."
                  style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '6px', padding: '6px 10px', color: 'var(--text-primary)', fontSize: '12px', width: '140px', outline: 'none' }}
                />
                <button onClick={handleAddNewContext} style={{ background: 'var(--accent-primary)', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', color: '#fff', fontSize: '11px', fontWeight: 700 }}>
                  <Plus size={12} /> Add
                </button>
              </div>
            </div>

            {/* Active capture indicator */}
            {activeContext && (
              <div style={{ padding: '6px 12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', fontSize: '11px', color: '#10B981', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', animation: 'pulse 2s infinite' }} />
                Capturing to: <strong>{activeContext}</strong>
              </div>
            )}

            {/* Context Tabs */}
            {allContextKeys.length > 0 ? (
              <>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {allContextKeys.map(ctx => (
                    <div key={ctx} style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                      <button
                        onClick={() => setViewingContext(ctx)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px 0 0 6px',
                          border: viewingContext === ctx ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                          background: viewingContext === ctx ? 'var(--accent-primary)' : 'var(--bg-deep)',
                          color: viewingContext === ctx ? '#fff' : 'var(--text-secondary)',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {ctx} ({(clipboardHistory[ctx] || []).length})
                      </button>
                      <button
                        onClick={() => handleDeleteContext(ctx)}
                        style={{
                          padding: '6px 6px',
                          borderRadius: '0 6px 6px 0',
                          border: viewingContext === ctx ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                          borderLeft: 'none',
                          background: viewingContext === ctx ? 'rgba(239,68,68,0.2)' : 'var(--bg-deep)',
                          color: '#EF4444',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title={`Delete ${ctx} clipboard`}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Clips for the selected context */}
                {viewingClips.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5, fontSize: '12px', color: 'var(--text-muted)' }}>
                    No clips saved for "{viewingContext}" yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
                    {viewingClips.map((clip, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '8px', padding: '10px 12px', gap: '12px', cursor: 'pointer', transition: 'all 0.15s' }}
                        onClick={async () => {
                          try {
                            if (window.electronAPI?.writeClipboardToOS) {
                              await window.electronAPI.writeClipboardToOS(clip);
                            } else {
                              await navigator.clipboard.writeText(clip);
                            }
                            if (addToast) addToast('Copied to clipboard!', 'success');
                          } catch(e) {}
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'var(--bg-deep)'; }}
                      >
                        <div style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)', wordBreak: 'break-all', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {clip}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setClipboardHistory(prev => {
                              const newList = prev[viewingContext].filter((_, idx) => idx !== i);
                              const next = { ...prev, [viewingContext]: newList };
                              localStorage.setItem('kroma_clipboard', JSON.stringify(next));
                              return next;
                            });
                          }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', flexShrink: 0 }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state-pro" style={{ padding: '30px 20px', opacity: 0.7 }}>
                <ClipboardCopy size={32} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
                <p style={{ margin: 0, fontSize: '13px' }}>No clipboard contexts yet.</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Type a target name above and click Add to start capturing.</p>
              </div>
            )}
          </div>


          <div className="dashboard-section pro-card" style={{ marginTop: '24px' }}>
            <div className="section-header">
              <h3 className="section-title">
                <DollarSign size={18} className="section-title-icon" />
                Recent Bounties
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => onViewChange('bounty')}>View All</button>
            </div>
            {recentBounties.length === 0 ? (
              <div className="empty-state-pro" style={{ padding: '20px' }}>
                <p>No bounties recorded yet.</p>
              </div>
            ) : (
              <div className="pro-target-list">
                {recentBounties.map(b => (
                  <div key={b.id} className="pro-target-item" onClick={() => onViewChange('bounty')}>
                    <div className="pro-target-info">
                      <div className="pro-target-name">{b.program} - {b.title}</div>
                      <div className="pro-target-meta" style={{ color: b.amount > 0 ? '#10B981' : 'var(--text-muted)' }}>
                        {b.amount > 0 ? `+$${b.amount}` : b.status.toUpperCase()}
                      </div>
                    </div>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent Notes & Quick Tools */}
        <div className="dashboard-column">
          <div className="dashboard-section pro-card">
            <div className="section-header">
              <h3 className="section-title">
                <Clock size={18} className="section-title-icon" />
                Recent Notes
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => onViewChange('all-notes')}>
                View All
              </button>
            </div>

            {notes.length === 0 ? (
              <div className="empty-state-pro">
                <div className="empty-state-icon-pro"><FileText size={32} /></div>
                <p>No notes created yet.</p>
              </div>
            ) : (
              <div className="pro-target-list">
                {notes.slice(0, 5).map(note => (
                  <div key={note.id} className="pro-target-item" onClick={() => {
                    // Quick hack to force read view: in real app you'd use a dedicated function
                    // App.jsx will handle opening read if view is 'read'
                    // Since Dashboard receives onViewChange instead of openTab now, we need to adapt:
                    // Actually, Dashboard gets onViewChange from App.jsx, which just sets activeView.
                    // But we need to set selectedNoteForRead. Dashboard doesn't have handleSelectNote!
                    // Let's call onViewChange('read', note) if App supports it, otherwise just go to 'all-notes'
                    onViewChange('all-notes');
                  }}>
                    <div className="pro-target-info">
                      <div className="pro-target-name">{note.title || 'Untitled'}</div>
                      <div className="pro-target-meta">
                        <span className={`pro-sev-dot ${note.severity || note.metadata?.severity || 'info'}`} />
                        {(note.severity || note.metadata?.severity || 'INFO').toUpperCase()}
                      </div>
                    </div>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dashboard-section pro-card" style={{ marginTop: '24px' }}>
            <div className="section-header">
              <h3 className="section-title">
                <Award size={18} className="section-title-icon" />
                Quick Tools
              </h3>
            </div>
            <div className="pro-quick-actions">
              <button className="pro-action-tile" onClick={() => onViewChange('code-editor')}>
                <Code2 size={20} />
                <span>IDE</span>
              </button>
              <button className="pro-action-tile" onClick={() => onViewChange('cvss-calculator')}>
                <BarChart2 size={20} />
                <span>CVSS</span>
              </button>
              <button className="pro-action-tile" onClick={() => onViewChange('recondb')}>
                <Target size={20} />
                <span>Recon</span>
              </button>
              <button className="pro-action-tile" onClick={() => onViewChange('annotator')}>
                <CameraIcon size={20} />
                <span>Annotate</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
        .stat-card.pro { position: relative; overflow: hidden; background: var(--bg-secondary); border: 1px solid var(--border-subtle); }
        .stat-card-glow { position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, var(--accent-primary-dim) 0%, transparent 60%); opacity: 0.3; pointer-events: none; }
        .pro-card { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 20px; }
        .revenue-chart { height: 120px; display: flex; align-items: flex-end; gap: 8px; padding: 0 8px; margin-top: 20px; border-bottom: 1px solid var(--border-subtle); }
        .revenue-bar-wrapper { flex: 1; height: 100%; display: flex; align-items: flex-end; }
        .revenue-bar { width: 100%; background: linear-gradient(to top, var(--accent-primary), var(--accent-primary-glow)); border-radius: 4px 4px 0 0; transition: height 0.3s; }
        .revenue-labels { display: flex; justify-content: space-between; margin-top: 8px; font-size: 10px; color: var(--text-muted); padding: 0 4px; }
        .pro-target-list { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
        .pro-target-item { display: flex; align-items: center; justify-content: space-between; padding: 12px; background: var(--bg-tertiary); border-radius: 12px; cursor: pointer; transition: transform 0.2s; }
        .pro-target-item:hover { transform: translateX(4px); background: var(--bg-hover); }
        .pro-target-name { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
        .pro-target-meta { display: flex; align-items: center; gap: 8px; font-size: 10px; font-weight: 700; color: var(--text-muted); }
        .pro-sev-dot { width: 6px; height: 6px; border-radius: 50%; }
        .pro-sev-dot.critical { background: #EF4444; box-shadow: 0 0 6px #EF4444; }
        .pro-sev-dot.high { background: #F97316; }
        .pro-sev-dot.medium { background: #F59E0B; }
        .pro-sev-dot.low { background: #10B981; }
        .pro-sev-dot.info { background: #3B82F6; }
        .pro-quick-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
        .pro-action-tile { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 16px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 12px; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
        .pro-action-tile:hover { background: var(--bg-hover); color: var(--accent-primary); border-color: var(--accent-primary-dim); transform: translateY(-2px); }
        .pro-action-tile span { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        input[type="number"]::-webkit-outer-spin-button, input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
    </div>
  );
}

const Code2 = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
);

const CameraIcon = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
);
