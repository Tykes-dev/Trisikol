import { useEffect, useId, useRef } from 'react';

const paths = {
  drivers: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  queue: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  trips: 'M12 8v4l3 2M3 11a9 9 0 1 1 2.5 7M3 4v7h7',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
  overview: 'M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  profile: 'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  logout: 'M9 21H4V3h5m7 4 5 5-5 5M8 12h13',
  plus: 'M12 5v14M5 12h14',
  edit: 'm16 3 5 5-12 12-6 1 1-6ZM14 5l5 5',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  close: 'm6 6 12 12M6 18 18 6',
  check: 'm5 12 4 4L19 6',
  cash: 'M2 5h20v14H2ZM7 9H5v6h2m10-6h2v6h-2m-2-3a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  location: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
};
export function AdminIcon({ name, size = 21 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.overview} /></svg>;
}
export function AdminButton({ children, icon, variant = '', className = '', ...props }) {
  return <button type="button" className={`admin-button ${variant ? `admin-button--${variant}` : ''} ${className}`} {...props}>{icon && <AdminIcon name={icon} size={19} />}{children}</button>;
}
export function AdminMetric({ label, value, icon }) {
  return <article className="admin-stat"><span className="admin-stat-icon"><AdminIcon name={icon} /></span><div><strong>{value}</strong><span>{label}</span></div></article>;
}
export function AdminEmpty({ title, children }) {
  return <div className="admin-empty"><AdminIcon name="search" size={30} /><h2>{title}</h2><p>{children}</p></div>;
}
export function AdminDialog({ title, children, onClose, busy = false }) {
  const ref = useRef(null);
  const titleId = useId();
  function containKeyboardFocus(event) {
    if (event.key !== 'Tab') return;
    const controls = [...ref.current.querySelectorAll('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')]
      .filter((element) => element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => {
      document.body.style.overflow = previousOverflow;
      dialog.close();
      trigger?.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={ref} className="admin-dialog" aria-labelledby={titleId} onKeyDown={containKeyboardFocus}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="admin-dialog-handle" aria-hidden="true" />
    <div className="admin-dialog-heading"><h2 id={titleId}>{title}</h2><button type="button" className="admin-icon-button" aria-label={`Close ${title}`} disabled={busy} onClick={onClose}><AdminIcon name="close" /></button></div>
    <div className="admin-dialog-body">{children}</div>
  </dialog>;
}
