import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, CircleCheck, EllipsisVertical, Inbox, Search, TriangleAlert, X } from 'lucide-react';
import { STATUS } from '../lib/format';
import { useClickOutside } from '../lib/hooks';

export function Badge({ status, children }) {
  const s = STATUS[status] || { label: status, tone: 'muted' };
  return <span className={`badge tone-${s.tone}`}>{children || s.label}</span>;
}

// penanda ringkas ✓ / I / — / × di tabel data presensi
export function Mark({ status }) {
  const s = STATUS[status] || STATUS.belum;
  return (
    <span className={`mark tone-${s.tone}`} title={s.label} aria-label={s.label}>
      {s.mark}
    </span>
  );
}

export function StatCard({ icon: Icon, label, value, hint, tone = 'primary' }) {
  return (
    <div className="card stat">
      <div className={`stat-icon tone-${tone}`}>
        <Icon size={22} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </div>
  );
}

export function PageHead({ title, subtitle, children }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="row wrap">{children}</div>}
    </div>
  );
}

export function Button({ variant = 'primary', size, block, loading, children, className = '', ...props }) {
  const cls = ['btn', `btn-${variant}`, size && `btn-${size}`, block && 'btn-block', className].filter(Boolean).join(' ');
  return (
    <button className={cls} disabled={loading || props.disabled} {...props}>
      {loading && <span className="spinner" />}
      {children}
    </button>
  );
}

export function Field({ label, required, error, hint, children, className = '' }) {
  return (
    <div className={`field ${className}`}>
      {label && (
        <label>
          {label} {required && <span className="req">*</span>}
        </label>
      )}
      {children}
      {error ? <span className="field-error">{error}</span> : hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Cari...' }) {
  return (
    <div className="input-wrap">
      <Search size={18} className="input-icon" />
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          className={`tab ${value === t.value ? 'active' : ''}`}
          onClick={() => onChange(t.value)}
        >
          {t.label}
          {t.count !== undefined && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Loading({ text = 'Memuat data...' }) {
  return (
    <div className="loading">
      <span className="spinner" /> {text}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title = 'Belum ada data', children }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={24} />
      </div>
      <div className="empty-title">{title}</div>
      {children && <div>{children}</div>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="alert tone-danger">
      <TriangleAlert size={18} />
      <div style={{ flex: 1 }}>{message}</div>
      {onRetry && (
        <button className="btn btn-sm btn-secondary" onClick={onRetry}>
          Coba lagi
        </button>
      )}
    </div>
  );
}

export function Pagination({ meta, onPage }) {
  if (!meta) return null;
  const { page, totalPages, total, limit } = meta;
  const dari = total ? (page - 1) * limit + 1 : 0;
  const sampai = Math.min(page * limit, total);
  return (
    <div className="pagination">
      <span>
        Menampilkan {dari}–{sampai} dari {total} data
      </span>
      <div className="pagination-pages">
        <button className="page-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Sebelumnya">
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => onPage(p)}>
            {p}
          </button>
        ))}
        <button className="page-btn" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Berikutnya">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, subtitle, size, children, footer, busy }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && !busy && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, busy]);

  if (!open) return null;
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose?.()}>
      <div className={`modal ${size || ''}`} role="dialog" aria-modal="true">
        {title && (
          <div className="modal-head">
            <div>
              <div className="modal-title">{title}</div>
              {subtitle && <div className="card-sub">{subtitle}</div>}
            </div>
            {onClose && (
              <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={onClose} disabled={busy} aria-label="Tutup">
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

// Dialog konfirmasi. onConfirm boleh async; tombol menampilkan loading.
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  icon: Icon = TriangleAlert,
  tone = 'primary',
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
}) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };
  const iconTone = { primary: 'tone-primary', danger: 'tone-danger', success: 'tone-success' }[tone];
  const btn = { primary: 'primary', danger: 'danger', success: 'success' }[tone];
  return (
    <Modal open={open} onClose={onClose} busy={busy}>
      <div className="dialog-center">
        <div className={`dialog-icon ${iconTone}`}>
          <Icon size={28} />
        </div>
        <div className="modal-title">{title}</div>
        {message && <p>{message}</p>}
      </div>
      <div className="dialog-foot-center">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button variant={btn} onClick={run} loading={busy}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

// Tampilan sukses setelah aksi penting
export function SuccessDialog({ open, title, message, children, actions }) {
  return (
    <Modal open={open}>
      <div className="dialog-center">
        <div className="dialog-icon tone-success">
          <CircleCheck size={30} />
        </div>
        <div className="modal-title">{title}</div>
        {message && <p>{message}</p>}
        {children}
      </div>
      <div className="dialog-foot-center">{actions}</div>
    </Modal>
  );
}

// Menu titik tiga di baris tabel. Panelnya fixed supaya tidak terpotong
// oleh container tabel yang bisa di-scroll.
export function ActionMenu({ items }) {
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  useClickOutside(panelRef, () => setPos(null), Boolean(pos));

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [pos]);

  const toggle = (e) => {
    e.stopPropagation();
    if (pos) return setPos(null);
    const r = btnRef.current.getBoundingClientRect();
    const tinggi = items.length * 40 + 12;
    const top = r.bottom + tinggi > window.innerHeight ? r.top - tinggi - 4 : r.bottom + 4;
    setPos({ top, left: Math.max(8, r.right - 200) });
  };

  return (
    <>
      <button ref={btnRef} className="icon-btn" style={{ width: 34, height: 34 }} onClick={toggle} aria-label="Aksi">
        <EllipsisVertical size={18} />
      </button>
      {pos &&
        createPortal(
          <div
            ref={panelRef}
            className="dropdown-panel"
            style={{ position: 'fixed', top: pos.top, left: pos.left, right: 'auto', width: 200 }}
            onClick={(e) => e.stopPropagation()}
          >
            {items.filter(Boolean).map((it) => (
              <button
                key={it.label}
                className={`dropdown-item ${it.danger ? 'danger' : ''}`}
                onClick={() => {
                  setPos(null);
                  it.onClick();
                }}
              >
                {it.icon && <it.icon size={16} />}
                {it.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
