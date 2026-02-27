import LeadCard from './LeadCard';

export default function KanbanColumn({ col, leads }) {
  const [bgC, textC] = col.cnt.split('/');
  const count = leads.length;

  return (
    <div className="col">
      <div className="col-hdr">
        <div className="col-dot" style={{ background: col.dot }}></div>
        <span className="col-lbl">{col.label}</span>
        <span className="col-cnt" style={{ background: bgC, color: textC }}>{count}</span>
        <svg className="col-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="5" r="1"/>
          <circle cx="12" cy="12" r="1"/>
          <circle cx="12" cy="19" r="1"/>
        </svg>
      </div>
      <div className="col-cards">
        {leads.map(lead => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  );
}
