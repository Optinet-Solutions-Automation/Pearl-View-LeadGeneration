import { useState, useMemo, useRef, useEffect } from 'react';
import { useLeadsContext } from '../context/LeadsContext';
import { COLS } from '../utils/constants';
import KanbanColumn from './KanbanColumn';

const PAGE_SIZE = 10;

const ALL_COLS = [
  { key: 'num',     label: '#' },
  { key: 'name',    label: 'Name' },
  { key: 'source',  label: 'Source' },
  { key: 'phone',   label: 'Phone' },
  { key: 'email',   label: 'Email' },
  { key: 'subject', label: 'Subject' },
  { key: 'date',    label: 'Date' },
  { key: 'value',   label: 'Est. Value' },
];

export default function KanbanBoard() {
  const { filteredLeads, openPanel } = useLeadsContext();

  const [selectedColId,  setSelectedColId]  = useState(null);
  const [modalSearch,    setModalSearch]    = useState('');
  const [modalPage,      setModalPage]      = useState(1);
  const [visibleCols,    setVisibleCols]    = useState(() => new Set(ALL_COLS.map(c => c.key)));
  const [showColPicker,  setShowColPicker]  = useState(false);
  const pickerRef = useRef(null);

  // Close picker when clicking outside
  useEffect(() => {
    if (!showColPicker) return;
    function handler(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowColPicker(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showColPicker]);

  const selectedCol   = COLS.find(c => c.id === selectedColId);
  const selectedLeads = selectedColId ? filteredLeads.filter(l => l.status === selectedColId) : [];

  const searchedLeads = useMemo(() => {
    const term = modalSearch.trim().toLowerCase();
    if (!term) return selectedLeads;
    return selectedLeads.filter(l =>
      l.name.toLowerCase().includes(term)           ||
      (l.phone   || '').toLowerCase().includes(term) ||
      (l.email   || '').toLowerCase().includes(term) ||
      (l.subject || '').toLowerCase().includes(term)
    );
  }, [selectedLeads, modalSearch]);

  const totalPages = Math.max(1, Math.ceil(searchedLeads.length / PAGE_SIZE));
  const safePage   = Math.min(modalPage, totalPages);
  const pagedLeads = searchedLeads.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const startIdx   = (safePage - 1) * PAGE_SIZE;

  function openCol(colId) {
    setSelectedColId(colId);
    setModalSearch('');
    setModalPage(1);
  }

  function closeTable() {
    setSelectedColId(null);
    setModalSearch('');
    setModalPage(1);
    setShowColPicker(false);
  }

  function handleSearch(e) {
    setModalSearch(e.target.value);
    setModalPage(1);
  }

  function toggleCol(key) {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  }

  function pageNumbers() {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = new Set([1, totalPages, safePage, safePage - 1, safePage + 1]);
    return [...pages].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  }

  const activeCols = ALL_COLS.filter(c => visibleCols.has(c.key));

  return (
    <>
      <div className="board-hdr">
        <span className="board-title">Lead Pipeline (Kanban Board)</span>
        <div className="board-ctrls">
          <button className="ctrl-btn">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M6 12h12M9 18h6"/>
            </svg>
            Filter
          </button>
          <button className="ctrl-btn">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M12 4v16m8-8H4"/>
            </svg>
            Add Column
          </button>
        </div>
      </div>

      {selectedColId && selectedCol ? (
        /* ── Table view — replaces the board in the same area ── */
        <div className="col-table-section">

          {/* Header */}
          <div className="col-modal-hdr">
            <div className="col-dot" style={{ background: selectedCol.dot }} />
            <span className="col-modal-title">{selectedCol.label}</span>
            <span className="col-table-count">
              {selectedLeads.length} lead{selectedLeads.length !== 1 ? 's' : ''}
            </span>

            {/* Column visibility picker */}
            <div className="col-picker-wrap" ref={pickerRef}>
              <button
                className="ctrl-btn"
                onClick={() => setShowColPicker(v => !v)}
                style={{ fontSize: '12px', padding: '5px 12px' }}
              >
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: '13px', height: '13px' }}>
                  <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
                </svg>
                Columns
              </button>
              {showColPicker && (
                <div className="col-picker-dropdown">
                  <div className="col-picker-title">Show / Hide Columns</div>
                  {ALL_COLS.map(col => (
                    <label key={col.key} className="col-picker-row">
                      <span className="col-picker-label">{col.label}</span>
                      <span className={`toggle-switch${visibleCols.has(col.key) ? ' on' : ''}`} onClick={() => toggleCol(col.key)}>
                        <span className="toggle-knob" />
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button className="col-table-close" onClick={closeTable}>✕</button>
          </div>

          {/* Search toolbar */}
          <div className="col-modal-toolbar">
            <div className="col-modal-search-wrap">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                className="col-modal-search"
                type="text"
                placeholder="Search by name, phone, email, subject…"
                value={modalSearch}
                onChange={handleSearch}
                autoFocus
              />
              {modalSearch && (
                <button className="col-search-clear" onClick={() => { setModalSearch(''); setModalPage(1); }}>✕</button>
              )}
            </div>
            {modalSearch && (
              <span className="col-search-info">
                {searchedLeads.length} result{searchedLeads.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Table body */}
          {searchedLeads.length === 0 ? (
            <div className="col-table-empty">
              {modalSearch ? `No leads match "${modalSearch}"` : 'No leads in this column yet.'}
            </div>
          ) : (
            <>
              <div className="col-modal-body">
                <table className="lead-table">
                  <thead>
                    <tr>
                      {activeCols.map(c => <th key={c.key}>{c.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedLeads.map((l, i) => {
                      const isCall   = l.source === 'call1' || l.source === 'call2';
                      const lpName   = l.lp === 'LP2' ? 'Pearl View' : 'Crystal Pro';
                      const srcLabel = isCall ? `Call · ${lpName}` : `Form · ${lpName}`;
                      const srcClass = isCall ? 'tag-call' : l.source === 'form1' ? 'tag-form1' : 'tag-form2';
                      const subjectSnip = (l.subject || '').length > 55
                        ? l.subject.substring(0, 55) + '…'
                        : l.subject || '—';

                      return (
                        <tr key={l.id} className="lead-trow" onClick={() => { closeTable(); openPanel(l.id); }}>
                          {visibleCols.has('num')     && <td className="lead-td-num">{startIdx + i + 1}</td>}
                          {visibleCols.has('name')    && <td className="lead-td-name">{l.name}</td>}
                          {visibleCols.has('source')  && <td><span className={`tag ${srcClass}`}>{srcLabel}</span></td>}
                          {visibleCols.has('phone')   && <td>{l.phone || '—'}</td>}
                          {visibleCols.has('email')   && <td>{l.email || '—'}</td>}
                          {visibleCols.has('subject') && <td className="lead-td-sub">{subjectSnip}</td>}
                          {visibleCols.has('date')    && <td className="lead-td-date">{l.date || '—'}</td>}
                          {visibleCols.has('value')   && <td className="lead-td-val">{l.value > 0 ? `$${l.value.toLocaleString()}` : '—'}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer */}
              <div className="col-modal-footer">
                <span className="pg-info">
                  Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, searchedLeads.length)} of {searchedLeads.length}
                </span>
                <div className="pg-controls">
                  <button className="pg-btn" disabled={safePage === 1} onClick={() => setModalPage(p => p - 1)}>‹ Prev</button>
                  {pageNumbers().reduce((acc, pg, idx, arr) => {
                    if (idx > 0 && pg - arr[idx - 1] > 1) acc.push(<span key={`gap-${pg}`} className="pg-gap">…</span>);
                    acc.push(
                      <button key={pg} className={`pg-btn pg-num${safePage === pg ? ' pg-active' : ''}`} onClick={() => setModalPage(pg)}>
                        {pg}
                      </button>
                    );
                    return acc;
                  }, [])}
                  <button className="pg-btn" disabled={safePage === totalPages} onClick={() => setModalPage(p => p + 1)}>Next ›</button>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        /* ── Kanban board — shown when no column is selected ── */
        <div className="board">
          {COLS.map(col => (
            <KanbanColumn
              key={col.id}
              col={col}
              leads={filteredLeads.filter(l => l.status === col.id)}
              isSelected={false}
              onSelect={() => openCol(col.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}
