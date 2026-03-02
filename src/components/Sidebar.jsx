import { useLeadsContext } from '../context/LeadsContext';

export const PAGE_TITLES = {
  leads:    'Leads Dashboard',
  overview: 'Overview',
  settings: 'Settings',
};

export default function Sidebar() {
  const { leads, currentPage, setCurrentPage, closePanel, sidebarOpen, closeSidebar } = useLeadsContext();

  function navigate(page) {
    setCurrentPage(page);
    closePanel();
    closeSidebar();
  }

  const navItem = (page, label, icon) => (
    <div
      className={`nav-item${currentPage === page ? ' active' : ''}`}
      onClick={() => navigate(page)}
    >
      {icon}
      {label}
      {page === 'leads' && (
        <span className="nav-badge">{leads.length || '—'}</span>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}

      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="logo">
          <div className="logo-icon">PV</div>
          <div>
            <span className="logo-name">Pearl View</span>
            <span className="logo-sub">Lead Management</span>
          </div>
        </div>
        <nav className="nav">
          <div className="nav-lbl">Main</div>
          {navItem('overview', 'Overview',
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          )}
          {navItem('leads', 'Leads',
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          )}
        </nav>
        <div className="sidebar-footer">
          {navItem('settings', 'Settings',
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          )}
        </div>
      </aside>
    </>
  );
}
