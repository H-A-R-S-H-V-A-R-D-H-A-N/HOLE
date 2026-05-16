import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ title, message, warning, onConfirm, onCancel, confirmText = "Delete" }) {
  return (
    <div className="modal-overlay" onClick={onCancel} style={{ zIndex: 9999 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
            <AlertTriangle color="#EF4444" /> {title}
          </h2>
          <button className="btn-icon" onClick={onCancel}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body" style={{ padding: '20px' }}>
          <p style={{ fontSize: '14px', lineHeight: 1.5 }}>{message}</p>
          {warning && (
            <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '12px' }}>{warning}</p>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
