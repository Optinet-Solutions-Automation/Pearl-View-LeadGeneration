import { useLeadsContext } from '../../context/LeadsContext';
import { formatDate } from '../../utils/dateUtils';

export default function ClientsPage() {
  const { leads, openPanel, setCurrentPage } = useLeadsContext();

  const formLeads = leads.filter(l => !l.hasCall && l.name !== 'Unknown');

  function goToLead(id) {
    setCurrentPage('leads');
    setTimeout(() => openPanel(id), 100);
  }

  return (
    <div className="page">
      <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '4px' }}>Clients</div>
      <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '16px' }}>All unique clients from form submissions</div>
      <div>
        {formLeads.length === 0 ? (
          <div style={{ color: 'var(--gray-400)', fontSize: '13px', textAlign: 'center', padding: '32px' }}>
            No form clients found
          </div>
        ) : (
          formLeads.map(l => (
            <div
              key={l.id}
              onClick={() => goToLead(l.id)}
              style={{
                background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '10px',
                padding: '14px 16px', marginBottom: '8px', display: 'flex', alignItems: 'center',
                gap: '14px', cursor: 'pointer', transition: 'border-color .15s',
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = 'var(--blue-200)'}
              onMouseOut={e => e.currentTarget.style.borderColor = 'var(--gray-200)'}
            >
              <div style={{
                width: '38px', height: '38px', borderRadius: '50%', background: 'var(--blue-100)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: 700, color: 'var(--primary)', flexShrink: 0,
              }}>
                {l.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--gray-900)' }}>{l.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{l.email || l.phone || '—'}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{formatDate(l.date)}</div>
                <span className={`tag tag-form${l.lp === 'LP2' ? '2' : '1'}`} style={{ marginTop: '4px', display: 'inline-block' }}>
                  Form · {l.lp}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
