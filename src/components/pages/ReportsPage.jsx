import { useState, useMemo } from 'react';
import { useLeadsContext } from '../../context/LeadsContext';
import { EXPENSE_CATEGORIES } from '../../utils/constants';

const LS_KEY  = 'pvl_expenses';
const PAY_KEY = 'pvl_payments';
const CAL_KEY = 'pvl_cal_bookings';

function loadPayments() {
  try { return JSON.parse(localStorage.getItem(PAY_KEY) || '[]'); }
  catch { return []; }
}

function loadCalBookings() {
  try { return JSON.parse(localStorage.getItem(CAL_KEY) || '[]'); }
  catch { return []; }
}

function loadExpenses() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
  catch { return []; }
}

const RANGES = [
  { id: 'week',   label: 'This Week' },
  { id: 'month',  label: 'This Month' },
  { id: 'year',   label: 'This Year' },
  { id: 'custom', label: 'Custom' },
];

function startOf(type) {
  const d = new Date();
  if (type === 'week')  { d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d; }
  if (type === 'month') { d.setDate(1); d.setHours(0,0,0,0); return d; }
  if (type === 'year')  { d.setMonth(0,1); d.setHours(0,0,0,0); return d; }
  return null;
}

function Bar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="reports-bar-row">
      <div className="reports-bar-label">{label}</div>
      <div className="reports-bar-track">
        <div style={{ height: '10px', width: `${pct}%`, background: color, borderRadius: '4px', transition: 'width .3s' }} />
      </div>
      <div className="reports-bar-value">
        ${value.toLocaleString('en-AU', { minimumFractionDigits: 0 })}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { leads } = useLeadsContext();
  const [range,       setRange]       = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd,   setCustomEnd]   = useState('');

  const expenses    = useMemo(() => loadExpenses(), []);
  const payments    = useMemo(() => loadPayments(), []);
  const calBookings = useMemo(() => loadCalBookings(), []);

  const { from, to } = useMemo(() => {
    if (range === 'custom') {
      return {
        from: customStart ? new Date(customStart) : null,
        to:   customEnd   ? new Date(customEnd + 'T23:59:59') : null,
      };
    }
    const f = startOf(range);
    return { from: f, to: new Date() };
  }, [range, customStart, customEnd]);

  function inRange(dateVal) {
    if (!from && !to) return true;
    const d = new Date(dateVal);
    if (from && d < from) return false;
    if (to   && d > to)   return false;
    return true;
  }

  const paidLeads     = leads.filter(l => l.paid && inRange(l.date));
  const totalIncome   = paidLeads.reduce((s, l) => s + (l.paidAmount || 0), 0);
  const jobDoneCount  = leads.filter(l => l.status === 'job_done' && inRange(l.date)).length;

  const incomeByJobType = {};
  paidLeads.forEach(l => {
    const k = l.jobType || 'Other';
    incomeByJobType[k] = (incomeByJobType[k] || 0) + (l.paidAmount || 0);
  });

  const filteredPayments    = payments.filter(p => inRange(p.date));
  const filteredCalBookings = calBookings.filter(b => inRange(b.date));
  const filteredExpenses    = expenses.filter(e => inRange(e.date));

  // Merge payments + cal bookings into one sorted list
  const allTransactions = [
    ...filteredPayments.map(p => ({ ...p, _type: 'payment' })),
    ...filteredCalBookings.map(b => ({
      id: b.id, _type: 'booking',
      name: b.clientName, phone: b.phone, email: b.email,
      jobType: b.service, city: b.city,
      method: b.paymentMethod, bankName: null, accountRef: null,
      amount: null, date: b.date,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalExpenses    = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const profit           = totalIncome - totalExpenses;

  const expByCategory = {};
  filteredExpenses.forEach(e => { expByCategory[e.category] = (expByCategory[e.category] || 0) + e.amount; });

  const maxExp = Math.max(...Object.values(expByCategory), 1);
  const maxInc = Math.max(...Object.values(incomeByJobType), 1);

  return (
    <div className="page">
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gray-900)' }}>Reports</div>
        <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '2px' }}>Income and expense overview</div>
      </div>

      {/* Range selector */}
      <div className="reports-range-btns">
        {RANGES.map(r => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            style={{
              padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              border: `1.5px solid ${range === r.id ? 'var(--primary)' : 'var(--gray-200)'}`,
              background: range === r.id ? '#eff6ff' : '#fff',
              color: range === r.id ? 'var(--primary)' : 'var(--gray-600)',
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {range === 'custom' && (
        <div className="reports-date-row">
          <div className="fgroup">
            <label className="flabel">From</label>
            <input className="finput" type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
          </div>
          <div className="fgroup">
            <label className="flabel">To</label>
            <input className="finput" type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="reports-summary-grid">
        <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '.05em' }}>Total Income</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d', marginTop: '6px' }}>${totalIncome.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</div>
          <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '4px' }}>{paidLeads.length} paid job{paidLeads.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '.05em' }}>Total Expenses</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626', marginTop: '6px' }}>${totalExpenses.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</div>
          <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>{filteredExpenses.length} item{filteredExpenses.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="reports-card-profit" style={{ background: profit >= 0 ? '#f0fdf4' : '#fef2f2', border: `1.5px solid ${profit >= 0 ? '#bbf7d0' : '#fecaca'}`, borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: profit >= 0 ? '#15803d' : '#dc2626', textTransform: 'uppercase', letterSpacing: '.05em' }}>Net Profit</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: profit >= 0 ? '#15803d' : '#dc2626', marginTop: '6px' }}>
            {profit < 0 ? '-' : ''}${Math.abs(profit).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '4px' }}>{jobDoneCount} job{jobDoneCount !== 1 ? 's' : ''} done</div>
        </div>
      </div>

      {Object.keys(incomeByJobType).length > 0 && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--gray-200)', padding: '20px', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '14px' }}>Income by Job Type</div>
          {Object.entries(incomeByJobType).sort((a, b) => b[1] - a[1]).map(([lbl, val]) => (
            <Bar key={lbl} label={lbl} value={val} max={maxInc} color="#16a34a" />
          ))}
        </div>
      )}

      {Object.keys(expByCategory).length > 0 && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--gray-200)', padding: '20px', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '14px' }}>Expenses by Category</div>
          {Object.entries(expByCategory).sort((a, b) => b[1] - a[1]).map(([lbl, val]) => (
            <Bar key={lbl} label={lbl} value={val} max={maxExp} color="#dc2626" />
          ))}
        </div>
      )}

      {allTransactions.length > 0 && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--gray-200)', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--gray-100)' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gray-900)' }}>Payment Transactions</div>
            <span style={{ fontSize: '11px', fontWeight: 700, background: '#f0fdf4', color: '#15803d', borderRadius: '20px', padding: '2px 10px' }}>
              {allTransactions.length} record{allTransactions.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                  <th style={pth}>Date</th>
                  <th style={pth}>Client</th>
                  <th style={pth}>Phone</th>
                  <th style={pth}>Job / Service</th>
                  <th style={pth}>City</th>
                  <th style={pth}>Method</th>
                  <th style={{ ...pth, textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {allTransactions.map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={ptd}>
                      <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                        {new Date(row.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td style={{ ...ptd, fontWeight: 600, color: 'var(--gray-900)' }}>
                      {row.name}
                      {row._type === 'booking' && (
                        <span style={{ marginLeft: '6px', fontSize: '9.5px', fontWeight: 700, padding: '1px 6px', borderRadius: '20px', background: '#fefce8', color: '#92400e', border: '1px solid #fde68a', verticalAlign: 'middle' }}>BOOKING</span>
                      )}
                    </td>
                    <td style={{ ...ptd, color: 'var(--gray-600)' }}>{row.phone || '—'}</td>
                    <td style={ptd}>
                      {row.jobType
                        ? <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', background: '#eff6ff', color: 'var(--primary)', whiteSpace: 'nowrap' }}>{row.jobType}</span>
                        : <span style={{ color: 'var(--gray-400)' }}>—</span>
                      }
                    </td>
                    <td style={{ ...ptd, color: 'var(--gray-500)' }}>{row.city || '—'}</td>
                    <td style={ptd}>
                      {row.method ? (
                        <>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 9px', borderRadius: '20px', background: row.method === 'Cash' ? '#f0fdf4' : '#eff6ff', color: row.method === 'Cash' ? '#15803d' : '#2563eb', border: `1px solid ${row.method === 'Cash' ? '#bbf7d0' : '#bfdbfe'}` }}>
                            {row.method.toUpperCase()}
                          </span>
                          {row.bankName && <div style={{ fontSize: '10.5px', color: 'var(--gray-500)', marginTop: '3px' }}>{row.bankName}</div>}
                          {row.accountRef && <div style={{ fontSize: '10px', color: 'var(--gray-400)' }}>{row.accountRef}</div>}
                        </>
                      ) : <span style={{ color: 'var(--gray-400)' }}>—</span>}
                    </td>
                    <td style={{ ...ptd, textAlign: 'right', fontWeight: 700, color: row.amount != null ? '#15803d' : 'var(--gray-400)' }}>
                      {row.amount != null
                        ? `$${Number(row.amount).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`
                        : '—'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {paidLeads.length === 0 && filteredExpenses.length === 0 && allTransactions.length === 0 && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--gray-200)', padding: '48px', textAlign: 'center' }}>
          <svg fill="none" viewBox="0 0 24 24" stroke="var(--gray-300)" strokeWidth="1.5" style={{ width: '48px', height: '48px', margin: '0 auto 12px', display: 'block' }}>
            <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-500)' }}>No data for this period</div>
          <div style={{ fontSize: '12.5px', color: 'var(--gray-400)', marginTop: '6px' }}>Mark leads as paid and add expenses to see reports here</div>
        </div>
      )}
    </div>
  );
}

const pth = { padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' };
const ptd = { padding: '11px 14px', color: 'var(--gray-700)', verticalAlign: 'middle' };
