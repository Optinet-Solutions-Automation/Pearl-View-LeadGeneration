import { useLeadsContext } from '../../context/LeadsContext';

export default function CalendarPage() {
  const { leads } = useLeadsContext();

  const scheduled = leads
    .filter(l => l.jobDate || l.followUp)
    .sort((a, b) => {
      const da = new Date(a.jobDate || a.followUp || 0);
      const db = new Date(b.jobDate || b.followUp || 0);
      return da - db;
    });

  return (
    <div className="page">
      <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '4px' }}>Calendar</div>
      <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '20px' }}>Scheduled jobs and follow-up dates</div>
      {scheduled.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--gray-200)', padding: '32px', textAlign: 'center', color: 'var(--gray-400)', fontSize: '13px' }}>
          No scheduled jobs or follow-ups yet.<br/>Set dates in lead details to see them here.
        </div>
      ) : (
        scheduled.map(l => {
          const dateStr = l.jobDate || l.followUp;
          const d = new Date(dateStr);
          return (
            <div key={l.id} style={{ background: '#fff', borderRadius: '10px', border: '1px solid var(--gray-200)', padding: '14px 16px', marginBottom: '8px', display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ background: 'var(--blue-50)', borderRadius: '8px', padding: '8px 12px', textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                  {d.toLocaleDateString('en-AU', { month: 'short' })}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--gray-900)' }}>{d.getDate()}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--gray-900)' }}>{l.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                  {l.jobDate ? 'Job scheduled' : 'Follow-up'} · {l.address || '—'}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
