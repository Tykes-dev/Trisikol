import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import Modal from '../../components/common/Modal';
import { api } from '../../services/api';
import { downloadText } from '../../services/download';
import { receiptHtml, receiptMoney, receiptNotice, receiptRows } from './receiptFormat';
import './receipts.css';

export default function TripReceipt({ rideId }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const path = `/${user.role.toLowerCase()}/rides/${rideId}/receipt`;
  useEffect(() => {
    if (!open) return;
    let active = true;
    api(path).then((receipt) => { if (active) setResult({ path, attempt, receipt }); })
      .catch((error) => { if (active) setResult({ path, attempt, error: error.message }); });
    return () => { active = false; };
  }, [open, path, attempt]);
  const current = result?.attempt === attempt && result.path === path ? result : null;
  const receipt = current?.receipt;
  return <>
    <button type="button" className="receipt-open-button" onClick={() => { setAttempt((value) => value + 1); setOpen(true); }}>View trip #{rideId} receipt</button>
    {open && <Modal printable title={`Trip #${rideId} receipt`} onClose={() => setOpen(false)}>
      {!current && <p role="status">Loading the saved cash receipt…</p>}
      {current?.error && <div role="alert">{current.error}<button type="button" className="receipt-open-button" onClick={() => setAttempt((value) => value + 1)}>Retry receipt</button></div>}
      {receipt && <>
        <article className="trip-receipt"><p className="receipt-brand">TrisiKol · cash trip receipt</p><h3>{receipt.receiptNumber}</h3><div className="receipt-total"><span>Cash collected · PHP</span><strong>{receiptMoney(receipt.cashCollected)}</strong></div>
          <dl>{receiptRows(receipt).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="receipt-notice">{receiptNotice}</p>
        </article>
        <div className="app-modal-actions receipt-export-actions"><button type="button" onClick={() => downloadText(receiptHtml(receipt), `${receipt.receiptNumber}.html`, 'text/html;charset=utf-8')}>Download receipt (.html)</button><button type="button" className="primary" onClick={() => window.print()}>Print / Save PDF</button></div>
      </>}
    </Modal>}
  </>;
}
