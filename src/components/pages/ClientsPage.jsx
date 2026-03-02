import { useState, useMemo } from 'react';
import { useLeadsContext } from '../../context/LeadsContext';
import { formatDate } from '../../utils/dateUtils';

const PAGE_SIZE = 10;

export default function ClientsPage() {
  const { leads, openPanel, setCurrentPage, searchTerm } = useLeadsContext();
  const [lpFilter, setLpFilter] = useState('all');
  const [page,     setPage]     = useState(1);

  const formLeads = leads.filter(l => !l.hasCall && l.name !== 'Unknown');
  const counts = {
    all: formLeads.length,
    LP1: formLeads.filter(l => l.lp === 'LP1').length,
    LP2: formLeads.filter(l => l.lp === 'LP2').length,
  };

  // Apply LP filter then search
  const filtered = useMemo(() => {
    let list = lpFilter === 'all' ? formLeads : formLeads.filter(l => l.lp === lpFilter);
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      list = list.filter(l =>
        l.name.toLowerCase().includes(term) ||
        (l.email  || '').toLowerCase().includes(term) ||
        (l.phone  || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [leads, lpFilter, searchTerm]);

  // Reset to page 1 when filter/search changes
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function changeFilter(key) { setLpFilter(key); setPage(1); }

  function goToLead(id) {
    setCurrentPage('leads');
    setTimeout(() => openPanel(id), 100);
  }

  function pageNumbers() {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = new Set([1, totalPages, safePage, safePage - 1, safePage + 1]);
    return [...pages].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  }

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'LP1', label: 'Crystal Pro' },
    { key: 'LP2', label: 'Pearl View' },
  ];

  return (
    <div className="page">
      <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '2px' }}>Clients</div>
      <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '14px' }}>
        All unique clients from form submissions
      </div>

      {/* LP tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => changeFilter(t.key)}
            style={{
              padding: '5px 14px', borderRadius: '20px', border: '1px solid',
              fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
              borderColor: lpFilter === t.key ? 'var(--primary)' : 'var(--gray-200)',
              background:  lpFilter === t.key ? 'var(--primary)' : '#fff',
              color:       lpFilter === t.key ? '#fff' : 'var(--gray-600)',
            }}
          >
            {t.label} <span style={{ opacity: 0.75, fontWeight: 400 }}>({counts[t.key]})</span>
          </button>
        ))}
      </div>

      {/* Results summary */}
      {searchTerm && (
        <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '10px' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{searchTerm}"
        </div>
      )}

      {/* Client list */}
      <div>
        {paged.length === 0 ? (
          <div style={{ color: 'var(--gray-400)', fontSize: '13px', textAlign: 'center', padding: '40px' }}>
            {searchTerm ? `No clients match "${searchTerm}"` : 'No clients found'}
          </div>
        ) : (
          paged.map(l => (
            <div
              key={l.id}
              onClick={() => goToLead(l.id)}
              style={{
                background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '10px',
                padding: '14px 16px', marginBottom: '8px', display: 'flex', alignItems: 'center',
                gap: '14px', cursor: 'pointer', transition: 'border-color .15s',
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = 'var(--blue-200)'}
              onMouseOut={e  => e.currentTarget.style.borderColor = 'var(--gray-200)'}
            >
              <div style={{
                width: '38px', height: '38px', borderRadius: '50%', background: 'var(--blue-100)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: 700, color: 'var(--primary)', flexShrink: 0,
              }}>
                {l.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--gray-900)' }}>
                  {/* Highlight matching text */}
                  {searchTerm ? highlightMatch(l.name, searchTerm) : l.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                  {l.email || l.phone || '—'}
                </div>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="col-modal-footer" style={{ marginTop: '8px' }}>
          <span className="pg-info">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="pg-controls">
            <button className="pg-btn" disabled={safePage === 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
            {pageNumbers().reduce((acc, pg, idx, arr) => {
              if (idx > 0 && pg - arr[idx - 1] > 1)
                acc.push(<span key={`gap-${pg}`} className="pg-gap">…</span>);
              acc.push(
                <button key={pg} className={`pg-btn pg-num${safePage === pg ? ' pg-active' : ''}`} onClick={() => setPage(pg)}>
                  {pg}
                </button>
              );
              return acc;
            }, [])}
            <button className="pg-btn" disabled={safePage === totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Bold-highlight the matched portion of text
function highlightMatch(text, term) {
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: '#fef08a', borderRadius: '2px', padding: '0 1px' }}>
        {text.slice(idx, idx + term.length)}
      </mark>
      {text.slice(idx + term.length)}
    </>
  );
}
