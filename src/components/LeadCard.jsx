import { useLeadsContext } from '../context/LeadsContext';

export default function LeadCard({ lead }) {
  const { activeId, openPanel, toggleStar } = useLeadsContext();

  const srcTag =
    lead.source === 'call1' || lead.source === 'call2'
      ? <span className="tag tag-call">Call · {lead.lp}</span>
      : lead.source === 'form1'
      ? <span className="tag tag-form1">Form · LP1</span>
      : <span className="tag tag-form2">Form · LP2</span>;

  const shortSubject =
    (lead.subject || '').length > 90
      ? lead.subject.substring(0, 90) + '…'
      : lead.subject || '—';

  const tagChip = lead.tag ? (
    <span className={`tag ${
      lead.tag.toLowerCase().includes('sent')
        ? 'tag-sent'
        : lead.tag.toLowerCase().includes('tomorrow')
        ? 'tag-tomorrow'
        : 'tag-gray'
    }`}>{lead.tag}</span>
  ) : null;

  const valText = lead.value > 0 ? `Est. $${lead.value.toLocaleString()}` : 'Est. $—';
  const showView = lead.status === 'new' || lead.status === 'contacted';
  const isActive = activeId === lead.id;

  function handleStarClick(e) {
    e.stopPropagation();
    toggleStar(lead.id);
  }

  return (
    <div
      className={`card${isActive ? ' active' : ''}`}
      onClick={() => openPanel(lead.id)}
    >
      <div className="card-top">
        <span className="card-name">{lead.name}</span>
        <button className={`star${lead.starred ? ' on' : ''}`} onClick={handleStarClick}>
          {lead.starred ? '★' : '☆'}
        </button>
      </div>
      <div className="tags">
        {srcTag}
        {tagChip}
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
      <div className="prog">
        <div className="prog-fill" style={{ width: `${lead.progress}%` }}></div>
      </div>
      {showView && (
        <button className="view-btn" onClick={(e) => { e.stopPropagation(); openPanel(lead.id); }}>
          View Details
        </button>
      )}
    </div>
  );
}
