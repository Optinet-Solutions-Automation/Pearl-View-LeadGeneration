import { useLeadsContext } from '../context/LeadsContext';
import { COLS } from '../utils/constants';
import KanbanColumn from './KanbanColumn';

export default function KanbanBoard() {
  const { filteredLeads } = useLeadsContext();

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
          />
        ))}
      </div>
    </>
  );
}
