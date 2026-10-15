import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import './modal.css';

export default function Modal({ title, children, onClose, busy = false, printable = false }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const element = ref.current;
    const trigger = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    return () => {
      document.body.style.overflow = overflow;
      element.close();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);
  function keyboard(event) {
    if (event.key !== 'Tab') return;
    const controls = [...ref.current.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')].filter((item) => item.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (!first) event.preventDefault();
    else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  return createPortal(<dialog ref={ref} className="app-modal" data-print-receipt={printable || undefined} aria-labelledby={titleId} onKeyDown={keyboard}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <header className="app-modal-heading"><h2 id={titleId}>{title}</h2><button type="button" disabled={busy} onClick={onClose} aria-label={`Close ${title}`}>×</button></header>
    <div className="app-modal-content">{children}</div>
  </dialog>, document.body);
}
