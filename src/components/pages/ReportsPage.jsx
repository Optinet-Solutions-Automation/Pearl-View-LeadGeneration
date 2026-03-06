import { useState, useEffect, useMemo } from 'react';
import { useLeadsContext } from '../../context/LeadsContext';
import { fetchRecords, AT_TABLES } from '../../utils/airtableSync';

const RANGES = [
  { id: 'week',   label: 'Week' },
  { id: 'month',  label: 'Month' },
  { id: 'year',   label: 'Year' },
  { id: 'custom', label: 'Custom' },
];

const SOURCE_META = {
  'website-pearlview':  { label: 'Pearl View',   color: '#2563eb', bg: '#eff6ff' },
  'website-crystalpro': { label: 'Crystal Pro',  color: '#7c3aed', bg: '#f5f3ff' },
  'Phone Call':         { label: 'Phone Call',   color: '#0d9488', bg: '#f0fdfa' },
  'Facebook':           { label: 'Facebook',     color: '#1877f2', bg: '#eff6ff' },
  'Google':             { label: 'Google',       color: '#dc2626', bg: '#fef2f2' },
  'Other':              { label: 'Other',        color: '#6b7280', bg: '#f9fafb' },
  'Manual':             { label: 'Manual',       color: '#94a3b8', bg: '#f8fafc' },
};

function getSourceMeta(key) {
  return SOURCE_META[key] || { label: key || 'Unknown', color: '#6b7280', bg: '#f9fafb' };
}

function startOf(type) {
  const d = new Date();
  if (type === 'week')  { d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d; }
  if (type === 'month') { d.setDate(1); d.setHours(0,0,0,0); return d; }
  if (type === 'year')  { d.setMonth(0,1); d.setHours(0,0,0,0); return d; }
  return null;
}

function Bar({ label, value, max, color, bg, count }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>{label}</span>
          {count !== undefined && <span style={{ fontSize: '10px', color: 'var(--gray-400)', fontWeight: 500 }}>{count} job{count !== 1 ? 's' : ''}</span>}
        </div>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-900)' }}>
          ${value.toLocaleString('en-AU', { minimumFractionDigits: 0 })}
        </span>
      </div>
      <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px', transition: 'width .35s ease' }} />
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { leads } = useLeadsContext();
  const [range,       setRange]       = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd,   setCustomEnd]   = useState('');
  const [activeTab,      setActiveTab]      = useState('overview'); // 'overview' | 'source' | 'transactions'
  const [selectedSource, setSelectedSource] = useState(null); // null = all sources

  const [expenses,       setExpenses]       = useState([]);
  const [revenueRecords, setRevenueRecords] = useState([]);
  const [isLoading,      setIsLoading]      = useState(true);

  useEffect(() => {
    Promise.all([
      fetchRecords(AT_TABLES.expenses),
      fetchRecords(AT_TABLES.revenue),
    ]).then(([expRecs, revRecs]) => {
      setExpenses(expRecs.map(r => ({
        id:          r.id,
        category:    r.fields['Category']    || 'General',
        amount:      parseFloat(r.fields['Amount'] || 0),
        description: r.fields['Description'] || '',
        date:        r.fields['Date']        || '',
      })));
      setRevenueRecords(revRecs.map(r => ({
        id:      r.id,
        name:    r.fields['Revenue Name']   || r.fields['Client Name'] || '',
        client:  r.fields['Client Name']   || '',
        phone:   r.fields['Phone']          || '',
        jobType: r.fields['Job_Service']    || '',
        city:    r.fields['City']           || '',
        method:  r.fields['Payment_Method'] || '',
        amount:  parseFloat(r.fields['Amount'] || 0),
        date:    r.fields['Date']           || '',
        status:  r.fields['Status']         || '',
      })));
    }).finally(() => setIsLoading(false));
  }, []);

  // Build phone → leadSource lookup from leads
  const sourceByPhone = useMemo(() => {
    const map = {};
    leads.forEach(l => {
      if (!l.phone) return;
      const key = l.phone.replace(/\s/g, '').toLowerCase();
      if (!map[key]) {
        map[key] = l.leadSource || (l.hasCall ? 'Phone Call' : 'Other');
      }
    });
    return map;
  }, [leads]);

  const { from, to } = useMemo(() => {
    if (range === 'custom') {
      return {
        from: customStart ? new Date(customStart) : null,
        to:   customEnd   ? new Date(customEnd + 'T23:59:59') : null,
      };
    }
    return { from: startOf(range), to: new Date() };
  }, [range, customStart, customEnd]);

  function inRange(dateVal) {
    if (!from && !to) return true;
    const d = new Date(dateVal);
    if (from && d < from) return false;
    if (to   && d > to)   return false;
    return true;
  }

  const filteredRevenue = revenueRecords
    .filter(r => inRange(r.date) && (r.status === 'Job Done' || r.status === ''))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const filteredExpenses = expenses.filter(e => inRange(e.date));
  const totalIncome   = filteredRevenue.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const profit        = totalIncome - totalExpenses;

  // Revenue enriched with source (matched by phone)
  const revenueWithSource = filteredRevenue.map(r => ({
    ...r,
    source: sourceByPhone[r.phone?.replace(/\s/g, '').toLowerCase()] || 'Other',
  }));

  // Group by source
  const bySource = {};
  revenueWithSource.forEach(r => {
    const k = r.source;
    if (!bySource[k]) bySource[k] = { amount: 0, count: 0 };
    bySource[k].amount += r.amount;
    bySource[k].count  += 1;
  });

  // Group by job type
  const byJobType = {};
  filteredRevenue.forEach(r => {
    const k = r.jobType || 'Other';
    if (!byJobType[k]) byJobType[k] = { amount: 0, count: 0 };
    byJobType[k].amount += r.amount;
    byJobType[k].count  += 1;
  });

  // Group expenses by category
  const byCategory = {};
  filteredExpenses.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  });

  const maxSource  = Math.max(...Object.values(bySource).map(v => v.amount),  1);
  const maxJobType = Math.max(...Object.values(byJobType).map(v => v.amount), 1);
  const maxCat     = Math.max(...Object.values(byCategory), 1);

  const outstandingLeads = leads.filter(l => l.status === 'job_done' && !l.paid && inRange(l.date));
  const rangeLabel = RANGES.find(r => r.id === range)?.label || '';

  if (isLoading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
        <div style={{ color: 'var(--gray-400)', fontSize: '14px' }}>Loading reports…</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gray-900)' }}>Reports</div>
        <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '2px' }}>Income, expenses & lead sources</div>
      </div>

      {/* ── Summary cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
        <SummaryCard label="Income" value={totalIncome} count={`${filteredRevenue.length} jobs`} color="#15803d" bg="#f0fdf4" border="#bbf7d0" />
        <SummaryCard label="Expenses" value={totalExpenses} count={`${filteredExpenses.length} items`} color="#dc2626" bg="#fef2f2" border="#fecaca" />
        <SummaryCard
          label="Profit"
          value={Math.abs(profit)}
          prefix={profit < 0 ? '-' : ''}
          count={profit >= 0 ? 'net gain' : 'net loss'}
          color={profit >= 0 ? '#15803d' : '#dc2626'}
          bg={profit >= 0 ? '#f0fdf4' : '#fef2f2'}
          border={profit >= 0 ? '#bbf7d0' : '#fecaca'}
        />
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '10px', padding: '4px', marginBottom: '10px' }}>
        {[
          { id: 'overview',      label: 'Overview' },
          { id: 'source',        label: 'By Source' },
          { id: 'transactions',  label: 'Transactions' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex: 1, padding: '8px 4px', borderRadius: '7px', fontSize: '12px', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', border: 'none',
            background: activeTab === t.id ? '#fff' : 'transparent',
            color: activeTab === t.id ? 'var(--gray-900)' : 'var(--gray-500)',
            boxShadow: activeTab === t.id ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
            transition: 'all .15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Range selector (below tabs, always visible) ── */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {RANGES.map(r => (
          <button key={r.id} onClick={() => setRange(r.id)} style={{
            padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
            border: `1.5px solid ${range === r.id ? 'var(--primary)' : 'var(--gray-200)'}`,
            background: range === r.id ? 'var(--primary)' : '#fff',
            color: range === r.id ? '#fff' : 'var(--gray-600)',
          }}>
            {r.label}
          </button>
        ))}
      </div>
      {range === 'custom' && (
        <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={lbl}>From</label>
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', fontSize: '14px', border: '1.5px solid var(--gray-200)', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', color: 'var(--gray-800)', background: '#f9fafb' }}
              />
            </div>
            <div>
              <label style={lbl}>To</label>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', fontSize: '14px', border: '1.5px solid var(--gray-200)', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', color: 'var(--gray-800)', background: '#f9fafb' }}
              />
            </div>
          </div>
          {customStart && customEnd && (
            <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--gray-500)', textAlign: 'center' }}>
              Showing {new Date(customStart).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – {new Date(customEnd).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          )}
        </div>
      )}

      {/* ── Overview tab ── */}
      {activeTab === 'overview' && (
        <>
          {Object.keys(byJobType).length > 0 && (
            <div style={card}>
              <div style={cardHdr}>Income by Job Type</div>
              {Object.entries(byJobType).sort((a, b) => b[1].amount - a[1].amount).map(([k, v]) => (
                <Bar key={k} label={k} value={v.amount} max={maxJobType} color="#16a34a" bg="#f0fdf4" count={v.count} />
              ))}
            </div>
          )}

          {Object.keys(byCategory).length > 0 && (
            <div style={card}>
              <div style={cardHdr}>Expenses by Category</div>
              {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                <Bar key={k} label={k} value={v} max={maxCat} color="#dc2626" bg="#fef2f2" />
              ))}
            </div>
          )}

          {outstandingLeads.length > 0 && (
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <div style={cardHdr2}>Awaiting Payment</div>
                  <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '2px' }}>Job done — payment not yet collected</div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, background: '#fff7ed', color: '#c2410c', borderRadius: '20px', padding: '3px 10px' }}>{outstandingLeads.length} unpaid</span>
              </div>
              {outstandingLeads.map(l => (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-900)' }}>{l.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '2px' }}>{l.phone || '—'} · {l.jobType || 'No job type'}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: '#c2410c', fontSize: '14px' }}>
                    {l.value > 0 ? `$${l.value.toLocaleString('en-AU')}` : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredRevenue.length === 0 && filteredExpenses.length === 0 && (
            <EmptyState />
          )}
        </>
      )}

      {/* ── By Source tab ── */}
      {activeTab === 'source' && (
        <>
          {Object.keys(bySource).length > 0 ? (
            <>
              {/* Clickable source cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '14px' }}>
                {Object.entries(bySource).sort((a, b) => b[1].amount - a[1].amount).map(([k, v]) => {
                  const meta    = getSourceMeta(k);
                  const pct     = totalIncome > 0 ? Math.round((v.amount / totalIncome) * 100) : 0;
                  const isActive = selectedSource === k;
                  return (
                    <div
                      key={k}
                      onClick={() => setSelectedSource(isActive ? null : k)}
                      style={{
                        background: isActive ? meta.color : meta.bg,
                        border: `2px solid ${isActive ? meta.color : `${meta.color}33`}`,
                        borderRadius: '12px', padding: '14px 12px', cursor: 'pointer',
                        transition: 'all .15s',
                      }}
                    >
                      <div style={{ fontSize: '10px', fontWeight: 700, color: isActive ? 'rgba(255,255,255,0.8)' : meta.color, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '5px' }}>
                        {meta.label}
                      </div>
                      <div style={{ fontSize: '19px', fontWeight: 800, color: isActive ? '#fff' : 'var(--gray-900)' }}>
                        ${v.amount.toLocaleString('en-AU')}
                      </div>
                      <div style={{ fontSize: '11px', color: isActive ? 'rgba(255,255,255,0.75)' : 'var(--gray-500)', marginTop: '3px' }}>
                        {v.count} job{v.count !== 1 ? 's' : ''} · {pct}%
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bar chart */}
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={cardHdr2}>
                    {selectedSource ? `${getSourceMeta(selectedSource).label} — Transactions` : 'All Sources'}
                  </div>
                  {selectedSource && (
                    <button onClick={() => setSelectedSource(null)} style={{ fontSize: '11px', color: 'var(--gray-400)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Clear ✕
                    </button>
                  )}
                </div>

                {/* Bars — filtered or all */}
                {!selectedSource && Object.entries(bySource).sort((a, b) => b[1].amount - a[1].amount).map(([k, v]) => {
                  const meta = getSourceMeta(k);
                  return <Bar key={k} label={meta.label} value={v.amount} max={maxSource} color={meta.color} bg={meta.bg} count={v.count} />;
                })}

                {/* Transaction list for selected source */}
                {revenueWithSource
                  .filter(r => !selectedSource || r.source === selectedSource)
                  .map(row => {
                    const sm = getSourceMeta(row.source);
                    const isUpsell = (row.name || '').toLowerCase().includes('upsell');
                    return (
                      <div key={row.id} style={{ padding: '10px 0', borderTop: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-900)' }}>{row.client || row.name}</span>
                            {isUpsell && <span style={{ fontSize: '9px', fontWeight: 700, background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', padding: '1px 5px', borderRadius: '6px' }}>UPSELL</span>}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '2px' }}>
                            {new Date(row.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                            {row.jobType ? ` · ${row.jobType}` : ''}
                            {row.method ? ` · ${row.method}` : ''}
                          </div>
                        </div>
                        <span style={{ fontWeight: 700, color: '#15803d', fontSize: '14px', flexShrink: 0 }}>
                          ${Number(row.amount).toLocaleString('en-AU')}
                        </span>
                      </div>
                    );
                  })
                }
              </div>
            </>
          ) : (
            <EmptyState msg="No revenue data with source information for this period." />
          )}
        </>
      )}

      {/* ── Transactions tab ── */}
      {activeTab === 'transactions' && (
        <>
          {filteredRevenue.length > 0 ? (
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={cardHdr2}>Revenue Transactions</div>
                <span style={{ fontSize: '11px', fontWeight: 700, background: '#f0fdf4', color: '#15803d', borderRadius: '20px', padding: '3px 10px' }}>
                  {filteredRevenue.length} record{filteredRevenue.length !== 1 ? 's' : ''}
                </span>
              </div>
              {filteredRevenue.map(row => {
                const src = sourceByPhone[row.phone?.replace(/\s/g, '').toLowerCase()] || '';
                const sm  = src ? getSourceMeta(src) : null;
                const isUpsell = (row.name || '').toLowerCase().includes('upsell');
                return (
                  <div key={row.id} style={{ padding: '11px 0', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-900)' }}>{row.client || row.name}</span>
                        {isUpsell && <span style={{ fontSize: '9px', fontWeight: 700, background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', padding: '1px 5px', borderRadius: '6px' }}>UPSELL</span>}
                        {sm && <span style={{ fontSize: '9px', fontWeight: 700, background: sm.bg, color: sm.color, padding: '1px 5px', borderRadius: '6px' }}>{sm.label.toUpperCase()}</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '3px' }}>
                        {new Date(row.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {row.jobType ? ` · ${row.jobType}` : ''}
                        {row.city ? ` · ${row.city}` : ''}
                      </div>
                      {row.method && (
                        <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '10px', fontWeight: 700, padding: '1px 8px', borderRadius: '20px', background: row.method === 'Cash' ? '#f0fdf4' : '#eff6ff', color: row.method === 'Cash' ? '#15803d' : '#2563eb', border: `1px solid ${row.method === 'Cash' ? '#bbf7d0' : '#bfdbfe'}` }}>
                          {row.method.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight: 800, color: '#15803d', fontSize: '15px', flexShrink: 0 }}>
                      ${Number(row.amount).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState />
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, prefix = '', count, color, bg, border }) {
  return (
    <div style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: '12px', padding: '14px 12px' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: 800, color, marginTop: '5px', lineHeight: 1.1 }}>
        {prefix}${value.toLocaleString('en-AU', { minimumFractionDigits: 0 })}
      </div>
      <div style={{ fontSize: '10px', color, opacity: 0.75, marginTop: '3px' }}>{count}</div>
    </div>
  );
}

function EmptyState({ msg }) {
  return (
    <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--gray-200)', padding: '48px 20px', textAlign: 'center' }}>
      <svg fill="none" viewBox="0 0 24 24" stroke="var(--gray-300)" strokeWidth="1.5" style={{ width: '40px', height: '40px', margin: '0 auto 10px', display: 'block' }}>
        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
      </svg>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-500)' }}>No data for this period</div>
      <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '5px' }}>{msg || 'Mark leads as paid and add expenses to see reports here'}</div>
    </div>
  );
}

const card     = { background: '#fff', borderRadius: '12px', border: '1px solid var(--gray-200)', padding: '18px 16px', marginBottom: '14px' };
const cardHdr  = { fontSize: '14px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '16px' };
const cardHdr2 = { fontSize: '14px', fontWeight: 700, color: 'var(--gray-900)' };
const lbl      = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--gray-500)', marginBottom: '5px', display: 'block' };
