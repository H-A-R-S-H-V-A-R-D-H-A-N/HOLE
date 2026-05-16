import { useState, useEffect } from 'react';
import {
  DollarSign, Plus, Filter, ArrowUpDown, ExternalLink,
  TrendingUp, Target, CheckCircle2, Clock, X, Trash2, Edit3
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import '../styles/Settings.css';

export default function BountyTracker() {
  const [bounties, setBounties] = useState(() => {
    try {
      const saved = localStorage.getItem('kroma_bounties');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showModal, setShowModal] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    program: '', title: '', severity: 'medium', status: 'submitted', amount: 0, url: '', date: new Date().toISOString().split('T')[0],
  });

  const totalEarned = bounties.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0);
  const totalSubmitted = bounties.length;
  const totalPaid = bounties.filter(b => b.status === 'paid').length;

  useEffect(() => {
    localStorage.setItem('kroma_bounties', JSON.stringify(bounties));
  }, [bounties]);

  const handleOpenModal = (bounty = null) => {
    if (bounty) {
      setEditingId(bounty.id);
      setFormData(bounty);
    } else {
      setEditingId(null);
      setFormData({ program: '', title: '', severity: 'medium', status: 'submitted', amount: 0, url: '', date: new Date().toISOString().split('T')[0] });
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

  const statusLabels = {
    submitted: 'Submitted',
    triaged: 'Triaged',
    resolved: 'Resolved',
    paid: 'Paid',
    duplicate: 'Duplicate',
  };

  return (
    <div className="bounty-tracker-page page-enter">
      <div className="bounty-header">
        <h1 className="bounty-title">💰 Bounty Tracker</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Add Bounty
        </button>
      </div>

      <div className="bounty-stats">
        <div className="bounty-stat-card">
          <div className="bounty-stat-value" style={{ color: 'var(--accent-green)' }}>${totalEarned.toLocaleString()}</div>
          <div className="bounty-stat-label">Total Earned</div>
        </div>
        <div className="bounty-stat-card">
          <div className="bounty-stat-value" style={{ color: 'var(--accent-primary)' }}>{totalSubmitted}</div>
          <div className="bounty-stat-label">Reports Submitted</div>
        </div>
        <div className="bounty-stat-card">
          <div className="bounty-stat-value" style={{ color: 'var(--accent-secondary)' }}>{totalPaid}</div>
          <div className="bounty-stat-label">Paid Out</div>
        </div>
      </div>

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
          {bounties.map((b) => (
            <tr key={b.id}>
              <td style={{ fontWeight: 600 }}>{b.program}</td>
              <td>{b.title}</td>
              <td><span className={`badge badge-${b.severity}`}>{b.severity}</span></td>
              <td><span className={`status-badge status-${b.status}`}>{statusLabels[b.status]}</span></td>
              <td style={{ fontWeight: 700, color: b.amount > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>{b.amount > 0 ? `$${b.amount}` : '—'}</td>
              <td style={{ color: 'var(--text-muted)' }}>{b.date}</td>
              <td style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-icon" onClick={() => handleOpenModal(b)} title="Edit"><Edit3 size={16} /></button>
                <button className="btn-icon" onClick={() => handleDelete(b)} title="Delete" style={{ color: '#EF4444' }}><Trash2 size={16} /></button>
                {b.url && <button className="btn-icon" onClick={() => window.open(b.url, '_blank')} title="View Report" style={{ color: 'var(--accent-primary)' }}><ExternalLink size={16} /></button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
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
                  <label className="pro-label">Date</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <label className="pro-label">Report URL</label>
                <input value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} placeholder="https://..." style={{ width: '100%' }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>{editingId ? 'Update' : 'Save'}</button>
            </div>
          </div>
        </div>
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
      `}</style>
    </div>
  );
}
