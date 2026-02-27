import { useLeadsContext } from '../context/LeadsContext';

const PAGE_TITLES = {
  leads:    'Leads Dashboard',
  overview: 'Overview',
  clients:  'Clients',
  calendar: 'Calendar',
  reports:  'Reports',
  crew:     'Crew & Jobs',
};

export default function Sidebar() {
  const { leads, currentPage, setCurrentPage, closePanel } = useLeadsContext();

  function navigate(page) {
    setCurrentPage(page);
    closePanel();
  }

  const totalLeads = leads.length;

  const navItem = (page, label, icon) => (
    <div
      className={`nav-item${currentPage === page ? ' active' : ''}`}
      onClick={() => navigate(page)}
    >
      {icon}
      {label}
      {page === 'leads' && (
        <span className="nav-badge">{totalLeads || '—'}</span>
      )}
    </div>
  );

  return (
    <aside className="sidebar">
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
        {navItem('calendar', 'Calendar',
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
        )}
        {navItem('clients', 'Clients',
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5M12 12a4 4 0 100-8 4 4 0 000 8z"/>
          </svg>
        )}

        <div className="nav-lbl" style={{ marginTop: '6px' }}>Business</div>
        {navItem('reports', 'Reports',
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
        )}
        {navItem('crew', 'Crew & Jobs',
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        )}
      </nav>
    </aside>
  );
}

export { PAGE_TITLES };
