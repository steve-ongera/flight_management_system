/**
 * common/index.jsx — shared UI primitives
 */
import { useState, useEffect, useRef } from 'react';

/* ── Status Badge ──────────────────────────────────────────────── */
export function StatusBadge({ value, type = 'booking' }) {
  if (!value) return null;
  const key = value.toLowerCase().replace(' ', '_');
  return <span className={`badge badge-${key}`}>{value.replace('_', ' ')}</span>;
}

export function PriorityBadge({ value }) {
  if (!value) return null;
  return (
    <span className={`badge badge-${value}`}>
      {value === 'vip' ? '★ VIP' : value.charAt(0).toUpperCase() + value.slice(1)}
    </span>
  );
}

/* ── Modal ─────────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, size = '', footer }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size}`}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}><i className="bi bi-x" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

/* ── Confirm Dialog ────────────────────────────────────────────── */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, variant = 'danger' }) {
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className={`btn btn-${variant}`} onClick={onConfirm}>Confirm</button>
        </>
      }
    >
      <p style={{ color: 'var(--gray-600)', fontSize: 14 }}>{message}</p>
    </Modal>
  );
}

/* ── Toast ─────────────────────────────────────────────────────── */
const toastListeners = new Set();
export function showToast(msg, type = 'success') {
  toastListeners.forEach(fn => fn({ msg, type, id: Date.now() }));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const handler = (t) => {
      setToasts(prev => [...prev, t]);
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 3500);
    };
    toastListeners.add(handler);
    return () => toastListeners.delete(handler);
  }, []);

  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:10 }}>
      {toasts.map(t => (
        <div key={t.id} className={`alert alert-${t.type}`}
          style={{ minWidth:280, boxShadow:'var(--shadow-lg)', animation:'slideUp 200ms ease' }}>
          <i className={`bi ${
            t.type === 'success' ? 'bi-check-circle' :
            t.type === 'danger'  ? 'bi-exclamation-circle' :
            'bi-info-circle'}`} />
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/* ── Search Input ──────────────────────────────────────────────── */
export function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="search-bar">
      <i className="bi bi-search" />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      {value && (
        <button style={{ background:'none',border:'none',color:'var(--gray-400)',cursor:'pointer' }}
          onClick={() => onChange('')}>
          <i className="bi bi-x" />
        </button>
      )}
    </div>
  );
}

/* ── Spinner / Loading ─────────────────────────────────────────── */
export function Spinner({ size = '' }) {
  return <div className={`spinner ${size}`} />;
}

export function PageLoader() {
  return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', padding:80 }}>
      <Spinner />
    </div>
  );
}

/* ── Empty State ───────────────────────────────────────────────── */
export function EmptyState({ icon = 'bi-inbox', title = 'Nothing here', message = '', action }) {
  return (
    <div className="empty-state">
      <i className={`bi ${icon}`} />
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

/* ── Stat Card ─────────────────────────────────────────────────── */
export function StatCard({ icon, label, value, color = 'blue', sub }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon si-${color}`}><i className={`bi ${icon}`} /></div>
      <div>
        <div className="stat-value">{value ?? '—'}</div>
        <div className="stat-label">{label}</div>
        {sub && <div style={{ fontSize:11, color:'var(--gray-400)', marginTop:2 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ── Form helpers ──────────────────────────────────────────────── */
export function FormGroup({ label, error, hint, required, children }) {
  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label}{required && <span style={{ color:'var(--danger)',marginLeft:3 }}>*</span>}
        </label>
      )}
      {children}
      {error && <div className="form-error">{error}</div>}
      {hint  && <div className="form-hint">{hint}</div>}
    </div>
  );
}

/* ── Pagination ────────────────────────────────────────────────── */
export function Pagination({ page, count, pageSize = 20, onChange }) {
  const total = Math.ceil(count / pageSize);
  if (total <= 1) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'16px 0', justifyContent:'flex-end' }}>
      <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => onChange(page - 1)}>
        <i className="bi bi-chevron-left" />
      </button>
      <span style={{ fontSize:13, color:'var(--gray-600)' }}>
        Page {page} of {total}
      </span>
      <button className="btn btn-outline btn-sm" disabled={page === total} onClick={() => onChange(page + 1)}>
        <i className="bi bi-chevron-right" />
      </button>
    </div>
  );
}

/* ── Section Header ────────────────────────────────────────────── */
export function SectionHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}