import { useState } from 'react';
import { useLeadsContext } from '../../context/LeadsContext';
import { formatDate } from '../../utils/dateUtils';

export default function ClientsPage() {
  const { leads, openPanel, setCurrentPage } = useLeadsContext();
  const [lpFilter, setLpFilter] = useState('all');

  const formLeads = leads.filter(l => !l.hasCall && l.name !== 'Unknown');
  const counts = { all: formLeads.length, LP1: formLeads.filter(l => l.lp === 'LP1').length, LP2: formLeads.filter(l => l.lp === 'LP2').length };
  const filtered = lpFilter === 'all' ? formLeads : formLeads.filter(l => l.lp === lpFilter);

  function goToLead(id) {
    setCurrentPage('leads');
    setTimeout(() => openPanel(id), 100);
  }

  const tabs = [{ key: 'all', label: 'All' }, { key: 'LP1', label: 'Crystal Pro' }, { key: 'LP2', label: 'Pearl View' }];

  return (
    <div className="page">
      <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '4px' }}>Clients</div>
      <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '14px' }}>All unique clients from form submissions</div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setLpFilter(t.key)}
            style={{
              padding: '5px 14px', borderRadius: '20px', border: '1px solid',
              fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
              borderColor: lpFilter === t.key ? 'var(--primary)' : 'var(--gray-200)',
              background: lpFilter === t.key ? 'var(--primary)' : '#fff',
              color: lpFilter === t.key ? '#fff' : 'var(--gray-600)',
            }}
          >
            {t.label} <span style={{ opacity: 0.75, fontWeight: 400 }}>({counts[t.key]})</span>
          </button>
        ))}
      </div>
      <div>
        {filtered.length === 0 ? (
          <div style={{ color: 'var(--gray-400)', fontSize: '13px', textAlign: 'center', padding: '32px' }}>
            No clients found
          </div>
        ) : (
          filtered.map(l => (
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
                  Form · {l.lp === 'LP2' ? 'Pearl View' : 'Crystal Pro'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
