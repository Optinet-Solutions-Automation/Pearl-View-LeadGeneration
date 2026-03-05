import { useLeadsContext } from '../context/LeadsContext';
import { formatDate } from '../utils/dateUtils';

const STATUS_LABELS = {
  new:        { label: 'New Lead',     bg: '#eff6ff', color: '#2563eb' },
  in_progress:{ label: 'In Progress',  bg: '#fefce8', color: '#854d0e' },
  quote_sent: { label: 'Quote Sent',   bg: '#f5f3ff', color: '#6d28d9' },
  job_done:   { label: 'Job Done',     bg: '#f0fdf4', color: '#15803d' },
  refused:    { label: 'Refused',      bg: '#fef2f2', color: '#dc2626' },
};

export default function ClientDetailModal({ client, onClose }) {
  const { leads, setCurrentPage, openPanel } = useLeadsContext();

  if (!client) return null;

  // Find all leads matching this client by phone or name
  const normalPhone = (client.phone || '').replace(/\s/g, '').toLowerCase();
  const relatedLeads = leads.filter(l => {
    if (normalPhone) {
      const lPhone = (l.phone || '').replace(/\s/g, '').toLowerCase();
      if (lPhone && lPhone === normalPhone) return true;
    }
    // Fallback to name match
    return l.name?.toLowerCase().trim() === client.name?.toLowerCase().trim();
  }).sort((a, b) => b.dateObj - a.dateObj);

  function goToLead(leadId) {
    onClose();
    setCurrentPage('leads');
    setTimeout(() => openPanel(leadId), 150);
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '480px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px 20px', borderBottom: '1px solid var(--gray-100)' }}>
          <div style={{
            width: '46px', height: '46px', borderRadius: '50%', background: 'var(--blue-100)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', fontWeight: 800, color: 'var(--primary)', flexShrink: 0,
          }}>
            {(client.name || '?').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.name || 'Unknown'}</div>
            <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '2px' }}>Client Profile</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--gray-400)', padding: '4px', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px' }}>

          {/* Contact info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            <InfoCard icon="📞" label="Phone" value={client.phone || '—'} href={client.phone ? `tel:${client.phone}` : null} />
            <InfoCard icon="✉️" label="Email" value={client.email || '—'} href={client.email ? `mailto:${client.email}` : null} />
            <InfoCard icon="📍" label="City" value={client.city || '—'} />
            <InfoCard icon="🏠" label="Property" value={client.jobType || '—'} />
          </div>

          {/* Address */}
          {client.address && (
            <div style={{ background: 'var(--gray-50)', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', fontSize: '12.5px', color: 'var(--gray-700)' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--gray-400)', letterSpacing: '.04em' }}>Address</span>
              <div style={{ marginTop: '3px' }}>{client.address}</div>
            </div>
          )}

          {/* Notes */}
          {client.notes && (
            <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', fontSize: '12.5px', color: 'var(--gray-700)' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#92400e', letterSpacing: '.04em' }}>Notes</span>
              <div style={{ marginTop: '3px', whiteSpace: 'pre-wrap' }}>{client.notes}</div>
            </div>
          )}

          {/* Related leads */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--gray-400)', marginBottom: '8px' }}>
              Lead History ({relatedLeads.length})
            </div>
            {relatedLeads.length === 0 ? (
              <div style={{ fontSize: '12.5px', color: 'var(--gray-400)', textAlign: 'center', padding: '24px', border: '1px dashed var(--gray-200)', borderRadius: '8px' }}>
                No leads linked to this client
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {relatedLeads.map(l => {
                  const st = STATUS_LABELS[l.status] || { label: l.status, bg: '#f3f4f6', color: '#6b7280' };
                  return (
                    <div
                      key={l.id}
                      onClick={() => goToLead(l.id)}
                      style={{
                        background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '8px',
                        padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                        transition: 'border-color .15s',
                      }}
                      onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                      onMouseOut={e  => e.currentTarget.style.borderColor = 'var(--gray-200)'}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--gray-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.subject || l.jobType || 'Inquiry'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '2px' }}>{formatDate(l.date)}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {l.value > 0 && (
                          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0d9488' }}>${l.value.toLocaleString()}</span>
                        )}
                        <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: st.bg, color: st.color, whiteSpace: 'nowrap' }}>
                          {st.label}
                        </span>
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: '12px', height: '12px', color: 'var(--gray-400)' }}>
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function InfoCard({ icon, label, value, href }) {
  const content = (
    <div style={{ background: 'var(--gray-50)', borderRadius: '8px', padding: '10px 12px' }}>
      <div style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--gray-400)', marginBottom: '3px' }}>{label}</div>
      <div style={{ fontSize: '12.5px', fontWeight: 600, color: href ? 'var(--primary)' : 'var(--gray-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {icon} {value}
      </div>
    </div>
  );
  if (href) {
    return <a href={href} style={{ textDecoration: 'none' }} onClick={e => e.stopPropagation()}>{content}</a>;
  }
  return content;
}
