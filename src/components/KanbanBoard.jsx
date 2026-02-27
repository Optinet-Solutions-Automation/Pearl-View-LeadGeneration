import { useState } from 'react';
import { useLeadsContext } from '../context/LeadsContext';
import { COLS } from '../utils/constants';
import KanbanColumn from './KanbanColumn';

export default function KanbanBoard() {
  const { filteredLeads, openPanel } = useLeadsContext();
  const [selectedColId, setSelectedColId] = useState(null);

  function handleColSelect(colId) {
    setSelectedColId(prev => prev === colId ? null : colId);
  }

  const selectedCol = COLS.find(c => c.id === selectedColId);
  const selectedLeads = selectedColId
    ? filteredLeads.filter(l => l.status === selectedColId)
    : [];

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
            onSelect={() => handleColSelect(col.id)}
          />
        ))}
      </div>

      {selectedColId && selectedCol && (
        <div className="col-table-wrap">
          <div className="col-table-hdr">
            <div className="col-dot" style={{ background: selectedCol.dot }} />
            <span className="col-table-title">
              {selectedCol.label}
              <span className="col-table-count">
                {selectedLeads.length} lead{selectedLeads.length !== 1 ? 's' : ''}
              </span>
            </span>
            <button className="col-table-close" onClick={() => setSelectedColId(null)}>✕</button>
          </div>

          {selectedLeads.length === 0 ? (
            <div className="col-table-empty">No leads in this column yet.</div>
          ) : (
            <table className="lead-table">
              <thead>
                <tr>
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
                {selectedLeads.map(l => {
                  const isCall = l.source === 'call1' || l.source === 'call2';
                  const srcLabel = isCall ? `Call · ${l.lp}` : `Form · ${l.lp}`;
                  const srcClass = isCall
                    ? 'tag-call'
                    : l.source === 'form1' ? 'tag-form1' : 'tag-form2';
                  const subjectSnip = (l.subject || '').length > 60
                    ? l.subject.substring(0, 60) + '…'
                    : l.subject || '—';

                  return (
                    <tr key={l.id} className="lead-trow" onClick={() => openPanel(l.id)}>
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
          )}
        </div>
      )}
    </>
  );
}
