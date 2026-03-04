import { useState, useRef, useEffect, useCallback } from 'react';
import { useLeadsContext } from '../context/LeadsContext';
import { formatDate } from '../utils/dateUtils';
import { REFUSE_LABELS } from '../utils/constants';


function PaymentModal({ leadName, initAmount, initMethod, onSubmit, onClose }) {
  const [amount, setAmount] = useState(initAmount ? String(initAmount) : '');
  const [method, setMethod] = useState(initMethod || 'Cash');
  const [err,    setErr]    = useState('');

  function handleSubmit() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setErr('Please enter a valid amount'); return; }
    setErr('');
    onSubmit({ amount: amt, method, bankName: '', accountRef: '' });
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '380px', boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--gray-100)' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gray-900)' }}>Submit Payment</div>
            <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '2px' }}>{leadName}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--gray-400)', padding: '4px' }}>✕</button>
        </div>

        <div style={{ padding: '18px 20px' }}>
          {/* Amount */}
          <label style={mlbl}>Amount Paid</label>
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)', fontWeight: 700, fontSize: '15px' }}>$</span>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
              style={{ width: '100%', padding: '10px 12px 10px 28px', fontSize: '17px', fontWeight: 700, border: '1.5px solid var(--gray-200)', borderRadius: '8px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Payment Method */}
          <label style={mlbl}>Payment Method</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            {['Cash', 'Bank'].map(m => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  border: `1.5px solid ${method === m ? (m === 'Cash' ? '#16a34a' : '#2563eb') : 'var(--gray-200)'}`,
                  background: method === m ? (m === 'Cash' ? '#f0fdf4' : '#eff6ff') : '#fff',
                  color: method === m ? (m === 'Cash' ? '#16a34a' : '#2563eb') : 'var(--gray-500)',
                }}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>

          {err && (
            <div style={{ fontSize: '12px', color: '#dc2626', marginBottom: '12px', padding: '8px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px' }}>
              {err}
            </div>
          )}

          <button
            onClick={handleSubmit}
            style={{ width: '100%', padding: '11px', background: '#0d9488', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Confirm Payment
          </button>
        </div>
      </div>
    </div>
  );
}

function generateWaveBars() {
  return Array.from({ length: 42 }, () => 4 + Math.floor(Math.random() * 20));
}

function AudioPlayer({ lead }) {
  const [playing, setPlaying] = useState(false);
  const [playedBars, setPlayedBars] = useState(0);
  const [bars] = useState(() => generateWaveBars());

  const handlePlay = useCallback(() => {
    if (playing) { setPlaying(false); return; }
    setPlaying(true); setPlayedBars(0);
    let idx = 0;
    const iv = setInterval(() => {
      idx++; setPlayedBars(idx);
      if (idx >= bars.length) { clearInterval(iv); setPlaying(false); setPlayedBars(0); }
    }, 80);
  }, [playing, bars.length]);

  return (
    <div className="audio-box">
      <div className="audio-row">
        <button className="play-btn" onClick={handlePlay}>
          {playing
            ? <svg fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            : <svg fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          }
        </button>
        <div className="wave">
          {bars.map((h, i) => (
            <div key={i} className={`wbar${i < playedBars ? ' played' : ''}`} style={{ height: `${h}px` }} />
          ))}
        </div>
      </div>
      <div className="audio-footer">
        <span className="audio-time">Duration: {lead.duration || '—'}</span>
      </div>
    </div>
  );
}

export default function DetailPanel() {
  const {
    activeLead: l, closePanel, changeStatus,
    saveNote, saveJobType, savePaidInfo, saveCity, saveJobDate, saveEmail,
    archiveLead, showToast, renameLead, setRefuseReason,
  } = useLeadsContext();

  const [noteText,     setNoteText]     = useState('');
  const [editingName,  setEditingName]  = useState(false);
  const [editNameVal,  setEditNameVal]  = useState('');
  const [editingCity,  setEditingCity]  = useState(false);
  const [cityVal,      setCityVal]      = useState('');
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailVal,     setEmailVal]     = useState('');
  const [paidAmount,   setPaidAmount]   = useState('');
  const [payMethod,    setPayMethod]    = useState('');
  const [payModalOpen, setPayModalOpen] = useState(false);
  const nameInputRef  = useRef(null);
  const cityInputRef  = useRef(null);
  const emailInputRef = useRef(null);
  const noteTimerRef  = useRef(null);

  useEffect(() => {
    setEditingName(false);
    setEditingCity(false);
    setEditingEmail(false);
    if (l) {
      setNoteText(l.notes || '');
      setPaidAmount(l.paidAmount || '');
      setPayMethod(l.paymentMethod || '');
    }
  }, [l?.id]);

  useEffect(() => {
    if (editingName && nameInputRef.current) { nameInputRef.current.focus(); nameInputRef.current.select(); }
  }, [editingName]);

  useEffect(() => {
    if (editingCity && cityInputRef.current) { cityInputRef.current.focus(); cityInputRef.current.select(); }
  }, [editingCity]);

  useEffect(() => {
    if (editingEmail && emailInputRef.current) { emailInputRef.current.focus(); emailInputRef.current.select(); }
  }, [editingEmail]);

  if (!l) return <aside className="panel" />;

  const isCallLead = l.source === 'call1' || l.source === 'call2';
  const lpName = l.lp === 'LP2' ? 'Pearl View' : 'Crystal Pro';

  const srcTag = isCallLead
    ? <span className="tag tag-call" style={{ fontSize: '11px' }}>Call · {lpName}</span>
    : l.source === 'form1'
    ? <span className="tag tag-form1" style={{ fontSize: '11px' }}>Form · Crystal Pro</span>
    : l.source === 'manual'
    ? <span className="tag tag-gray" style={{ fontSize: '11px' }}>{l.leadChannel || 'Manual'}</span>
    : <span className="tag tag-form2" style={{ fontSize: '11px' }}>Form · Pearl View</span>;

  function handleNoteChange(e) {
    const val = e.target.value;
    setNoteText(val);
    clearTimeout(noteTimerRef.current);
    noteTimerRef.current = setTimeout(() => saveNote(l.id, val), 1500);
  }
  function handleSaveNote()  { saveNote(l.id, noteText); showToast('Note saved'); }
  function handleClearNote() { setNoteText(''); saveNote(l.id, ''); showToast('Note cleared'); }
  function handleArchive()   { archiveLead(l.id); }
  function handleSendQuote() { changeStatus(l.id, 'quote_sent'); }
  function handleJobDone()   { changeStatus(l.id, 'job_done'); }

  function startEditName() { setEditNameVal(l.name); setEditingName(true); }
  function saveName() { const t = editNameVal.trim() || l.name; renameLead(l.id, t); setEditingName(false); }
  function handleNameKey(e) {
    if (e.key === 'Enter') saveName();
    if (e.key === 'Escape') setEditingName(false);
  }

  function startEditCity() { setCityVal(l.city || ''); setEditingCity(true); }
  function saveCity_()     { saveCity(l.id, cityVal.trim()); setEditingCity(false); }
  function handleCityKey(e) {
    if (e.key === 'Enter') saveCity_();
    if (e.key === 'Escape') setEditingCity(false);
  }

  function startEditEmail() { setEmailVal(l.email || ''); setEditingEmail(true); }
  function saveEmail_()     { saveEmail(l.id, emailVal.trim()); setEditingEmail(false); }
  function handleEmailKey(e) {
    if (e.key === 'Enter') saveEmail_();
    if (e.key === 'Escape') setEditingEmail(false);
  }

  function handleSubmitPayment() {
    setPayModalOpen(true);
  }

  function onPaymentSubmit({ amount, method, bankName, accountRef }) {
    const payments = JSON.parse(localStorage.getItem('pvl_payments') || '[]');
    payments.unshift({
      id: `pay-${Date.now()}`,
      leadId: l.id,
      name: l.name,
      phone: l.phone || '',
      email: l.email || '',
      jobType: l.jobType || '',
      city: l.city || '',
      amount,
      method,
      bankName,
      accountRef,
      date: new Date().toISOString(),
    });
    localStorage.setItem('pvl_payments', JSON.stringify(payments));
    savePaidInfo(l.id, true, amount, method);
    setPaidAmount(amount.toString());
    setPayMethod(method);
    setPayModalOpen(false);
    showToast('Payment submitted ✓');
  }

  function handlePaidToggle(checked) {
    const amount = checked ? (parseFloat(paidAmount) || 0) : 0;
    const method = checked ? payMethod : '';
    savePaidInfo(l.id, checked, amount, method);
  }

  function handlePayMethodSelect(method) {
    setPayMethod(method);
    savePaidInfo(l.id, l.paid, parseFloat(paidAmount) || 0, method);
  }

  function handlePaidAmountBlur() {
    if (l.paid) savePaidInfo(l.id, true, parseFloat(paidAmount) || 0, payMethod);
  }

  return (
    <aside className="panel open" style={{ position: 'relative' }}>
      <div className="panel-hdr">
        <div className="panel-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {editingName ? (
              <input
                ref={nameInputRef}
                value={editNameVal}
                onChange={e => setEditNameVal(e.target.value)}
                onBlur={saveName}
                onKeyDown={handleNameKey}
                style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gray-900)', border: 'none', borderBottom: '1.5px solid var(--primary)', outline: 'none', background: 'transparent', fontFamily: 'inherit', padding: 0, width: '180px' }}
              />
            ) : (
              <h2>{l.name}</h2>
            )}
            <button
              onClick={startEditName}
              title="Edit name"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px', color: 'var(--gray-400)', lineHeight: 0, flexShrink: 0 }}
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </div>
          <div className="panel-meta">
            {isCallLead ? `Direct Call · ${l.lp}` : `Form · ${l.lp}`} · {formatDate(l.date)}
          </div>
        </div>
        <button className="close-btn" onClick={closePanel}>✕</button>
      </div>

      <div className="panel-body">
        {/* Status */}
        <div className="psec">
          <div className="psec-title">Status</div>
          <select className="status-sel" value={l.status} onChange={e => changeStatus(l.id, e.target.value)}>
            <option value="new">🔵 New Lead</option>
            <option value="in_progress">🟡 In Progress</option>
            <option value="quote_sent">🟣 Quote Sent</option>
            <option value="refused">🚫 Refused</option>
            <option value="job_done">✅ Job Done</option>
          </select>
        </div>

        {/* Refuse reason buttons */}
        {l.status === 'refused' && (
          <div className="psec">
            <div className="psec-title">Refusal Reason</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {Object.entries(REFUSE_LABELS).map(([key, label]) => {
                const active = l.refuseReason === key;
                const emoji = key === 'too_expensive' ? '💰 ' : key === 'competition' ? '🏆 ' : key === 'no_answer' ? '📵 ' : '❓ ';
                return (
                  <button key={key} onClick={() => setRefuseReason(l.id, key)} style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', border: `1.5px solid ${active ? '#dc2626' : 'var(--gray-200)'}`, background: active ? '#fee2e2' : '#fff', color: active ? '#991b1b' : 'var(--gray-600)' }}>
                    {emoji}{label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Contact */}
        <div className="psec">
          <div className="psec-title">Client Contact</div>
          <div className="prow">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 012 1.18 2 2 0 014 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" transform="translate(1,1)"/>
            </svg>
            <span className="prow-text">{l.phone || '—'}</span>
          </div>
          {/* Email — tap to edit */}
          <div className="prow" style={{ cursor: 'pointer' }} onClick={editingEmail ? undefined : startEditEmail}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            {editingEmail ? (
              <input
                ref={emailInputRef}
                value={emailVal}
                onChange={e => setEmailVal(e.target.value)}
                onBlur={saveEmail_}
                onKeyDown={handleEmailKey}
                placeholder="Add email…"
                style={{ fontSize: '13px', color: 'var(--gray-800)', border: 'none', borderBottom: '1.5px solid var(--primary)', outline: 'none', background: 'transparent', fontFamily: 'inherit', padding: 0, flex: 1 }}
              />
            ) : (
              <span className="prow-text" style={{ color: l.email ? 'var(--gray-800)' : 'var(--gray-400)' }}>
                {l.email ? <a href={`mailto:${l.email}`} onClick={e => e.stopPropagation()}>{l.email}</a> : 'Add email…'}
              </span>
            )}
          </div>
          {/* City — building icon, tap to edit */}
          <div className="prow" style={{ cursor: 'pointer' }} onClick={editingCity ? undefined : startEditCity}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16M3 21h18M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
            {editingCity ? (
              <input
                ref={cityInputRef}
                value={cityVal}
                onChange={e => setCityVal(e.target.value)}
                onBlur={saveCity_}
                onKeyDown={handleCityKey}
                placeholder="Enter city…"
                style={{ fontSize: '13px', color: 'var(--gray-800)', border: 'none', borderBottom: '1.5px solid var(--primary)', outline: 'none', background: 'transparent', fontFamily: 'inherit', padding: 0, flex: 1 }}
              />
            ) : (
              <span className="prow-text" style={{ color: l.city ? 'var(--gray-800)' : 'var(--gray-400)' }}>
                {l.city || 'Add city…'}
              </span>
            )}
          </div>
        </div>

        {/* Job Details */}
        <div className="psec">
          <div className="psec-title">Job Details</div>
          <div className="jrow" style={{ alignItems: 'center' }}>
            <span className="jlbl">Job Type</span>
            <select
              className="status-sel"
              value={l.jobType || ''}
              onChange={e => saveJobType(l.id, e.target.value)}
              style={{ fontSize: '12px', padding: '4px 8px', height: 'auto', flex: 1 }}
            >
              <option value="">— Select —</option>
              <option value="Window Cleaning">Window Cleaning</option>
              <option value="Pressure Washing">Pressure Washing</option>
              <option value="Solar Panel">Solar Panel</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div style={{ padding: '4px 0' }}>
            <div className="jlbl" style={{ marginBottom: '4px' }}>Subject</div>
            <div style={{ fontSize: '12px', color: 'var(--gray-800)', lineHeight: 1.55, background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: '6px', padding: '8px 10px', maxHeight: '120px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {l.subject || '—'}
            </div>
          </div>
          {l.jobDate && <div className="jrow"><span className="jlbl">Job Date</span><span className="jval">{l.jobDate}</span></div>}
          <div className="jrow">
            <span className="jlbl">Est. Value</span>
            <span className="jval" style={{ color: 'var(--primary)' }}>{l.value > 0 ? '$' + l.value.toLocaleString() : '—'}</span>
          </div>
          <div className="jrow"><span className="jlbl">Lead Source</span>{srcTag}</div>
        </div>

        {/* Payment */}
        <div className="psec">
          <div className="psec-title">Payment</div>
          <label className="paid-toggle-row">
            <input
              type="checkbox"
              checked={!!l.paid}
              onChange={e => handlePaidToggle(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--green)' }}
            />
            <span style={{ fontSize: '13px', fontWeight: 600, color: l.paid ? '#15803d' : 'var(--gray-700)' }}>
              {l.paid ? 'Paid ✓' : 'Mark as Paid'}
            </span>
          </label>
          {l.paid && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="jrow" style={{ alignItems: 'center' }}>
                <span className="jlbl">Amount Paid</span>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={e => setPaidAmount(e.target.value)}
                  onBlur={handlePaidAmountBlur}
                  placeholder="0"
                  style={{ flex: 1, fontSize: '13px', padding: '4px 8px', border: '1.5px solid var(--gray-200)', borderRadius: '6px', fontFamily: 'inherit', outline: 'none' }}
                />
              </div>
              <div className="jrow" style={{ alignItems: 'center' }}>
                <span className="jlbl">Method</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handlePayMethodSelect('Bank')}
                    style={{ padding: '5px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: `1.5px solid ${payMethod === 'Bank' ? '#2563eb' : 'var(--gray-200)'}`, background: payMethod === 'Bank' ? '#eff6ff' : '#fff', color: payMethod === 'Bank' ? '#2563eb' : 'var(--gray-600)' }}
                  >
                    BANK
                  </button>
                  <button
                    onClick={() => handlePayMethodSelect('Cash')}
                    style={{ padding: '5px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: `1.5px solid ${payMethod === 'Cash' ? '#16a34a' : 'var(--gray-200)'}`, background: payMethod === 'Cash' ? '#f0fdf4' : '#fff', color: payMethod === 'Cash' ? '#16a34a' : 'var(--gray-600)' }}
                  >
                    CASH
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Call History */}
        <div className="psec">
          <div className="psec-title">Call History</div>
          {l.hasCall ? (
            <>
              <AudioPlayer lead={l} />
              {l.subject && (
                <div style={{ marginTop: '10px' }}>
                  <div className="psec-title" style={{ marginBottom: '5px' }}>Transcript</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--gray-600)', lineHeight: 1.6, background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '10px', maxHeight: '140px', overflowY: 'auto' }}>
                    {l.subject}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p style={{ fontSize: '12px', color: 'var(--gray-400)' }}>No call recording for this lead.</p>
          )}
        </div>

        {/* Notes */}
        <div className="psec">
          <div className="psec-title">Notes</div>
          <textarea
            className="notes-ta"
            placeholder="Add notes about this lead…"
            value={noteText}
            onChange={handleNoteChange}
          />
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
            <button className="save-note-btn" style={{ marginTop: 0 }} onClick={handleSaveNote}>Save Note</button>
            <button className="clear-note-btn" onClick={handleClearNote}>Clear</button>
          </div>
        </div>

        {/* Actions */}
        <div className="psec" style={{ borderBottom: 'none' }}>
          <div className="psec-title">Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <div className="action-grid">
              <button className="action-btn btn-blue">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Assign Crew
              </button>
              <button className="action-btn btn-dark" onClick={handleSendQuote}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                Send Quote
              </button>
            </div>
            <button className="action-btn btn-green" onClick={handleJobDone}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              Job Done
            </button>
            <button className="action-btn" style={{ background: '#0d9488', borderColor: '#0d9488', color: '#fff' }} onClick={handleSubmitPayment}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
              Submit Payment
            </button>
            <button className="action-btn btn-red" onClick={handleArchive}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <polyline points="21 8 21 21 3 21 3 8"/>
                <rect x="1" y="3" width="22" height="5"/>
                <line x1="10" y1="12" x2="14" y2="12"/>
              </svg>
              Archive Lead
            </button>
          </div>
        </div>
      </div>

      {payModalOpen && (
        <PaymentModal
          leadName={l.name}
          initAmount={paidAmount}
          initMethod={payMethod}
          onSubmit={onPaymentSubmit}
          onClose={() => setPayModalOpen(false)}
        />
      )}
    </aside>
  );
}

const mlbl = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--gray-500)', marginBottom: '6px', display: 'block' };
