import { useState } from 'react';
import { useLeadsContext } from '../context/LeadsContext';

export default function BookModal() {
  const { bookModalId, confirmBook, closeBookModal, leads } = useLeadsContext();

  const [date,   setDate]   = useState(new Date().toISOString().slice(0, 10));
  const [time,   setTime]   = useState('');
  const [worker, setWorker] = useState('');
  const [err,    setErr]    = useState('');

  if (!bookModalId) return null;
  const lead = leads.find(l => l.id === bookModalId);

  function handleSubmit() {
    if (!date) { setErr('Please select a date'); return; }
    setErr('');
    confirmBook({ date, jobTime: time, worker });
  }

  const lbl = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--gray-500)', marginBottom: '6px', display: 'block' };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '16px' }}
      onClick={e => { if (e.target === e.currentTarget) closeBookModal(); }}
    >
      <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--gray-100)' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gray-900)' }}>📅 Book Job</div>
            <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '2px' }}>{lead?.name}</div>
          </div>
          <button onClick={closeBookModal} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--gray-400)', padding: '4px' }}>✕</button>
        </div>

        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={lbl}>Date *</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="finput"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={lbl}>Job Time (optional)</label>
            <input
              type="text"
              value={time}
              onChange={e => setTime(e.target.value)}
              placeholder="e.g. 9:00 AM"
              className="finput"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={lbl}>Assigned Worker (optional)</label>
            <input
              type="text"
              value={worker}
              onChange={e => setWorker(e.target.value)}
              placeholder="e.g. John"
              className="finput"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {err && (
            <div style={{ fontSize: '12px', color: '#dc2626', padding: '8px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px' }}>{err}</div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              onClick={closeBookModal}
              style={{ padding: '11px', background: '#f9fafb', color: 'var(--gray-700)', border: '1px solid var(--gray-200)', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              style={{ padding: '11px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Confirm Booking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
