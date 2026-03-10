import { useLeadsContext } from '../../context/LeadsContext';
import { formatDate, isToday } from '../../utils/dateUtils';

// ── Helpers ──────────────────────────────────────────────────────────────────
function ageLabel(dateObj) {
  if (!dateObj) return '';
  const h = (Date.now() - dateObj.getTime()) / 3600000;
  if (h < 1)  return `${Math.floor(h * 60)}m ago`;
  if (h < 24) return `${Math.floor(h)}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmt$(n) {
  if (n >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `$${n.toLocaleString()}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionHeader({ title, count, countColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-900)' }}>{title}</span>
      {count != null && (
        <span style={{ fontSize: '10.5px', fontWeight: 700, background: countColor || 'var(--gray-100)', color: countColor ? '#fff' : 'var(--gray-600)', borderRadius: '20px', padding: '1px 8px' }}>
          {count}
        </span>
      )}
      <span style={{ flex: 1, height: '1px', background: 'var(--gray-100)' }} />
    </div>
  );
}

function ActionRow({ lead, sub, accent, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: '1px solid var(--gray-100)', cursor: 'pointer' }}
    >
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accent, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.name}</div>
        <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '1px' }}>{sub}</div>
      </div>
      {lead.phone && (
        <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} style={{ fontSize: '11px', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, flexShrink: 0 }}>
          Call
        </a>
      )}
    </div>
  );
}

function RecentRow({ l, onClick }) {
  const STATUS_STYLE = {
    new:         { bg: '#ccfbf1', color: '#0f766e', label: 'New' },
    in_progress: { bg: '#dbeafe', color: '#1d4ed8', label: 'In Progress' },
    quote_sent:  { bg: '#ede9fe', color: '#6d28d9', label: 'Quoted' },
    job_done:    { bg: '#dcfce7', color: '#15803d', label: 'Job Done' },
    refused:     { bg: '#fee2e2', color: '#991b1b', label: 'Refused' },
    scam:        { bg: '#f3f4f6', color: '#374151', label: 'Scam' },
    archived:    { bg: 'var(--gray-100)', color: 'var(--gray-500)', label: 'Archived' },
  };
  const s = STATUS_STYLE[l.status] || STATUS_STYLE.archived;
  const isCall = l.hasCall;

  return (
    <div
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--gray-100)', cursor: 'pointer' }}
    >
      <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: isCall ? '#d1fae5' : 'var(--blue-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {isCall ? (
          <svg fill="none" viewBox="0 0 24 24" stroke="#065f46" strokeWidth="2" style={{ width: '15px', height: '15px' }}>
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 012 1.18 2 2 0 014 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" transform="translate(1,1)"/>
          </svg>
        ) : (
          <svg fill="none" viewBox="0 0 24 24" stroke="#0f766e" strokeWidth="2" style={{ width: '15px', height: '15px' }}>
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-900)' }}>{l.name}</span>
          <span style={{ fontSize: '9.5px', fontWeight: 700, background: s.bg, color: s.color, borderRadius: '20px', padding: '1px 6px' }}>{s.label}</span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {l.phone || (l.subject || '').substring(0, 50) || '—'}
        </div>
      </div>
      <div style={{ fontSize: '11px', color: 'var(--gray-400)', flexShrink: 0 }}>{formatDate(l.date)}</div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const SOURCE_META_OV = {
  'website-pearlview':  { label: 'Pearl View',  color: '#7c3aed', bg: '#fdf4ff' },
  'website-crystalpro': { label: 'Crystal Pro', color: '#2563eb', bg: '#eff6ff' },
  'Phone Call':         { label: 'Phone Call',  color: '#0d9488', bg: '#f0fdfa' },
  'Facebook':           { label: 'Facebook',    color: '#1877f2', bg: '#eff6ff' },
  'Google':             { label: 'Google',      color: '#dc2626', bg: '#fef2f2' },
  'Other':              { label: 'Other',        color: '#6b7280', bg: '#f9fafb' },
};

function ageBadge(dateObj) {
  if (!dateObj) return { label: '—', color: 'var(--gray-400)', bg: 'var(--gray-100)' };
  const days = (Date.now() - dateObj.getTime()) / 86400000;
  if (days < 2)  return { label: ageLabel(dateObj), color: '#15803d', bg: '#f0fdf4' };
  if (days < 5)  return { label: ageLabel(dateObj), color: '#92400e', bg: '#fffbeb' };
  return           { label: ageLabel(dateObj), color: '#991b1b', bg: '#fef2f2' };
}

export default function OverviewPage() {
  const { leads, calBookings, openPanel, setCurrentPage } = useLeadsContext();

  // Status buckets
  const newLeads   = leads.filter(l => l.status === 'new');
  const inProgress = leads.filter(l => l.status === 'in_progress')
    .sort((a, b) => (a.dateObj || 0) - (b.dateObj || 0)); // oldest first
  const quoteSent = leads.filter(l => l.status === 'quote_sent');
  const jobDone = leads.filter(l => l.status === 'job_done');

  // Today's snapshot
  const newToday     = newLeads.filter(l => isToday(l.dateObj)).length;
  const followUpsDue = leads.filter(l => l.followUp && new Date(l.followUp) < new Date());
  const bookedToday  = (calBookings || []).filter(b => b.date && isToday(new Date(b.date)) && b.bookingStatus !== 'Completed').length;

  // Revenue
  const totalRevenue   = leads.filter(l => l.paid).reduce((sum, l) => sum + (l.paidAmount || 0), 0);
  const pendingRevenue = quoteSent.reduce((sum, l) => sum + (l.value || 0), 0);

  // Action items
  const agingNew    = newLeads.filter(l => l.dateObj && (Date.now() - l.dateObj.getTime()) > 24 * 3600000);
  const uncollected = jobDone.filter(l => !l.paid);

  const totalActions = followUpsDue.length + agingNew.length + uncollected.length;

  // Source breakdown from all leads
  const sourceBreakdown = {};
  leads.forEach(l => {
    const src = l.leadSource || (l.hasCall ? 'Phone Call' : l.lp === 'LP1' ? 'website-crystalpro' : l.lp === 'LP2' ? 'website-pearlview' : 'Other');
    sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1;
  });

  // Recent activity (last 8)
  const recent = leads.slice(0, 8);

  function goToLead(id) {
    setCurrentPage('leads');
    setTimeout(() => openPanel(id), 100);
  }

  return (
    <div className="page">
      {/* ── Today's Snapshot ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '12px', padding: '12px 10px' }}>
          <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#0f766e', marginBottom: '5px' }}>New Today</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#134e4a', lineHeight: 1 }}>{newToday}</div>
          <div style={{ fontSize: '10px', color: '#0d9488', marginTop: '4px' }}>received</div>
        </div>
        <div
          style={{ background: followUpsDue.length > 0 ? '#fef2f2' : '#f9fafb', border: `1px solid ${followUpsDue.length > 0 ? '#fecaca' : 'var(--gray-200)'}`, borderRadius: '12px', padding: '12px 10px', cursor: followUpsDue.length > 0 ? 'pointer' : 'default' }}
          onClick={() => followUpsDue.length > 0 && setCurrentPage('leads')}
        >
          <div style={{ fontSize: '9.5px', fontWeight: 700, color: followUpsDue.length > 0 ? '#dc2626' : 'var(--gray-500)', marginBottom: '5px' }}>Follow-ups</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: followUpsDue.length > 0 ? '#dc2626' : 'var(--gray-400)', lineHeight: 1 }}>{followUpsDue.length}</div>
          <div style={{ fontSize: '10px', color: followUpsDue.length > 0 ? '#ef4444' : 'var(--gray-400)', marginTop: '4px' }}>overdue</div>
        </div>
        <div
          style={{ background: bookedToday > 0 ? '#fffbeb' : '#f9fafb', border: `1px solid ${bookedToday > 0 ? '#fde68a' : 'var(--gray-200)'}`, borderRadius: '12px', padding: '12px 10px', cursor: bookedToday > 0 ? 'pointer' : 'default' }}
          onClick={() => bookedToday > 0 && setCurrentPage('calendar')}
        >
          <div style={{ fontSize: '9.5px', fontWeight: 700, color: bookedToday > 0 ? '#d97706' : 'var(--gray-500)', marginBottom: '5px' }}>Booked Today</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: bookedToday > 0 ? '#d97706' : 'var(--gray-400)', lineHeight: 1 }}>{bookedToday}</div>
          <div style={{ fontSize: '10px', color: bookedToday > 0 ? '#f59e0b' : 'var(--gray-400)', marginTop: '4px' }}>on calendar</div>
        </div>
      </div>


      {/* ── Revenue Snapshot ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px 14px' }}>
          <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#15803d', marginBottom: '5px' }}>Revenue Collected</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#14532d', lineHeight: 1 }}>{totalRevenue > 0 ? fmt$(totalRevenue) : '—'}</div>
          <div style={{ fontSize: '10px', color: '#16a34a', marginTop: '4px' }}>{leads.filter(l => l.paid).length} paid jobs</div>
        </div>
        <div style={{ background: pendingRevenue > 0 ? '#fffbeb' : '#f9fafb', border: `1px solid ${pendingRevenue > 0 ? '#fde68a' : 'var(--gray-200)'}`, borderRadius: '12px', padding: '14px 14px' }}>
          <div style={{ fontSize: '9.5px', fontWeight: 700, color: pendingRevenue > 0 ? '#92400e' : 'var(--gray-500)', marginBottom: '5px' }}>Quoted Pipeline</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: pendingRevenue > 0 ? '#b45309' : 'var(--gray-400)', lineHeight: 1 }}>{pendingRevenue > 0 ? fmt$(pendingRevenue) : '—'}</div>
          <div style={{ fontSize: '10px', color: pendingRevenue > 0 ? '#d97706' : 'var(--gray-400)', marginTop: '4px' }}>{quoteSent.length} quotes open</div>
        </div>
      </div>

      {/* ── In Progress ── */}
      {inProgress.length > 0 && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #bfdbfe', padding: '16px 18px' }}>
          <SectionHeader title="In Progress" count={inProgress.length} countColor="#2563eb" />
          {inProgress.slice(0, 6).map(l => {
            const badge = ageBadge(l.dateObj);
            return (
              <div
                key={l.id}
                onClick={() => goToLead(l.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: '1px solid var(--gray-100)', cursor: 'pointer' }}
              >
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563eb', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '1px' }}>{l.phone || l.subject || '—'}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, background: badge.bg, color: badge.color, borderRadius: '20px', padding: '2px 7px', whiteSpace: 'nowrap' }}>
                    {badge.label}
                  </span>
                  {l.phone && (
                    <a href={`tel:${l.phone}`} onClick={e => e.stopPropagation()} style={{ fontSize: '11px', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                      Call
                    </a>
                  )}
                </div>
              </div>
            );
          })}
          {inProgress.length > 6 && (
            <div style={{ fontSize: '11px', color: 'var(--primary)', cursor: 'pointer', marginTop: '8px', fontWeight: 600 }} onClick={() => setCurrentPage('leads')}>
              +{inProgress.length - 6} more →
            </div>
          )}
        </div>
      )}

      {/* ── Needs Attention ── */}
      {totalActions > 0 && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--gray-200)', padding: '16px 18px' }}>
          <SectionHeader title="Needs Attention" count={totalActions} countColor="#dc2626" />

          {/* Overdue follow-ups */}
          {followUpsDue.length > 0 && (
            <>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '4px', marginTop: '4px' }}>
                Overdue Follow-ups
              </div>
              {followUpsDue.slice(0, 4).map(l => (
                <ActionRow
                  key={l.id} lead={l}
                  sub={`Due ${formatDate(l.followUp)}`}
                  accent="#dc2626"
                  onClick={() => goToLead(l.id)}
                />
              ))}
              {followUpsDue.length > 4 && (
                <div style={{ fontSize: '11px', color: 'var(--primary)', cursor: 'pointer', marginTop: '4px' }} onClick={() => setCurrentPage('leads')}>
                  +{followUpsDue.length - 4} more →
                </div>
              )}
            </>
          )}

          {/* Aging new leads */}
          {agingNew.length > 0 && (
            <>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '4px', marginTop: followUpsDue.length > 0 ? '12px' : '4px' }}>
                New Leads Aging (&gt;24h uncontacted)
              </div>
              {agingNew.slice(0, 3).map(l => (
                <ActionRow
                  key={l.id} lead={l}
                  sub={`Received ${ageLabel(l.dateObj)} · ${l.source?.includes('call') ? 'Call' : 'Form'}`}
                  accent="#d97706"
                  onClick={() => goToLead(l.id)}
                />
              ))}
              {agingNew.length > 3 && (
                <div style={{ fontSize: '11px', color: 'var(--primary)', cursor: 'pointer', marginTop: '4px' }} onClick={() => setCurrentPage('leads')}>
                  +{agingNew.length - 3} more →
                </div>
              )}
            </>
          )}

          {/* Uncollected payments */}
          {uncollected.length > 0 && (
            <>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '4px', marginTop: (followUpsDue.length > 0 || agingNew.length > 0) ? '12px' : '4px' }}>
                Payment Not Yet Collected
              </div>
              {uncollected.slice(0, 3).map(l => (
                <ActionRow
                  key={l.id} lead={l}
                  sub={l.value > 0 ? `Est. $${l.value.toLocaleString()}` : 'Job done — record payment'}
                  accent="#0d9488"
                  onClick={() => goToLead(l.id)}
                />
              ))}
              {uncollected.length > 3 && (
                <div style={{ fontSize: '11px', color: 'var(--primary)', cursor: 'pointer', marginTop: '4px' }} onClick={() => setCurrentPage('leads')}>
                  +{uncollected.length - 3} more →
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Lead Sources ── */}
      {Object.keys(sourceBreakdown).length > 0 && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--gray-200)', padding: '16px 18px' }}>
          <SectionHeader title="Lead Sources" count={leads.length} />
          {Object.entries(sourceBreakdown)
            .sort((a, b) => b[1] - a[1])
            .map(([src, count]) => {
              const meta = SOURCE_META_OV[src] || { label: src || 'Unknown', color: '#6b7280', bg: '#f9fafb' };
              const pct  = Math.round((count / leads.length) * 100);
              return (
                <div key={src} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>{meta.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{pct}%</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-800)' }}>{count}</span>
                    </div>
                  </div>
                  <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: meta.color, borderRadius: '4px', transition: 'width .35s ease' }} />
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* ── Recent Activity ── */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--gray-200)', padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-900)' }}>Recent Activity</span>
          <span style={{ fontSize: '11.5px', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setCurrentPage('leads')}>View all →</span>
        </div>

        {recent.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--gray-400)', textAlign: 'center', padding: '20px 0' }}>No leads yet.</p>
        ) : (
          recent.map(l => <RecentRow key={l.id} l={l} onClick={() => goToLead(l.id)} />)
        )}
      </div>
    </div>
  );
}
