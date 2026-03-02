import { useLeadsContext } from '../context/LeadsContext';
import { PAGE_TITLES } from './Sidebar';

export default function TopBar() {
  const { currentPage, searchTerm, setSearchTerm, setModalOpen, toggleSidebar, refetch } = useLeadsContext();

  const title = PAGE_TITLES[currentPage] || 'Dashboard';

  return (
    <header className="topbar">
      <button className="burger-btn" onClick={toggleSidebar} title="Menu">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      <span className="topbar-title">{title}</span>
      <div className="search-wrap">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Search leads…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value.toLowerCase().trim())}
        />
      </div>
      <div className="topbar-right">
        <button
          className="notif-btn"
          title="Refresh from Airtable"
          onClick={() => refetch()}
          style={{ background: 'var(--blue-50)', border: '1.5px solid var(--blue-200)' }}
        >
          <svg fill="none" viewBox="0 0 24 24" stroke="var(--primary)" strokeWidth="2" style={{ width: '15px', height: '15px' }}>
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </button>
        <button className="btn-new" onClick={() => setModalOpen(true)}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ width: '14px', height: '14px' }}>
            <path d="M12 5v14M5 12h14"/>
          </svg>
          New Lead
        </button>
        <button className="notif-btn">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          <span className="notif-dot"></span>
        </button>
        <div className="user-chip">
          <div className="avatar">AC</div>
          <span className="user-name">Asaf C.</span>
        </div>
      </div>
    </header>
  );
}
