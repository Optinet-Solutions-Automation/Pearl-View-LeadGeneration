import { useState, useEffect, useMemo } from 'react';
import { EXPENSE_CATEGORIES } from '../../utils/constants';
import { createRecord, deleteRecord, fetchRecords, AT_TABLES } from '../../utils/airtableSync';

// ── Chart helpers ─────────────────────────────────────────────────────────────
const LINE_COLORS = ['#2563eb', '#0d9488', '#dc2626', '#d97706', '#7c3aed', '#ea580c', '#0891b2', '#16a34a'];

function smoothPath(pts) {
  if (!pts || pts.length < 2) return '';
  if (pts.length === 2) return `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)} L${pts[1][0].toFixed(1)},${pts[1][1].toFixed(1)}`;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${(+p2[0]).toFixed(1)},${(+p2[1]).toFixed(1)}`;
  }
  return d;
}

function ExpensesChart({ expenses }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const W = 320, H = 160, PL = 4, PR = 4, PT = 26, PB = 26;
  const cW = W - PL - PR, cH = H - PT - PB;
  const floorY = PT + cH;

  const { labels, series } = useMemo(() => {
    if (!expenses.length) return { labels: [], series: [] };
    // Build last 12 months
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' }), year: d.getFullYear(), month: d.getMonth() };
    });
    const cats = [...new Set(expenses.map(e => e.category))].filter(Boolean);
    return {
      labels: months.map(m => m.label),
      series: cats.map(cat => ({
        label: cat,
        data: months.map(m => expenses.filter(e => e.category === cat && e.date && new Date(e.date).getFullYear() === m.year && new Date(e.date).getMonth() === m.month).reduce((a, e) => a + e.amount, 0)),
      })),
    };
  }, [expenses]);

  const activeSeries = series.filter(s => s.data.some(v => v > 0));
  const n       = labels.length || 1;
  const rawMax  = activeSeries.length > 0 ? Math.max(...activeSeries.flatMap(s => s.data), 1) : 1;
  const niceStep = (() => {
    const rough = rawMax / 4;
    const exp   = Math.pow(10, Math.floor(Math.log10(rough)));
    return [1, 2, 2.5, 5, 10].map(s => s * exp).find(s => s >= rough) || exp * 10;
  })();
  const maxVal = Math.ceil(rawMax / niceStep) * niceStep;
  const xOf = i => PL + (n <= 1 ? cW / 2 : (i / (n - 1)) * cW);
  const yOf = v => PT + cH - (v / maxVal) * cH;
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const v = niceStep * i;
    return { y: yOf(v), label: v >= 1000 ? `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `$${Math.round(v)}` };
  });
  const hX = hoverIdx !== null ? xOf(hoverIdx) : null;
  const tipPct = hoverIdx !== null ? (xOf(hoverIdx) / W * 100) : 50;

  function onMove(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const plotX = Math.max(0, Math.min(cW, ((e.clientX - r.left) / r.width) * W - PL));
    setHoverIdx(Math.max(0, Math.min(n - 1, Math.round((plotX / cW) * (n - 1)))));
  }

  return (
    <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '12px', padding: '16px 16px 10px', marginBottom: '16px' }}>
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-800)', marginBottom: '6px' }}>Expenses Over Time</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {activeSeries.length > 0 ? activeSeries.map((s, idx) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '14px', height: '2.5px', background: LINE_COLORS[idx % LINE_COLORS.length], borderRadius: '2px' }} />
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--gray-500)' }}>{s.label}</span>
            </div>
          )) : (
            <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>No data yet — add an expense to see the chart</span>
          )}
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        {hoverIdx !== null && activeSeries.length > 0 && (
          <div style={{
            position: 'absolute', top: '2px', zIndex: 20, pointerEvents: 'none',
            left: `clamp(60px, ${tipPct}%, calc(100% - 60px))`,
            transform: 'translateX(-50%)',
            background: '#1e293b', color: '#fff',
            fontSize: '9.5px', fontWeight: 600,
            padding: '8px 12px', borderRadius: '10px',
            lineHeight: 1.9, whiteSpace: 'nowrap',
            boxShadow: '0 4px 20px rgba(0,0,0,.3)',
            border: '1px solid rgba(255,255,255,.08)',
          }}>
            <div style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '3px' }}>{labels[hoverIdx]}</div>
            {activeSeries.map((s, idx) => (
              <div key={s.label} style={{ color: LINE_COLORS[idx % LINE_COLORS.length] }}>
                ● {s.label}: ${(s.data[hoverIdx] || 0).toLocaleString('en-AU')}
              </div>
            ))}
          </div>
        )}

        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="180"
          preserveAspectRatio="none"
          style={{ display: 'block', cursor: activeSeries.length > 0 ? 'crosshair' : 'default', overflow: 'hidden' }}
          onMouseMove={activeSeries.length > 0 ? onMove : undefined}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={PL} y1={t.y} x2={W - PR} y2={t.y} stroke={i === 0 ? '#e2e8f0' : '#f1f5f9'} strokeWidth="0.8" />
              <text x={PL + 4} y={t.y - 3} textAnchor="start" fontSize="8" fontWeight="500" fill="#94a3b8">{t.label}</text>
            </g>
          ))}

          {activeSeries.map((s, idx) => (
            <path key={s.label} d={smoothPath(s.data.map((v, i) => [xOf(i), yOf(v)]))}
              fill="none" stroke={LINE_COLORS[idx % LINE_COLORS.length]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          ))}

          {labels.map((lbl, i) => (i === 0 || i === n - 1 || i % 3 === 0) ? (
            <text key={i} x={xOf(i).toFixed(1)} y={H - 5}
              textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
              fontSize="7.5" fill="#94a3b8">{lbl}</text>
          ) : null)}

          {hX !== null && activeSeries.length > 0 && (
            <>
              <line x1={hX} y1={PT} x2={hX} y2={floorY} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,3" />
              {activeSeries.map((s, idx) => (
                <circle key={s.label} cx={hX} cy={yOf(s.data[hoverIdx] || 0)} r="3" fill="#fff" stroke={LINE_COLORS[idx % LINE_COLORS.length]} strokeWidth="1.5" />
              ))}
            </>
          )}
        </svg>
      </div>
    </div>
  );
}

const CAT_COLORS = {
  'Salary - Employee 1':        { bg: '#eff6ff', color: '#2563eb' },
  'Salary - Employee 2':        { bg: '#eff6ff', color: '#2563eb' },
  'Salary - Employee 3':        { bg: '#eff6ff', color: '#2563eb' },
  'Salary - Employee 4':        { bg: '#eff6ff', color: '#2563eb' },
  'Fuel':                        { bg: '#fff7ed', color: '#c2410c' },
  'Cleaning Supplies/Equipment': { bg: '#f0fdf4', color: '#15803d' },
  'Advertising':                 { bg: '#fdf4ff', color: '#9333ea' },
  'Insurance':                   { bg: '#fef9c3', color: '#a16207' },
  'General':                     { bg: '#f1f5f9', color: '#475569' },
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({ category: EXPENSE_CATEGORIES[0], amount: '', description: '', date: new Date().toISOString().slice(0, 10) });
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Load expenses from Airtable on mount
  useEffect(() => {
    fetchRecords(AT_TABLES.expenses).then(records => {
      const loaded = records.map(r => ({
        id: r.id,
        airtableId: r.id,
        category: r.fields['Category'] || EXPENSE_CATEGORIES[0],
        amount: parseFloat(r.fields['Amount'] || 0),
        description: r.fields['Description'] || '',
        date: r.fields['Date'] || '',
      })).sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses(loaded);
    }).finally(() => setIsLoading(false));
  }, []);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleAdd() {
    if (!form.amount || parseFloat(form.amount) <= 0) { alert('Enter a valid amount.'); return; }
    const tempId = `temp-${Date.now()}`;
    const entry = {
      id: tempId,
      airtableId: null,
      category: form.category,
      amount: parseFloat(form.amount),
      description: form.description.trim(),
      date: form.date,
    };
    setExpenses(prev => [entry, ...prev]);
    setForm(prev => ({ ...prev, amount: '', description: '' }));
    setShowForm(false);
    // Write to Airtable and replace temp id with real Airtable id
    // Note: Created_At is an auto-generated field in Airtable, do NOT write it
    const airtableId = await createRecord(AT_TABLES.expenses, {
      'Expense Name': `${form.category} - ${form.date}`,
      'Category':     entry.category,
      'Amount':       entry.amount,
      'Description':  entry.description || '',
      'Date':         entry.date,
    });
    if (airtableId) {
      setExpenses(prev => prev.map(e => e.id === tempId ? { ...e, id: airtableId, airtableId } : e));
    }
  }

  function handleDelete(id) {
    const expense = expenses.find(e => e.id === id);
    if (expense?.airtableId) deleteRecord(AT_TABLES.expenses, expense.airtableId);
    setExpenses(prev => prev.filter(e => e.id !== id));
    setDeleteId(null);
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  // Group by category
  const byCategory = EXPENSE_CATEGORIES.map(cat => ({
    cat,
    total: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.total > 0);

  if (isLoading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
        <div style={{ color: 'var(--gray-400)', fontSize: '14px' }}>Loading expenses…</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gray-900)' }}>Expenses</div>
          <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '2px' }}>Track business expenses manually</div>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ width: '14px', height: '14px' }}><path d="M12 5v14M5 12h14"/></svg>
          Add Expense
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gray-800)', marginBottom: '14px' }}>New Expense</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="fgroup" style={{ margin: 0 }}>
              <label className="flabel">Category</label>
              <select className="fselect" name="category" value={form.category} onChange={handleChange}>
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="fgroup" style={{ margin: 0 }}>
              <label className="flabel">Amount ($)</label>
              <input className="finput" name="amount" type="number" placeholder="0.00" value={form.amount} onChange={handleChange} />
            </div>
            <div className="fgroup" style={{ margin: 0, gridColumn: '1 / -1' }}>
              <label className="flabel">Description (optional)</label>
              <input className="finput" name="description" placeholder="e.g. BP Station refuel…" value={form.description} onChange={handleChange} />
            </div>
            <div className="fgroup" style={{ margin: 0 }}>
              <label className="flabel">Date</label>
              <input className="finput" name="date" type="date" value={form.date} onChange={handleChange} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <button onClick={handleAdd} style={{ padding: '8px 20px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ padding: '8px 20px', background: '#fff', color: 'var(--gray-600)', border: '1.5px solid var(--gray-200)', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Expenses trend chart */}
      <ExpensesChart expenses={expenses} />

      {/* Summary cards */}
      {byCategory.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', marginBottom: '16px' }}>
          <div style={{ background: '#fff', border: '1.5px solid var(--gray-200)', borderRadius: '10px', padding: '14px', gridColumn: '1 / -1' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Total Expenses</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>${total.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</div>
          </div>
          {byCategory.map(({ cat, total: t }) => {
            const c = CAT_COLORS[cat] || { bg: '#f1f5f9', color: '#475569' };
            return (
              <div key={cat} style={{ background: c.bg, border: `1.5px solid ${c.color}22`, borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: c.color, marginBottom: '4px' }}>{cat}</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: c.color }}>${t.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Expense list */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--gray-200)', overflow: 'hidden' }}>
        {expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--gray-400)' }}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ width: '40px', height: '40px', margin: '0 auto 12px', display: 'block', color: 'var(--gray-300)' }}>
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-500)' }}>No expenses yet</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>Click "Add Expense" to get started</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                  <th style={th}>Date</th>
                  <th style={th}>Category</th>
                  <th style={th}>Description</th>
                  <th style={{ ...th, textAlign: 'right' }}>Amount</th>
                  <th style={{ ...th, textAlign: 'center', width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => {
                  const c = CAT_COLORS[e.category] || { bg: '#f1f5f9', color: '#475569' };
                  const d = new Date(e.date);
                  const dateStr = d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
                  return (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                      <td style={td}>{dateStr}</td>
                      <td style={td}>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: c.bg, color: c.color, whiteSpace: 'nowrap' }}>
                          {e.category}
                        </span>
                      </td>
                      <td style={{ ...td, color: 'var(--gray-500)' }}>{e.description || '—'}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                        ${e.amount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <button
                          onClick={() => setDeleteId(e.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: '4px' }}
                          title="Delete"
                        >
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: '15px', height: '15px' }}>
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '28px 32px', maxWidth: '360px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '8px' }}>Delete Expense?</div>
            <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>This cannot be undone.</div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: '9px', border: '1.5px solid var(--gray-200)', background: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={() => handleDelete(deleteId)} style={{ flex: 1, padding: '9px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const th = { padding: '10px 14px', textAlign: 'left', fontSize: '11.5px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' };
const td = { padding: '12px 14px', color: 'var(--gray-700)', verticalAlign: 'middle' };
