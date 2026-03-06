import { useState, useRef } from 'react';
import { useLeadsContext } from '../context/LeadsContext';

// ── Time picker ───────────────────────────────────────────────────────────────
function TimePicker({ value, onChange }) {
  function parse(str) {
    if (!str) return { h: '9', m: '00', p: 'AM' };
    const match = str.match(/^(\d+):(\d+)\s*(AM|PM)?/i);
    return match ? { h: match[1], m: match[2], p: (match[3] || 'AM').toUpperCase() } : { h: '9', m: '00', p: 'AM' };
  }
  const parsed = parse(value);
  const [enabled, setEnabled] = useState(!!value);
  const [h, setH] = useState(parsed.h);
  const [m, setM] = useState(parsed.m);
  const [p, setP] = useState(parsed.p);
  const ref = useRef({ h: parsed.h, m: parsed.m, p: parsed.p });

  function update(newH, newM, newP) {
    ref.current = { h: newH, m: newM, p: newP };
    setH(newH); setM(newM); setP(newP);
    onChange(`${newH}:${newM} ${newP}`);
  }

  if (!enabled) {
    return (
      <button type="button" onClick={() => { setEnabled(true); onChange(`${h}:${m} ${p}`); }}
        style={{ padding: '7px 14px', background: '#f9fafb', color: 'var(--gray-600)', border: '1.5px dashed var(--gray-300)', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', width: '100%', textAlign: 'left' }}>
        + Set time (optional)
      </button>
    );
  }

  const selStyle = { padding: '9px 6px', border: '1.5px solid var(--gray-200)', borderRadius: '8px', fontFamily: 'inherit', fontSize: '13px', outline: 'none', background: '#fff', flex: 1 };
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      <select value={h} onChange={e => update(e.target.value, ref.current.m, ref.current.p)} style={selStyle}>
        {['1','2','3','4','5','6','7','8','9','10','11','12'].map(v => <option key={v}>{v}</option>)}
      </select>
      <span style={{ fontWeight: 700, color: 'var(--gray-400)', fontSize: '16px' }}>:</span>
      <select value={m} onChange={e => update(ref.current.h, e.target.value, ref.current.p)} style={selStyle}>
        {['00','15','30','45'].map(v => <option key={v}>{v}</option>)}
      </select>
      <div style={{ display: 'flex', border: '1.5px solid var(--gray-200)', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
        {['AM','PM'].map((v, i) => (
          <button key={v} type="button" onClick={() => update(ref.current.h, ref.current.m, v)}
            style={{ padding: '9px 13px', background: p === v ? '#eff6ff' : '#fff', color: p === v ? 'var(--primary)' : 'var(--gray-500)', border: 'none', borderLeft: i > 0 ? '1px solid var(--gray-200)' : 'none', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function BookModal() {
  const { bookModalId, confirmBook, closeBookModal, leads } = useLeadsContext();

  const [date,   setDate]   = useState(new Date().toISOString().slice(0, 10));
  const [time,   setTime]   = useState('');
  const [worker, setWorker] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [err,    setErr]    = useState('');

  if (!bookModalId) return null;
  const lead = leads.find(l => l.id === bookModalId);

  function handleSubmit() {
    if (!date) { setErr('Please select a date'); return; }
    setErr('');
    confirmBook({ date, jobTime: time, worker, amount: parseFloat(amount) || 0, paymentMethod: method });
  }

  const lbl = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--gray-500)', marginBottom: '6px', display: 'block' };
  const hasAmount = parseFloat(amount) > 0;

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
            <TimePicker value={time} onChange={setTime} />
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

          {/* Amount — if entered, recorded as Revenue immediately */}
          <div>
            <label style={lbl}>Payment Amount (optional)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)', fontWeight: 700 }}>$</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="finput"
                style={{ width: '100%', boxSizing: 'border-box', paddingLeft: '24px' }}
              />
            </div>
            {hasAmount && (
              <div style={{ marginTop: '8px' }}>
                <label style={{ ...lbl, marginBottom: '6px' }}>Payment Method</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['Cash', 'Bank'].map(mt => (
                    <button key={mt} type="button" onClick={() => setMethod(mt)} style={{
                      flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit',
                      border: `1.5px solid ${method === mt ? (mt === 'Cash' ? '#16a34a' : '#2563eb') : 'var(--gray-200)'}`,
                      background: method === mt ? (mt === 'Cash' ? '#f0fdf4' : '#eff6ff') : '#fff',
                      color: method === mt ? (mt === 'Cash' ? '#16a34a' : '#2563eb') : 'var(--gray-500)',
                    }}>
                      {mt.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: '6px', fontSize: '11px', color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '5px 8px' }}>
                  Payment will be recorded as Revenue
                </div>
              </div>
            )}
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
