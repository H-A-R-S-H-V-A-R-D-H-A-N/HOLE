import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  DollarSign, Plus, Filter, ArrowUpDown, ExternalLink,
  TrendingUp, Target, CheckCircle2, Clock, X, Trash2, Edit3, FileText, Eye, Edit, Maximize, Minimize, Folder, LayoutList, Shield, Paintbrush
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { marked } from 'marked';
import ConfirmModal from './ConfirmModal';
import '../styles/Settings.css';

const formatColorsList = [
  { name: 'Default (Cyan)', color: '#00D4FF' },
  { name: 'Green', color: '#10B981' },
  { name: 'Red', color: '#EF4444' },
  { name: 'Yellow', color: '#F59E0B' },
  { name: 'Purple', color: '#8B5CF6' },
  { name: 'Pink', color: '#EC4899' },
  { name: 'White', color: '#FFFFFF' },
];

export default function BountyTracker() {
  const [bounties, setBounties] = useState(() => {
    try {
      const saved = window.electronAPI ? window.electronAPI.storeGetSync('kroma_bounties') : localStorage.getItem('kroma_bounties');
      return (typeof saved === 'string' ? JSON.parse(saved) : saved) || [];
    } catch {
      return [];
    }
  });

  const [activeSection, setActiveSection] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    program: '', title: '', severity: 'medium', status: 'submitted', amount: 0, url: '', date: new Date().toISOString().split('T')[0], report: ''
  });

  // Report Modal State
  const [activeReportBounty, setActiveReportBounty] = useState(null);
  const [reportContent, setReportContent] = useState('');
  const [reportColor, setReportColor] = useState('#00D4FF');
  const [showReportColors, setShowReportColors] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const previewRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const renderedHtml = useMemo(() => {
    let finalHtml = marked(reportContent || '*No report content written yet.*');
    
    if (finalHtml) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(finalHtml, 'text/html');
      const pres = doc.querySelectorAll('pre');
      
      pres.forEach(pre => {
        if (pre.parentElement?.classList.contains('reader-code-wrapper')) return;
        
        const codeEl = pre.querySelector('code');
        const langClass = codeEl?.className?.match(/language-(\w+)/) || codeEl?.className?.match(/hljs (\w+)/);
        const lang = langClass ? langClass[1] : '';
        
        const wrapper = doc.createElement('div');
        wrapper.className = 'reader-code-wrapper';
        
        const header = doc.createElement('div');
        header.className = 'reader-code-header';
        
        const langLabel = doc.createElement('span');
        langLabel.className = 'reader-code-lang';
        langLabel.textContent = lang ? lang.charAt(0).toUpperCase() + lang.slice(1) : 'Code';
        
        const actions = doc.createElement('div');
        actions.className = 'reader-code-actions';
        
        actions.innerHTML = `
          <button class="reader-code-btn download-btn" data-ext="${lang || 'txt'}" title="Download">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button class="reader-code-btn copy-btn" title="Copy">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
        `;
        
        header.appendChild(langLabel);
        header.appendChild(actions);
        
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(header);
        wrapper.appendChild(pre);
      });
      
      finalHtml = doc.body.innerHTML;
    }
    return finalHtml;
  }, [reportContent]);

  useEffect(() => {
    if (!isPreview || !previewRef.current) return;

    const handleCodeActions = (e) => {
      const btn = e.target.closest('.reader-code-btn');
      if (!btn) return;
      
      const wrapper = btn.closest('.reader-code-wrapper');
      if (!wrapper) return;
      
      const code = wrapper.querySelector('code')?.textContent || '';

      if (btn.classList.contains('copy-btn')) {
        navigator.clipboard.writeText(code);
        btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
        setTimeout(() => {
          btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
        }, 2000);
      } else if (btn.classList.contains('download-btn')) {
        const ext = btn.getAttribute('data-ext') || 'txt';
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; 
        a.download = `code.${ext}`; 
        a.click();
        URL.revokeObjectURL(url);
      }
    };

    const el = previewRef.current;
    el.addEventListener('click', handleCodeActions);
    return () => el.removeEventListener('click', handleCodeActions);
  }, [isPreview, renderedHtml]);

  const totalEarned = bounties.filter(b => b.status === 'paid' || b.status === 'resolved-paid').reduce((sum, b) => sum + b.amount, 0);
  const totalSubmitted = bounties.length;
  const totalPaid = bounties.filter(b => b.status === 'paid' || b.status === 'resolved-paid').length;
  const totalDuplicates = bounties.filter(b => b.status === 'duplicate').length;

  const filteredBounties = useMemo(() => {
    if (activeSection === 'all') return bounties;
    if (activeSection.startsWith('severity-')) return bounties.filter(b => b.severity === activeSection.replace('severity-', ''));
    if (activeSection.startsWith('status-')) return bounties.filter(b => b.status === activeSection.replace('status-', ''));
    return bounties;
  }, [bounties, activeSection]);

  const totalPages = Math.ceil(filteredBounties.length / itemsPerPage);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [activeSection]);

  const currentBounties = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBounties.slice(start, start + itemsPerPage);
  }, [filteredBounties, currentPage]);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.storeSetSync('kroma_bounties', bounties);
    } else {
      localStorage.setItem('kroma_bounties', JSON.stringify(bounties));
    }
  }, [bounties]);

  const handleOpenModal = (bounty = null) => {
    if (bounty) {
      setEditingId(bounty.id);
      setFormData(bounty);
    } else {
      setEditingId(null);
      setFormData({ program: '', title: '', severity: 'medium', status: 'submitted', amount: 0, url: '', date: new Date().toISOString().split('T')[0], report: '' });
    }
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.program || !formData.title) return;
    if (editingId) {
      setBounties(prev => prev.map(b => b.id === editingId ? { ...formData } : b));
    } else {
      setBounties([{ ...formData, id: Date.now().toString() }, ...bounties]);
    }
    setShowModal(false);
  };

  const handleDelete = (bounty) => {
    setConfirmState({
      title: "Delete Bounty",
      message: `Are you sure you want to delete the report for "${bounty.title}"?`,
      onConfirm: () => {
        setBounties(prev => prev.filter(b => b.id !== bounty.id));
        setConfirmState(null);
      }
    });
  };

  const handleOpenReport = (bounty) => {
    setActiveReportBounty(bounty);
    setReportContent(bounty.report || '');
    setReportColor(bounty.formatColor || localStorage.getItem('hole_format_color') || '#00D4FF');
    setIsPreview(!!bounty.report);
  };

  const handleSaveReport = () => {
    setBounties(prev => prev.map(b => b.id === activeReportBounty.id ? { ...b, report: reportContent, formatColor: reportColor } : b));
    setActiveReportBounty(null);
  };

  const statusLabels = {
    submitted: 'Submitted',
    triaged: 'Triaged',
    resolved: 'Resolved',
    'resolved-paid': 'Resolved & Paid',
    paid: 'Paid',
    duplicate: 'Duplicate',
  };

  return (
    <div className="bounty-tracker-page page-enter">
      <div className="bounty-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="bounty-title" style={{ fontSize: '24px', fontWeight: 800 }}>💰 Bounty Tracker</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()} style={{ borderRadius: '12px' }}>
          <Plus size={18} /> Add Bounty
        </button>
      </div>

      <div className="filter-pills-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', marginBottom: '8px', gap: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', overflowX: 'auto', flex: 1, alignItems: 'center' }}>
          <button className={`filter-pill ${activeSection === 'all' ? 'active' : ''}`} onClick={() => setActiveSection('all')}>
            All <span className="pill-count">{bounties.length}</span>
          </button>
          
          <div style={{ width: '2px', height: '24px', background: 'var(--border-default)', margin: '0 8px', flexShrink: 0, borderRadius: '2px' }} />

          {['submitted', 'triaged', 'resolved', 'resolved-paid', 'paid', 'duplicate'].map(st => {
            const count = bounties.filter(b => b.status === st).length;
            if (count === 0 && activeSection !== `status-${st}`) return null;
            return (
              <button key={st} className={`filter-pill ${activeSection === 'status-' + st ? 'active' : ''}`} onClick={() => setActiveSection(`status-${st}`)}>
                {statusLabels[st]} <span className="pill-count">{count}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', overflowX: 'auto', alignItems: 'center' }}>
          <div style={{ width: '2px', height: '24px', background: 'var(--border-default)', margin: '0 8px', flexShrink: 0, borderRadius: '2px' }} />
          {['critical', 'high', 'medium', 'low', 'info'].map(sev => {
            const count = bounties.filter(b => b.severity === sev).length;
            if (count === 0 && activeSection !== `severity-${sev}`) return null;
            return (
              <button key={sev} className={`filter-pill ${activeSection === 'severity-' + sev ? 'active' : ''}`} onClick={() => setActiveSection(`severity-${sev}`)}>
                {sev.charAt(0).toUpperCase() + sev.slice(1)} <span className="pill-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bounty-stats" style={{ marginBottom: '24px' }}>
        <div className="bounty-stat-card" style={{ borderRadius: '16px' }}>
          <div className="bounty-stat-value" style={{ color: '#10B981' }}>${totalEarned.toLocaleString()}</div>
          <div className="bounty-stat-label">Total Earned</div>
        </div>
        <div className="bounty-stat-card" style={{ borderRadius: '16px' }}>
          <div className="bounty-stat-value" style={{ color: 'var(--accent-primary)' }}>{totalSubmitted}</div>
          <div className="bounty-stat-label">Reports Submitted</div>
        </div>
        <div className="bounty-stat-card" style={{ borderRadius: '16px' }}>
          <div className="bounty-stat-value" style={{ color: 'var(--accent-secondary)' }}>{totalPaid}</div>
          <div className="bounty-stat-label">Paid Out</div>
        </div>
        <div className="bounty-stat-card" style={{ borderRadius: '16px' }}>
          <div className="bounty-stat-value" style={{ color: 'var(--accent-red)' }}>{totalDuplicates}</div>
          <div className="bounty-stat-label">Duplicates</div>
        </div>
      </div>

      <div className="bounty-table-container">
        <table className="bounty-table">
          <thead>
            <tr>
              <th>Program</th>
              <th>Vulnerability</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentBounties.map((b) => (
            <tr key={b.id} className="bounty-row">
              <td style={{ fontWeight: 700, fontSize: '15px' }}>{b.program}</td>
              <td style={{ color: 'var(--text-secondary)' }}>{b.title}</td>
              <td><span className={`bounty-badge severity-${b.severity}`}>{b.severity.toUpperCase()}</span></td>
              <td><span className={`bounty-badge status-${b.status}`}>{statusLabels[b.status] || b.status}</span></td>
              <td style={{ color: '#10B981', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '15px' }}>{b.amount ? `$${b.amount.toLocaleString()}` : '—'}</td>
              <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{b.date}</td>
              <td style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-icon" onClick={() => handleOpenReport(b)} title="Write/View Report" style={{ color: 'var(--accent-secondary)' }}><FileText size={16} /></button>
                <button className="btn-icon" onClick={() => handleOpenModal(b)} title="Edit"><Edit3 size={16} /></button>
                <button className="btn-icon" onClick={() => handleDelete(b)} title="Delete" style={{ color: '#EF4444' }}><Trash2 size={16} /></button>
                {b.url && <button className="btn-icon" onClick={() => window.open(b.url, '_blank')} title="View External Report" style={{ color: 'var(--accent-primary)' }}><ExternalLink size={16} /></button>}
              </td>
            </tr>
            ))}
            {currentBounties.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                  No bounties found in this section.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        {totalPages > 1 && (
          <div className="pagination-container">
            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredBounties.length)} of {filteredBounties.length} results
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</button>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[...Array(totalPages)].map((_, i) => (
                  <button key={i} className={`btn btn-sm ${currentPage === i + 1 ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setCurrentPage(i + 1)} style={{ width: '32px', height: '32px', padding: 0, borderRadius: '8px' }}>
                    {i + 1}
                  </button>
                ))}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
            </div>
          </div>
        )}
      </div>

      {showModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontWeight: 700 }}>{editingId ? 'Edit Bounty Report' : 'Add Bounty Report'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="pro-label">Program</label>
                <input value={formData.program} onChange={(e) => setFormData({ ...formData, program: e.target.value })} placeholder="e.g., HackerOne — Acme Corp" style={{ width: '100%' }} />
              </div>
              <div>
                <label className="pro-label">Vulnerability Title</label>
                <input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Stored XSS" style={{ width: '100%' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="pro-label">Severity</label>
                  <select className="settings-select" value={formData.severity} onChange={(e) => setFormData({ ...formData, severity: e.target.value })} style={{ width: '100%' }}>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                    <option value="info">Info</option>
                  </select>
                </div>
                <div>
                  <label className="pro-label">Status</label>
                  <select className="settings-select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={{ width: '100%' }}>
                    <option value="submitted">Submitted</option>
                    <option value="triaged">Triaged</option>
                    <option value="resolved">Resolved</option>
                    <option value="resolved-paid">Resolved & Paid</option>
                    <option value="paid">Paid</option>
                    <option value="duplicate">Duplicate</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="pro-label">Amount ($)</label>
                  <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })} style={{ width: '100%' }} />
                </div>
                <div>
                  <label className="pro-label">External Report URL (Optional)</label>
                  <input value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} placeholder="https://..." style={{ width: '100%' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="pro-label">Date</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} style={{ width: '100%' }} />
                </div>
                <div></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>{editingId ? 'Update' : 'Save'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {activeReportBounty && createPortal(
        <div className="modal-overlay" onClick={() => setActiveReportBounty(null)}>
          <div 
            className="modal-content report-modal" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              width: isFullScreen ? '100vw' : '90vw', 
              maxWidth: isFullScreen ? 'none' : '1400px', 
              height: isFullScreen ? '100vh' : '90vh', 
              borderRadius: isFullScreen ? '0' : 'var(--radius-xl)',
              display: 'flex', 
              flexDirection: 'column',
              transition: 'all 0.3s ease'
            }}
          >
            <div className="modal-header" style={{ padding: '24px 32px' }}>
              <h2 style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FileText size={24} color="var(--accent-secondary)" /> 
                {activeReportBounty.title} 
                <span className={`status-badge status-${activeReportBounty.status}`} style={{ fontSize: '12px' }}>{statusLabels[activeReportBounty.status]}</span>
              </h2>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <button className="btn-icon" onClick={() => setShowReportColors(!showReportColors)} title="Formatting Theme Color" style={{ color: reportColor === '#FFFFFF' ? 'var(--text-primary)' : reportColor }}>
                    <Paintbrush size={18} />
                  </button>
                  {showReportColors && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 1000, display: 'flex', gap: '6px', background: 'var(--bg-elevated)', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-default)', marginTop: '8px' }}>
                      {formatColorsList.map(({ name, color }) => (
                        <button
                          key={name}
                          style={{ backgroundColor: color, width: '20px', height: '20px', borderRadius: '50%', border: 'none', cursor: 'pointer' }}
                          title={name}
                          onClick={() => {
                            setReportColor(color);
                            localStorage.setItem('hole_format_color', color);
                            setShowReportColors(false);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <button className="btn btn-ghost" onClick={() => setIsPreview(!isPreview)}>
                  {isPreview ? <><Edit size={16} /> Edit Markdown</> : <><Eye size={16} /> View Preview</>}
                </button>
                <button className="btn-icon" onClick={() => setIsFullScreen(!isFullScreen)} title="Toggle Fullscreen">
                  {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>
                <button className="btn-icon" onClick={() => setActiveReportBounty(null)}><X size={24} /></button>
              </div>
            </div>
            <div className="modal-body" style={{ flex: 1, padding: 0, display: 'flex', overflow: 'hidden' }}>
              <div style={{ flex: 1, display: isPreview ? 'none' : 'block', background: '#1e1e1e' }}>
                <Editor
                  height="100%"
                  defaultLanguage="markdown"
                  theme="vs-dark"
                  value={reportContent}
                  onChange={setReportContent}
                  options={{
                    minimap: { enabled: false },
                    wordWrap: 'on',
                    fontSize: 14,
                    fontFamily: 'JetBrains Mono',
                    padding: { top: 24 }
                  }}
                />
              </div>
              <div style={{ flex: 1, display: isPreview ? 'block' : 'none', padding: '32px 48px', overflowY: 'auto', background: 'var(--bg-primary)', '--accent-primary': reportColor, '--accent-primary-dim': `${reportColor}33` }}>
                <div ref={previewRef} className="markdown-body reader-tiptap rendered-content" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '24px 32px', borderTop: '1px solid var(--border-subtle)' }}>
              <button className="btn btn-secondary" onClick={() => setActiveReportBounty(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveReport}>Save Report</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {confirmState && (
        <ConfirmModal
          title={confirmState.title}
          message={confirmState.message}
          confirmText="Delete"
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}

      <style>{`
        .pro-label { font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; display: block; }
        
        .filter-pills-container::-webkit-scrollbar { display: none; }
        .filter-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 20px;
          background: var(--bg-secondary);
          color: var(--text-secondary);
          border: 1px solid var(--border-subtle);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .filter-pill:hover {
          background: var(--bg-tertiary);
          border-color: var(--border-default);
          color: var(--text-primary);
        }
        .filter-pill.active {
          background: var(--text-primary);
          color: var(--bg-deep);
          border-color: var(--text-primary);
        }
        .filter-pill .pill-count {
          background: rgba(255,255,255,0.08);
          color: inherit;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 11px;
        }
        .filter-pill.active .pill-count {
          background: rgba(0,0,0,0.15);
        }
        
        .bounty-table-container {
          background: transparent;
          border: none;
          margin-bottom: 24px;
        }
        .bounty-table {
          margin-bottom: 0;
          border: none;
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 16px;
        }
        .bounty-table thead th {
          padding: 0 24px 8px 24px;
          color: var(--text-muted);
          font-weight: 700;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.5px;
          border-bottom: none;
        }
        .bounty-table tbody tr {
          background: var(--bg-secondary);
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .bounty-table tbody tr:hover {
          transform: translateY(-4px) scale(1.01);
          box-shadow: 0 12px 30px rgba(0,0,0,0.25);
          background: var(--bg-tertiary);
          z-index: 10;
          position: relative;
        }
        .bounty-table tbody td {
          padding: 20px 24px;
          border: none;
          border-top: 1px solid var(--border-subtle);
          border-bottom: 1px solid var(--border-subtle);
        }
        .bounty-table tbody tr td:first-child {
          border-top-left-radius: 16px;
          border-bottom-left-radius: 16px;
          border-left: 1px solid var(--border-subtle);
        }
        .bounty-table tbody tr td:last-child {
          border-top-right-radius: 16px;
          border-bottom-right-radius: 16px;
          border-right: 1px solid var(--border-subtle);
        }
        .modal-content {
          border-radius: 16px !important;
        }
        .pagination-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: 16px;
        }
      `}</style>
    </div>
  );
}
