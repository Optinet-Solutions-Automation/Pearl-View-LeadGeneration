import { useState, useMemo } from 'react';
import { useLeadsContext } from '../context/LeadsContext';
import { COLS } from '../utils/constants';
import KanbanColumn from './KanbanColumn';

const PAGE_SIZE = 10;

export default function KanbanBoard() {
  const { filteredLeads, openPanel } = useLeadsContext();

  const [selectedColId, setSelectedColId] = useState(null);
  const [modalSearch,   setModalSearch]   = useState('');
  const [modalPage,     setModalPage]     = useState(1);

  const selectedCol   = COLS.find(c => c.id === selectedColId);
  const selectedLeads = selectedColId
    ? filteredLeads.filter(l => l.status === selectedColId)
    : [];

  // Filter by search term
  const searchedLeads = useMemo(() => {
    const term = modalSearch.trim().toLowerCase();
    if (!term) return selectedLeads;
    return selectedLeads.filter(l =>
      l.name.toLowerCase().includes(term)       ||
      (l.phone  || '').toLowerCase().includes(term) ||
      (l.email  || '').toLowerCase().includes(term) ||
      (l.subject|| '').toLowerCase().includes(term)
    );
  }, [selectedLeads, modalSearch]);

  const totalPages  = Math.max(1, Math.ceil(searchedLeads.length / PAGE_SIZE));
  const safePage    = Math.min(modalPage, totalPages);
  const pagedLeads  = searchedLeads.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const startIdx    = (safePage - 1) * PAGE_SIZE;

  function openCol(colId) {
    setSelectedColId(colId);
    setModalSearch('');
    setModalPage(1);
  }

  function closeModal(e) {
    if (!e || e.target === e.currentTarget) {
      setSelectedColId(null);
      setModalSearch('');
      setModalPage(1);
    }
  }

  function handleSearch(e) {
    setModalSearch(e.target.value);
    setModalPage(1);
  }

  // Build compact page number list: always show first, last, and ±1 around current
  function pageNumbers() {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = new Set([1, totalPages, safePage, safePage - 1, safePage + 1]);
    return [...pages].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  }

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

      <div className="board">
        {COLS.map(col => (
          <KanbanColumn
            key={col.id}
            col={col}
            leads={filteredLeads.filter(l => l.status === col.id)}
            isSelected={selectedColId === col.id}
            onSelect={() => openCol(col.id)}
          />
        ))}
      </div>

      {/* Popup modal */}
      {selectedColId && selectedCol && (
        <div className="col-modal-overlay" onClick={closeModal}>
          <div className="col-modal" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="col-modal-hdr">
              <div className="col-dot" style={{ background: selectedCol.dot }} />
              <span className="col-modal-title">{selectedCol.label}</span>
              <span className="col-table-count">
                {selectedLeads.length} lead{selectedLeads.length !== 1 ? 's' : ''}
              </span>
              <button className="col-table-close" onClick={() => closeModal()}>✕</button>
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
                        <th>#</th>
                        <th>Name</th>
                        <th>Source</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Subject</th>
                        <th>Date</th>
                        <th>Est. Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedLeads.map((l, i) => {
                        const isCall   = l.source === 'call1' || l.source === 'call2';
                        const srcLabel = isCall ? `Call · ${l.lp}` : `Form · ${l.lp}`;
                        const srcClass = isCall ? 'tag-call'
                          : l.source === 'form1' ? 'tag-form1' : 'tag-form2';
                        const subjectSnip = (l.subject || '').length > 55
                          ? l.subject.substring(0, 55) + '…'
                          : l.subject || '—';

                        return (
                          <tr
                            key={l.id}
                            className="lead-trow"
                            onClick={() => { closeModal(); openPanel(l.id); }}
                          >
                            <td className="lead-td-num">{startIdx + i + 1}</td>
                            <td className="lead-td-name">{l.name}</td>
                            <td><span className={`tag ${srcClass}`}>{srcLabel}</span></td>
                            <td>{l.phone || '—'}</td>
                            <td>{l.email || '—'}</td>
                            <td className="lead-td-sub">{subjectSnip}</td>
                            <td className="lead-td-date">{l.date || '—'}</td>
                            <td className="lead-td-val">
                              {l.value > 0 ? `$${l.value.toLocaleString()}` : '—'}
                            </td>
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
                    <button
                      className="pg-btn"
                      disabled={safePage === 1}
                      onClick={() => setModalPage(p => p - 1)}
                    >
                      ‹ Prev
                    </button>

                    {pageNumbers().reduce((acc, pg, idx, arr) => {
                      if (idx > 0 && pg - arr[idx - 1] > 1) {
                        acc.push(<span key={`gap-${pg}`} className="pg-gap">…</span>);
                      }
                      acc.push(
                        <button
                          key={pg}
                          className={`pg-btn pg-num${safePage === pg ? ' pg-active' : ''}`}
                          onClick={() => setModalPage(pg)}
                        >
                          {pg}
                        </button>
                      );
                      return acc;
                    }, [])}

                    <button
                      className="pg-btn"
                      disabled={safePage === totalPages}
                      onClick={() => setModalPage(p => p + 1)}
                    >
                      Next ›
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
