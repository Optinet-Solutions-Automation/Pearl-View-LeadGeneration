import { useState, useRef, useEffect, useCallback } from 'react';
import { useLeadsContext } from '../context/LeadsContext';
import { formatDate } from '../utils/dateUtils';
import { REFUSE_LABELS } from '../utils/constants';

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
    saveNote, saveJobType, archiveLead, showToast, renameLead, setRefuseReason,
  } = useLeadsContext();

  const [noteText, setNoteText]       = useState('');
  const [editingName, setEditingName] = useState(false);
  const [editNameVal, setEditNameVal] = useState('');
  const nameInputRef = useRef(null);
  const noteTimerRef = useRef(null);

  useEffect(() => {
    setEditingName(false);
    if (l) setNoteText(l.notes || '');
  }, [l?.id]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  if (!l) return <aside className="panel" />;

  const isCallLead = l.source === 'call1' || l.source === 'call2';
  const lpName = l.lp === 'LP2' ? 'Pearl View' : 'Crystal Pro';

  const srcTag = isCallLead
    ? <span className="tag tag-call" style={{ fontSize: '11px' }}>Call · {lpName}</span>
    : l.source === 'form1'
    ? <span className="tag tag-form1" style={{ fontSize: '11px' }}>Form · Crystal Pro</span>
    : <span className="tag tag-form2" style={{ fontSize: '11px' }}>Form · Pearl View</span>;

  function handleNoteChange(e) {
    const val = e.target.value;
    setNoteText(val);
    clearTimeout(noteTimerRef.current);
    noteTimerRef.current = setTimeout(() => saveNote(l.id, val), 1500);
  }
  function handleSaveNote() { saveNote(l.id, noteText); showToast('Note saved'); }
  function handleClearNote() { setNoteText(''); saveNote(l.id, ''); showToast('Note cleared'); }
  function handleComplete() { changeStatus(l.id, 'completed'); closePanel(); }
  function handleArchive() { archiveLead(l.id); }
  function handleSendQuote() { changeStatus(l.id, 'quoted'); }
  function startEditName() { setEditNameVal(l.name); setEditingName(true); }
  function saveName() { const t = editNameVal.trim() || l.name; renameLead(l.id, t); setEditingName(false); }
  function handleNameKey(e) {
    if (e.key === 'Enter') saveName();
    if (e.key === 'Escape') setEditingName(false);
  }

  return (
    <aside className="panel open">
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
            <option value="contacted">🟡 Contacted</option>
            <option value="quoted">🟣 In Progress</option>
            <option value="scheduled">🟢 Invoice Pending</option>
            <option value="completed">✅ Job Payment</option>
            <option value="refused">🚫 Refused</option>
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
          <div className="prow">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <span className="prow-text">{l.email ? <a href={`mailto:${l.email}`}>{l.email}</a> : '—'}</span>
          </div>
          <div className="prow">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span className="prow-text">{l.address || '—'}</span>
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
              <option value="Window">Window</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Pressure">Pressure</option>
              <option value="Solar">Solar</option>
              <option value="Panels">Panels</option>
            </select>
          </div>
          <div className="jrow"><span className="jlbl">Windows</span><span className="jval">{l.windows || '—'}</span></div>
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
            <button className="action-btn btn-green" onClick={handleComplete}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              Complete Job
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
    </aside>
  );
}
