import { useLeadsContext } from '../context/LeadsContext';

export const PAGE_TITLES = {
  leads:            'Leads Dashboard',
  overview:         'Overview',
  clients:          'Clients',
  'deleted-history':'Deleted History',
  calendar:         'Calendar',
};

export default function Sidebar() {
  const { leads, deletedLeads, currentPage, setCurrentPage, setSearchTerm, closePanel, sidebarOpen, closeSidebar } = useLeadsContext();

  function navigate(page) {
    setCurrentPage(page);
    setSearchTerm('');
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
      {page === 'deleted-history' && deletedLeads.length > 0 && (
        <span className="nav-badge" style={{ background: '#fee2e2', color: '#dc2626' }}>
          {deletedLeads.length}
        </span>
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
          {navItem('clients', 'Clients',
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
          )}
          {navItem('deleted-history', 'Deleted History',
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          )}
          {navItem('calendar', 'Calendar',
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
          )}
        </nav>
        <div className="sidebar-footer" />
      </aside>
    </>
  );
}
