import { useState } from 'react';
import { useLeadsContext } from '../../context/LeadsContext';
import { formatDate } from '../../utils/dateUtils';

export default function DeletedHistoryPage() {
  const { deletedLeads, permanentDelete, recoverLead } = useLeadsContext();

  // confirm = { type: 'delete'|'recover', id, name } or null
  const [confirm, setConfirm] = useState(null);

  function askDelete(lead) {
    setConfirm({ type: 'delete', id: lead.id, name: lead.name });
  }
  function askRecover(lead) {
    setConfirm({ type: 'recover', id: lead.id, name: lead.name });
  }
  function handleYes() {
    if (!confirm) return;
    if (confirm.type === 'delete')  permanentDelete(confirm.id);
    if (confirm.type === 'recover') recoverLead(confirm.id);
    setConfirm(null);
  }

  return (
    <div className="page">
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gray-900)' }}>Deleted History</div>
        <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '2px' }}>
          Leads removed from the pipeline — recover or permanently delete them here
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--gray-200)', overflow: 'hidden' }}>
        {deletedLeads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray-400)' }}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"
              style={{ width: '40px', height: '40px', margin: '0 auto 12px', display: 'block', color: 'var(--gray-300)' }}>
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-500)' }}>No deleted leads</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>Leads you archive will appear here</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Phone / Email</th>
                  <th style={thStyle}>Original Date</th>
                  <th style={thStyle}>Deleted At</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deletedLeads.map((l, i) => {
                  const isCall   = l.hasCall;
                  const lpName   = l.lp === 'LP2' ? 'Pearl View' : 'Crystal Pro';
                  const srcLabel = isCall ? `Call · ${lpName}` : `Form · ${lpName}`;
                  const deletedStr = l.deletedAt
                    ? l.deletedAt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                      + ' ' + l.deletedAt.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
                    : '—';

                  return (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                      <td style={tdStyle}>{i + 1}</td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--gray-900)' }}>{l.name}</td>
                      <td style={tdStyle}>
                        <span style={{
                          fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                          background: isCall ? '#dcfce7' : '#dbeafe',
                          color: isCall ? '#15803d' : '#1d4ed8',
                        }}>
                          {srcLabel}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--gray-600)' }}>{l.phone || l.email || '—'}</td>
                      <td style={{ ...tdStyle, color: 'var(--gray-500)' }}>{formatDate(l.date)}</td>
                      <td style={{ ...tdStyle, color: 'var(--gray-500)' }}>{deletedStr}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => askRecover(l)}
                            style={{
                              padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                              border: '1.5px solid #2563eb', background: '#eff6ff', color: '#2563eb',
                              cursor: 'pointer',
                            }}
                          >
                            Recover
                          </button>
                          <button
                            onClick={() => askDelete(l)}
                            style={{
                              padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                              border: '1.5px solid #dc2626', background: '#fef2f2', color: '#dc2626',
                              cursor: 'pointer',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation modal */}
      {confirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: '14px', padding: '28px 32px',
            maxWidth: '400px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          }}>
            {/* Icon */}
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px', margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: confirm.type === 'delete' ? '#fef2f2' : '#eff6ff',
            }}>
              {confirm.type === 'delete' ? (
                <svg fill="none" viewBox="0 0 24 24" stroke="#dc2626" strokeWidth="2" style={{ width: '24px', height: '24px' }}>
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              ) : (
                <svg fill="none" viewBox="0 0 24 24" stroke="#2563eb" strokeWidth="2" style={{ width: '24px', height: '24px' }}>
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              )}
            </div>

            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gray-900)', textAlign: 'center', marginBottom: '8px' }}>
              {confirm.type === 'delete' ? 'Delete Permanently?' : 'Recover Lead?'}
            </div>
            <div style={{ fontSize: '13.5px', color: 'var(--gray-600)', textAlign: 'center', lineHeight: 1.5 }}>
              {confirm.type === 'delete'
                ? <>Are you sure you want to permanently delete <strong>"{confirm.name}"</strong>? This cannot be undone.</>
                : <>Are you sure you want to recover <strong>"{confirm.name}"</strong> and add it back to the leads list?</>
              }
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button
                onClick={() => setConfirm(null)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13.5px', fontWeight: 600,
                  border: '1.5px solid var(--gray-200)', background: '#fff', color: 'var(--gray-700)',
                  cursor: 'pointer',
                }}
              >
                No
              </button>
              <button
                onClick={handleYes}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13.5px', fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  background: confirm.type === 'delete' ? '#dc2626' : '#2563eb',
                  color: '#fff',
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: '10px 14px', textAlign: 'left', fontSize: '11.5px',
  fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase',
  letterSpacing: '.04em', whiteSpace: 'nowrap',
};
const tdStyle = {
  padding: '12px 14px', color: 'var(--gray-700)', verticalAlign: 'middle',
};
