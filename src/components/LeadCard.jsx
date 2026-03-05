import { useState, useRef, useEffect } from 'react';
import { useLeadsContext } from '../context/LeadsContext';
import { REFUSE_LABELS } from '../utils/constants';

export default function LeadCard({ lead }) {
  const { activeId, openPanel, toggleStar, changeStatus, renameLead, showToast } = useLeadsContext();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName]   = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const isCall = lead.source === 'call1' || lead.source === 'call2';
  const lpName = lead.lp === 'LP2' ? 'Pearl View' : 'Crystal Pro';

  const srcTag = isCall
    ? <span className="tag tag-call">Call · {lpName}</span>
    : lead.source === 'form1'
    ? <span className="tag tag-form1">Form · Crystal Pro</span>
    : <span className="tag tag-form2">Form · Pearl View</span>;

  const refuseTag = lead.status === 'refused' && lead.refuseReason
    ? <span className="tag" style={{ background: '#fee2e2', color: '#991b1b' }}>
        {REFUSE_LABELS[lead.refuseReason] || lead.refuseReason}
      </span>
    : null;

  const tagChip = lead.tag ? (
    <span className={`tag ${
      lead.tag.toLowerCase().includes('sent') ? 'tag-sent'
      : lead.tag.toLowerCase().includes('tomorrow') ? 'tag-tomorrow'
      : 'tag-gray'
    }`}>{lead.tag}</span>
  ) : null;

  const shortSubject = (lead.subject || '').length > 90
    ? lead.subject.substring(0, 90) + '…'
    : lead.subject || '—';

  let valText = '';
  if (lead.status === 'job_done' && lead.paid && lead.paidAmount > 0) {
    valText = `Paid $${lead.paidAmount.toLocaleString()}`;
  } else if ((lead.status === 'quote_sent' || lead.status === 'job_done') && lead.value > 0) {
    valText = `Est. $${lead.value.toLocaleString()}`;
  }
  const showView = lead.status === 'new' || lead.status === 'in_progress';
  const isActive = activeId === lead.id;

  function handleStarClick(e) {
    e.stopPropagation();
    toggleStar(lead.id);
  }

  function handleDblClick(e) {
    e.stopPropagation();
    setEditName(lead.name);
    setIsEditing(true);
  }

  function saveName() {
    const trimmed = editName.trim() || lead.name;
    renameLead(lead.id, trimmed);
    setIsEditing(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); saveName(); }
    if (e.key === 'Escape') { setIsEditing(false); }
  }

  // Drag-and-drop
  function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', lead.id);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => e.target.classList.add('dragging'), 0);
  }
  function handleDragEnd(e) {
    e.target.classList.remove('dragging');
  }

  return (
    <div
      className={`card${isActive ? ' active' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => openPanel(lead.id)}
    >
      <div className="card-top">
        {isEditing ? (
          <input
            ref={inputRef}
            className="card-name-input"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={saveName}
            onKeyDown={handleKeyDown}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="card-name" onDoubleClick={handleDblClick} title="Double-click to rename">
            {lead.name}
          </span>
        )}
        <button className={`star${lead.starred ? ' on' : ''}`} onClick={handleStarClick}>
          {lead.starred ? '★' : '☆'}
        </button>
      </div>
      <div className="tags">
        {srcTag}
        {tagChip}
        {refuseTag}
      </div>
      <div className="card-sub">{shortSubject}</div>
      <div className="card-footer">
        <span className="card-val">{valText}</span>
        {lead.duration && (
          <span className="card-dur">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            {lead.duration}
          </span>
        )}
      </div>
      {lead.status === 'job_done' && !lead.paid && (
        <div style={{ marginTop: '8px', padding: '5px 10px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: '#c2410c', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ width: '12px', height: '12px', flexShrink: 0 }}>
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
          </svg>
          Collect Payment
        </div>
      )}
      <div className="prog">
        <div className="prog-fill" style={{ width: `${lead.progress}%` }}></div>
      </div>
      {showView && (
        <button className="view-btn" onClick={e => { e.stopPropagation(); openPanel(lead.id); }}>
          View Details
        </button>
      )}
    </div>
  );
}
