import { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Sparkles, X } from 'lucide-react';

export function PageActions({ children }) { return <div className="page-actions">{children}</div>; }

export function Illustration({ type, alt, className = '' }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={`illustration-fallback illustration-${type} ${className}`} aria-hidden="true"><Sparkles size={28} /></div>;
  return <img className={`illustration illustration-${type} ${className}`} src={`${import.meta.env.BASE_URL}assets/illustrations/${type}.png`} alt={alt} onError={() => setFailed(true)} />;
}

export function StatCard({ label, value, hint, icon: Icon, accent = '' }) {
  return <motion.article className={`stat-card ${accent}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}><span className="stat-icon"><Icon size={17} aria-hidden="true" /></span><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-hint">{hint}</span></motion.article>;
}

export function ProgressMeter({ value, max = 100, label, tone = 'mint' }) {
  const percentage = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return <div className="meter-group"><div className="meter-heading"><span>{label}</span><strong>{percentage}%</strong></div><div className={`meter meter-${tone}`} role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={percentage}><span style={{ width: `${percentage}%` }} /></div></div>;
}

export function EmptyState({ type = 'empty-task', title, message, action, onAction }) {
  return <motion.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Illustration type={type} alt="" /><h3>{title}</h3><p>{message}</p>{action && <button className="btn btn-secondary" type="button" onClick={onAction}>{action}</button>}</motion.div>;
}

export function Modal({ open, onClose, title, eyebrow = 'TaskFlow', children, compact = false }) {
  const dialogRef = useRef(null);
  // Semua <dialog> tetap ter-render walau tertutup, jadi id statis akan bentrok
  // di halaman yang memasang beberapa modal sekaligus (Fokus memasang empat).
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return <dialog ref={dialogRef} className={`dialog ${compact ? 'dialog-compact' : ''}`} onCancel={(event) => { event.preventDefault(); onClose(); }} onClose={onClose} aria-labelledby={titleId}><motion.div key={open ? 'open' : 'closed'} className="dialog-card" initial={{ opacity: 0, scale: 0.98, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}><div className="dialog-header"><div><p className="section-kicker">{eyebrow}</p><h2 id={titleId}>{title}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Tutup dialog" title="Tutup"><X size={18} /></button></div>{children}</motion.div></dialog>;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Lanjutkan', danger = false, onClose, onConfirm }) {
  return <Modal open={open} onClose={onClose} title={title} eyebrow="Konfirmasi" compact><p className="dialog-message">{message}</p><div className="dialog-footer"><button className="btn btn-secondary" type="button" onClick={onClose}>Batal</button><button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} type="button" onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button></div></Modal>;
}

export function CourseDot({ color, size = 10 }) {
  return <i className="course-dot" style={{ width: size, height: size, background: color }} aria-hidden="true" />;
}

export function WorkspaceLoading({ error, onRetry }) {
  return <main className="workspace-loading container"><section className="workspace-loading-card" aria-live="polite"><span className="brand-mark" aria-hidden="true"><span /></span><p className="eyebrow">TaskFlow</p><h1>{error ? 'Ruang fokus belum dapat dibuka.' : 'Menyiapkan ruang fokusmu...'}</h1><p>{error || 'Memeriksa workspace lokal di perangkat ini.'}</p>{error && <button className="btn btn-primary" type="button" onClick={onRetry}>Coba lagi</button>}</section></main>;
}

export function ReminderBanner({ items, onOpen }) {
  if (!items.length) return null;
  const overdue = items.filter((item) => item.overdue).length;
  const text = overdue ? `${overdue} tugas melewati deadline.` : `${items.length} tugas perlu perhatian hari ini.`;
  return <aside className="reminder-banner" role="status"><Check size={15} /><span>{text}</span><button className="text-link" type="button" onClick={onOpen}>Lihat agenda</button></aside>;
}
